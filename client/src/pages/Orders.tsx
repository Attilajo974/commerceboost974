import AppShell, { Workspace } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, orderStatusLabel, shortDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ClipboardList, PackageCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrderDetails } from "@/components/CommerceDetails";

const statuses = ["new", "confirmed", "preparing", "ready", "completed", "cancelled"] as const;

export default function Orders({ business }: { business: Workspace }) {
  const [filter, setFilter] = useState<"all" | (typeof statuses)[number]>("all"); const { data, isLoading, error } = trpc.order.list.useQuery({ businessId: business.id, status: filter === "all" ? undefined : filter }); const utils = trpc.useUtils();
  const update = trpc.order.updateStatus.useMutation({ onSuccess: () => { utils.order.list.invalidate(); toast.success("Statut mis à jour."); } });
  return <AppShell business={business} title="Commandes"><div className="cb-page"><section className="cb-page-intro"><div><p className="cb-eyebrow">Flux de vente</p><h2>Commandes clients</h2><p>Suivez chaque demande, de la confirmation à la remise.</p></div><Select value={filter} onValueChange={value => setFilter(value as typeof filter)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem>{statuses.map(status => <SelectItem key={status} value={status}>{orderStatusLabel[status]}</SelectItem>)}</SelectContent></Select></section>{isLoading ? <div className="cb-table-skeleton" /> : error ? <section className="cb-empty"><span><ClipboardList size={25} /></span><h3>Les commandes sont indisponibles.</h3><p>Réessayez dans quelques instants.</p><Button variant="outline" onClick={() => utils.order.list.invalidate()}>Réessayer</Button></section> : data?.length ? <div className="cb-table-wrap"><table className="cb-table"><thead><tr><th>Commande</th><th>Client</th><th>Date</th><th>Statut</th><th>Total</th><th /></tr></thead><tbody>{data.map(({ order, customer }) => <tr key={order.id}><td><strong>{order.orderNumber}</strong><small>#{order.id}</small></td><td><strong>{customer.firstName} {customer.lastName}</strong><small>{customer.email}</small></td><td>{shortDate(order.createdAt)}</td><td><span className={`cb-order-status is-${order.status}`}>{orderStatusLabel[order.status]}</span></td><td><b>{money(order.totalCents)}</b></td><td><div className="cb-header-actions"><OrderDetails businessId={business.id} orderId={order.id} /><OrderAction current={order.status} disabled={update.isPending} onNext={status => update.mutate({ businessId: business.id, id: order.id, status })} /></div></td></tr>)}</tbody></table></div> : <section className="cb-empty"><span><ClipboardList size={25} /></span><h3>Aucune commande pour le moment.</h3><p>Partagez votre boutique pour commencer à recevoir des demandes.</p></section>}</div></AppShell>;
}

function OrderAction({ current, disabled, onNext }: { current: string; disabled: boolean; onNext: (status: "confirmed" | "preparing" | "ready" | "completed" | "cancelled") => void }) { const next: Record<string, ["confirmed" | "preparing" | "ready" | "completed" | "cancelled", string] | undefined> = { new: ["confirmed", "Confirmer"], confirmed: ["preparing", "Préparer"], preparing: ["ready", "Prête"], ready: ["completed", "Terminer"] }; const action = next[current]; return action ? <Button variant="outline" size="sm" disabled={disabled} onClick={() => onNext(action[0])}><PackageCheck size={14} /> {action[1]}</Button> : null; }
