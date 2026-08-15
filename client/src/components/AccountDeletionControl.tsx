import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AccountDeletionControl() {
  const deletion = trpc.privacy.deleteMyAccount.useMutation({ onSuccess: () => { toast.success("Votre compte a été supprimé."); window.setTimeout(() => window.location.assign("/"), 700); }, onError: error => toast.error(error.message) });
  const remove = () => { const confirmation = window.prompt("Cette action est définitive. Saisissez SUPPRIMER MON COMPTE pour confirmer."); if (confirmation === "SUPPRIMER MON COMPTE") deletion.mutate({ confirmation }); else if (confirmation !== null) toast.error("La phrase de confirmation est incorrecte."); };
  return <div className="mt-8 border-t border-emerald-950/10 pt-5"><p className="text-xs text-slate-500">Vous ne souhaitez pas créer d’espace ? Vous pouvez supprimer votre compte si aucun espace professionnel n’y est associé.</p><Button type="button" variant="ghost" className="mt-2 text-red-700 hover:text-red-800" onClick={remove} disabled={deletion.isPending}><Trash2 size={15} /> Supprimer mon compte</Button></div>;
}
