import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const steps = ["Votre activité", "Présentation", "Coordonnées", "Identité", "Premier produit", "Style", "Vérification", "Publication"];

export default function Onboarding({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", activityType: "", description: "", contactEmail: "", contactPhone: "", accentColor: "#0F766E", productName: "", productPrice: "" });
  const [firstProductId, setFirstProductId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const createBusiness = trpc.business.create.useMutation({ onSuccess: ({ businessId: id }) => { setBusinessId(id); setStep(2); utils.business.mine.invalidate(); } });
  const update = trpc.business.updateOnboarding.useMutation();
  const createProduct = trpc.product.create.useMutation({ onSuccess: ({ id }) => { setFirstProductId(id); utils.product.list.invalidate(); } });
  const publish = trpc.business.publish.useMutation({ onSuccess: () => { toast.success("Votre boutique est en ligne."); onCreated(); } });
  const saveStep = async () => {
    if (!businessId) return;
    if (step === 5 && !firstProductId) {
      const priceCents = Math.round(Number(form.productPrice.replace(",", ".")) * 100);
      if (!form.productName.trim() || !Number.isFinite(priceCents) || priceCents < 0) {
        toast.error("Ajoutez le nom et le prix de votre premier produit.");
        return;
      }
      await createProduct.mutateAsync({ businessId, name: form.productName, priceCents, status: "active" });
    }
    await update.mutateAsync({ businessId, step, description: form.description || null, activityType: form.activityType || null, contactEmail: form.contactEmail || null, contactPhone: form.contactPhone || null, accentColor: form.accentColor });
    setStep(current => Math.min(8, current + 1));
  };
  const submitFirst = async (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return toast.error("Indiquez le nom de votre entreprise."); await createBusiness.mutateAsync({ name: form.name, activityType: form.activityType || undefined }); };
  const busy = createBusiness.isPending || update.isPending || createProduct.isPending || publish.isPending;
  return <main className="cb-onboarding"><section className="cb-onboarding-card"><div className="cb-onboarding-aside"><div className="cb-brand"><span className="cb-brand-mark">C</span>CommerceBoost<span className="cb-brand-accent">974</span></div><div><p className="cb-eyebrow">Configuration guidée</p><h1>Votre présence en ligne, étape par étape.</h1><p>Quelques informations suffisent pour ouvrir votre espace professionnel.</p></div><ol>{steps.map((label, index) => <li key={label} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-done" : ""}><span>{index + 1 < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol></div><div className="cb-onboarding-form"><div className="cb-progress"><span>Étape {step} sur 8</span><div><i style={{ width: `${step * 12.5}%` }} /></div></div>{step === 1 ? <form onSubmit={submitFirst} className="cb-form"><div><p className="cb-eyebrow">Commençons simplement</p><h2>Comment s’appelle votre activité ?</h2></div><div><Label htmlFor="name">Nom de l’entreprise</Label><Input id="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex. Atelier Péi" autoFocus /></div><div><Label htmlFor="activity">Type d’activité</Label><Input id="activity" value={form.activityType} onChange={event => setForm({ ...form, activityType: event.target.value })} placeholder="Artisan, restauration, service…" /></div><Button disabled={busy} type="submit">Créer mon espace <ChevronRight size={17} /></Button></form> : <div className="cb-form">{step === 2 && <><div><p className="cb-eyebrow">Votre savoir-faire</p><h2>Présentez votre activité.</h2></div><div><Label htmlFor="description">Une courte description</Label><Textarea id="description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Décrivez en quelques mots ce que vous proposez." rows={5} /></div></>}{step === 3 && <><div><p className="cb-eyebrow">Pour être contacté</p><h2>Vos coordonnées.</h2></div><div><Label htmlFor="email">E-mail professionnel</Label><Input id="email" type="email" value={form.contactEmail} onChange={event => setForm({ ...form, contactEmail: event.target.value })} placeholder="bonjour@votre-activite.re" /></div><div><Label htmlFor="phone">Téléphone</Label><Input id="phone" value={form.contactPhone} onChange={event => setForm({ ...form, contactPhone: event.target.value })} placeholder="0262…" /></div></>}{step === 4 && <><div><p className="cb-eyebrow">Votre identité</p><h2>Choisissez une couleur d’accent.</h2></div><div className="cb-color-row"><input aria-label="Couleur d’accent" type="color" value={form.accentColor} onChange={event => setForm({ ...form, accentColor: event.target.value })} /><Input value={form.accentColor} onChange={event => setForm({ ...form, accentColor: event.target.value })} /></div></>}{step === 5 && <><Sparkles className="cb-step-icon" /><div><p className="cb-eyebrow">Catalogue</p><h2>Ajoutez votre premier produit.</h2></div><div><Label htmlFor="first-product">Nom du produit ou service</Label><Input id="first-product" value={form.productName} onChange={event => setForm({ ...form, productName: event.target.value })} placeholder="Ex. Coffret découverte" /></div><div><Label htmlFor="first-product-price">Prix TTC</Label><Input id="first-product-price" value={form.productPrice} onChange={event => setForm({ ...form, productPrice: event.target.value })} inputMode="decimal" placeholder="24,90" /></div></>}{step === 6 && <><div><p className="cb-eyebrow">Personnalisation</p><h2>Une vitrine sobre et professionnelle.</h2></div><p>Votre boutique reprendra votre identité, votre présentation et vos produits. Les réglages avancés restent disponibles dans les paramètres.</p></>}{step === 7 && <><div><p className="cb-eyebrow">Tout est prêt</p><h2>Vérifiez avant de publier.</h2></div><p>Votre description et vos coordonnées seront visibles sur votre boutique. Vous pourrez revenir les modifier après publication.</p></>}{step === 8 && <><div><p className="cb-eyebrow">Dernière étape</p><h2>Publiez votre boutique.</h2></div><p>Votre adresse publique sera disponible immédiatement. Vous pourrez ensuite enrichir votre catalogue et recevoir vos premières commandes.</p></>}<div className="cb-form-actions"><Button variant="ghost" disabled={busy || step <= 2} onClick={() => setStep(current => current - 1)}><ChevronLeft size={17} /> Retour</Button>{step < 8 ? <Button disabled={busy} onClick={saveStep}>Continuer <ChevronRight size={17} /></Button> : <Button disabled={busy} onClick={() => businessId && publish.mutate({ businessId })}>Publier ma boutique <Check size={17} /></Button>}</div></div>}</div></section></main>;
}
