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

const PRIORITY_SCORE: Record<TaskPriority, number> = {
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
  const today = new Date().toISOString().split("T")[0];

  if (!lead.nextAction) return "sem_acao";

  if (lead.stage === "reuniao_agendada" && isDueToday(lead.nextAction.dueDate)) {
    return "reuniao_hoje";
  }

  if (lead.stage === "proposta_enviada") {
    return "proposta_pendente";
  }

  if (lead.lastInteraction === today && lead.stage !== "prospeccao") {
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
    respondeu_hoje: 5,
    followup_atrasado: 3,
    reuniao_hoje: 45,
    proposta_pendente: 5,
    novo_contato: 3,
    sem_acao: 2,
  };
  return times[priority];
}

function getTaskType(priority: TaskPriority, lead: Lead): ExecutionTask["taskType"] {
  if (priority === "reuniao_hoje") return "reuniao";
  if (priority === "proposta_pendente") return "proposta";
  if (priority === "novo_contato") return "contato";
  if (priority === "sem_acao") return "atualizacao";
  return "followup";
}

export function buildExecutionQueue(leads: Lead[]): ExecutionTask[] {
  const active = leads.filter(l => l.stage !== "venda");

  return active
    .map(lead => {
      const priority = detectPriority(lead);
      return {
        lead,
        priority,
        priorityScore: PRIORITY_SCORE[priority],
        reason: PRIORITY_REASON[priority],
        recommendedAction: getRecommendedAction(lead, priority),
        estimatedMinutes: getEstimatedMinutes(priority),
        taskType: getTaskType(priority, lead),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getLeadsWithoutAction(leads: Lead[]): Lead[] {
  return leads.filter(l => !l.nextAction && l.stage !== "venda");
}

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
  const today = new Date().toISOString().split("T")[0];

  const followupLeads = leads.filter(l =>
    l.stage === "followup" || l.stage === "proposta_enviada"
  );
  const followupsDone = sessionCompleted.filter(id =>
    followupLeads.some(l => l.id === id)
  ).length;

  const meetingsScheduled = leads.filter(l => l.stage === "reuniao_agendada").length;
  const meetingsDone = leads.filter(l => l.stage === "reuniao_realizada").length;

  const proposalsSent = leads.filter(l => l.stage === "proposta_enviada").length;
  const leadsWithoutAction = leads.filter(l => !l.nextAction && l.stage !== "venda").length;

  const goalPercent = Math.round((sessionCompleted.length / Math.max(leads.filter(l => l.stage !== "venda").length, 1)) * 100);

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
