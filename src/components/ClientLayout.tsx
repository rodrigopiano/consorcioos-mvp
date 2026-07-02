"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullscreen = pathname === "/execucao";

  if (fullscreen) {
    return (
      <main className="flex-1 overflow-y-auto h-screen">
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </>
  );
}
