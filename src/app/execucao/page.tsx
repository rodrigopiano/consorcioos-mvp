"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Play, CheckCircle2, Clock, ChevronRight, X, Zap,
  Phone, MessageCircle, AlertTriangle, Target,
  ArrowRight, Loader2, Trophy, TrendingUp, Users,
  Calendar, FileText, RefreshCw, Star
} from "lucide-react";
import { getLeads, completeNextAction, setNextAction } from "@/lib/db";
import { Lead, ORIGIN_LABELS, INTEREST_LABELS, CHANNEL_LABELS, STAGE_LABELS } from "@/lib/types";
import { buildExecutionQueue, buildDaySummary, getLeadsWithoutAction, ExecutionTask, DaySummary } from "@/lib/priority";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Mode = "idle" | "running" | "finished";

const CONTACTS_GOAL = 40;

const taskTypeConfig = {
  followup: { label: "Follow-up", icon: Phone, color: "text-orange-400", bg: "bg-orange-500/10" },
  reuniao: { label: "Reunião", icon: Calendar, color: "text-violet-400", bg: "bg-violet-500/10" },
  proposta: { label: "Proposta", icon: FileText, color: "text-pink-400", bg: "bg-pink-500/10" },
  contato: { label: "Novo Contato", icon: Users, color: "text-sky-400", bg: "bg-sky-500/10" },
  atualizacao: { label: "Atualizar CRM", icon: RefreshCw, color: "text-slate-400", bg: "bg-slate-500/10" },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  respondeu_hoje: { label: "Respondeu hoje", color: "text-green-400 bg-green-500/10" },
  followup_atrasado: { label: "Atrasado", color: "text-orange-400 bg-orange-500/10" },
  reuniao_hoje: { label: "Reunião hoje", color: "text-violet-400 bg-violet-500/10" },
  proposta_pendente: { label: "Proposta pendente", color: "text-pink-400 bg-pink-500/10" },
  novo_contato: { label: "Novo contato", color: "text-sky-400 bg-sky-500/10" },
  sem_acao: { label: "Sem ação", color: "text-slate-400 bg-slate-500/10" },
};

export default function ExecucaoPage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [queue, setQueue] = useState<ExecutionTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [contactsDone, setContactsDone] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const data = await getLeads();
    setLeads(data);
    setQueue(buildExecutionQueue(data));
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const activeQueue = queue.filter(t => !completed.includes(t.lead.id) && !skipped.includes(t.lead.id));
  const currentTask = activeQueue[0] ?? null;
  const leadsWithoutAction = getLeadsWithoutAction(leads);

  const progress = {
    contacts: { done: contactsDone, goal: CONTACTS_GOAL },
    followups: { done: completed.filter(id => queue.find(t => t.lead.id === id)?.taskType === "followup").length, total: queue.filter(t => t.taskType === "followup").length },
    meetings: { done: completed.filter(id => queue.find(t => t.lead.id === id)?.taskType === "reuniao").length, total: queue.filter(t => t.taskType === "reuniao").length },
    proposals: { done: completed.filter(id => queue.find(t => t.lead.id === id)?.taskType === "proposta").length, total: queue.filter(t => t.taskType === "proposta").length },
    goalPercent: queue.length > 0 ? Math.round((completed.length / queue.length) * 100) : 0,
  };

  function startMode() {
    setMode("running");
    setCurrentIndex(0);
    setCompleted([]);
    setSkipped([]);
    setContactsDone(0);
  }

  async function handleComplete() {
    if (!currentTask) return;
    setTransitioning(true);

    const newCompleted = [...completed, currentTask.lead.id];
    setCompleted(newCompleted);

    if (currentTask.taskType === "contato" || currentTask.taskType === "followup") {
      setContactsDone(c => c + 1);
    }

    await new Promise(r => setTimeout(r, 400));
    setTransitioning(false);

    const remaining = queue.filter(t => !newCompleted.includes(t.lead.id) && !skipped.includes(t.lead.id));
    if (remaining.length === 0) {
      const s = buildDaySummary(leads, newCompleted, contactsDone + 1, CONTACTS_GOAL);
      setSummary(s);
      setMode("finished");
    }
  }

  async function handlePostpone() {
    if (!currentTask?.lead.nextAction) return;
    setTransitioning(true);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await setNextAction(currentTask.lead.id, {
      ...currentTask.lead.nextAction,
      dueDate: tomorrow.toISOString().split("T")[0],
    });
    const newSkipped = [...skipped, currentTask.lead.id];
    setSkipped(newSkipped);
    await new Promise(r => setTimeout(r, 300));
    setTransitioning(false);

    const remaining = queue.filter(t => !completed.includes(t.lead.id) && !newSkipped.includes(t.lead.id));
    if (remaining.length === 0) {
      const s = buildDaySummary(leads, completed, contactsDone, CONTACTS_GOAL);
      setSummary(s);
      setMode("finished");
    }
  }

  function handleExit() {
    if (completed.length > 0 || skipped.length > 0) {
      const s = buildDaySummary(leads, completed, contactsDone, CONTACTS_GOAL);
      setSummary(s);
      setMode("finished");
    } else {
      setMode("idle");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-slate-400 text-sm">Carregando...</p></div>
      </div>
    );
  }

  if (mode === "finished" && summary) {
    return <DaySummaryScreen summary={summary} completed={completed} skipped={skipped} queue={queue} onRestart={() => { setMode("idle"); loadLeads(); }} />;
  }

  if (mode === "running") {
    return (
      <div className="min-h-full bg-[#0f172a] flex flex-col">
        {/* Header minimalista */}
        <div className="border-b border-[#1e293b] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">Modo Execução</span>
            <span className="text-xs text-slate-500">{completed.length + skipped.length}/{queue.length} tarefas</span>
          </div>
          <button onClick={handleExit} className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1e293b]">
            <X className="w-3.5 h-3.5" />Encerrar
          </button>
        </div>

        <div className="flex flex-1 max-w-5xl mx-auto w-full px-6 py-6 gap-6">
          {/* Tarefa principal */}
          <div className="flex-1">
            {currentTask ? (
              <div className={cn("transition-all duration-300", transitioning ? "opacity-0 scale-95" : "opacity-100 scale-100")}>
                <TaskCard
                  task={currentTask}
                  onComplete={handleComplete}
                  onPostpone={handlePostpone}
                  queuePosition={activeQueue.indexOf(currentTask) + 1}
                  queueTotal={activeQueue.length}
                />
              </div>
            ) : (
              <div className="text-center py-20">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Todas as tarefas concluídas!</h2>
                <button onClick={() => { const s = buildDaySummary(leads, completed, contactsDone, CONTACTS_GOAL); setSummary(s); setMode("finished"); }}
                  className="mt-4 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                  Ver resumo do dia →
                </button>
              </div>
            )}

            {/* Próximas tarefas */}
            {activeQueue.length > 1 && (
              <div className="mt-5">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Próximas tarefas</p>
                <div className="space-y-2">
                  {activeQueue.slice(1, 4).map((task, i) => {
                    const cfg = taskTypeConfig[task.taskType];
                    const Icon = cfg.icon;
                    return (
                      <div key={task.lead.id} className="flex items-center gap-3 px-4 py-2.5 bg-[#1e293b]/50 rounded-lg border border-[#334155]/50">
                        <span className="text-xs text-slate-600 w-4">{i + 2}</span>
                        <div className={cn("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", cfg.bg)}>
                          <Icon className={cn("w-3 h-3", cfg.color)} />
                        </div>
                        <span className="text-sm text-slate-400 flex-1 truncate">{task.lead.name}</span>
                        <span className="text-xs text-slate-600">{task.estimatedMinutes}min</span>
                      </div>
                    );
                  })}
                  {activeQueue.length > 4 && (
                    <p className="text-xs text-slate-600 text-center py-1">+{activeQueue.length - 4} tarefas restantes</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Painel de progresso lateral */}
          <div className="w-52 flex-shrink-0">
            <ProgressPanel progress={progress} />
          </div>
        </div>
      </div>
    );
  }

  // IDLE — tela inicial
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-sky-400" />
          Modo Execução
        </h1>
        <p className="text-slate-400 text-sm mt-1">O sistema conduz você pelas tarefas mais importantes do dia.</p>
      </div>

      {/* Botão principal */}
      <button onClick={startMode} disabled={queue.length === 0}
        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white py-5 rounded-2xl text-lg font-bold transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
        <Play className="w-6 h-6 fill-white" />
        {queue.length === 0 ? "Nenhuma tarefa pendente" : `Iniciar Modo Execução (${queue.length} tarefas)`}
      </button>

      {/* Preview da fila */}
      {queue.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <div className="p-4 border-b border-[#334155] flex items-center justify-between">
            <span className="text-sm font-medium text-white">Fila de hoje</span>
            <span className="text-xs text-slate-400">Ordenada por prioridade</span>
          </div>
          <div className="divide-y divide-[#334155]">
            {queue.slice(0, 6).map((task, i) => {
              const cfg = taskTypeConfig[task.taskType];
              const Icon = cfg.icon;
              const pl = priorityLabels[task.priority];
              return (
                <div key={task.lead.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-slate-600 w-5 text-right">{i + 1}</span>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{task.lead.name}</div>
                    <div className="text-xs text-slate-500 truncate">{task.recommendedAction}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", pl.color)}>{pl.label}</span>
                    <span className="text-xs text-slate-600">{task.estimatedMinutes}min</span>
                  </div>
                </div>
              );
            })}
            {queue.length > 6 && (
              <div className="px-4 py-3 text-center text-xs text-slate-500">+{queue.length - 6} tarefas adicionais</div>
            )}
          </div>
        </div>
      )}

      {/* Leads sem próxima ação */}
      {leadsWithoutAction.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">Leads sem próxima ação ({leadsWithoutAction.length})</span>
          </div>
          <div className="divide-y divide-red-500/10">
            {leadsWithoutAction.map(lead => (
              <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{lead.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">{lead.name}</div>
                  <div className="text-xs text-slate-500">{STAGE_LABELS[lead.stage]} · {INTEREST_LABELS[lead.interest]}</div>
                </div>
                <Link href="/leads/novo" className="text-xs text-sky-400 hover:text-sky-300">Definir ação →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="text-center py-12 bg-[#1e293b] rounded-xl border border-[#334155]">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Nenhum lead cadastrado</p>
          <p className="text-slate-400 text-sm mb-4">Cadastre leads para usar o Modo Execução.</p>
          <Link href="/leads/novo" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4" />Cadastrar primeiro lead
          </Link>
        </div>
      )}
    </div>
  );
}

// ── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onComplete, onPostpone, queuePosition, queueTotal }: {
  task: ExecutionTask;
  onComplete: () => void;
  onPostpone: () => void;
  queuePosition: number;
  queueTotal: number;
}) {
  const cfg = taskTypeConfig[task.taskType];
  const Icon = cfg.icon;
  const pl = priorityLabels[task.priority];

  return (
    <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden">
      {/* Barra de progresso da tarefa */}
      <div className="h-1 bg-[#334155]">
        <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all"
          style={{ width: `${((queueTotal - queuePosition) / queueTotal) * 100}%` }} />
      </div>

      <div className="p-6 space-y-5">
        {/* Header da tarefa */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
              <Icon className={cn("w-5 h-5", cfg.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cfg.label}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", pl.color)}>{pl.label}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{task.estimatedMinutes} min estimados</span>
                <span>·</span>
                <span>{queuePosition} de {queueTotal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lead info */}
        <div className="bg-[#273549] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0">
              {task.lead.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-white">{task.lead.name}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                <span>{INTEREST_LABELS[task.lead.interest]}</span>
                <span>·</span>
                <span>{ORIGIN_LABELS[task.lead.origin]}</span>
                <span>·</span>
                <span>{STAGE_LABELS[task.lead.stage]}</span>
                {task.lead.value ? <><span>·</span><span className="text-green-400 font-medium">{formatCurrency(task.lead.value)}</span></> : null}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {task.lead.nextAction?.channel === "whatsapp" ? (
                <a href={`https://wa.me/55${task.lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="p-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </a>
              ) : (
                <a href={`tel:${task.lead.phone.replace(/\D/g, "")}`}
                  className="p-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-colors">
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Motivo + Ação recomendada */}
        <div className="space-y-3">
          <div className="bg-[#273549] rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Por que agora?</div>
            <p className="text-sm text-slate-300">{task.reason}</p>
          </div>
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1.5">Ação recomendada</div>
            <p className="text-sm text-white font-medium">{task.recommendedAction}</p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3">
          <button onClick={onComplete}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold transition-colors">
            <CheckCircle2 className="w-5 h-5" />
            Concluído
          </button>
          <button onClick={onPostpone}
            className="flex items-center justify-center gap-2 bg-[#334155] hover:bg-slate-600 text-slate-300 px-5 py-3.5 rounded-xl font-medium transition-colors">
            Adiar
          </button>
          <Link href={`/leads`}
            className="flex items-center justify-center gap-2 bg-[#273549] hover:bg-[#334155] text-slate-400 hover:text-white px-4 py-3.5 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── ProgressPanel ─────────────────────────────────────────────────────────────

function ProgressPanel({ progress }: { progress: {
  contacts: { done: number; goal: number };
  followups: { done: number; total: number };
  meetings: { done: number; total: number };
  proposals: { done: number; total: number };
  goalPercent: number;
}}) {
  return (
    <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4 sticky top-6">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Progresso do Dia</div>

      {/* Meta geral */}
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400">Meta geral</span>
          <span className="font-bold text-white">{progress.goalPercent}%</span>
        </div>
        <div className="h-2.5 bg-[#334155] rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all",
            progress.goalPercent >= 80 ? "bg-green-500" : progress.goalPercent >= 50 ? "bg-sky-500" : "bg-orange-500"
          )} style={{ width: `${progress.goalPercent}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        <ProgressRow icon="📞" label="Contatos" done={progress.contacts.done} total={progress.contacts.goal} />
        <ProgressRow icon="🔔" label="Follow-ups" done={progress.followups.done} total={progress.followups.total} />
        <ProgressRow icon="📅" label="Reuniões" done={progress.meetings.done} total={progress.meetings.total} />
        <ProgressRow icon="📄" label="Propostas" done={progress.proposals.done} total={progress.proposals.total} />
      </div>
    </div>
  );
}

function ProgressRow({ icon, label, done, total }: { icon: string; label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-slate-400"><span>{icon}</span>{label}</span>
        <span className="text-white font-medium">{done}/{total}</span>
      </div>
      <div className="h-1 bg-[#334155] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-green-500" : "bg-sky-500")}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

// ── DaySummaryScreen ──────────────────────────────────────────────────────────

function DaySummaryScreen({ summary, completed, skipped, queue, onRestart }: {
  summary: DaySummary;
  completed: string[];
  skipped: string[];
  queue: ExecutionTask[];
  onRestart: () => void;
}) {
  const completedTasks = queue.filter(t => completed.includes(t.lead.id));
  const skippedTasks = queue.filter(t => skipped.includes(t.lead.id));

  const rating = summary.goalPercent >= 80 ? "excelente" : summary.goalPercent >= 50 ? "bom" : "regular";
  const ratingConfig = {
    excelente: { emoji: "🏆", color: "text-yellow-400", label: "Dia excelente!" },
    bom: { emoji: "⭐", color: "text-sky-400", label: "Bom trabalho!" },
    regular: { emoji: "💪", color: "text-orange-400", label: "Continue melhorando!" },
  }[rating];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="text-center py-6">
        <div className="text-5xl mb-3">{ratingConfig.emoji}</div>
        <h1 className={cn("text-2xl font-bold mb-1", ratingConfig.color)}>{ratingConfig.label}</h1>
        <p className="text-slate-400 text-sm">Modo Execução encerrado</p>
      </div>

      {/* Análise do dia */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <div className="p-4 border-b border-[#334155] flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-white text-sm">Análise do Dia</span>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <SummaryLine
            icon="📞"
            text={`Você realizou ${summary.contacts.done} de ${summary.contacts.goal} contatos`}
            value={`${Math.round((summary.contacts.done / summary.contacts.goal) * 100)}% da meta`}
            good={summary.contacts.done >= summary.contacts.goal * 0.8}
          />
          <SummaryLine
            icon="🔔"
            text={`Fez ${summary.followups.done} de ${summary.followups.total} follow-ups`}
            value={summary.followups.total > 0 ? `${Math.round((summary.followups.done / summary.followups.total) * 100)}%` : "—"}
            good={summary.followups.done >= summary.followups.total}
          />
          <SummaryLine
            icon="📅"
            text={`Reuniões realizadas: ${summary.meetings.done} de ${summary.meetings.scheduled} agendadas`}
            good={summary.meetings.done === summary.meetings.scheduled}
          />
          <SummaryLine
            icon="📄"
            text={`Propostas em andamento: ${summary.proposals.sent}`}
            good={summary.proposals.sent > 0}
          />
          {summary.leadsWithoutAction > 0 && (
            <SummaryLine
              icon="⚠️"
              text={`${summary.leadsWithoutAction} lead${summary.leadsWithoutAction > 1 ? "s ficaram" : " ficou"} sem próxima ação`}
              good={false}
            />
          )}
          {completed.length > 0 && (
            <SummaryLine icon="✅" text={`${completed.length} tarefa${completed.length > 1 ? "s" : ""} concluída${completed.length > 1 ? "s" : ""}`} good={true} />
          )}
          {skipped.length > 0 && (
            <SummaryLine icon="⏭️" text={`${skipped.length} tarefa${skipped.length > 1 ? "s adiadas" : " adiada"} para amanhã`} good={false} />
          )}
        </div>
      </div>

      {/* Prioridade de amanhã */}
      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">Principal prioridade para amanhã</div>
            <p className="text-sm text-white">{summary.topPriorityTomorrow}</p>
          </div>
        </div>
      </div>

      {/* Tarefas concluídas */}
      {completedTasks.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <div className="p-3 border-b border-[#334155] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">Concluídas ({completedTasks.length})</span>
          </div>
          <div className="divide-y divide-[#334155]">
            {completedTasks.map(task => (
              <div key={task.lead.id} className="flex items-center gap-3 px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm text-slate-300 flex-1">{task.lead.name}</span>
                <span className="text-xs text-slate-500">{taskTypeConfig[task.taskType].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <button onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#273549] border border-[#334155] text-slate-300 py-3 rounded-xl font-medium transition-colors">
          <RefreshCw className="w-4 h-4" />Nova sessão
        </button>
        <Link href="/" className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-semibold transition-colors">
          <ArrowRight className="w-4 h-4" />Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function SummaryLine({ icon, text, value, good }: { icon: string; text: string; value?: string; good: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{icon}</span>
      <span className={cn("flex-1 text-sm", good ? "text-slate-300" : "text-slate-400")}>{text}</span>
      {value && <span className={cn("text-xs font-medium", good ? "text-green-400" : "text-orange-400")}>{value}</span>}
    </div>
  );
}
