import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PrivacyControls({ businessId, businessName }: { businessId: number; businessName: string }) {
  const utils = trpc.useUtils(); const exported = trpc.privacy.exportWorkspace.useQuery({ businessId }, { enabled: false });
  const remove = trpc.privacy.deleteWorkspace.useMutation({ onSuccess: () => { toast.success("Espace supprimé. Votre session va être actualisée."); utils.business.mine.invalidate(); window.location.assign("/app"); }, onError: error => toast.error(error.message) });
  const download = async () => { const result = await exported.refetch(); if (!result.data) return toast.error("L’export est indisponible."); const file = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = `commerceboost974-${businessName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-export.json`; link.click(); URL.revokeObjectURL(url); toast.success("Export téléchargé."); };
  const confirmDeletion = () => { const confirmation = window.prompt(`Pour supprimer définitivement « ${businessName} », saisissez exactement son nom.`); if (confirmation === null) return; remove.mutate({ businessId, confirmation }); };
  return <section className="cb-panel"><header><div><p className="cb-eyebrow">Données et confidentialité</p><h3>Vos droits RGPD</h3></div><ShieldAlert size={20} /></header><p>Exportez les données de votre espace ou supprimez définitivement l’entreprise et les données tenantées associées. La suppression est irréversible.</p><div className="cb-toolbar"><Button type="button" variant="outline" onClick={download} disabled={exported.isFetching}><Download size={16} /> {exported.isFetching ? "Préparation…" : "Exporter mes données"}</Button><Button type="button" variant="destructive" onClick={confirmDeletion} disabled={remove.isPending}><Trash2 size={16} /> Supprimer cet espace</Button></div></section>;
}
