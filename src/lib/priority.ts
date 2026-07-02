import { Lead } from "./types";
import { isOverdue, isDueToday } from "./utils";

export type TaskPriority =
  | "respondeu_hoje"
  | "followup_atrasado"
  | "reuniao_hoje"
  | "proposta_pendente"
  | "novo_contato"
  | "sem_acao";

export interface ExecutionTask {
  lead: Lead;
  priority: TaskPriority;
  priorityScore: number;
  reason: string;
  recommendedAction: string;
  estimatedMinutes: number;
  taskType: "followup" | "reuniao" | "proposta" | "contato" | "atualizacao";
}

// Probabilidade de fechamento por etapa
export const STAGE_PROBABILITY: Record<Lead["stage"], number> = {
  prospeccao: 5,
  contato_ativo: 15,
  qualificacao: 25,
  reuniao_agendada: 45,
  reuniao_realizada: 60,
  proposta_enviada: 70,
  followup: 50,
  venda: 100,
};

const BASE_SCORE: Record<TaskPriority, number> = {
  respondeu_hoje: 100,
  followup_atrasado: 90,
  reuniao_hoje: 85,
  proposta_pendente: 70,
  novo_contato: 50,
  sem_acao: 10,
};

const PRIORITY_REASON: Record<TaskPriority, string> = {
  respondeu_hoje: "Respondeu recentemente — momento ideal para avançar",
  followup_atrasado: "Follow-up atrasado — risco de perder o lead",
  reuniao_hoje: "Reunião agendada para hoje",
  proposta_pendente: "Proposta enviada aguardando resposta",
  novo_contato: "Primeiro contato ainda não realizado",
  sem_acao: "Lead sem próxima ação definida",
};

function detectPriority(lead: Lead): TaskPriority {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (!lead.nextAction) return "sem_acao";

  if (lead.stage === "reuniao_agendada" && isDueToday(lead.nextAction.dueDate)) {
    return "reuniao_hoje";
  }
  if (lead.stage === "proposta_enviada") {
    return "proposta_pendente";
  }
  if (lead.lastInteraction === todayStr && lead.stage !== "prospeccao") {
    return "respondeu_hoje";
  }
  if (isOverdue(lead.nextAction.dueDate)) {
    return "followup_atrasado";
  }
  if (lead.stage === "prospeccao" || lead.stage === "contato_ativo") {
    return "novo_contato";
  }
  return "followup_atrasado";
}

function calcBonus(lead: Lead): number {
  let bonus = 0;
  // Valor do lead: até +20 pontos
  if (lead.value && lead.value > 0) {
    bonus += Math.min(20, Math.round((lead.value / 500000) * 20));
  }
  // Dias de atraso: +2 por dia, máx +15
  if (lead.nextAction && isOverdue(lead.nextAction.dueDate)) {
    const due = new Date(lead.nextAction.dueDate + "T12:00:00");
    const diffDays = Math.floor((Date.now() - due.getTime()) / 86400000);
    bonus += Math.min(15, diffDays * 2);
  }
  // Estágio avançado: até +10
  const stageBonus: Record<Lead["stage"], number> = {
    prospeccao: 0, contato_ativo: 2, qualificacao: 4,
    reuniao_agendada: 6, reuniao_realizada: 8,
    proposta_enviada: 10, followup: 7, venda: 0,
  };
  bonus += stageBonus[lead.stage] ?? 0;
  return bonus;
}

function getRecommendedAction(lead: Lead, priority: TaskPriority): string {
  if (lead.nextAction?.description) return lead.nextAction.description;
  const defaults: Record<TaskPriority, string> = {
    respondeu_hoje: "Continuar a conversa e tentar agendar reunião",
    followup_atrasado: "Entrar em contato imediatamente por WhatsApp ou ligação",
    reuniao_hoje: "Confirmar presença e preparar material da reunião",
    proposta_pendente: "Fazer follow-up da proposta enviada",
    novo_contato: "Realizar primeiro contato via WhatsApp com mensagem padrão",
    sem_acao: "Definir próxima ação e data de follow-up",
  };
  return defaults[priority];
}

function getEstimatedMinutes(priority: TaskPriority): number {
  const times: Record<TaskPriority, number> = {
    respondeu_hoje: 5, followup_atrasado: 3, reuniao_hoje: 45,
    proposta_pendente: 5, novo_contato: 3, sem_acao: 2,
  };
  return times[priority];
}

function getTaskType(priority: TaskPriority): ExecutionTask["taskType"] {
  if (priority === "reuniao_hoje") return "reuniao";
  if (priority === "proposta_pendente") return "proposta";
  if (priority === "novo_contato") return "contato";
  if (priority === "sem_acao") return "atualizacao";
  return "followup";
}

export function buildExecutionQueue(leads: Lead[]): ExecutionTask[] {
  return leads
    .filter(l => l.stage !== "venda")
    .map(lead => {
      const priority = detectPriority(lead);
      return {
        lead,
        priority,
        priorityScore: BASE_SCORE[priority] + calcBonus(lead),
        reason: PRIORITY_REASON[priority],
        recommendedAction: getRecommendedAction(lead, priority),
        estimatedMinutes: getEstimatedMinutes(priority),
        taskType: getTaskType(priority),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getLeadsWithoutAction(leads: Lead[]): Lead[] {
  return leads.filter(l => !l.nextAction && l.stage !== "venda");
}

// ── Radar de Fechamento ────────────────────────────────
export interface RadarLead {
  lead: Lead;
  probability: number;
  expectedValue: number;
}

export function buildClosingRadar(leads: Lead[]): RadarLead[] {
  return leads
    .filter(l => l.stage !== "venda" && l.stage !== "prospeccao")
    .map(lead => {
      const probability = STAGE_PROBABILITY[lead.stage] ?? 0;
      const expectedValue = ((lead.value ?? 0) * probability) / 100;
      return { lead, probability, expectedValue };
    })
    .sort((a, b) => b.expectedValue - a.expectedValue)
    .slice(0, 6);
}

// ── Receita em Risco ──────────────────────────────────
export interface RiskRevenue {
  total: number;
  leads: Lead[];
}

export function calcRiskRevenue(leads: Lead[]): RiskRevenue {
  const risky = leads.filter(l =>
    (l.stage === "proposta_enviada" || l.stage === "followup") &&
    l.nextAction && isOverdue(l.nextAction.dueDate)
  );
  return { total: risky.reduce((s, l) => s + (l.value ?? 0), 0), leads: risky };
}

// ── Pipeline Financeiro ───────────────────────────────
export interface PipelineStage {
  stage: Lead["stage"];
  label: string;
  count: number;
  total: number;
}

export function buildPipeline(leads: Lead[]): PipelineStage[] {
  const stages: Lead["stage"][] = [
    "prospeccao", "contato_ativo", "qualificacao",
    "reuniao_agendada", "reuniao_realizada", "proposta_enviada", "followup",
  ];
  const labels: Record<Lead["stage"], string> = {
    prospeccao: "Prospecção", contato_ativo: "Contato", qualificacao: "Qualificação",
    reuniao_agendada: "Reunião", reuniao_realizada: "Pós-reunião",
    proposta_enviada: "Proposta", followup: "Follow-up", venda: "Venda",
  };
  return stages.map(stage => {
    const sl = leads.filter(l => l.stage === stage);
    return { stage, label: labels[stage], count: sl.length, total: sl.reduce((s, l) => s + (l.value ?? 0), 0) };
  });
}

// ── Day Summary ───────────────────────────────────────
export interface DaySummary {
  contacts: { done: number; goal: number };
  followups: { done: number; total: number };
  meetings: { done: number; scheduled: number };
  proposals: { sent: number };
  leadsWithoutAction: number;
  topPriorityTomorrow: string;
  goalPercent: number;
}

export function buildDaySummary(
  leads: Lead[],
  sessionCompleted: string[],
  contactsDone: number,
  contactsGoal: number
): DaySummary {
  const followupLeads = leads.filter(l => l.stage === "followup" || l.stage === "proposta_enviada");
  const followupsDone = sessionCompleted.filter(id => followupLeads.some(l => l.id === id)).length;
  const meetingsScheduled = leads.filter(l => l.stage === "reuniao_agendada").length;
  const meetingsDone = leads.filter(l => l.stage === "reuniao_realizada").length;
  const proposalsSent = leads.filter(l => l.stage === "proposta_enviada").length;
  const leadsWithoutAction = leads.filter(l => !l.nextAction && l.stage !== "venda").length;
  const goalPercent = Math.round(
    (sessionCompleted.length / Math.max(leads.filter(l => l.stage !== "venda").length, 1)) * 100
  );
  const hasOverdue = leads.some(l => l.nextAction && isOverdue(l.nextAction.dueDate));
  const hasProposals = leads.some(l => l.stage === "proposta_enviada");
  let topPriorityTomorrow = "Manter o ritmo de contatos e follow-ups";
  if (hasOverdue) topPriorityTomorrow = "Concluir os follow-ups atrasados e retomar leads sem resposta";
  else if (hasProposals) topPriorityTomorrow = "Fazer follow-up das propostas pendentes e tentar fechar negócio";
  else if (leadsWithoutAction > 0) topPriorityTomorrow = `Definir próxima ação para ${leadsWithoutAction} lead${leadsWithoutAction > 1 ? "s" : ""} sem acompanhamento`;

  return {
    contacts: { done: contactsDone, goal: contactsGoal },
    followups: { done: followupsDone, total: followupLeads.length },
    meetings: { done: meetingsDone, scheduled: meetingsScheduled },
    proposals: { sent: proposalsSent },
    leadsWithoutAction,
    topPriorityTomorrow,
    goalPercent,
  };
}
