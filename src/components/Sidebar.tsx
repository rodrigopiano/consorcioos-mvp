"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Bell,
  CheckSquare,
  BarChart2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", badge: null },
  { href: "/followup", icon: Bell, label: "Follow-up", badge: "8" },
  { href: "/tarefas", icon: CheckSquare, label: "Tarefas do Dia", badge: null },
  { href: "/funil", icon: Kanban, label: "Funil", badge: null },
  { href: "/leads", icon: Users, label: "Leads", badge: null },
  { href: "/metricas", icon: BarChart2, label: "Métricas", badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        {nav.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sky-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-[#273549]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-bold",
                  active ? "bg-white/20 text-white" : "bg-orange-500 text-white"
                )}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#334155]">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
            C
          </div>
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
