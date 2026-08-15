import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FolderPlus, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type Category = { id: number; name: string };
type EditableProduct = { id: number; name: string; priceCents: number; description: string | null; categoryId: number | null; status: "draft" | "active" | "archived" };

export function CategoriesManager({ businessId, categories }: { businessId: number; categories: Category[] }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const utils = trpc.useUtils();
  const create = trpc.category.create.useMutation({ onSuccess: () => { utils.category.list.invalidate({ businessId }); setName(""); toast.success("Catégorie créée."); } });
  const remove = trpc.category.remove.useMutation({ onSuccess: () => { utils.category.list.invalidate({ businessId }); utils.product.list.invalidate(); toast.success("Catégorie supprimée."); } });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; create.mutate({ businessId, name }); };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><FolderPlus size={16} /> Catégories</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Catégories du catalogue</DialogTitle></DialogHeader><form className="cb-inline-form" onSubmit={submit}><Input value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Nouveautés" /><Button type="submit" size="icon" aria-label="Ajouter" disabled={create.isPending}><Plus size={17} /></Button></form><div className="cb-category-manager">{categories.length ? categories.map(category => <div key={category.id}><span>{category.name}</span><button aria-label={`Supprimer ${category.name}`} onClick={() => remove.mutate({ businessId, id: category.id })}><Trash2 size={15} /></button></div>) : <p>Aucune catégorie. Ajoutez-en une pour organiser votre offre.</p>}</div></DialogContent></Dialog>;
}

export function ProductEditor({ businessId, product, categories }: { businessId: number; product: EditableProduct; categories: Category[] }) {
  const [open, setOpen] = useState(false); const [form, setForm] = useState({ name: product.name, price: String(product.priceCents / 100).replace(".", ","), description: product.description || "", categoryId: product.categoryId ? String(product.categoryId) : "none", status: product.status }); const utils = trpc.useUtils();
  useEffect(() => { if (open) setForm({ name: product.name, price: String(product.priceCents / 100).replace(".", ","), description: product.description || "", categoryId: product.categoryId ? String(product.categoryId) : "none", status: product.status }); }, [open, product]);
  const update = trpc.product.update.useMutation({ onSuccess: () => { utils.product.list.invalidate(); toast.success("Produit modifié."); setOpen(false); } }); const improve = trpc.ai.improveProduct.useMutation({ onSuccess: result => { setForm(current => ({ ...current, description: result.text })); toast.success("Proposition ajoutée à la description."); } });
  const submit = (event: FormEvent) => { event.preventDefault(); const cents = Math.round(Number(form.price.replace(",", ".")) * 100); if (!form.name.trim() || !Number.isFinite(cents) || cents < 0) return toast.error("Indiquez un nom et un prix valides."); update.mutate({ businessId, id: product.id, name: form.name, priceCents: cents, description: form.description || null, categoryId: form.categoryId === "none" ? null : Number(form.categoryId), status: form.status }); };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="sm"><Pencil size={15} /> Modifier</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Modifier le produit</DialogTitle></DialogHeader><form className="cb-form compact" onSubmit={submit}><div><Label htmlFor={`product-name-${product.id}`}>Nom</Label><Input id={`product-name-${product.id}`} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div><div className="cb-form-row"><div><Label htmlFor={`product-price-${product.id}`}>Prix TTC</Label><Input id={`product-price-${product.id}`} inputMode="decimal" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /></div><div><Label>Catégorie</Label><Select value={form.categoryId} onValueChange={value => setForm({ ...form, categoryId: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sans catégorie</SelectItem>{categories.map(category => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select></div></div><div><div className="cb-label-with-action"><Label>Description</Label><Button type="button" variant="ghost" size="sm" onClick={() => improve.mutate({ businessId, productId: product.id, intent: "description" })} disabled={improve.isPending}><Sparkles size={14} /> {improve.isPending ? "Amélioration…" : "Améliorer avec l’IA"}</Button></div><Textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></div><Button type="submit" disabled={update.isPending}>Enregistrer</Button></form></DialogContent></Dialog>;
}
