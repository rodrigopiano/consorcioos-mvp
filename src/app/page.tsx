"use client";
import Link from "next/link";
import {
  Phone, Users, Bell, Calendar, TrendingUp,
  ChevronRight, AlertTriangle, Zap, Clock, CheckCircle2
} from "lucide-react";
import { mockLeads, mockTasks, metricsMock } from "@/lib/mock-data";
import { getLeadUrgency, formatCurrency, isDueToday } from "@/lib/utils";
import { STAGE_LABELS, CHANNEL_LABELS } from "@/lib/types";

export default function Dashboard() {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const todayTasks = mockTasks.filter((t) => isDueToday(t.dueDate));
  const completedTasks = todayTasks.filter((t) => t.completed).length;
  const progress = todayTasks.length > 0 ? Math.round((completedTasks / todayTasks.length) * 100) : 0;

  const followupsDue = mockLeads.filter(
    (l) => l.nextAction && isDueToday(l.nextAction.dueDate) && l.stage !== "venda"
  );

  const overdueLeads = mockLeads.filter((l) => getLeadUrgency(l) === "overdue");
  const meetingsToday = mockLeads.filter((l) => l.stage === "reuniao_agendada" && l.nextAction && isDueToday(l.nextAction.dueDate));

  const nextAction = followupsDue.find((l) => !l.nextAction?.completed);

  const { contacts } = metricsMock;
  const contactProgress = Math.round((contacts.done / contacts.total) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bom dia, Consultor 👋</h1>
          <p className="text-slate-400 text-sm capitalize">{today}</p>
        </div>
        <Link
          href="/leads/novo"
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Users className="w-4 h-4" />
          Novo Lead
        </Link>
      </div>

      {/* PRÓXIMA AÇÃO — destaque máximo */}
      {nextAction && (
        <div className="bg-gradient-to-r from-sky-500/20 to-blue-600/10 border border-sky-500/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
                Próxima Ação Obrigatória
              </div>
              <div className="text-white font-semibold text-base">{nextAction.name}</div>
              <div className="text-slate-300 text-sm mt-0.5">{nextAction.nextAction?.description}</div>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-slate-400">
                  {STAGE_LABELS[nextAction.stage]} • {nextAction.nextAction ? CHANNEL_LABELS[nextAction.nextAction.channel] : ""}
                </span>
              </div>
            </div>
            <Link
              href="/followup"
              className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              Agir
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Alertas */}
      {overdueLeads.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-orange-300 font-medium text-sm">
              {overdueLeads.length} lead{overdueLeads.length > 1 ? "s" : ""} com ação atrasada —{" "}
            </span>
            <span className="text-orange-400/80 text-sm">
              {overdueLeads.map((l) => l.name).join(", ")}
            </span>
          </div>
          <Link href="/followup" className="text-orange-400 text-xs font-medium hover:text-orange-300">
            Ver agora →
          </Link>
        </div>
      )}

      {/* Métricas do dia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Phone className="w-5 h-5" />}
          label="Contatos"
          value={`${contacts.done}/${contacts.total}`}
          sub={`${contactProgress}% da meta`}
          color="sky"
          progress={contactProgress}
        />
        <MetricCard
          icon={<Bell className="w-5 h-5" />}
          label="Follow-ups hoje"
          value={String(followupsDue.length)}
          sub={`${followupsDue.filter(l => l.nextAction?.completed).length} concluídos`}
          color="orange"
          urgent={followupsDue.filter(l => !l.nextAction?.completed).length > 0}
        />
        <MetricCard
          icon={<Calendar className="w-5 h-5" />}
          label="Reuniões hoje"
          value={String(meetingsToday.length)}
          sub="agendadas"
          color="violet"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Tarefas"
          value={`${completedTasks}/${todayTasks.length}`}
          sub={`${progress}% concluído`}
          color="green"
          progress={progress}
        />
      </div>

      {/* Barra de progresso do dia */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-300">Progresso do Dia</span>
          <span className="text-sm font-bold text-white">{progress}%</span>
        </div>
        <div className="h-2.5 bg-[#334155] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {todayTasks.length - completedTasks} tarefas restantes para hoje
        </p>
      </div>

      {/* Dois painéis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Follow-ups do dia */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155]">
          <div className="flex items-center justify-between p-4 border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <span className="font-medium text-white text-sm">Follow-ups do Dia</span>
            </div>
            <Link href="/followup" className="text-xs text-sky-400 hover:text-sky-300">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-[#334155]">
            {followupsDue.slice(0, 4).map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  lead.nextAction?.completed ? "bg-green-400" : "bg-orange-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{lead.name}</div>
                  <div className="text-xs text-slate-400 truncate">{lead.nextAction?.description}</div>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {lead.nextAction ? CHANNEL_LABELS[lead.nextAction.channel] : ""}
                </span>
              </div>
            ))}
            {followupsDue.length === 0 && (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Todos os follow-ups em dia!</p>
              </div>
            )}
          </div>
        </div>

        {/* Reuniões do dia */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155]">
          <div className="flex items-center justify-between p-4 border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span className="font-medium text-white text-sm">Reuniões de Hoje</span>
            </div>
            <Link href="/leads" className="text-xs text-sky-400 hover:text-sky-300">
              Ver leads →
            </Link>
          </div>
          <div className="divide-y divide-[#334155]">
            {meetingsToday.length > 0 ? meetingsToday.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{lead.name}</div>
                  <div className="text-xs text-slate-400">{lead.nextAction?.description}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-400">
                  <Clock className="w-3 h-3" />
                  Hoje
                </div>
              </div>
            )) : (
              <div className="p-6 text-center">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhuma reunião agendada</p>
                <Link href="/leads" className="text-xs text-sky-400 mt-1 block">Agendar reunião →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, value, sub, color, progress, urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "sky" | "orange" | "violet" | "green";
  progress?: number;
  urgent?: boolean;
}) {
  const colors = {
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
  };
  const barColors = {
    sky: "bg-sky-500",
    orange: "bg-orange-500",
    violet: "bg-violet-500",
    green: "bg-green-500",
  };

  return (
    <div className={`bg-[#1e293b] border rounded-xl p-4 ${urgent ? "border-orange-500/40" : "border-[#334155]"}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {progress !== undefined ? (
        <div className="mt-2">
          <div className="h-1 bg-[#334155] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColors[color]}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{sub}</div>
        </div>
      ) : (
        <div className="text-xs text-slate-500 mt-1">{sub}</div>
      )}
    </div>
  );
}
