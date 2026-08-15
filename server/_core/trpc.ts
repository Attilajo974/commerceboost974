import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { isCsrfRequestValid } from "./httpSecurity";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requireCsrfForMutation = t.middleware(async opts => {
  if (opts.type === "mutation" && !isCsrfRequestValid(opts.ctx.req)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "La requête de sécurité est invalide." });
  }
  return opts.next();
});

export const protectedProcedure = t.procedure.use(requireUser).use(requireCsrfForMutation);
export const csrfProtectedProcedure = t.procedure.use(requireCsrfForMutation);

const requireAdmin = t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
});

export const adminProcedure = t.procedure.use(requireAdmin).use(requireCsrfForMutation);
