"use client";
import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, DollarSign, Users, Target, Loader2 } from "lucide-react";
import { getLeads } from "@/lib/db";
import { Lead, STAGE_LABELS } from "@/lib/types";
import { FUNNEL_ORDER, formatCurrency, isOverdue } from "@/lib/utils";
import { STAGE_PROBABILITY } from "@/lib/priority";
import { cn } from "@/lib/utils";

const barColors: Record<string, string> = {
  prospeccao: "bg-slate-400", contato_ativo: "bg-blue-400", qualificacao: "bg-violet-400",
  reuniao_agendada: "bg-yellow-400", reuniao_realizada: "bg-orange-400",
  proposta_enviada: "bg-pink-400", followup: "bg-red-400", venda: "bg-green-400",
};

function pct(a: number, b: number) {
  if (b === 0) return "0%";
  return Math.round((a / b) * 100) + "%";
}

export default function MetricasPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeads().then(data => { setLeads(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  const active = leads.filter(l => l.stage !== "venda");
  const vendas = leads.filter(l => l.stage === "venda");
  const reunioesFeitas = leads.filter(l => l.stage === "reuniao_realizada" || l.stage === "proposta_enviada" || l.stage === "followup" || l.stage === "venda").length;
  const reunioesAgendadas = leads.filter(l => l.stage === "reuniao_agendada").length;
  const propostas = leads.filter(l => l.stage === "proposta_enviada").length;
  const followups = leads.filter(l => l.nextAction && isOverdue(l.nextAction.dueDate) && l.stage !== "venda").length;

  // Pipeline ponderado (valor esperado)
  const expectedRevenue = leads
    .filter(l => l.stage !== "venda")
    .reduce((s, l) => s + ((l.value ?? 0) * (STAGE_PROBABILITY[l.stage] ?? 0)) / 100, 0);

  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);
  const salesValue = vendas.reduce((s, l) => s + (l.value ?? 0), 0);

  const stageCounts = FUNNEL_ORDER.map(stage => ({
    stage,
    count: leads.filter(l => l.stage === stage).length,
    value: leads.filter(l => l.stage === stage).reduce((s, l) => s + (l.value ?? 0), 0),
  }));
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  const conversionRates = [
    { from: "Leads", to: "Contato ativo", rate: pct(leads.filter(l => l.stage !== "prospeccao").length, leads.length), icon: "📲" },
    { from: "Contato", to: "Reunião", rate: pct(reunioesFeitas, leads.filter(l => l.stage !== "prospeccao").length), icon: "📅" },
    { from: "Reunião", to: "Proposta", rate: pct(propostas + vendas.length, reunioesFeitas), icon: "📄" },
    { from: "Proposta", to: "Venda", rate: pct(vendas.length, propostas + vendas.length), icon: "🏆" },
  ];

  const funnelData = [
    { label: "Leads cadastrados", value: leads.length, color: "bg-slate-400" },
    { label: "Em contato ativo", value: leads.filter(l => l.stage !== "prospeccao").length, color: "bg-blue-400" },
    { label: "Reuniões realizadas", value: reunioesFeitas, color: "bg-yellow-400" },
    { label: "Propostas enviadas", value: propostas + vendas.length, color: "bg-pink-400" },
    { label: "Vendas fechadas", value: vendas.length, color: "bg-green-400" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-sky-400" />Métricas de Conversão
        </h1>
        <p className="text-slate-400 text-sm mt-1">Visão completa do desempenho comercial</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigMetric icon={<Users className="w-5 h-5" />} label="Leads Ativos" value={String(active.length)} sub={`${leads.length} total`} color="sky" />
        <BigMetric icon={<Target className="w-5 h-5" />} label="Reuniões" value={String(reunioesFeitas)} sub={`${reunioesAgendadas} agendadas`} color="violet" />
        <BigMetric icon={<TrendingUp className="w-5 h-5" />} label="Vendas" value={String(vendas.length)} sub={formatCurrency(salesValue)} color="green" />
        <BigMetric icon={<DollarSign className="w-5 h-5" />} label="Pipeline Esperado" value={formatCurrency(expectedRevenue)} sub="valor ponderado" color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Funil de conversão */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />Funil de Conversão
          </h2>
          {leads.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Nenhum lead cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {funnelData.map((row, i) => {
                const base = funnelData[0].value || 1;
                const p = Math.round((row.value / base) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-bold text-white">{row.value}</span>
                    </div>
                    <div className="h-5 bg-[#334155] rounded overflow-hidden">
                      <div className={cn("h-full rounded flex items-center px-2 transition-all", row.color)}
                        style={{ width: `${Math.max(p, row.value > 0 ? 5 : 0)}%`, opacity: 0.85 }}>
                        <span className="text-xs font-bold text-white">{p}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Taxas de conversão */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Taxas de Conversão</h2>
          <div className="space-y-3">
            {conversionRates.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#273549] rounded-lg">
                <div className="text-xl">{r.icon}</div>
                <div className="flex-1">
                  <div className="text-xs text-slate-400">{r.from} → {r.to}</div>
                </div>
                <div className={cn("text-lg font-bold",
                  parseInt(r.rate) >= 50 ? "text-green-400" :
                  parseInt(r.rate) >= 25 ? "text-yellow-400" : "text-red-400")}>
                  {r.rate}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-sky-500/10 rounded-lg border border-sky-500/20">
            <p className="text-xs text-sky-300">
              <strong>Pipeline total:</strong> {formatCurrency(totalValue)} ·{" "}
              <strong>Vendido:</strong> {formatCurrency(salesValue)} ·{" "}
              <strong>Atrasados:</strong> {followups} lead{followups !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Distribuição do funil */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Distribuição Atual do Funil</h2>
        {leads.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Nenhum lead cadastrado.</p>
        ) : (
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {stageCounts.map(({ stage, count }) => {
              const p = Math.round((count / maxCount) * 100);
              return (
                <div key={stage} className="flex flex-col items-center gap-2">
                  <div className="text-xl font-bold text-white">{count}</div>
                  <div className="w-8 bg-[#334155] rounded overflow-hidden" style={{ height: "80px" }}>
                    <div className={cn("w-full rounded transition-all", barColors[stage])}
                      style={{ height: `${Math.max(p, count > 0 ? 5 : 0)}%`, marginTop: `${100 - Math.max(p, count > 0 ? 5 : 0)}%`, opacity: 0.85 }} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 leading-tight">{STAGE_LABELS[stage].split(" ")[0]}</div>
                    {stageCounts.find(s => s.stage === stage)?.value ? (
                      <div className="text-xs text-slate-600">{formatCurrency(stageCounts.find(s => s.stage === stage)!.value)}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BigMetric({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "sky" | "violet" | "green" | "yellow";
}) {
  const configs = { sky: "bg-sky-500/10 text-sky-400", violet: "bg-violet-500/10 text-violet-400", green: "bg-green-500/10 text-green-400", yellow: "bg-yellow-500/10 text-yellow-400" };
  return (
    <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", configs[color])}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      <div className="text-xs text-slate-600 mt-0.5">{sub}</div>
    </div>
  );
}
