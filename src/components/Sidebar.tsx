"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Kanban, Bell, CheckSquare, BarChart2, Zap, Play, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLeads } from "@/lib/db";
import { buildExecutionQueue } from "@/lib/priority";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", highlight: false },
  { href: "/execucao", icon: Play, label: "Modo Execução", highlight: true },
  { href: "/followup", icon: Bell, label: "Follow-up", highlight: false },
  { href: "/tarefas", icon: CheckSquare, label: "Tarefas do Dia", highlight: false },
  { href: "/funil", icon: Kanban, label: "Funil", highlight: false },
  { href: "/leads", icon: Users, label: "Leads", highlight: false },
  { href: "/metricas", icon: BarChart2, label: "Métricas", highlight: false },
  { href: "/resumo", icon: ClipboardList, label: "Resumo Diário", highlight: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [topLeadId, setTopLeadId] = useState<string | null>(null);

  useEffect(() => {
    getLeads().then(leads => {
      const queue = buildExecutionQueue(leads);
      setTopLeadId(queue[0]?.lead.id ?? null);
    });
  }, []);

  const agirHref = topLeadId ? `/leads/${topLeadId}?tab=acao` : "/execucao";

  return (
    <aside className="w-56 flex-shrink-0 bg-[#1e293b] border-r border-[#334155] flex flex-col">
      <div className="p-4 border-b border-[#334155]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">ConsórcioOS</div>
            <div className="text-xs text-slate-400">Sistema Comercial</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, icon: Icon, label, highlight }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sky-500 text-white"
                  : highlight
                  ? "text-sky-400 hover:text-white hover:bg-sky-500/10 border border-sky-500/20"
                  : "text-slate-400 hover:text-white hover:bg-[#273549]"
              )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Botão "O que faço agora?" — aponta para o lead mais urgente */}
      <div className="p-3 border-t border-[#334155] space-y-3">
        <Link href={agirHref}
          className="flex items-center justify-center gap-2 w-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:text-sky-300 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors">
          <Zap className="w-3.5 h-3.5" />
          O que faço agora?
        </Link>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-white">C</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">Consultor</div>
            <div className="text-xs text-slate-400">Ativo</div>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full" />
        </div>
      </div>
    </aside>
  );
}
