"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Bell, Calendar, TrendingUp, Zap, Play,
  AlertTriangle, Target, DollarSign, ChevronRight,
  CheckCircle2, Clock, Flame, Shield
} from "lucide-react";
import { getLeads } from "@/lib/db";
import { Lead, STAGE_LABELS } from "@/lib/types";
import { formatCurrency, isDueToday, isOverdue } from "@/lib/utils";
import {
  buildExecutionQueue, buildClosingRadar, calcRiskRevenue,
  buildPipeline, ExecutionTask
} from "@/lib/priority";
import { getYesterdayReport, RATING_CONFIG } from "@/lib/resumo";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeads().then(data => { setLeads(data); setLoading(false); });
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Bom dia, Consultor 👋</h1>
            <p className="text-slate-400 text-sm capitalize">{today}</p>
          </div>
          <Link href="/leads/novo" className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4" />Novo Lead
          </Link>
        </div>
        <div className="bg-[#1e293b] border border-dashed border-[#334155] rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-white font-semibold text-lg mb-1">Nenhum lead cadastrado</h2>
          <p className="text-slate-400 text-sm mb-4">Cadastre seu primeiro lead para começar.</p>
          <Link href="/leads/novo" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4" />Cadastrar primeiro lead
          </Link>
        </div>
      </div>
    );
  }

  const queue = buildExecutionQueue(leads);
  const radar = buildClosingRadar(leads);
  const yesterdayReport = typeof window !== "undefined" ? getYesterdayReport() : null;
  const risk = calcRiskRevenue(leads);
  const pipeline = buildPipeline(leads);
  const missaoTop3 = queue.slice(0, 3);

  const followupsDue = leads.filter(l => l.nextAction && !l.nextAction.completed && (isDueToday(l.nextAction.dueDate) || isOverdue(l.nextAction.dueDate)) && l.stage !== "venda");
  const overdueLeads = leads.filter(l => l.nextAction && !l.nextAction.completed && isOverdue(l.nextAction.dueDate) && l.stage !== "venda");
  const meetingsToday = leads.filter(l => l.stage === "reuniao_agendada" && l.nextAction && !l.nextAction.completed && isDueToday(l.nextAction.dueDate));
  const activeLeads = leads.filter(l => l.stage !== "venda");
  const salesLeads = leads.filter(l => l.stage === "venda");
  const totalPipelineValue = pipeline.reduce((s, p) => s + p.total, 0);
  const maxPipelineTotal = Math.max(...pipeline.map(p => p.total), 1);
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{saudacao}, Consultor 👋</h1>
          <p className="text-slate-400 text-sm capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/execucao" className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-sky-500/20">
            <Play className="w-4 h-4 fill-white" />Iniciar Execução
          </Link>
          <Link href="/leads/novo" className="flex items-center gap-2 bg-[#1e293b] hover:bg-[#273549] border border-[#334155] text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4" />Novo Lead
          </Link>
        </div>
      </div>

      {/* Card resumo de ontem */}
      {yesterdayReport && (() => {
        const rc = RATING_CONFIG[yesterdayReport.rating];
        return (
          <Link href="/resumo" className="flex items-center gap-4 bg-[#1e293b] border border-[#334155] hover:border-sky-500/40 rounded-xl p-4 transition-colors group">
            <div className="text-3xl">{rc.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 mb-0.5">Resumo de ontem</div>
              <div className={cn("text-sm font-semibold", rc.color)}>{rc.label} — {yesterdayReport.goalPercent}% da meta</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {yesterdayReport.contacts.done} contatos · {yesterdayReport.tasksCompleted} tarefas · {yesterdayReport.salesClosed} vendas
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
          </Link>
        );
      })()}

      {/* Alerta de atrasados */}
      {overdueLeads.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-orange-300 font-medium text-sm">{overdueLeads.length} lead{overdueLeads.length > 1 ? "s" : ""} com ação atrasada — </span>
            <span className="text-orange-400/80 text-sm">{overdueLeads.map(l => l.name).join(", ")}</span>
          </div>
          <Link href="/followup" className="text-orange-400 text-xs font-medium hover:text-orange-300 flex-shrink-0">Ver agora →</Link>
        </div>
      )}

      {/* Missão do Dia */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-white text-sm">Missão do Dia</span>
            <span className="text-xs text-slate-500">— Top {missaoTop3.length} prioridades agora</span>
          </div>
          <Link href="/execucao" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
            Iniciar execução <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-[#334155]">
          {missaoTop3.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhuma tarefa pendente.</p>
            </div>
          ) : missaoTop3.map((task, i) => (
            <MissaoCard key={task.lead.id} task={task} index={i} total={queue.length} />
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Bell className="w-5 h-5" />} label="Follow-ups hoje" value={String(followupsDue.length)} sub={`${overdueLeads.length} atrasados`} color="orange" urgent={overdueLeads.length > 0} />
        <MetricCard icon={<Calendar className="w-5 h-5" />} label="Reuniões hoje" value={String(meetingsToday.length)} sub="agendadas" color="violet" />
        <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Leads ativos" value={String(activeLeads.length)} sub={`${salesLeads.length} vendas`} color="green" />
        <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Pipeline total" value={formatCurrency(totalPipelineValue)} sub={`${activeLeads.length} leads`} color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Radar de Fechamento */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#334155]">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-white text-sm">Radar de Fechamento</span>
            <span className="text-xs text-slate-500">— valor × probabilidade</span>
          </div>
          <div className="divide-y divide-[#334155]">
            {radar.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Avance leads no funil para ver aqui.</div>
            ) : radar.map(({ lead, probability, expectedValue }) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#273549] transition-colors">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{lead.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{lead.name}</div>
                  <div className="text-xs text-slate-400">{STAGE_LABELS[lead.stage]}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-green-400">{formatCurrency(expectedValue)}</div>
                  <div className="text-xs text-slate-500">{probability}% prob.</div>
                </div>
                <div className="w-1.5 h-8 rounded-full bg-[#334155] overflow-hidden flex-shrink-0">
                  <div className="w-full rounded-full bg-orange-400" style={{ height: `${probability}%`, marginTop: `${100 - probability}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Receita em Risco + Pipeline */}
        <div className="space-y-4">
          <div className={cn("rounded-xl border p-4", risk.total > 0 ? "bg-red-500/5 border-red-500/30" : "bg-[#1e293b] border-[#334155]")}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className={cn("w-4 h-4", risk.total > 0 ? "text-red-400" : "text-slate-400")} />
              <span className="font-semibold text-white text-sm">Receita em Risco</span>
            </div>
            {risk.total > 0 ? (
              <>
                <div className="text-2xl font-bold text-red-400 mb-1">{formatCurrency(risk.total)}</div>
                <div className="text-xs text-slate-400 mb-3">{risk.leads.length} lead{risk.leads.length > 1 ? "s" : ""} com proposta/follow-up atrasado</div>
                <div className="space-y-1.5">
                  {risk.leads.slice(0, 3).map(l => (
                    <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between text-xs bg-red-500/10 rounded-lg px-3 py-2 hover:bg-red-500/20 transition-colors">
                      <span className="text-red-300 font-medium">{l.name}</span>
                      <span className="text-red-400">{formatCurrency(l.value ?? 0)}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Nenhuma receita em risco. ✓</span>
              </div>
            )}
          </div>

          <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-white text-sm">Pipeline Financeiro</span>
            </div>
            <div className="space-y-2.5">
              {pipeline.filter(p => p.count > 0).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">Adicione valores aos leads para ver o pipeline.</p>
              ) : pipeline.filter(p => p.count > 0).map(p => (
                <div key={p.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{p.label}</span>
                    <span className="text-slate-400">{formatCurrency(p.total)} · {p.count} lead{p.count > 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-[#334155] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
                      style={{ width: `${Math.round((p.total / maxPipelineTotal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Follow-ups e Reuniões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1e293b] rounded-xl border border-[#334155]">
          <div className="flex items-center justify-between p-4 border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <span className="font-medium text-white text-sm">Follow-ups do Dia</span>
            </div>
            <Link href="/followup" className="text-xs text-sky-400 hover:text-sky-300">Ver todos →</Link>
          </div>
          <div className="divide-y divide-[#334155]">
            {followupsDue.slice(0, 4).map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 p-3 hover:bg-[#273549] transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue(lead.nextAction!.dueDate) ? "bg-orange-400" : "bg-sky-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{lead.name}</div>
                  <div className="text-xs text-slate-400 truncate">{lead.nextAction?.description}</div>
                </div>
                {isOverdue(lead.nextAction!.dueDate) && <span className="text-xs text-orange-400 flex-shrink-0">Atrasado</span>}
              </Link>
            ))}
            {followupsDue.length === 0 && (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum follow-up para hoje.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-[#334155]">
          <div className="flex items-center justify-between p-4 border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span className="font-medium text-white text-sm">Reuniões de Hoje</span>
            </div>
            <Link href="/leads" className="text-xs text-sky-400 hover:text-sky-300">Ver leads →</Link>
          </div>
          <div className="divide-y divide-[#334155]">
            {meetingsToday.length > 0 ? meetingsToday.map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 p-3 hover:bg-[#273549] transition-colors">
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{lead.name}</div>
                  <div className="text-xs text-slate-400">{lead.nextAction?.description}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-400 flex-shrink-0">
                  <Clock className="w-3 h-3" />Hoje
                </div>
              </Link>
            )) : (
              <div className="p-6 text-center">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhuma reunião agendada.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MissaoCard({ task, index, total }: { task: ExecutionTask; index: number; total: number }) {
  const colors = [
    "text-sky-400 bg-sky-500/10 border-sky-500/30",
    "text-violet-400 bg-violet-500/10 border-violet-500/30",
    "text-orange-400 bg-orange-500/10 border-orange-500/30",
  ];
  const color = colors[index] ?? colors[2];
  const taskTypeLabel: Record<ExecutionTask["taskType"], string> = {
    followup: "Follow-up", reuniao: "Reunião", proposta: "Proposta",
    contato: "1º Contato", atualizacao: "Atualizar",
  };
  return (
    <Link href={`/leads/${task.lead.id}?tab=acao`} className="flex items-center gap-4 px-5 py-4 hover:bg-[#273549] transition-colors group">
      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 text-sm font-bold", color)}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-semibold text-white">{task.lead.name}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full border", color)}>{taskTypeLabel[task.taskType]}</span>
        </div>
        <div className="text-xs text-slate-400 truncate">{task.recommendedAction}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-slate-500">{task.estimatedMinutes} min</div>
        <div className="text-xs text-slate-600">missão {index + 1}/{total}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
    </Link>
  );
}

function MetricCard({ icon, label, value, sub, color, urgent }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "sky" | "orange" | "violet" | "green"; urgent?: boolean;
}) {
  const colors = { sky: "bg-sky-500/10 text-sky-400", orange: "bg-orange-500/10 text-orange-400", violet: "bg-violet-500/10 text-violet-400", green: "bg-green-500/10 text-green-400" };
  return (
    <div className={cn("bg-[#1e293b] border rounded-xl p-4", urgent ? "border-orange-500/40" : "border-[#334155]")}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", colors[color])}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
