"use client";
import { useState } from "react";
import {
  Bell, Phone, MessageCircle, CheckCircle2, Clock,
  ChevronRight, Flame, AlertTriangle, Hourglass
} from "lucide-react";
import { mockLeads } from "@/lib/mock-data";
import { Lead } from "@/lib/types";
import { STAGE_LABELS, CHANNEL_LABELS, INTEREST_LABELS } from "@/lib/types";
import { getLeadUrgency, formatDate, formatCurrency, isDueToday, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Filter = "all" | "today" | "overdue";

export default function FollowUpPage() {
  const [filter, setFilter] = useState<Filter>("today");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [postponed, setPostponed] = useState<Set<string>>(new Set());

  const actionableLeads = mockLeads.filter(
    (l) => l.nextAction && l.stage !== "venda"
  );

  const filtered = actionableLeads.filter((lead) => {
    if (!lead.nextAction) return false;
    if (filter === "today") return isDueToday(lead.nextAction.dueDate) || isOverdue(lead.nextAction.dueDate);
    if (filter === "overdue") return isOverdue(lead.nextAction.dueDate);
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const urgencyOrder = { overdue: 0, today: 1, hot: 2, ok: 3, lost: 4 };
    return urgencyOrder[getLeadUrgency(a)] - urgencyOrder[getLeadUrgency(b)];
  });

  const todayCount = actionableLeads.filter(l => l.nextAction && isDueToday(l.nextAction.dueDate)).length;
  const overdueCount = actionableLeads.filter(l => l.nextAction && isOverdue(l.nextAction.dueDate)).length;
  const completedCount = completed.size;

  function handleComplete(id: string) {
    setCompleted(prev => { const s = new Set(prev); s.add(id); return s; });
  }
  function handlePostpone(id: string) {
    setPostponed(prev => { const s = new Set(prev); s.add(id); return s; });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-orange-400" />
          Follow-up
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {overdueCount > 0 ? (
            <span className="text-orange-400 font-medium">{overdueCount} atrasados · </span>
          ) : null}
          {todayCount} para hoje · {completedCount} concluídos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {([
          ["today", `Hoje (${todayCount})`],
          ["overdue", `Atrasados (${overdueCount})`],
          ["all", "Todos"],
        ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === f
                ? f === "overdue" ? "bg-orange-500 text-white" : "bg-sky-500 text-white"
                : "bg-[#1e293b] text-slate-400 hover:text-white border border-[#334155]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-white font-medium">Tudo em dia!</p>
            <p className="text-slate-400 text-sm mt-1">Nenhum follow-up pendente para este filtro.</p>
          </div>
        )}
        {sorted.map((lead) => {
          const isDone = completed.has(lead.id);
          const isPost = postponed.has(lead.id);
          const urgency = getLeadUrgency(lead);
          return (
            <FollowUpCard
              key={lead.id}
              lead={lead}
              urgency={urgency}
              isDone={isDone}
              isPostponed={isPost}
              onComplete={() => handleComplete(lead.id)}
              onPostpone={() => handlePostpone(lead.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FollowUpCard({
  lead, urgency, isDone, isPostponed, onComplete, onPostpone,
}: {
  lead: Lead;
  urgency: ReturnType<typeof getLeadUrgency>;
  isDone: boolean;
  isPostponed: boolean;
  onComplete: () => void;
  onPostpone: () => void;
}) {
  const action = lead.nextAction!;

  const urgencyConfig = {
    overdue: { bg: "border-orange-500/40 bg-orange-500/5", badge: "bg-orange-500 text-white", icon: <AlertTriangle className="w-3 h-3" />, label: "Atrasado" },
    today: { bg: "border-sky-500/30 bg-sky-500/5", badge: "bg-sky-500/20 text-sky-300", icon: <Clock className="w-3 h-3" />, label: "Hoje" },
    hot: { bg: "border-red-500/30 bg-red-500/5", badge: "bg-red-500/20 text-red-300", icon: <Flame className="w-3 h-3" />, label: "Quente" },
    ok: { bg: "border-[#334155]", badge: "bg-[#334155] text-slate-400", icon: <Clock className="w-3 h-3" />, label: formatDate(action.dueDate) },
    lost: { bg: "border-red-800/40", badge: "bg-red-900/40 text-red-400", icon: <AlertTriangle className="w-3 h-3" />, label: "Sem ação" },
  };

  const cfg = urgencyConfig[urgency];

  return (
    <div className={cn(
      "bg-[#1e293b] rounded-xl border p-4 transition-opacity",
      cfg.bg,
      (isDone || isPostponed) && "opacity-50"
    )}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
          {lead.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{lead.name}</span>
            <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", cfg.badge)}>
              {cfg.icon}
              {cfg.label}
            </span>
            <span className="text-xs text-slate-500">{INTEREST_LABELS[lead.interest]}</span>
          </div>

          <div className="mt-1.5 text-sm text-slate-300">{action.description}</div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="bg-[#334155] px-2 py-0.5 rounded">{STAGE_LABELS[lead.stage]}</span>
            <span>Canal: {CHANNEL_LABELS[action.channel]}</span>
            {lead.value && <span className="text-green-400">{formatCurrency(lead.value)}</span>}
          </div>
        </div>

        {/* Canal rápido */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {action.channel === "whatsapp" ? (
            <a
              href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
              title="Abrir WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          ) : (
            <a
              href={`tel:${lead.phone.replace(/\D/g, "")}`}
              className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-colors"
              title="Ligar"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Ações */}
      {!isDone && !isPostponed && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[#334155]">
          <button
            onClick={onComplete}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Concluir
          </button>
          <button
            onClick={onPostpone}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#334155] hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            <Hourglass className="w-3.5 h-3.5" />
            Adiar 1 dia
          </button>
          <button className="flex items-center justify-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
            Próxima ação
          </button>
        </div>
      )}
      {isDone && (
        <div className="mt-3 pt-3 border-t border-[#334155] flex items-center gap-2 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Concluído hoje
        </div>
      )}
      {isPostponed && (
        <div className="mt-3 pt-3 border-t border-[#334155] flex items-center gap-2 text-xs text-slate-400">
          <Hourglass className="w-3.5 h-3.5" />
          Adiado para amanhã
        </div>
      )}
    </div>
  );
}
