import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "BLACKINPAY | Automatize o acesso aos seus grupos no Telegram",
  description: "Configure o BLACKINPAY em apenas 5 passos e comece a faturar ainda hoje com seu grupo de acesso VIP!",
  keywords: ["telegram", "bot", "grupos vip", "automatização", "acesso", "controle", "faturamento", "pix", "pagamentos", "BLACKINPAY"],
  authors: [{ name: "BLACKINPAY Team" }],
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

// Exportar configuração de viewport separadamente conforme recomendado pelo Next.js
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0f20"
}; 