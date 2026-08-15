import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { auditLogs, memberships } from "../../drizzle/schema";
import { getDb } from "../db";

export const BUSINESS_ROLES = ["owner", "manager", "staff"] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export async function getRequiredDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Le service est temporairement indisponible." });
  }
  return db;
}

export async function requireBusinessAccess(
  userId: number,
  businessId: number,
  acceptedRoles: readonly BusinessRole[] = BUSINESS_ROLES
) {
  const db = await getRequiredDb();
  const rows = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.businessId, businessId), eq(memberships.userId, userId), eq(memberships.status, "active")))
    .limit(1);
  const membership = rows[0];

  if (!membership || membership.status !== "active" || !acceptedRoles.includes(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Vous n’avez pas accès à cette entreprise." });
  }

  return { db, membership };
}

export async function recordAudit(
  businessId: number | null,
  actorUserId: number | null,
  action: string,
  entityType: string,
  entityId?: string | number,
  metadata?: Record<string, unknown>
) {
  const db = await getRequiredDb();
  await db.insert(auditLogs).values({
    businessId,
    actorUserId,
    action,
    entityType,
    entityId: entityId === undefined ? null : String(entityId),
    metadata: metadata ?? null,
  });
}
