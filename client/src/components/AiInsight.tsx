import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bot, Sparkles } from "lucide-react";
import { useState } from "react";

export default function AiInsight({ businessId }: { businessId: number }) {
  const [text, setText] = useState<string | null>(null);
  const insight = trpc.ai.weeklyInsight.useMutation({ onSuccess: result => setText(result.text) });
  return <article className="cb-panel cb-ai-panel"><header><div><p className="cb-eyebrow"><Sparkles size={12} /> Assistant CommerceBoost</p><h3>Votre point d’attention</h3></div><Bot size={19} /></header>{text ? <div className="cb-ai-response">{text.split("\n").filter(Boolean).map((line, index) => <p key={index}>{line.replace(/^[•\-\d.\s]+/, "")}</p>)}</div> : <p className="cb-ai-placeholder">Analysez vos commandes récentes pour faire émerger une action concrète, sans données inventées.</p>}<Button variant="outline" size="sm" onClick={() => insight.mutate({ businessId })} disabled={insight.isPending}>{insight.isPending ? "Analyse en cours…" : text ? "Actualiser l’analyse" : "Faire le point sur la semaine"}</Button></article>;
}
