"use client";
import { BarChart2, TrendingUp, DollarSign, Users, Target } from "lucide-react";
import { mockLeads, metricsMock } from "@/lib/mock-data";
import { FUNNEL_ORDER, FUNNEL_ORDER as stages } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const funnelData = [
  { label: "Contatos realizados", value: metricsMock.contacts.done, color: "bg-slate-400" },
  { label: "Respostas", value: metricsMock.responses, color: "bg-blue-400" },
  { label: "Conversas qualificadas", value: metricsMock.qualifiedConversations, color: "bg-violet-400" },
  { label: "Reuniões", value: metricsMock.meetingsDone, color: "bg-yellow-400" },
  { label: "Propostas enviadas", value: metricsMock.proposalsSent, color: "bg-pink-400" },
  { label: "Vendas fechadas", value: metricsMock.salesClosed, color: "bg-green-400" },
];

function convRate(a: number, b: number) {
  if (b === 0) return "0%";
  return Math.round((a / b) * 100) + "%";
}

const conversionRates = [
  {
    from: "Contato",
    to: "Resposta",
    rate: convRate(metricsMock.responses, metricsMock.contacts.done),
    icon: "📲",
  },
  {
    from: "Resposta",
    to: "Reunião",
    rate: convRate(metricsMock.meetingsDone, metricsMock.responses),
    icon: "📅",
  },
  {
    from: "Reunião",
    to: "Proposta",
    rate: convRate(metricsMock.proposalsSent, metricsMock.meetingsDone),
    icon: "📄",
  },
  {
    from: "Proposta",
    to: "Venda",
    rate: convRate(metricsMock.salesClosed, metricsMock.proposalsSent),
    icon: "🏆",
  },
];

export default function MetricasPage() {
  const stageCounts = FUNNEL_ORDER.map(stage => ({
    stage,
    count: mockLeads.filter(l => l.stage === stage).length,
  }));

  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-sky-400" />
          Métricas de Conversão
        </h1>
        <p className="text-slate-400 text-sm mt-1">Visão completa do seu desempenho comercial</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigMetric
          icon={<Users className="w-5 h-5" />}
          label="Leads Ativos"
          value={String(mockLeads.filter(l => l.stage !== "venda").length)}
          sub="no funil"
          color="sky"
        />
        <BigMetric
          icon={<Target className="w-5 h-5" />}
          label="Reuniões Realizadas"
          value={String(metricsMock.meetingsDone)}
          sub={`de ${metricsMock.meetingsScheduled} agendadas`}
          color="violet"
        />
        <BigMetric
          icon={<TrendingUp className="w-5 h-5" />}
          label="Vendas Fechadas"
          value={String(metricsMock.salesClosed)}
          sub="este mês"
          color="green"
        />
        <BigMetric
          icon={<DollarSign className="w-5 h-5" />}
          label="Comissão Estimada"
          value={formatCurrency(metricsMock.estimatedCommission)}
          sub="mês atual"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Funil de conversão */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            Funil de Conversão
          </h2>
          <div className="space-y-3">
            {funnelData.map((row, i) => {
              const pct = Math.round((row.value / funnelData[0].value) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="font-bold text-white">{row.value}</span>
                  </div>
                  <div className="h-5 bg-[#334155] rounded overflow-hidden">
                    <div
                      className={cn("h-full rounded flex items-center px-2 transition-all", row.color)}
                      style={{ width: `${Math.max(pct, 5)}%`, opacity: 0.85 }}
                    >
                      <span className="text-xs font-bold text-white">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Taxas de conversão */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Taxas de Conversão</h2>
          <div className="space-y-3">
            {conversionRates.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#273549] rounded-lg">
                <div className="text-xl">{r.icon}</div>
                <div className="flex-1">
                  <div className="text-xs text-slate-400">
                    {r.from} → {r.to}
                  </div>
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  parseInt(r.rate) >= 50 ? "text-green-400" :
                  parseInt(r.rate) >= 25 ? "text-yellow-400" : "text-red-400"
                )}>
                  {r.rate}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-sky-500/10 rounded-lg border border-sky-500/20">
            <p className="text-xs text-sky-300">
              <strong>Meta recomendada:</strong> Para 1 venda/mês, você precisa de ~{" "}
              <strong>40 contatos/dia</strong>, considerando as suas taxas atuais.
            </p>
          </div>
        </div>
      </div>

      {/* Distribuição atual do funil */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Distribuição Atual do Funil</h2>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {stageCounts.map(({ stage, count }) => {
            const pct = Math.round((count / maxCount) * 100);
            const barColors: Record<string, string> = {
              prospeccao: "bg-slate-400",
              contato_ativo: "bg-blue-400",
              qualificacao: "bg-violet-400",
              reuniao_agendada: "bg-yellow-400",
              reuniao_realizada: "bg-orange-400",
              proposta_enviada: "bg-pink-400",
              followup: "bg-red-400",
              venda: "bg-green-400",
            };
            return (
              <div key={stage} className="flex flex-col items-center gap-2">
                <div className="text-xl font-bold text-white">{count}</div>
                <div className="w-8 bg-[#334155] rounded overflow-hidden" style={{ height: "80px" }}>
                  <div
                    className={cn("w-full rounded transition-all", barColors[stage])}
                    style={{ height: `${Math.max(pct, 5)}%`, marginTop: `${100 - Math.max(pct, 5)}%`, opacity: 0.85 }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 leading-tight">{STAGE_LABELS[stage].split(" ")[0]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meta de contatos */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Meta de Contatos do Dia</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">{metricsMock.contacts.done} realizados</span>
              <span className="font-bold text-white">{metricsMock.contacts.total} meta</span>
            </div>
            <div className="h-4 bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all"
                style={{ width: `${Math.round((metricsMock.contacts.done / metricsMock.contacts.total) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              Faltam {metricsMock.contacts.total - metricsMock.contacts.done} contatos para bater a meta
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {Math.round((metricsMock.contacts.done / metricsMock.contacts.total) * 100)}%
            </div>
            <div className="text-xs text-slate-400">concluído</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigMetric({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "sky" | "violet" | "green" | "yellow";
}) {
  const configs = {
    sky: "bg-sky-500/10 text-sky-400",
    violet: "bg-violet-500/10 text-violet-400",
    green: "bg-green-500/10 text-green-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
  };
  return (
    <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", configs[color])}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      <div className="text-xs text-slate-600 mt-0.5">{sub}</div>
    </div>
  );
}
