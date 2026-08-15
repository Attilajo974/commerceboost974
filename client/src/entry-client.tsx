import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, CSRF_HEADER_NAME, CSRF_HEADER_VALUE, UNAUTHED_ERR_MSG } from "@shared/const";
import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { hydrateRoot } from "react-dom/client";
import superjson from "superjson";
import { Router } from "wouter";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
const redirect = (error: unknown) => { if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) startLogin(); };
queryClient.getQueryCache().subscribe(event => { if (event.type === "updated" && event.action.type === "error") redirect(event.query.state.error); });
queryClient.getMutationCache().subscribe(event => { if (event.type === "updated" && event.action.type === "error") redirect(event.mutation.state.error); });
const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson, headers() { const csrf = { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE }; try { const raw = sessionStorage.getItem("manus-cookie"); const prefix = `${COOKIE_NAME}=`; const pair = raw?.split(";").find(value => value.trim().startsWith(prefix)); const token = pair?.trim().slice(prefix.length); return token ? { ...csrf, Authorization: `Bearer ${token}` } : csrf; } catch { return csrf; } }, fetch(input, init) { return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" }); } })] });
const raw = (window as Window & { __RQ_STATE__?: unknown }).__RQ_STATE__;
const state = raw ? superjson.deserialize(raw as Parameters<typeof superjson.deserialize>[0]) as DehydratedState : undefined;
hydrateRoot(document.getElementById("root")!, <trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><HydrationBoundary state={state}><Router><App /></Router></HydrationBoundary></QueryClientProvider></trpc.Provider>);
