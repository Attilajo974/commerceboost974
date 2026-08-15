import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { stripeReadiness } from "./plans";
import { ENV } from "../_core/env";

export function requireStripe() {
  const readiness = stripeReadiness();
  if (!readiness.configured) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La facturation Stripe n’est pas encore configurée. Renseignez les clés et les Price IDs réels dans l’environnement de production." });
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2 });
}

export function applicationOrigin() {
  const origin = ENV.canonicalOrigin;
  if (process.env.NODE_ENV === "production" && !origin) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le domaine de production doit être configuré avant d’activer Stripe." });
  return (origin || "http://localhost:3000").replace(/\/$/, "");
}
