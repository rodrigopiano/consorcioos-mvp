"use client";
import { useState } from "react";
import {
  CheckSquare, CheckCircle2, Circle, Phone, MessageCircle,
  Calendar, FileText, Users, TrendingUp
} from "lucide-react";
import { mockTasks } from "@/lib/mock-data";
import { DailyTask } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeConfig = {
  contato: { icon: Users, color: "text-sky-400", bg: "bg-sky-500/10", label: "Contato" },
  followup: { icon: Phone, color: "text-orange-400", bg: "bg-orange-500/10", label: "Follow-up" },
  ligacao: { icon: Phone, color: "text-violet-400", bg: "bg-violet-500/10", label: "Ligação" },
  reuniao: { icon: Calendar, color: "text-green-400", bg: "bg-green-500/10", label: "Reunião" },
  proposta: { icon: FileText, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Proposta" },
};

export default function TarefasPage() {
  const [tasks, setTasks] = useState(mockTasks);

  function toggle(id: string) {
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const progress = Math.round((completed / total) * 100);

  const byType = Object.keys(typeConfig) as DailyTask["type"][];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-sky-400" />
          Tarefas do Dia
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {completed} de {total} concluídas
        </p>
      </div>

      {/* Barra de progresso grande */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-300">Progresso do Dia</span>
          <span className="text-2xl font-bold text-white">{progress}%</span>
        </div>
        <div className="h-3 bg-[#334155] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress === 100 ? "bg-green-500" : "bg-gradient-to-r from-sky-500 to-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <div className="flex items-center gap-2 mt-3 text-green-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Parabéns! Você concluiu todas as tarefas de hoje!
          </div>
        )}

        {/* Resumo por tipo */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {byType.map(type => {
            const cfg = typeConfig[type];
            const Icon = cfg.icon;
            const count = tasks.filter(t => t.type === type).length;
            const done = tasks.filter(t => t.type === type && t.completed).length;
            return (
              <div key={type} className="text-center">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="text-xs text-white font-medium">{done}/{count}</div>
                <div className="text-xs text-slate-500">{cfg.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de tarefas agrupada */}
      {byType.map(type => {
        const typeTasks = tasks.filter(t => t.type === type);
        if (typeTasks.length === 0) return null;
        const cfg = typeConfig[type];
        const Icon = cfg.icon;
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", cfg.color)} />
              <h2 className="text-sm font-semibold text-slate-300">{cfg.label}s</h2>
              <span className="text-xs text-slate-500">
                ({typeTasks.filter(t => t.completed).length}/{typeTasks.length})
              </span>
            </div>
            <div className="space-y-2">
              {typeTasks.map(task => (
                <TaskRow key={task.id} task={task} onToggle={() => toggle(task.id)} typeConfig={cfg} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  task, onToggle, typeConfig: cfg,
}: {
  task: DailyTask;
  onToggle: () => void;
  typeConfig: { icon: React.ElementType; color: string; bg: string; label: string };
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
        task.completed
          ? "bg-[#1e293b]/50 border-[#334155]/50 opacity-60"
          : "bg-[#1e293b] border-[#334155] hover:border-slate-500"
      )}
    >
      {task.completed ? (
        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", task.completed ? "line-through text-slate-500" : "text-white")}>
          {task.leadName}
        </div>
        <div className="text-xs text-slate-400 truncate">{task.description}</div>
      </div>
      {task.channel && (
        <span className="text-xs text-slate-500 flex-shrink-0">
          {CHANNEL_LABELS[task.channel]}
        </span>
      )}
    </button>
  );
}
