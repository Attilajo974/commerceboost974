import type { Request, Response } from "express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import type { SsrPrefetch } from "../../client/src/ssr/prefetch";

export async function buildSsrPrefetch(req: Request, res: Response): Promise<SsrPrefetch> {
  const caller = appRouter.createCaller(await createContext({ req, res } as any));
  return { getShop: slug => caller.publicShop.get({ slug }) };
}
