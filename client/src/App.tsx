import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Route, Switch, useLocation, useRoute } from "wouter";
import AppShell, { Workspace } from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { lazy, Suspense } from "react";

const Home = lazy(() => import("./pages/Home"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Catalogue = lazy(() => import("./pages/Catalogue"));
const Orders = lazy(() => import("./pages/Orders"));
const Customers = lazy(() => import("./pages/Customers"));
const Promotions = lazy(() => import("./pages/Promotions"));
const Automations = lazy(() => import("./pages/Automations"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicShop = lazy(() => import("./pages/PublicShop"));
const Admin = lazy(() => import("./pages/Admin"));

function Portal() {
  const { user, loading } = useAuth(); const { data, isLoading, refetch } = trpc.business.mine.useQuery(undefined, { enabled: Boolean(user) }); const [location] = useLocation();
  if (loading || (user && isLoading)) return <div className="cb-screen-loader"><Loader2 className="animate-spin" /> Chargement de votre espace…</div>;
  if (!user) return <main className="cb-login-gate"><div><span className="cb-brand-mark">C</span><h1>Votre espace professionnel vous attend.</h1><p>Connectez-vous pour créer ou gérer votre activité.</p><Button onClick={startLogin}>Se connecter</Button></div></main>;
  const entry = data?.[0]; if (!entry) return <Onboarding onCreated={() => refetch()} />;
  const business = entry.business as Workspace;
  if (!business.onboardingCompleted) return <Onboarding onCreated={() => refetch()} />;
  if (location === "/app" || location === "/app/") return <Dashboard business={business} />;
  if (location.startsWith("/app/catalogue")) return <Catalogue business={business} />;
  if (location.startsWith("/app/commandes")) return <Orders business={business} />;
  if (location.startsWith("/app/clients")) return <Customers business={business} />;
  if (location.startsWith("/app/promotions")) return <Promotions business={business} />;
  if (location.startsWith("/app/automatisations")) return <Automations business={business} />;
  if (location.startsWith("/app/parametres")) return <Settings business={business} />;
  return <AppShell business={business} title="Espace professionnel"><div className="cb-empty"><h3>Cette page n’existe pas.</h3></div></AppShell>;
}

function ShopRoute() { const [, params] = useRoute("/shop/:slug"); return params?.slug ? <PublicShop slug={params.slug} /> : <NotFound />; }

function AdminRoute() { const { user, loading } = useAuth(); if (loading) return <div className="cb-screen-loader">Chargement…</div>; return user?.role === "admin" ? <Admin /> : <NotFound />; }
function Router() { return <Suspense fallback={<div className="cb-screen-loader"><Loader2 className="animate-spin" /> Chargement…</div>}><Switch><Route path="/" component={Home} /><Route path="/app" component={Portal} /><Route path="/app/:section" component={Portal} /><Route path="/admin" component={AdminRoute} /><Route path="/shop/:slug" component={ShopRoute} /><Route component={NotFound} /></Switch></Suspense>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
