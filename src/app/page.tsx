"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone, Users, Bell, Calendar, TrendingUp,
  ChevronRight, AlertTriangle, Zap, Clock, CheckCircle2
} from "lucide-react";
import { getLeads } from "@/lib/db";
import { Lead } from "@/lib/types";
import { getLeadUrgency, formatCurrency, isDueToday } from "@/lib/utils";
import { STAGE_LABELS, CHANNEL_LABELS } from "@/lib/types";

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeads().then(data => { setLeads(data); setLoading(false); });
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const followupsDue = leads.filter(
    (l) => l.nextAction && isDueToday(l.nextAction.dueDate) && l.stage !== "venda"
  );
  const overdueLeads = leads.filter((l) => getLeadUrgency(l) === "overdue");
  const meetingsToday = leads.filter((l) => l.stage === "reuniao_agendada" && l.nextAction && isDueToday(l.nextAction.dueDate));
  const nextAction = followupsDue.find((l) => !l.nextAction?.completed);

  const contactsGoal = 40;
  const contactsDone = 0;
  const contactProgress = Math.round((contactsDone / contactsGoal) * 100);

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bom dia, Consultor 👋</h1>
          <p className="text-slate-400 text-sm capitalize">{today}</p>
        </div>
        <Link href="/leads/novo" className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Users className="w-4 h-4" />
          Novo Lead
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="bg-[#1e293b] border border-dashed border-[#334155] rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-white font-semibold text-lg mb-1">Nenhum lead cadastrado</h2>
          <p className="text-slate-400 text-sm mb-4">Cadastre seu primeiro lead para começar a usar o sistema.</p>
          <Link href="/leads/novo" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4" />
            Cadastrar primeiro lead
          </Link>
        </div>
      ) : (
        <>
          {nextAction && (
            <div className="bg-gradient-to-r from-sky-500/20 to-blue-600/10 border border-sky-500/40 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">Próxima Ação Obrigatória</div>
                  <div className="text-white font-semibold text-base">{nextAction.name}</div>
                  <div className="text-slate-300 text-sm mt-0.5">{nextAction.nextAction?.description}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    {STAGE_LABELS[nextAction.stage]} • {nextAction.nextAction ? CHANNEL_LABELS[nextAction.nextAction.channel] : ""}
                  </div>
                </div>
                <Link href="/followup" className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0">
                  Agir <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {overdueLeads.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-orange-300 font-medium text-sm">{overdueLeads.length} lead{overdueLeads.length > 1 ? "s" : ""} com ação atrasada — </span>
                <span className="text-orange-400/80 text-sm">{overdueLeads.map((l) => l.name).join(", ")}</span>
              </div>
              <Link href="/followup" className="text-orange-400 text-xs font-medium hover:text-orange-300">Ver agora →</Link>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={<Phone className="w-5 h-5" />} label="Contatos" value={`${contactsDone}/${contactsGoal}`} sub={`${contactProgress}% da meta`} color="sky" progress={contactProgress} />
            <MetricCard icon={<Bell className="w-5 h-5" />} label="Follow-ups hoje" value={String(followupsDue.length)} sub={`${followupsDue.filter(l => l.nextAction?.completed).length} concluídos`} color="orange" urgent={followupsDue.filter(l => !l.nextAction?.completed).length > 0} />
            <MetricCard icon={<Calendar className="w-5 h-5" />} label="Reuniões hoje" value={String(meetingsToday.length)} sub="agendadas" color="violet" />
            <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Leads ativos" value={String(leads.filter(l => l.stage !== "venda").length)} sub={`${leads.filter(l => l.stage === "venda").length} vendas`} color="green" />
          </div>

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
                {followupsDue.slice(0, 4).map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${lead.nextAction?.completed ? "bg-green-400" : "bg-orange-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{lead.name}</div>
                      <div className="text-xs text-slate-400 truncate">{lead.nextAction?.description}</div>
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{lead.nextAction ? CHANNEL_LABELS[lead.nextAction.channel] : ""}</span>
                  </div>
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
                      <Clock className="w-3 h-3" />Hoje
                    </div>
                  </div>
                )) : (
                  <div className="p-6 text-center">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nenhuma reunião agendada.</p>
                    <Link href="/leads" className="text-xs text-sky-400 mt-1 block">Agendar reunião →</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, sub, color, progress, urgent }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "sky" | "orange" | "violet" | "green"; progress?: number; urgent?: boolean;
}) {
  const colors = { sky: "bg-sky-500/10 text-sky-400", orange: "bg-orange-500/10 text-orange-400", violet: "bg-violet-500/10 text-violet-400", green: "bg-green-500/10 text-green-400" };
  const barColors = { sky: "bg-sky-500", orange: "bg-orange-500", violet: "bg-violet-500", green: "bg-green-500" };
  return (
    <div className={`bg-[#1e293b] border rounded-xl p-4 ${urgent ? "border-orange-500/40" : "border-[#334155]"}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {progress !== undefined ? (
        <div className="mt-2">
          <div className="h-1 bg-[#334155] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColors[color]}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{sub}</div>
        </div>
      ) : <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
