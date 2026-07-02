import { Lead, FunnelStage } from "./types";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isOverdue(dateStr: string): boolean {
  return dateStr < localToday();
}

export function isDueToday(dateStr: string): boolean {
  return dateStr === localToday();
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
