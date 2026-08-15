import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { renderToString } from "react-dom/server";
import superjson from "superjson";
import { Router } from "wouter";
import { trpc } from "@/lib/trpc";
import App from "./App";
import { prefetchForPath, type HeadMeta, type SsrPrefetch } from "./ssr/prefetch";

export async function render(url: string, prefetch: SsrPrefetch): Promise<{ html: string; state: unknown; head: HeadMeta }> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const i = url.indexOf("?"); const ssrPath = i < 0 ? url : url.slice(0, i); const ssrSearch = i < 0 ? "" : url.slice(i + 1);
  const head = await prefetchForPath(url, client, prefetch);
  const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })] });
  const html = renderToString(<trpc.Provider client={trpcClient} queryClient={client}><QueryClientProvider client={client}><Router ssrPath={ssrPath} ssrSearch={ssrSearch}><App /></Router></QueryClientProvider></trpc.Provider>);
  return { html, state: dehydrate(client), head };
}
