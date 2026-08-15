import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Box, CalendarClock, ChevronDown, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Percent, Settings, Store, Sun, Users } from "lucide-react";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import NotificationBell from "./NotificationBell";

export type Workspace = { id: number; name: string; slug: string; activityType: string | null; onboardingCompleted: boolean; isPublished: boolean };

const navigation = [
  { label: "Vue d’ensemble", path: "/app", icon: LayoutDashboard },
  { label: "Catalogue", path: "/app/catalogue", icon: Box },
  { label: "Commandes", path: "/app/commandes", icon: ClipboardList },
  { label: "Clients", path: "/app/clients", icon: Users },
  { label: "Promotions", path: "/app/promotions", icon: Percent },
  { label: "Automatisations", path: "/app/automatisations", icon: CalendarClock },
  { label: "Paramètres", path: "/app/parametres", icon: Settings },
];

function NavContent({ business, close }: { business: Workspace; close?: () => void }) {
  const [location] = useLocation();
  return <>
    <div className="cb-brand"><span className="cb-brand-mark">C</span><span>CommerceBoost<span className="cb-brand-accent">974</span></span></div>
    <div className="cb-workspace"><span className="cb-workspace-dot" /><div><strong>{business.name}</strong><small>{business.activityType || "Espace professionnel"}</small></div><ChevronDown size={16} /></div>
    <nav className="cb-nav" aria-label="Navigation principale">
      {navigation.map(item => {
        const active = item.path === "/app" ? location === "/app" : location.startsWith(item.path);
        return <Link key={item.path} href={item.path} onClick={close} className={active ? "is-active" : ""}><item.icon size={18} /><span>{item.label}</span></Link>;
      })}
    </nav>
    <div className="cb-sidebar-bottom"><Link href={`/shop/${business.slug}`} className="cb-shop-link"><Store size={16} /> Voir ma boutique</Link></div>
  </>;
}

export default function AppShell({ business, title, children }: { business: Workspace; title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const utils = trpc.useUtils();
  const signOut = async () => { await logout(); await utils.auth.me.invalidate(); };
  return <div className={collapsed ? "cb-app is-collapsed" : "cb-app"}>
    <aside className="cb-sidebar"><NavContent business={business} /><button className="cb-collapse" aria-label="Réduire la barre latérale" onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></aside>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button className="cb-mobile-menu" variant="ghost" size="icon" aria-label="Ouvrir le menu"><Menu size={21} /></Button></SheetTrigger><SheetContent side="left" className="cb-mobile-sheet"><NavContent business={business} close={() => setMobileOpen(false)} /></SheetContent></Sheet>
    <main className="cb-main">
      <header className="cb-topbar"><div><p className="cb-eyebrow">{business.name}</p><h1>{title}</h1></div><div className="cb-top-actions"><NotificationBell businessId={business.id} /><button className="cb-icon-button" aria-label="Changer de thème" onClick={toggleTheme}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><div className="cb-user"><span>{user?.name?.slice(0, 1).toUpperCase() || "U"}</span><button onClick={signOut} title="Se déconnecter"><LogOut size={17} /></button></div></div></header>
      {children}
    </main>
  </div>;
}
