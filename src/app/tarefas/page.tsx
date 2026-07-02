"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare, CheckCircle2, Circle, Phone,
  Calendar, FileText, Users, Loader2, AlertTriangle
} from "lucide-react";
import { getLeads } from "@/lib/db";
import { Lead, STAGE_LABELS } from "@/lib/types";
import { buildExecutionQueue, ExecutionTask } from "@/lib/priority";
import { isOverdue, isDueToday } from "@/lib/utils";
import { cn } from "@/lib/utils";

const typeConfig = {
  contato:    { icon: Users,    color: "text-sky-400",    bg: "bg-sky-500/10",    label: "1º Contato" },
  followup:   { icon: Phone,    color: "text-orange-400", bg: "bg-orange-500/10", label: "Follow-up" },
  reuniao:    { icon: Calendar, color: "text-violet-400", bg: "bg-violet-500/10", label: "Reunião" },
  proposta:   { icon: FileText, color: "text-pink-400",   bg: "bg-pink-500/10",   label: "Proposta" },
  atualizacao:{ icon: Users,    color: "text-slate-400",  bg: "bg-slate-500/10",  label: "Atualizar" },
};

export default function TarefasPage() {
  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeads().then(leads => {
      // Filtra apenas leads com ação para hoje ou atrasados
      const queue = buildExecutionQueue(leads).filter(t =>
        t.lead.nextAction &&
        (isDueToday(t.lead.nextAction.dueDate) || isOverdue(t.lead.nextAction.dueDate))
      );
      setTasks(queue);
      setLoading(false);
    });
  }, []);

  function toggle(id: string) {
    setDone(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const completed = done.size;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const types = Object.keys(typeConfig) as ExecutionTask["taskType"][];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-sky-400" />Tarefas do Dia
        </h1>
        <p className="text-slate-400 text-sm mt-1">{completed} de {total} concluídas</p>
      </div>

      {/* Barra de progresso */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-300">Progresso do Dia</span>
          <span className="text-2xl font-bold text-white">{progress}%</span>
        </div>
        <div className="h-3 bg-[#334155] rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500",
            progress === 100 ? "bg-green-500" : "bg-gradient-to-r from-sky-500 to-blue-500"
          )} style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && total > 0 && (
          <div className="flex items-center gap-2 mt-3 text-green-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />Parabéns! Todas as tarefas concluídas!
          </div>
        )}

        {/* Resumo por tipo */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {types.map(type => {
            const cfg = typeConfig[type];
            const Icon = cfg.icon;
            const typeTasks = tasks.filter(t => t.taskType === type);
            const typeDone = typeTasks.filter(t => done.has(t.lead.id)).length;
            if (typeTasks.length === 0) return null;
            return (
              <div key={type} className="text-center">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="text-xs text-white font-medium">{typeDone}/{typeTasks.length}</div>
                <div className="text-xs text-slate-500">{cfg.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vazio */}
      {tasks.length === 0 && (
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Nenhuma tarefa para hoje</p>
          <p className="text-slate-400 text-sm mb-4">Sem follow-ups ou ações pendentes para hoje.</p>
          <Link href="/leads/novo" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Cadastrar lead
          </Link>
        </div>
      )}

      {/* Lista por tipo */}
      {types.map(type => {
        const typeTasks = tasks.filter(t => t.taskType === type);
        if (typeTasks.length === 0) return null;
        const cfg = typeConfig[type];
        const Icon = cfg.icon;
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", cfg.color)} />
              <h2 className="text-sm font-semibold text-slate-300">{cfg.label}</h2>
              <span className="text-xs text-slate-500">
                ({typeTasks.filter(t => done.has(t.lead.id)).length}/{typeTasks.length})
              </span>
            </div>
            <div className="space-y-2">
              {typeTasks.map(task => {
                const isDone = done.has(task.lead.id);
                const overdue = task.lead.nextAction && isOverdue(task.lead.nextAction.dueDate);
                return (
                  <button key={task.lead.id} onClick={() => toggle(task.lead.id)}
                    className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                      isDone ? "bg-[#1e293b]/50 border-[#334155]/50 opacity-60"
                        : overdue ? "bg-[#1e293b] border-orange-500/30 hover:border-orange-500/60"
                        : "bg-[#1e293b] border-[#334155] hover:border-slate-500")}>
                    {isDone
                      ? <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm font-medium", isDone ? "line-through text-slate-500" : "text-white")}>
                        {task.lead.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{task.recommendedAction}</div>
                    </div>
                    {overdue && !isDone && (
                      <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    )}
                    <Link href={`/leads/${task.lead.id}`} onClick={e => e.stopPropagation()}
                      className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 px-1">
                      Ver →
                    </Link>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
