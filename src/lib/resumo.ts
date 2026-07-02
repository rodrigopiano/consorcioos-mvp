import { Lead, STAGE_LABELS } from "./types";
import { buildClosingRadar, calcRiskRevenue, buildExecutionQueue, STAGE_PROBABILITY } from "./priority";
import { isOverdue, formatCurrency } from "./utils";

const COMMISSION_RATE = 0.012; // 1.2%
const STORAGE_KEY = "consorcioos_reports";
const MAX_HISTORY = 30;

// ── Tipos ──────────────────────────────────────────────

export interface DailyReportMetric {
  done: number;
  goal: number;
}

export interface DailyReportLead {
  id: string;
  name: string;
  stage: string;
  stageLabel: string;
  value: number;
  probability: number;
  expectedValue: number;
  daysOverdue: number;
}

export interface DailyReport {
  date: string; // YYYY-MM-DD
  generatedAt: string;

  // Execução
  contacts: DailyReportMetric;
  followups: DailyReportMetric;
  meetings: DailyReportMetric;
  proposals: DailyReportMetric;
  salesClosed: number;
  tasksCompleted: number;
  tasksTotal: number;
  goalPercent: number;

  // Financeiro
  pipelineTotal: number;
  riskRevenue: number;
  negotiationRevenue: number;
  salesValue: number;
  estimatedCommission: number;

  // Leads em destaque
  hotLeads: DailyReportLead[];
  riskLeads: DailyReportLead[];
  bigOpportunities: DailyReportLead[];

  // Análise
  analysisText: string;
  tomorrowPriorities: string[];

  // Rating
  rating: "excelente" | "bom" | "regular";
}

// ── Calculadora principal ──────────────────────────────

export function buildDailyReport(
  leads: Lead[],
  session: {
    contactsDone: number;
    contactsGoal: number;
    tasksCompleted: number;
    tasksTotal: number;
  }
): DailyReport {
  const today = localDateStr();

  // Métricas de execução
  const followupLeads = leads.filter(l => l.stage === "followup" || l.stage === "proposta_enviada");
  const meetingsScheduled = leads.filter(l => l.stage === "reuniao_agendada").length;
  const meetingsDone = leads.filter(l =>
    l.stage === "reuniao_realizada" || l.stage === "proposta_enviada" ||
    l.stage === "followup" || l.stage === "venda"
  ).length;
  const proposalsSent = leads.filter(l => l.stage === "proposta_enviada").length;
  const salesClosed = leads.filter(l => l.stage === "venda").length;

  const goalPercent = session.tasksTotal > 0
    ? Math.round((session.tasksCompleted / session.tasksTotal) * 100)
    : 0;

  // Financeiro
  const pipelineTotal = leads.filter(l => l.stage !== "venda")
    .reduce((s, l) => s + (l.value ?? 0), 0);
  const { total: riskRevenue } = calcRiskRevenue(leads);
  const negotiationRevenue = leads
    .filter(l => l.stage === "proposta_enviada" || l.stage === "followup")
    .reduce((s, l) => s + (l.value ?? 0), 0);
  const salesValue = leads.filter(l => l.stage === "venda")
    .reduce((s, l) => s + (l.value ?? 0), 0);
  const estimatedCommission = salesValue * COMMISSION_RATE;

  // Leads em destaque
  const radar = buildClosingRadar(leads);
  const hotLeads: DailyReportLead[] = radar.slice(0, 3).map(r => ({
    id: r.lead.id,
    name: r.lead.name,
    stage: r.lead.stage,
    stageLabel: STAGE_LABELS[r.lead.stage],
    value: r.lead.value ?? 0,
    probability: r.probability,
    expectedValue: r.expectedValue,
    daysOverdue: 0,
  }));

  const riskLeads: DailyReportLead[] = leads
    .filter(l => l.nextAction && isOverdue(l.nextAction.dueDate) && l.stage !== "venda")
    .slice(0, 4)
    .map(l => {
      const due = new Date((l.nextAction!.dueDate) + "T12:00:00");
      const daysOverdue = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000));
      return {
        id: l.id, name: l.name, stage: l.stage,
        stageLabel: STAGE_LABELS[l.stage],
        value: l.value ?? 0, probability: STAGE_PROBABILITY[l.stage] ?? 0,
        expectedValue: ((l.value ?? 0) * (STAGE_PROBABILITY[l.stage] ?? 0)) / 100,
        daysOverdue,
      };
    });

  const bigOpportunities: DailyReportLead[] = [...leads]
    .filter(l => (l.value ?? 0) > 0 && l.stage !== "venda")
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 3)
    .map(l => ({
      id: l.id, name: l.name, stage: l.stage,
      stageLabel: STAGE_LABELS[l.stage],
      value: l.value ?? 0,
      probability: STAGE_PROBABILITY[l.stage] ?? 0,
      expectedValue: ((l.value ?? 0) * (STAGE_PROBABILITY[l.stage] ?? 0)) / 100,
      daysOverdue: 0,
    }));

  // Análise automática
  const analysisText = generateAnalysis({
    goalPercent, contacts: { done: session.contactsDone, goal: session.contactsGoal },
    followups: { done: session.tasksCompleted, total: followupLeads.length },
    riskLeads: riskLeads.length, proposalsSent, hotLeads,
  });

  // Prioridades de amanhã
  const queue = buildExecutionQueue(leads);
  const tomorrowPriorities = generateTomorrowPriorities({
    queue, riskLeads, bigOpportunities,
    contactsGoal: session.contactsGoal, contactsDone: session.contactsDone,
  });

  const rating: DailyReport["rating"] =
    goalPercent >= 80 ? "excelente" : goalPercent >= 50 ? "bom" : "regular";

  return {
    date: today, generatedAt: new Date().toISOString(),
    contacts: { done: session.contactsDone, goal: session.contactsGoal },
    followups: { done: session.tasksCompleted, total: followupLeads.length },
    meetings: { done: meetingsDone, goal: meetingsScheduled },
    proposals: { done: proposalsSent, goal: Math.max(proposalsSent, 1) },
    salesClosed, tasksCompleted: session.tasksCompleted, tasksTotal: session.tasksTotal,
    goalPercent, pipelineTotal, riskRevenue, negotiationRevenue, salesValue,
    estimatedCommission, hotLeads, riskLeads, bigOpportunities,
    analysisText, tomorrowPriorities, rating,
  };
}

// ── Análise automática ─────────────────────────────────

function generateAnalysis(data: {
  goalPercent: number;
  contacts: { done: number; goal: number };
  followups: { done: number; total: number };
  riskLeads: number;
  proposalsSent: number;
  hotLeads: DailyReportLead[];
}): string {
  const parts: string[] = [];

  // Abertura
  if (data.goalPercent >= 80) {
    parts.push(`Hoje você concluiu ${data.goalPercent}% da sua meta diária — um dia excelente.`);
  } else if (data.goalPercent >= 50) {
    parts.push(`Hoje você concluiu ${data.goalPercent}% da sua meta diária — bom ritmo, mas ainda há espaço para melhorar.`);
  } else if (data.goalPercent > 0) {
    parts.push(`Hoje você concluiu ${data.goalPercent}% da meta diária — amanhã é uma nova oportunidade de acelerar.`);
  } else {
    parts.push("Nenhuma execução registrada hoje — use o Modo Execução para registrar seu progresso diário.");
  }

  // Gargalo principal
  const contactPct = data.contacts.goal > 0 ? data.contacts.done / data.contacts.goal : 0;
  if (contactPct < 0.5 && data.contacts.goal > 0) {
    parts.push(`Seu principal gargalo foi o volume de contatos: apenas ${data.contacts.done} de ${data.contacts.goal} realizados.`);
  } else if (data.proposalsSent === 0) {
    parts.push("Nenhuma proposta foi enviada hoje — considere avançar leads qualificados para proposta amanhã.");
  } else if (data.followups.total > 0 && data.followups.done < data.followups.total * 0.5) {
    parts.push(`Vários follow-ups ficaram pendentes (${data.followups.done} de ${data.followups.total}).`);
  }

  // Leads em risco
  if (data.riskLeads > 0) {
    parts.push(`Existem ${data.riskLeads} lead${data.riskLeads > 1 ? "s" : ""} em risco que precisam de ação amanhã.`);
  }

  // Maior oportunidade
  if (data.hotLeads.length > 0) {
    const top = data.hotLeads[0];
    parts.push(`Sua maior oportunidade é ${top.name} (${formatCurrency(top.value)}, ${top.probability}% de probabilidade).`);
  }

  return parts.join(" ");
}

// ── Prioridades de amanhã ──────────────────────────────

function generateTomorrowPriorities(data: {
  queue: ReturnType<typeof buildExecutionQueue>;
  riskLeads: DailyReportLead[];
  bigOpportunities: DailyReportLead[];
  contactsGoal: number;
  contactsDone: number;
}): string[] {
  const priorities: string[] = [];

  if (data.queue.length > 0) {
    priorities.push(`Iniciar pelo lead mais urgente: ${data.queue[0].lead.name} — ${data.queue[0].recommendedAction}`);
  }
  if (data.riskLeads.length > 0) {
    const top = data.riskLeads[0];
    priorities.push(`Follow-up atrasado: ${top.name} (${top.daysOverdue} dia${top.daysOverdue > 1 ? "s" : ""} sem contato)`);
  }
  if (data.bigOpportunities.length > 0) {
    const top = data.bigOpportunities[0];
    priorities.push(`Maior oportunidade: ${top.name} — ${formatCurrency(top.value)} com ${top.probability}% de probabilidade`);
  }
  const deficit = Math.max(0, data.contactsGoal - data.contactsDone);
  if (deficit > 0) {
    priorities.push(`Realizar ${data.contactsGoal} contatos para atingir a meta diária`);
  }

  return priorities;
}

// ── Histórico (localStorage) ───────────────────────────

export function saveReport(report: DailyReport): void {
  if (typeof window === "undefined") return;
  const history = getHistory();
  const idx = history.findIndex(r => r.date === report.date);
  if (idx >= 0) {
    history[idx] = report;
  } else {
    history.unshift(report);
    if (history.length > MAX_HISTORY) history.pop();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getHistory(): DailyReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as DailyReport[];
  } catch {
    return [];
  }
}

export function getReportByDate(date: string): DailyReport | null {
  return getHistory().find(r => r.date === date) ?? null;
}

export function getYesterdayReport(): DailyReport | null {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return getReportByDate(`${y}-${m}-${day}`);
}

// ── Helpers ────────────────────────────────────────────

export function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatReportDate(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export const RATING_CONFIG = {
  excelente: { emoji: "🏆", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Dia Excelente" },
  bom:       { emoji: "⭐", color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/20",       label: "Bom Trabalho" },
  regular:   { emoji: "💪", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", label: "Continue Melhorando" },
};
