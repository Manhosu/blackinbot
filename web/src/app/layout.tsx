import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLACKINPAY | Automatize o acesso aos seus grupos no Telegram",
  description: "Configure o BLACKINPAY em apenas 5 passos e comece a faturar ainda hoje com seu grupo de acesso VIP!",
  keywords: ["telegram", "bot", "grupos vip", "automatização", "acesso", "controle", "faturamento", "pix", "pagamentos", "BLACKINPAY"],
  authors: [{ name: "BLACKINPAY Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#0a0f20",
  robots: "index, follow",
  metadataBase: new URL("https://blackinpay.com.br"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://blackinpay.com.br",
    title: "BLACKINPAY | Automatize o acesso aos seus grupos no Telegram",
    description: "Configure o BLACKINPAY em apenas 5 passos e comece a faturar ainda hoje com seu grupo de acesso VIP!",
    siteName: "BLACKINPAY",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "BLACKINPAY Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BLACKINPAY | Automatize o acesso aos seus grupos no Telegram",
    description: "Configure o BLACKINPAY em apenas 5 passos e comece a faturar ainda hoje com seu grupo de acesso VIP!",
    images: ["/og-image.jpg"],
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
      data-mcp-browser="true"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
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
