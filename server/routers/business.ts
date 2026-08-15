import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { businesses, businessSettings, memberships } from "../../drizzle/schema";
import { getRequiredDb, recordAudit, requireBusinessAccess } from "../domain/tenant";
import { slugify } from "../domain/slug";
import { enforceActionRateLimit } from "../domain/rateLimit";
import { protectedProcedure, router } from "../_core/trpc";

const businessIdSchema = z.object({ businessId: z.number().int().positive() });
const contactSchema = z.object({
  contactEmail: z.string().email("Adresse e-mail invalide.").nullable().optional(),
  contactPhone: z.string().min(6).max(32).nullable().optional(),
  address: z.string().max(600).nullable().optional(),
  city: z.string().max(96).nullable().optional(),
  postalCode: z.string().max(16).nullable().optional(),
});

async function createUniqueBusinessSlug(name: string) {
  const db = await getRequiredDb();
  const base = slugify(name);
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, candidate)).limit(1);
    if (!existing[0]) return candidate;
  }
  throw new TRPCError({ code: "CONFLICT", message: "Impossible de créer une adresse de boutique disponible." });
}

export const businessRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getRequiredDb();
    return db
      .select({ business: businesses, membership: memberships })
      .from(memberships)
      .innerJoin(businesses, eq(memberships.businessId, businesses.id))
      .where(and(eq(memberships.userId, ctx.user.id), eq(memberships.status, "active")));
  }),

  get: protectedProcedure.input(businessIdSchema).query(async ({ ctx, input }) => {
    const { db, membership } = await requireBusinessAccess(ctx.user.id, input.businessId);
    const business = await db.select().from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
    if (!business[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Entreprise introuvable." });
    const settings = await db.select().from(businessSettings).where(eq(businessSettings.businessId, input.businessId)).limit(1);
    return { business: business[0], membership, settings: settings[0] ?? null };
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(160), activityType: z.string().max(96).optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("business.create", `user:${ctx.user.id}`);
      const db = await getRequiredDb();
      const slug = await createUniqueBusinessSlug(input.name);
      let businessId = 0;
      await db.transaction(async tx => {
        const [created] = await tx.insert(businesses).values({
          name: input.name.trim(),
          slug,
          activityType: input.activityType?.trim() ?? null,
          contactEmail: ctx.user.email ?? null,
        });
        businessId = Number(created.insertId);
        await tx.insert(memberships).values({ businessId, userId: ctx.user.id, role: "owner", status: "active" });
        await tx.insert(businessSettings).values({ businessId, orderNotificationEmail: ctx.user.email ?? null });
      });
      await recordAudit(businessId, ctx.user.id, "business.created", "business", businessId);
      return { businessId, slug };
    }),

  updateProfile: protectedProcedure
    .input(
      businessIdSchema.extend({
        name: z.string().min(2).max(160).optional(),
        activityType: z.string().max(96).nullable().optional(),
        description: z.string().max(4000).nullable().optional(),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        logoUrl: z.string().max(2000).nullable().optional(),
        ...contactSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("business.profile", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      const { businessId, ...values } = input;
      await db.update(businesses).set(values).where(eq(businesses.id, businessId));
      await recordAudit(businessId, ctx.user.id, "business.updated", "business", businessId);
      return { success: true };
    }),

  updateOnboarding: protectedProcedure
    .input(
      businessIdSchema.extend({
        step: z.number().int().min(1).max(8),
        description: z.string().max(4000).nullable().optional(),
        activityType: z.string().max(96).nullable().optional(),
        logoUrl: z.string().max(2000).nullable().optional(),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        ...contactSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("business.onboarding", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
      const { businessId, step, ...values } = input;
      await db.update(businesses).set({ ...values, onboardingStep: step }).where(eq(businesses.id, businessId));
      await recordAudit(businessId, ctx.user.id, "business.onboarding_updated", "business", businessId, { step });
      return { success: true };
    }),

  settings: protectedProcedure.input(businessIdSchema).query(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    const settings = await db.select().from(businessSettings).where(eq(businessSettings.businessId, input.businessId)).limit(1);
    if (!settings[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Paramètres introuvables." });
    return settings[0];
  }),

  updateSettings: protectedProcedure
    .input(
      businessIdSchema.extend({
        currency: z.literal("EUR").optional(),
        locale: z.literal("fr-FR").optional(),
        timezone: z.literal("Indian/Reunion").optional(),
        orderNotificationEmail: z.string().email().nullable().optional(),
        legalNoticeUrl: z.string().url().nullable().optional(),
        privacyUrl: z.string().url().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("business.settings", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
      const { businessId, ...values } = input;
      await db.update(businessSettings).set(values).where(eq(businessSettings.businessId, businessId));
      await recordAudit(businessId, ctx.user.id, "business.settings_updated", "business_settings", businessId);
      return { success: true };
    }),

  publish: protectedProcedure.input(businessIdSchema).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("business.publish", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
    const current = await db.select().from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
    if (!current[0]?.description || !current[0].contactEmail) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Ajoutez une description et une adresse e-mail avant publication." });
    }
    await db
      .update(businesses)
      .set({ status: "active", isPublished: true, onboardingCompleted: true, onboardingStep: 8, publishedAt: new Date() })
      .where(eq(businesses.id, input.businessId));
    await recordAudit(input.businessId, ctx.user.id, "business.published", "business", input.businessId);
    return { success: true, slug: current[0].slug };
  }),
});
