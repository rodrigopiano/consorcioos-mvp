"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Kanban, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { getLeads } from "@/lib/db";
import { Lead, FunnelStage, STAGE_LABELS, INTEREST_LABELS } from "@/lib/types";
import { FUNNEL_ORDER, getLeadUrgency, formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const stageColors: Record<FunnelStage, string> = {
  prospeccao: "border-t-slate-400",
  contato_ativo: "border-t-blue-400",
  qualificacao: "border-t-violet-400",
  reuniao_agendada: "border-t-yellow-400",
  reuniao_realizada: "border-t-orange-400",
  proposta_enviada: "border-t-pink-400",
  followup: "border-t-red-400",
  venda: "border-t-green-400",
};

const stageDotColors: Record<FunnelStage, string> = {
  prospeccao: "bg-slate-400",
  contato_ativo: "bg-blue-400",
  qualificacao: "bg-violet-400",
  reuniao_agendada: "bg-yellow-400",
  reuniao_realizada: "bg-orange-400",
  proposta_enviada: "bg-pink-400",
  followup: "bg-red-400",
  venda: "bg-green-400",
};

export default function FunilPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeads().then(data => { setLeads(data); setLoading(false); });
  }, []);

  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);
  const salesValue = leads.filter(l => l.stage === "venda").reduce((s, l) => s + (l.value ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Carregando funil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Kanban className="w-6 h-6 text-sky-400" />Funil Comercial
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {leads.length} leads · Pipeline: {formatCurrency(totalValue)} · Vendido: {formatCurrency(salesValue)}
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-[#1e293b] border border-dashed border-[#334155] rounded-xl p-12 text-center">
          <Kanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Nenhum lead no funil</p>
          <p className="text-slate-400 text-sm mb-4">Cadastre leads para visualizar o funil.</p>
          <Link href="/leads/novo" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Cadastrar lead
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {FUNNEL_ORDER.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage);
                const stageValue = stageLeads.reduce((s, l) => s + (l.value ?? 0), 0);
                return <KanbanColumn key={stage} stage={stage} leads={stageLeads} value={stageValue} />;
              })}
            </div>
          </div>

          <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">Funil de Conversão</h2>
            </div>
            <div className="space-y-2">
              {FUNNEL_ORDER.map(stage => {
                const count = leads.filter(l => l.stage === stage).length;
                const width = leads.length > 0 ? Math.max((count / leads.length) * 100, count > 0 ? 5 : 0) : 0;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-slate-400 text-right">{STAGE_LABELS[stage]}</div>
                    <div className="flex-1 h-6 bg-[#334155] rounded overflow-hidden">
                      {count > 0 && (
                        <div className={cn("h-full rounded flex items-center px-2", stageDotColors[stage])}
                          style={{ width: `${width}%`, opacity: 0.8 }}>
                          <span className="text-xs font-bold text-white">{count}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-8 text-xs text-slate-400 text-right">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KanbanColumn({ stage, leads, value }: { stage: FunnelStage; leads: Lead[]; value: number }) {
  return (
    <div className={cn("w-52 bg-[#1e293b] rounded-xl border border-[#334155] border-t-4 flex-shrink-0", stageColors[stage])}>
      <div className="p-3 border-b border-[#334155]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">{STAGE_LABELS[stage]}</span>
          <span className="text-xs bg-[#334155] text-slate-300 px-1.5 py-0.5 rounded-full font-medium">{leads.length}</span>
        </div>
        {value > 0 && <div className="text-xs text-slate-400 mt-0.5">{formatCurrency(value)}</div>}
      </div>
      <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
        {leads.length === 0 && <div className="text-center py-6 text-xs text-slate-600">Vazio</div>}
        {leads.map(lead => {
          const urgency = getLeadUrgency(lead);
          return (
            <Link key={lead.id} href={`/leads/${lead.id}`}
              className={cn("block bg-[#273549] rounded-lg p-2.5 hover:bg-[#2d3e54] transition-colors border",
                urgency === "overdue" ? "border-orange-500/40" : urgency === "lost" ? "border-red-800/40" : "border-transparent")}>
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-medium text-white leading-tight">{lead.name}</span>
                {urgency === "overdue" && <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />}
              </div>
              <div className="text-xs text-slate-500 mt-1">{INTEREST_LABELS[lead.interest]}</div>
              {lead.nextAction && (
                <div className="text-xs text-slate-400 mt-1.5 leading-tight line-clamp-2">{lead.nextAction.description}</div>
              )}
              {lead.nextAction && (
                <div className={cn("text-xs mt-1.5 font-medium", urgency === "overdue" ? "text-orange-400" : "text-slate-500")}>
                  {formatDate(lead.nextAction.dueDate)}
                </div>
              )}
              {!lead.nextAction && stage !== "venda" && (
                <div className="text-xs text-red-400 mt-1.5">⚠ Sem próxima ação</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
