"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, UserPen, ChevronDown, Save,
  MessageCircle, Phone, Trash2, AlertTriangle
} from "lucide-react";
import {
  LeadOrigin, LeadInterest, ActionChannel, FunnelStage,
  ORIGIN_LABELS, INTEREST_LABELS, CHANNEL_LABELS, STAGE_LABELS,
} from "@/lib/types";
import { getLeadById, updateLead, updateLeadStage, setNextAction } from "@/lib/db";
import { Lead } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STAGE_ORDER: FunnelStage[] = [
  "prospeccao", "contato_ativo", "qualificacao",
  "reuniao_agendada", "reuniao_realizada", "proposta_enviada",
  "followup", "venda",
];

const stageColor: Record<FunnelStage, string> = {
  prospeccao: "border-slate-500 text-slate-300 bg-slate-500/10",
  contato_ativo: "border-blue-500 text-blue-300 bg-blue-500/10",
  qualificacao: "border-violet-500 text-violet-300 bg-violet-500/10",
  reuniao_agendada: "border-yellow-500 text-yellow-300 bg-yellow-500/10",
  reuniao_realizada: "border-orange-500 text-orange-300 bg-orange-500/10",
  proposta_enviada: "border-pink-500 text-pink-300 bg-pink-500/10",
  followup: "border-red-500 text-red-300 bg-red-500/10",
  venda: "border-green-500 text-green-300 bg-green-500/10",
};

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState<"dados" | "acao">(
    searchParams.get("tab") === "acao" ? "acao" : "dados"
  );

  const [form, setForm] = useState({
    name: "",
    phone: "",
    origin: "instagram" as LeadOrigin,
    interest: "imovel" as LeadInterest,
    stage: "prospeccao" as FunnelStage,
    notes: "",
    value: "",
  });

  const [actionForm, setActionForm] = useState({
    description: "",
    dueDate: new Date().toISOString().split("T")[0],
    channel: "whatsapp" as ActionChannel,
  });

  useEffect(() => {
    getLeadById(id).then(data => {
      if (!data) { router.push("/leads"); return; }
      setLead(data);
      setForm({
        name: data.name,
        phone: data.phone,
        origin: data.origin,
        interest: data.interest,
        stage: data.stage,
        notes: data.notes || "",
        value: data.value ? String(data.value) : "",
      });
      if (data.nextAction) {
        setActionForm({
          description: data.nextAction.description,
          dueDate: data.nextAction.dueDate,
          channel: data.nextAction.channel,
        });
      }
      setLoading(false);
    });
  }, [id]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSaveDados(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      await updateLead(id, {
        name: form.name,
        phone: form.phone,
        origin: form.origin,
        interest: form.interest,
        stage: form.stage,
        notes: form.notes,
        value: form.value ? Number(form.value) : 0,
      });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : (err as {message?: string})?.message || JSON.stringify(err));
      setStatus("error");
    }
  }

  async function handleSaveAction(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      await setNextAction(id, actionForm);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : (err as {message?: string})?.message || JSON.stringify(err));
      setStatus("error");
    }
  }

  async function handleStageChange(stage: FunnelStage) {
    set("stage", stage);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Carregando lead...</p>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/leads" className="p-2 text-slate-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPen className="w-6 h-6 text-sky-400" />
            {lead.name}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Cadastrado em {formatDate(lead.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {lead.nextAction?.channel === "whatsapp" ? (
            <a href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors">
              <MessageCircle className="w-5 h-5" />
            </a>
          ) : (
            <a href={`tel:${lead.phone.replace(/\D/g, "")}`}
              className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg transition-colors">
              <Phone className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      {/* Funil — mover etapa */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Etapa no Funil</h2>
        <div className="flex flex-wrap gap-2">
          {STAGE_ORDER.map(stage => (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                form.stage === stage
                  ? stageColor[stage] + " ring-2 ring-offset-2 ring-offset-[#1e293b]"
                  : "border-[#334155] text-slate-400 hover:text-white hover:border-slate-500"
              )}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1e293b] rounded-lg p-1 border border-[#334155]">
        {(["dados", "acao"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-colors",
              tab === t ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white")}>
            {t === "dados" ? "Dados do Lead" : "Próxima Ação"}
          </button>
        ))}
      </div>

      {status === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Erro ao salvar: {errorMsg}
        </div>
      )}

      {status === "done" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />Salvo com sucesso!
        </div>
      )}

      {/* Tab: Dados */}
      {tab === "dados" && (
        <form onSubmit={handleSaveDados} className="space-y-4">
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nome completo *</label>
                <input required value={form.name} onChange={e => set("name", e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Telefone / WhatsApp *</label>
                <input required value={form.phone} onChange={e => set("phone", e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Valor estimado (R$)</label>
                <input value={form.value} onChange={e => set("value", e.target.value)} type="number"
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Origem</label>
                <select value={form.origin} onChange={e => set("origin", e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500">
                  {Object.entries(ORIGIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Interesse</label>
                <select value={form.interest} onChange={e => set("interest", e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500">
                  {Object.entries(INTEREST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observações</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 resize-none" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={status === "saving"}
            className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {status === "saving" ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar Alterações</>}
          </button>
        </form>
      )}

      {/* Tab: Próxima Ação */}
      {tab === "acao" && (
        <form onSubmit={handleSaveAction} className="space-y-4">
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4 space-y-4">
            {lead.nextAction && (
              <div className="bg-[#0f172a] rounded-lg p-3 text-xs text-slate-400 border border-[#334155]">
                <span className="text-slate-300 font-medium">Ação atual: </span>
                {lead.nextAction.description} · {formatDate(lead.nextAction.dueDate)} · {CHANNEL_LABELS[lead.nextAction.channel]}
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">O que precisa ser feito? *</label>
              <input required value={actionForm.description} onChange={e => setActionForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Enviar proposta por WhatsApp"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Data *</label>
                <input required type="date" value={actionForm.dueDate} onChange={e => setActionForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Canal *</label>
                <select value={actionForm.channel} onChange={e => setActionForm(p => ({ ...p, channel: e.target.value as ActionChannel }))}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500">
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={status === "saving"}
            className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {status === "saving" ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar Próxima Ação</>}
          </button>
        </form>
      )}
    </div>
  );
}
