import { Lead, FunnelStage } from "./types";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

export function isDueToday(dateStr: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getLeadUrgency(lead: Lead): "hot" | "overdue" | "today" | "ok" | "lost" {
  if (!lead.nextAction) return "lost";
  if (lead.stage === "venda") return "ok";
  const dueDate = lead.nextAction.dueDate;
  if (isOverdue(dueDate)) return "overdue";
  if (isDueToday(dueDate)) return "today";
  return "ok";
}

export const FUNNEL_ORDER: FunnelStage[] = [
  "prospeccao",
  "contato_ativo",
  "qualificacao",
  "reuniao_agendada",
  "reuniao_realizada",
  "proposta_enviada",
  "followup",
  "venda",
];

export function stageIndex(stage: FunnelStage): number {
  return FUNNEL_ORDER.indexOf(stage);
}
