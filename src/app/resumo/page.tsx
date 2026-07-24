"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2, TrendingUp, DollarSign, Flame, Shield,
  AlertTriangle, Target, ChevronRight, Calendar,
  CheckCircle2, Clock, ArrowRight, Loader2, History
} from "lucide-react";
import { getLeads } from "@/lib/db";
import { Lead } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  buildDailyReport, getHistory, getReportByDate, localDateStr,
  formatReportDate, saveReport, RATING_CONFIG, DailyReport
} from "@/lib/resumo";
import { cn } from "@/lib/utils";

const CONTACTS_GOAL = 40;

export default function ResumoDiarioPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [history, setHistory] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hoje" | "historico">("hoje");

  useEffect(() => {
    getLeads().then(leads => {
      setLeads(leads);
      const today = localDateStr();
      // Tenta carregar resumo salvo do dia; se não houver, gera com dados zerados de sessão
      const saved = getReportByDate(today);
      if (saved) {
        setReport(saved);
      } else {
        const generated = buildDailyReport(leads, {
          contactsDone: 0, contactsGoal: CONTACTS_GOAL,
          tasksCompleted: 0, tasksTotal: leads.filter(l => l.stage !== "venda").length,
        });
        setReport(generated);
      }
      setHistory(getHistory());
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-sky-400" />Resumo Diário
          </h1>
          <p className="text-slate-400 text-sm mt-1 capitalize">
            {report ? formatReportDate(report.date) : ""}
          </p>
        </div>
        <Link href="/execucao" className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Iniciar Execução →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1e293b] rounded-lg p-1 border border-[#334155] w-fit">
        {(["hoje", "historico"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === t ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white")}>
            {t === "hoje" ? "Hoje" : "Histórico"}
          </button>
        ))}
      </div>

      {activeTab === "hoje" && report && <ReportView report={report} />}
      {activeTab === "historico" && <HistoryView history={history} />}
    </div>
  );
}

// ── ReportView ────────────────────────────────────────────────────────────────

function ReportView({ report }: { report: DailyReport }) {
  const rc = RATING_CONFIG[report.rating];

  return (
    <div className="space-y-6">
      {/* Rating + Análise */}
      <div className={cn("rounded-xl border p-5", rc.bg)}>
        <div className="flex items-start gap-4">
          <div className="text-4xl">{rc.emoji}</div>
          <div className="flex-1">
            <div className={cn("text-lg font-bold mb-2", rc.color)}>{rc.label}</div>
            <p className="text-slate-300 text-sm leading-relaxed">{report.analysisText}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={cn("text-3xl font-bold", rc.color)}>{report.goalPercent}%</div>
            <div className="text-xs text-slate-400">meta do dia</div>
          </div>
        </div>
      </div>

      {/* Métricas de execução */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#334155]">
          <Target className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-white text-sm">Execução do Dia</span>
        </div>
        <div className="p-5 space-y-4">
          <MetricRow icon="📞" label="Contatos" done={report.contacts.done} goal={report.contacts.goal} />
          <MetricRow icon="🔔" label="Follow-ups" done={report.followups.done} goal={report.followups.goal} />
          <MetricRow icon="📅" label="Reuniões" done={report.meetings.done} goal={report.meetings.goal} />
          <MetricRow icon="📄" label="Propostas" done={report.proposals.done} goal={report.proposals.goal} />
          <MetricRow icon="🏆" label="Vendas" done={report.salesClosed} goal={report.salesClosed} />
          <div className="pt-2 border-t border-[#334155]">
            <MetricRow icon="✅" label="Tarefas concluídas" done={report.tasksCompleted} goal={report.tasksTotal} />
          </div>
        </div>
      </div>

      {/* Financeiro */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#334155]">
          <DollarSign className="w-4 h-4 text-green-400" />
          <span className="font-semibold text-white text-sm">Financeiro</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-0 divide-x divide-[#334155]">
          <FinanceCell label="Pipeline Total" value={formatCurrency(report.pipelineTotal)} color="text-white" />
          <FinanceCell label="Em Negociação" value={formatCurrency(report.negotiationRevenue)} color="text-sky-400" />
          <FinanceCell label="Receita em Risco" value={formatCurrency(report.riskRevenue)} color={report.riskRevenue > 0 ? "text-red-400" : "text-green-400"} />
          <FinanceCell label="Vendas Fechadas" value={formatCurrency(report.salesValue)} color="text-green-400" />
          <FinanceCell label="Comissão Est." value={formatCurrency(report.estimatedCommission)} color="text-yellow-400" />
        </div>
      </div>

      {/* Leads em destaque — 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Leads Quentes */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#334155]">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-white text-sm">Leads Quentes</span>
          </div>
          <div className="divide-y divide-[#334155]">
            {report.hotLeads.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum lead qualificado.</p>
            ) : report.hotLeads.map(l => (
              <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#273549] transition-colors">
                <div className="w-7 h-7 bg-orange-500/20 rounded-full flex items-center justify-center text-xs font-bold text-orange-300 flex-shrink-0">{l.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{l.name}</div>
                  <div className="text-xs text-slate-400">{l.stageLabel}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-green-400 font-medium">{formatCurrency(l.expectedValue)}</div>
                  <div className="text-xs text-slate-500">{l.probability}%</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Leads em Risco */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#334155]">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="font-semibold text-white text-sm">Leads em Risco</span>
          </div>
          <div className="divide-y divide-[#334155]">
            {report.riskLeads.length === 0 ? (
              <div className="flex items-center gap-2 justify-center py-6 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs">Nenhum em risco!</span>
              </div>
            ) : report.riskLeads.map(l => (
              <Link key={l.id} href={`/leads/${l.id}?tab=acao`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#273549] transition-colors">
                <div className="w-7 h-7 bg-red-500/20 rounded-full flex items-center justify-center text-xs font-bold text-red-300 flex-shrink-0">{l.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{l.name}</div>
                  <div className="text-xs text-slate-400">{l.stageLabel}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-red-400 font-medium">{l.daysOverdue}d atraso</div>
                  {l.value > 0 && <div className="text-xs text-slate-500">{formatCurrency(l.value)}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Maiores Oportunidades */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#334155]">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-white text-sm">Maiores Oportunidades</span>
          </div>
          <div className="divide-y divide-[#334155]">
            {report.bigOpportunities.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Adicione valores aos leads.</p>
            ) : report.bigOpportunities.map(l => (
              <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#273549] transition-colors">
                <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center text-xs font-bold text-green-300 flex-shrink-0">{l.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{l.name}</div>
                  <div className="text-xs text-slate-400">{l.stageLabel}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-green-400 font-bold">{formatCurrency(l.value)}</div>
                  <div className="text-xs text-slate-500">{l.probability}% prob.</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Prioridades de amanhã */}
      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-white text-sm">🎯 Prioridades para Amanhã</span>
        </div>
        <div className="space-y-3">
          {report.tomorrowPriorities.map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-sky-300 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-slate-300">{p}</p>
            </div>
          ))}
          {report.tomorrowPriorities.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma prioridade identificada.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── HistoryView ───────────────────────────────────────────────────────────────

function HistoryView({ history }: { history: DailyReport[] }) {
  if (history.length === 0) {
    return (
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-12 text-center">
        <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-white font-medium mb-1">Nenhum histórico ainda</p>
        <p className="text-slate-400 text-sm">Complete o Modo Execução para registrar o primeiro resumo.</p>
      </div>
    );
  }

  const avgGoal = Math.round(history.reduce((s, r) => s + r.goalPercent, 0) / history.length);
  const totalSales = history.reduce((s, r) => s + r.salesClosed, 0);
  const totalContacts = history.reduce((s, r) => s + r.contacts.done, 0);

  return (
    <div className="space-y-5">
      {/* Resumo do período */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4 text-center">
          <div className="text-2xl font-bold text-sky-400">{avgGoal}%</div>
          <div className="text-xs text-slate-400 mt-1">Média de execução</div>
        </div>
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{totalSales}</div>
          <div className="text-xs text-slate-400 mt-1">Vendas fechadas</div>
        </div>
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{totalContacts}</div>
          <div className="text-xs text-slate-400 mt-1">Total de contatos</div>
        </div>
      </div>

      {/* Gráfico de barras — % meta por dia */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-white text-sm">Evolução — % Meta Diária</span>
        </div>
        <div className="flex items-end gap-1.5 h-24">
          {history.slice(0, 30).reverse().map((r, i) => {
            const rc = RATING_CONFIG[r.rating];
            const barColor = r.rating === "excelente" ? "bg-green-500" : r.rating === "bom" ? "bg-sky-500" : "bg-orange-500";
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${r.date}: ${r.goalPercent}%`}>
                <div className={cn("w-full rounded-sm self-end", barColor)} style={{ height: `${Math.max(r.goalPercent, 4)}%` }} />
                <div className="text-xs text-slate-600 truncate w-full text-center hidden lg:block">
                  {r.date.slice(5)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de dias */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <div className="p-4 border-b border-[#334155]">
          <span className="font-semibold text-white text-sm">Últimos {history.length} dias</span>
        </div>
        <div className="divide-y divide-[#334155]">
          {history.map(r => {
            const rc = RATING_CONFIG[r.rating];
            return (
              <div key={r.date} className="flex items-center gap-4 px-4 py-3">
                <div className="text-xl">{rc.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white capitalize">{formatReportDate(r.date)}</div>
                  <div className="text-xs text-slate-400">
                    {r.contacts.done} contatos · {r.tasksCompleted} tarefas · {r.salesClosed} vendas
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={cn("text-sm font-bold", rc.color)}>{r.goalPercent}%</div>
                  <div className="text-xs text-slate-500">{rc.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Componentes de suporte ─────────────────────────────

function MetricRow({ icon, label, done, goal }: { icon: string; label: string; done: number; goal: number }) {
  const pct = goal > 0 ? Math.min(Math.round((done / goal) * 100), 100) : done > 0 ? 100 : 0;
  const good = pct >= 80;
  const warn = pct >= 50 && pct < 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span>{icon}</span>
          <span className={good ? "text-slate-200" : warn ? "text-orange-300" : "text-slate-400"}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{done}/{goal}</span>
          <span className={cn("text-xs font-bold", good ? "text-green-400" : warn ? "text-orange-400" : "text-red-400")}>
            {goal > 0 ? `${pct}%` : done > 0 ? "✓" : "—"}
          </span>
        </div>
      </div>
      {goal > 0 && (
        <div className="h-1.5 bg-[#334155] rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", good ? "bg-green-500" : warn ? "bg-orange-500" : "bg-red-500")}
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function FinanceCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 text-center">
      <div className={cn("text-lg font-bold", color)}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
