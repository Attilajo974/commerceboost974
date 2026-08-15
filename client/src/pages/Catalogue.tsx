import { CategoriesManager, ProductEditor } from "@/components/CatalogueEditors";
import AppShell, { Workspace } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Archive, Box, Plus, Search, Tags, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

export default function Catalogue({ business }: { business: Workspace }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "draft" | "archived">("all");
  const [sort, setSort] = useState<"recent" | "name" | "price_asc" | "price_desc">("recent");
  const [dialog, setDialog] = useState(false);
  const params = useMemo(() => ({ businessId: business.id, query: query || undefined, status: status === "all" ? undefined : status, sort }), [business.id, query, status, sort]);
  const { data: rows, isLoading, error } = trpc.product.list.useQuery(params);
  const { data: categories = [] } = trpc.category.list.useQuery({ businessId: business.id });
  const utils = trpc.useUtils();
  const archive = trpc.product.archive.useMutation({ onSuccess: () => { utils.product.list.invalidate(); toast.success("Produit archivé."); } });
  const remove = trpc.product.remove.useMutation({ onSuccess: () => { utils.product.list.invalidate(); toast.success("Produit supprimé."); } });

  return <AppShell business={business} title="Catalogue"><div className="cb-page">
    <section className="cb-page-intro"><div><p className="cb-eyebrow">Votre offre</p><h2>Produits et services</h2><p>Gérez ce que vos clients voient et commandent.</p></div><div className="cb-header-actions"><CategoriesManager businessId={business.id} categories={categories} /><ProductDialog business={business} categories={categories} open={dialog} onOpenChange={setDialog} /></div></section>
    <div className="cb-toolbar"><div className="cb-search"><Search size={17} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit" /></div><div className="cb-header-actions"><Select value={status} onValueChange={value => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="active">Actifs</SelectItem><SelectItem value="draft">Brouillons</SelectItem><SelectItem value="archived">Archivés</SelectItem></SelectContent></Select><Select value={sort} onValueChange={value => setSort(value as typeof sort)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">Plus récent</SelectItem><SelectItem value="name">Nom</SelectItem><SelectItem value="price_asc">Prix croissant</SelectItem><SelectItem value="price_desc">Prix décroissant</SelectItem></SelectContent></Select></div></div>
    {isLoading ? <div className="cb-products-grid cb-loading-grid">{[1, 2, 3].map(item => <div key={item} />)}</div> : error ? <section className="cb-empty"><span><Tags size={25} /></span><h3>Le catalogue est indisponible.</h3><p>Réessayez dans quelques instants.</p><Button variant="outline" onClick={() => utils.product.list.invalidate(params)}>Réessayer</Button></section> : rows?.length ? <div className="cb-products-grid">{rows.map(({ product, category }) => <article key={product.id} className="cb-product-card"><div className="cb-product-art"><Box size={28} /><span className={product.isAvailable ? "is-available" : ""}>{product.isAvailable ? "Disponible" : "Indisponible"}</span></div><div className="cb-product-info"><div><p>{category?.name || "Sans catégorie"}</p><h3>{product.name}</h3></div><strong>{money(product.priceCents)}</strong><small>{product.status === "active" ? "Publié" : product.status === "draft" ? "Brouillon" : "Archivé"}</small></div><div className="cb-product-actions"><ProductEditor businessId={business.id} product={product} categories={categories} /><Button variant="ghost" size="sm" onClick={() => archive.mutate({ businessId: business.id, id: product.id })} disabled={product.status === "archived"}><Archive size={15} /> Archiver</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (window.confirm(`Supprimer « ${product.name} » ?`)) remove.mutate({ businessId: business.id, id: product.id }); }}><Trash2 size={15} /></Button></div></article>)}</div> : <EmptyCatalogue onAdd={() => setDialog(true)} />}
  </div></AppShell>;
}

function ProductDialog({ business, categories, open, onOpenChange }: { business: Workspace; categories: { id: number; name: string }[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState({ name: "", price: "", description: "", categoryId: "none", status: "active" }); const utils = trpc.useUtils();
  const create = trpc.product.create.useMutation({ onSuccess: () => { utils.product.list.invalidate(); toast.success("Produit ajouté au catalogue."); onOpenChange(false); setForm({ name: "", price: "", description: "", categoryId: "none", status: "active" }); } });
  const submit = (event: FormEvent) => { event.preventDefault(); const cents = Math.round(Number(form.price.replace(",", ".")) * 100); if (!form.name || !Number.isFinite(cents) || cents < 0) return toast.error("Indiquez un nom et un prix valides."); create.mutate({ businessId: business.id, name: form.name, description: form.description || null, priceCents: cents, categoryId: form.categoryId === "none" ? null : Number(form.categoryId), status: form.status as "active" | "draft" }); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button><Plus size={17} /> Ajouter un produit</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Ajouter au catalogue</DialogTitle></DialogHeader><form className="cb-form compact" onSubmit={submit}><div><Label htmlFor="product-name">Nom</Label><Input id="product-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex. Coffret découverte" /></div><div className="cb-form-row"><div><Label htmlFor="price">Prix TTC</Label><Input id="price" inputMode="decimal" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="24,90" /></div><div><Label>Catégorie</Label><Select value={form.categoryId} onValueChange={value => setForm({ ...form, categoryId: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sans catégorie</SelectItem>{categories.map(category => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select></div></div><div><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Ce qui rend votre produit unique…" /></div><Button type="submit" disabled={create.isPending}>Ajouter au catalogue</Button></form></DialogContent></Dialog>;
}

function EmptyCatalogue({ onAdd }: { onAdd: () => void }) { return <section className="cb-empty"><span><Tags size={25} /></span><h3>Votre catalogue est vide.</h3><p>Ajoutez votre premier produit pour commencer à présenter votre offre et recevoir des commandes.</p><Button onClick={onAdd}><Plus size={17} /> Ajouter mon premier produit</Button></section>; }
