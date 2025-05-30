import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

// Forçar todas as páginas a serem dinâmicas
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "BlackInBot - Sistema de Bots Telegram",
  description: "Plataforma para criar e gerenciar bots do Telegram",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="pt-BR"
      suppressHydrationWarning 
      className="dark"
    >
      <body
        className="antialiased bg-background text-foreground font-sans"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
