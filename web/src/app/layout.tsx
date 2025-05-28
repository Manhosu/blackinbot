import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { metadata as sharedMetadata, viewport as sharedViewport } from "./metadata";

// Layout configurado para produção com otimizações para SSR

export const metadata: Metadata = sharedMetadata;
export const viewport = sharedViewport;

// Configurações para evitar problemas de SSR
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="pt-BR"
      suppressHydrationWarning 
      data-mcp-browser="true"
      className="dark font-sans"
    >
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link 
          rel="icon" 
          href="/favicon.ico" 
          sizes="any"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
        />
        <link 
          rel="manifest" 
          href="/manifest.json" 
        />
      </head>
      <body
        className="antialiased bg-background text-foreground font-sans"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
