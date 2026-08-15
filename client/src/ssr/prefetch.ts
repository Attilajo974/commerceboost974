import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { TRPCError } from "@trpc/server";
import { trpc } from "@/lib/trpc";

export type HeadMeta = { title: string; description: string; canonicalPath?: string; noindex?: boolean; notFound?: boolean; ogType?: "website" | "product" };
export type SsrPrefetch = { getShop: (slug: string) => Promise<any> };
export const SITE_NAME = "CommerceBoost974";
export const DEFAULT_DESCRIPTION = "Vitrine, catalogue, commandes et pilotage pour les artisans, commerçants et TPE de La Réunion.";

export async function prefetchForPath(url: string, queryClient: QueryClient, prefetch: SsrPrefetch): Promise<HeadMeta> {
  const path = (url.split("?")[0].replace(/\/+$/, "") || "/");
  if (path === "/") return { title: `${SITE_NAME} | Le copilote numérique des professionnels réunionnais`, description: DEFAULT_DESCRIPTION, canonicalPath: "/" };
  const match = path.match(/^\/shop\/([^/]+)$/);
  if (match) {
    try {
      const slug = match[1]; const shop = await prefetch.getShop(slug);
      queryClient.setQueryData(getQueryKey(trpc.publicShop.get, { slug }, "query"), shop);
      return { title: `${shop.business.name} | Boutique locale`, description: shop.business.description || `Découvrez la boutique de ${shop.business.name}.`, canonicalPath: path, ogType: "product" };
    } catch (error) { if (error instanceof TRPCError && error.code === "NOT_FOUND") return { title: SITE_NAME, description: DEFAULT_DESCRIPTION, notFound: true }; throw error; }
  }
  if (path === "/confidentialite") return { title: `Confidentialité | ${SITE_NAME}`, description: "Politique de confidentialité de CommerceBoost974.", canonicalPath: path };
  if (path === "/mentions-legales") return { title: `Mentions légales | ${SITE_NAME}`, description: "Mentions légales de CommerceBoost974.", canonicalPath: path };
  if (path === "/app" || path.startsWith("/app/") || path === "/admin") return { title: SITE_NAME, description: DEFAULT_DESCRIPTION, noindex: true };
  return { title: SITE_NAME, description: DEFAULT_DESCRIPTION, notFound: true };
}
