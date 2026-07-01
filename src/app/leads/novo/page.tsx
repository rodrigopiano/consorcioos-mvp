"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowLeft, Check, Loader2 } from "lucide-react";
import { LeadOrigin, LeadInterest, ActionChannel, ORIGIN_LABELS, INTEREST_LABELS, CHANNEL_LABELS } from "@/lib/types";
import { createLead } from "@/lib/db";

export default function NovoLeadPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    origin: "instagram" as LeadOrigin,
    interest: "imovel" as LeadInterest,
    nextActionDescription: "",
    nextActionDate: new Date().toISOString().split("T")[0],
    nextActionChannel: "whatsapp" as ActionChannel,
    notes: "",
    value: "",
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      await createLead(
        {
          name: form.name,
          phone: form.phone,
          origin: form.origin,
          interest: form.interest,
          stage: "prospeccao",
          lastInteraction: new Date().toISOString().split("T")[0],
          notes: form.notes,
          value: form.value ? Number(form.value) : 0,
        },
        {
          description: form.nextActionDescription,
          dueDate: form.nextActionDate,
          channel: form.nextActionChannel,
        }
      );
      setStatus("done");
      setTimeout(() => router.push("/leads"), 1500);
    } catch (err) {
      console.error("Erro ao criar lead:", err);
      setStatus("error");
      const msg = err instanceof Error ? err.message : (err as {message?: string})?.message || JSON.stringify(err);
      setErrorMsg(msg);
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Lead cadastrado!</h2>
          <p className="text-slate-400 text-sm mt-1">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/leads" className="p-2 text-slate-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-sky-400" />
            Novo Lead
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Cadastre e defina a próxima ação</p>
        </div>
      </div>

      {status === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          Erro ao salvar: {errorMsg || "Verifique a conexão com o Supabase."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card title="Dados do Lead">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nome completo *</label>
              <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ex: João Silva"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Telefone / WhatsApp *</label>
              <input required value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(11) 99999-0000"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Valor estimado (R$)</label>
              <input value={form.value} onChange={e => set("value", e.target.value)} placeholder="Ex: 150000" type="number"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Origem *</label>
              <select value={form.origin} onChange={e => set("origin", e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500">
                {Object.entries(ORIGIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Interesse *</label>
              <select value={form.interest} onChange={e => set("interest", e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500">
                {Object.entries(INTEREST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observações</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Anote informações relevantes..." rows={3}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 resize-none" />
            </div>
          </div>
        </Card>

        <Card title="Próxima Ação Obrigatória">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">O que precisa ser feito? *</label>
              <input required value={form.nextActionDescription} onChange={e => set("nextActionDescription", e.target.value)}
                placeholder="Ex: Enviar mensagem de apresentação no WhatsApp"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Data *</label>
              <input required type="date" value={form.nextActionDate} onChange={e => set("nextActionDate", e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Canal *</label>
              <select value={form.nextActionChannel} onChange={e => set("nextActionChannel", e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500">
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Link href="/leads" className="flex-1 text-center py-3 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 text-sm font-medium hover:bg-[#273549] transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={status === "saving"}
            className="flex-1 py-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {status === "saving" ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Cadastrar Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-4">
      <h2 className="text-sm font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}
