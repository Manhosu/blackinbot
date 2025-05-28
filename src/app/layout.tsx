import type { Metadata } from 'next'
// import { Inter } from 'next/font/google' - Temporariamente removido para deploy
// import './globals.css' - Temporariamente removido para deploy
import { AuthProvider } from '@/contexts/AuthContext'

// const inter = Inter({ subsets: ['latin'] }) - Temporariamente removido para deploy

export const metadata: Metadata = {
  title: 'Black-in-Bot | Sistema de Gerenciamento de Grupos VIP',
  description: 'Plataforma para gerenciar bots de acesso a grupos VIP no Telegram',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; background: #000; color: #fff; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .btn { display: inline-block; padding: 12px 24px; background: #3b5aef; color: white; border: none; border-radius: 8px; cursor: pointer; text-decoration: none; font-weight: 500; transition: background 0.2s; }
            .btn:hover { background: #2d48c7; }
            .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; margin: 16px 0; }
            .input { width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #444; border-radius: 8px; color: #fff; font-size: 14px; }
            .input:focus { outline: none; border-color: #3b5aef; }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 16px; }
            .mt-4 { margin-top: 16px; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .gap-4 { gap: 16px; }
            .w-full { width: 100%; }
            .h-screen { height: 100vh; }
          `
        }} />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 