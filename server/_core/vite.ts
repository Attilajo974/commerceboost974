import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import superjson from "superjson";
import { createServer as createViteServer } from "vite";
import type { HeadMeta } from "../../client/src/ssr/prefetch";
import viteConfig from "../../vite.config";
import { buildSsrPrefetch } from "./ssrCaller";

const SITE = "CommerceBoost974";
const DEFAULT_DESCRIPTION = "Vitrine, catalogue, commandes et pilotage pour les artisans, commerçants et TPE de La Réunion.";
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const origin = () => (process.env.CANONICAL_ORIGIN || "").replace(/\/$/, "");

function headTags(head: HeadMeta) {
  const title = escape(head.title || SITE); const description = escape(head.description || DEFAULT_DESCRIPTION); const canonical = head.canonicalPath && origin() ? `${origin()}${head.canonicalPath}` : "";
  const tags = [`<title>${title}</title>`, `<meta name="description" content="${description}" />`, `<meta property="og:type" content="${head.ogType || "website"}" />`, `<meta property="og:title" content="${title}" />`, `<meta property="og:description" content="${description}" />`, `<meta property="og:locale" content="fr_FR" />`, `<meta property="og:site_name" content="${SITE}" />`, `<meta name="twitter:card" content="summary" />`, `<meta name="twitter:title" content="${title}" />`, `<meta name="twitter:description" content="${description}" />`];
  if (canonical) tags.push(`<link rel="canonical" href="${escape(canonical)}" />`, `<meta property="og:url" content="${escape(canonical)}" />`);
  if (head.noindex || head.notFound) tags.push(`<meta name="robots" content="noindex, follow" />`);
  return tags.join("\n");
}

function compose(template: string, html: string, head: HeadMeta, state: unknown) {
  const serialized = JSON.stringify(superjson.serialize(state)).replace(/</g, "\\u003c");
  return template.replace("</body>", () => `<script>window.__RQ_STATE__ = ${serialized}</script></body>`).replace("<!--app-head-->", () => headTags(head)).replace("<!--app-html-->", () => html);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({ ...viteConfig, configFile: false, server: { middlewareMode: true, hmr: { server }, allowedHosts: true }, appType: "custom" });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      let template = await fs.promises.readFile(path.resolve(import.meta.dirname, "../..", "client", "index.html"), "utf-8");
      template = template.replace(`src="/src/entry-client.tsx"`, `src="/src/entry-client.tsx?v=${nanoid()}"`);
      template = await vite.transformIndexHtml(req.originalUrl, template);
      template = template.replace("</head>", `<link rel="stylesheet" href="/src/index.css?direct" data-ssr-dev-css></head>`);
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const result = await render(req.originalUrl, await buildSsrPrefetch(req, res));
      res.status(result.head.notFound ? 404 : 200).set("Cache-Control", "no-cache").type("html").end(compose(template, result.html, result.head, result.state));
    } catch (error) { vite.ssrFixStacktrace(error as Error); next(error); }
  });
}

export function serveStatic(app: Express) {
  const dist = path.resolve(import.meta.dirname, "public");
  app.use((req, res, next) => { if (req.path === "/index.html") return res.redirect(301, "/"); if (req.path !== "/" && /\/+$/ .test(req.path)) return res.redirect(301, req.path.replace(/\/+$/ , "") || "/"); next(); });
  app.use(express.static(dist, { index: false, redirect: false }));
  app.use("*", async (req, res) => {
    const template = await fs.promises.readFile(path.resolve(dist, "index.html"), "utf-8");
    try {
      const module = await import(path.resolve(import.meta.dirname, "server-ssr", "entry-server.js"));
      const result = await module.render(req.originalUrl, await buildSsrPrefetch(req, res));
      res.status(result.head.notFound ? 404 : 200).set("Cache-Control", "no-cache").type("html").end(compose(template, result.html, result.head, result.state));
    } catch (error) {
      console.error("[SSR] render failed", error);
      const fallback: HeadMeta = { title: SITE, description: DEFAULT_DESCRIPTION };
      res.status(200).set("Cache-Control", "no-cache").type("html").end(compose(template, "", fallback, {}));
    }
  });
}
