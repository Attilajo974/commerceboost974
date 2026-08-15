import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { weeklySummaryHandler } from "../scheduled/weeklySummary";
import { getRequiredDb } from "../domain/tenant";
import { businesses } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { stripeWebhookHandler } from "../billing/webhook";
import { ENV } from "./env";
import { dataRetentionHandler } from "../scheduled/dataRetention";
import { logOperationalError } from "../domain/observability";
import { JSON_BODY_LIMIT, URL_ENCODED_BODY_LIMIT } from "./httpSecurity";

const apiRequests = new Map<string, { count: number; resetAt: number }>();

function securityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.manus.computer");
  }
  next();
}

function apiRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  if (apiRequests.size > 1_000) {
    apiRequests.forEach((entry, storedKey) => {
      if (entry.resetAt <= now) apiRequests.delete(storedKey);
    });
  }
  const isCheckout = req.path.includes("checkout.create");
  const maxRequests = isCheckout ? 8 : 120;
  const key = `${req.ip || "unknown"}:${isCheckout ? "checkout" : "general"}`;
  const entry = apiRequests.get(key);
  if (!entry || entry.resetAt <= now) {
    apiRequests.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (entry.count >= maxRequests) {
    res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: "Trop de requêtes. Réessayez dans un instant." });
  }
  entry.count += 1;
  next();
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
  // Files are stored through presigned storage URLs; API payloads need only structured data.
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: URL_ENCODED_BODY_LIMIT, extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/weekly-summary", weeklySummaryHandler);
  app.post("/api/scheduled/data-retention", dataRetentionHandler);
  app.get("/robots.txt", (req, res) => {
    const origin = ENV.canonicalOrigin || `${req.protocol}://${req.get("host")}`;
    res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /admin\nSitemap: ${origin}/sitemap.xml\n`);
  });
  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      const origin = ENV.canonicalOrigin || `${req.protocol}://${req.get("host")}`;
      const db = await getRequiredDb();
      const shops = await db.select({ slug: businesses.slug, updatedAt: businesses.updatedAt }).from(businesses).where(and(eq(businesses.isPublished, true), eq(businesses.status, "active")));
      const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
      const urls = [`<url><loc>${escapeXml(origin)}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`, ...shops.map(shop => `<url><loc>${escapeXml(origin)}/shop/${encodeURIComponent(shop.slug)}</loc><lastmod>${shop.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)].join("");
      res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
    } catch (error) { next(error); }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    apiRateLimit,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logOperationalError("http.unhandled", error, { path: _req.path, method: _req.method });
    if (!res.headersSent) {
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
      if (status === 413) {
        res.status(413).json({ error: "La requête dépasse la taille autorisée." });
        return;
      }
      res.status(500).json({ error: "Le service a rencontré une erreur inattendue." });
    }
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => logOperationalError("server.start_failed", error));
