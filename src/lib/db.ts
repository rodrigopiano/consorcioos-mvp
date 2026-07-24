import { supabase } from "./supabase";
import { Lead, NextAction } from "./types";

// ── Leads ──────────────────────────────────────────────

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*, next_actions(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(mapLead);
}

export async function createLead(
  lead: Omit<Lead, "id" | "createdAt" | "nextAction">,
  nextAction: Omit<NextAction, "completed">
) {
  const { data: leadData, error: leadError } = await supabase
    .from("leads")
    .insert({
      name: lead.name,
      phone: lead.phone,
      origin: lead.origin,
      interest: lead.interest,
      stage: lead.stage,
      notes: lead.notes,
      value: lead.value,
      last_interaction: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (leadError) throw leadError;

  const { error: actionError } = await supabase.from("next_actions").insert({
    lead_id: leadData.id,
    description: nextAction.description,
    due_date: nextAction.dueDate,
    channel: nextAction.channel,
    completed: false,
  });

  if (actionError) throw actionError;

  return leadData;
}

export async function updateLeadStage(leadId: string, stage: Lead["stage"]) {
  const { error } = await supabase
    .from("leads")
    .update({ stage, last_interaction: new Date().toISOString().split("T")[0] })
    .eq("id", leadId);
  if (error) throw error;
}

export async function updateLead(
  leadId: string,
  data: Partial<Omit<Lead, "id" | "createdAt" | "nextAction">>
) {
  const { error } = await supabase
    .from("leads")
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.origin !== undefined && { origin: data.origin }),
      ...(data.interest !== undefined && { interest: data.interest }),
      ...(data.stage !== undefined && { stage: data.stage }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.value !== undefined && { value: data.value }),
      last_interaction: new Date().toISOString().split("T")[0],
    })
    .eq("id", leadId);
  if (error) throw error;
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("*, next_actions(*)")
    .eq("id", leadId)
    .single();
  if (error) return null;
  return mapLead(data);
}

export async function completeNextAction(actionId: string) {
  const { error } = await supabase
    .from("next_actions")
    .update({ completed: true })
    .eq("id", actionId);
  if (error) throw error;
}

export async function completeNextActionByLead(leadId: string) {
  const { error } = await supabase
    .from("next_actions")
    .update({ completed: true })
    .eq("lead_id", leadId)
    .eq("completed", false);
  if (error) throw error;
}

export async function setNextAction(
  leadId: string,
  action: Omit<NextAction, "completed">
) {
  // Marca todas as ações anteriores como concluídas
  await supabase
    .from("next_actions")
    .update({ completed: true })
    .eq("lead_id", leadId)
    .eq("completed", false);

  const { error } = await supabase.from("next_actions").insert({
    lead_id: leadId,
    description: action.description,
    due_date: action.dueDate,
    channel: action.channel,
    completed: false,
  });
  if (error) throw error;
}

// ── Daily Tasks ────────────────────────────────────────

export async function getTodayTasks() {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("due_date", today)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

export async function completeTask(taskId: string) {
  const { error } = await supabase
    .from("daily_tasks")
    .update({ completed: true })
    .eq("id", taskId);
  if (error) throw error;
}

// ── Metrics ────────────────────────────────────────────

export async function getTodayMetrics() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("date", today)
    .single();
  return data || { contacts_goal: 40, contacts_done: 0 };
}

export async function incrementContacts() {
  const today = new Date().toISOString().split("T")[0];
  const metrics = await getTodayMetrics();

  if (!metrics.id) {
    await supabase.from("daily_metrics").insert({
      date: today,
      contacts_goal: 40,
      contacts_done: 1,
    });
  } else {
    await supabase
      .from("daily_metrics")
      .update({ contacts_done: metrics.contacts_done + 1 })
      .eq("date", today);
  }
}

// ── Mapper ─────────────────────────────────────────────

function mapLead(row: Record<string, unknown>): Lead {
  const actions = (row.next_actions as Record<string, unknown>[] | null) || [];
  const activeAction = actions.find((a) => !a.completed) as Record<string, unknown> | undefined;

  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    origin: row.origin as Lead["origin"],
    interest: row.interest as Lead["interest"],
    stage: row.stage as Lead["stage"],
    lastInteraction: row.last_interaction as string,
    notes: (row.notes as string) || "",
    value: (row.value as number) || 0,
    createdAt: row.created_at as string,
    nextAction: activeAction
      ? {
          description: activeAction.description as string,
          dueDate: activeAction.due_date as string,
          channel: activeAction.channel as NextAction["channel"],
          completed: activeAction.completed as boolean,
        }
      : null,
  };
}
