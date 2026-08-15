import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { notifications } from "../../drizzle/schema";
import { requireBusinessAccess } from "../domain/tenant";
import { protectedProcedure, router } from "../_core/trpc";

const scope = z.object({ businessId: z.number().int().positive() });

export const notificationRouter = router({
  list: protectedProcedure.input(scope).query(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    return db.select().from(notifications).where(and(eq(notifications.businessId, input.businessId), eq(notifications.recipientUserId, ctx.user.id))).orderBy(desc(notifications.createdAt)).limit(20);
  }),
  markRead: protectedProcedure.input(scope.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.businessId, input.businessId), eq(notifications.recipientUserId, ctx.user.id)));
    return { success: true };
  }),
});
