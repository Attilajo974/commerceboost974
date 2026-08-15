import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyticsRouter } from "./routers/analytics";
import { aiRouter } from "./routers/ai";
import { adminRouter } from "./routers/admin";
import { automationRouter } from "./routers/automation";
import { notificationRouter } from "./routers/notifications";
import { businessRouter } from "./routers/business";
import { categoryRouter, productRouter, promotionRouter } from "./routers/catalog";
import { checkoutRouter, customerRouter, orderRouter } from "./routers/commerce";
import { publicShopRouter } from "./routers/public";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  business: businessRouter,
  category: categoryRouter,
  product: productRouter,
  promotion: promotionRouter,
  customer: customerRouter,
  order: orderRouter,
  checkout: checkoutRouter,
  analytics: analyticsRouter,
  ai: aiRouter,
  admin: adminRouter,
  automation: automationRouter,
  notification: notificationRouter,
  publicShop: publicShopRouter,
});

export type AppRouter = typeof appRouter;
