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
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#000', color: '#fff' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 