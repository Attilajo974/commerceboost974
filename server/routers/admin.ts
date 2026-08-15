import { count, desc, eq } from "drizzle-orm";
import { businesses, memberships, orders, users } from "../../drizzle/schema";
import { getRequiredDb } from "../domain/tenant";
import { adminProcedure, router } from "../_core/trpc";

export const adminRouter = router({
  overview: adminProcedure.query(async () => {
    const db = await getRequiredDb();
    const [businessCount] = await db.select({ value: count() }).from(businesses);
    const [userCount] = await db.select({ value: count() }).from(users);
    const [orderCount] = await db.select({ value: count() }).from(orders);
    const newestBusinesses = await db.select({ id: businesses.id, name: businesses.name, slug: businesses.slug, status: businesses.status, createdAt: businesses.createdAt, ownerCount: count(memberships.id) }).from(businesses).leftJoin(memberships, eq(memberships.businessId, businesses.id)).groupBy(businesses.id, businesses.name, businesses.slug, businesses.status, businesses.createdAt).orderBy(desc(businesses.createdAt)).limit(10);
    return { businessCount: businessCount?.value ?? 0, userCount: userCount?.value ?? 0, orderCount: orderCount?.value ?? 0, newestBusinesses };
  }),
});
