"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search, Plus, AlertTriangle, MessageCircle, Phone, ChevronRight, Loader2 } from "lucide-react";
import { getLeads } from "@/lib/db";
import { Lead, FunnelStage, STAGE_LABELS, INTEREST_LABELS, ORIGIN_LABELS, CHANNEL_LABELS } from "@/lib/types";
import { getLeadUrgency, formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const stageColor: Record<FunnelStage, string> = {
  prospeccao: "bg-slate-500/20 text-slate-300",
  contato_ativo: "bg-blue-500/20 text-blue-300",
  qualificacao: "bg-violet-500/20 text-violet-300",
  reuniao_agendada: "bg-yellow-500/20 text-yellow-300",
  reuniao_realizada: "bg-orange-500/20 text-orange-300",
  proposta_enviada: "bg-pink-500/20 text-pink-300",
  followup: "bg-red-500/20 text-red-300",
  venda: "bg-green-500/20 text-green-300",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<FunnelStage | "all">("all");

  useEffect(() => {
    getLeads().then(data => { setLeads(data); setLoading(false); });
  }, []);

  const filtered = leads.filter(lead => {
    const matchSearch = lead.name.toLowerCase().includes(search.toLowerCase()) || lead.phone.includes(search);
    const matchStage = stageFilter === "all" || lead.stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6 text-sky-400" />Leads</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} leads encontrados</p>
        </div>
        <Link href="/leads/novo" className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Novo Lead
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
            className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value as FunnelStage | "all")}
          className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
          <option value="all">Todas as etapas</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando leads...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">{leads.length === 0 ? "Nenhum lead cadastrado ainda." : "Nenhum lead encontrado."}</p>
            {leads.length === 0 && (
              <Link href="/leads/novo" className="inline-flex items-center gap-2 mt-3 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />Cadastrar primeiro lead
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155] text-xs text-slate-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Interesse</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Origem</th>
                <th className="text-left px-4 py-3">Etapa</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Próxima Ação</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filtered.map(lead => {
                const urgency = getLeadUrgency(lead);
                return (
                  <tr key={lead.id} className="hover:bg-[#273549] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{lead.name.charAt(0)}</div>
                        <div>
                          <div className="text-sm font-medium text-white">{lead.name}</div>
                          <div className="text-xs text-slate-500">{lead.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-slate-300">{INTEREST_LABELS[lead.interest]}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><span className="text-xs text-slate-400">{ORIGIN_LABELS[lead.origin]}</span></td>
                    <td className="px-4 py-3"><span className={cn("text-xs px-2 py-1 rounded-full font-medium", stageColor[lead.stage])}>{STAGE_LABELS[lead.stage]}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lead.nextAction ? (
                        <div className="flex items-center gap-2">
                          {urgency === "overdue" && <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                          <div>
                            <div className="text-xs text-slate-300 max-w-40 truncate">{lead.nextAction.description}</div>
                            <div className={cn("text-xs", urgency === "overdue" ? "text-orange-400" : "text-slate-500")}>
                              {formatDate(lead.nextAction.dueDate)} · {CHANNEL_LABELS[lead.nextAction.channel]}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Sem ação</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lead.value ? <span className="text-xs text-green-400 font-medium">{formatCurrency(lead.value)}</span> : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {lead.nextAction?.channel === "whatsapp" ? (
                          <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"><MessageCircle className="w-4 h-4" /></a>
                        ) : (
                          <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded transition-colors"><Phone className="w-4 h-4" /></a>
                        )}
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-[#334155] rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
