import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "ConsórcioOS — Sistema Operacional Comercial",
  description: "Rotina diária estruturada para consultores de consórcio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex h-screen overflow-hidden bg-[#0f172a]">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
