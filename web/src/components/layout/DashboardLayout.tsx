'use client';

import React, { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BarChart3, DollarSign, Users, Globe } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActivePath = (path: string) => {
    return pathname?.startsWith(path);
  };

  // Função de logout temporária
  const handleLogout = () => {
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barra lateral */}
      <aside className="w-72 bg-primary fixed h-full z-10 border-r border-border-light">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.png" alt="BLACKINBOT" width={40} height={40} className="object-contain" />
            <span className="text-white text-2xl font-bold font-heading">BLACKINBOT</span>
          </Link>
        </div>
        
        <nav className="mt-6">
          <Link href="/dashboard" className={`sidebar-link ${isActivePath('/dashboard') && !isActivePath('/dashboard/') ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>Visão geral</span>
          </Link>
          
          <Link href="/dashboard/bots" className={`sidebar-link ${isActivePath('/dashboard/bots') ? 'active' : ''}`}>
            <Users size={20} />
            <span>Meus bots</span>
          </Link>
          

          
          <Link href="/dashboard/sales" className={`sidebar-link ${isActivePath('/dashboard/sales') ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>Minhas vendas</span>
          </Link>
          
          <Link href="/dashboard/marketing" className={`sidebar-link ${isActivePath('/dashboard/marketing') ? 'active' : ''}`}>
            <Globe size={20} />
            <span>Remarketing</span>
          </Link>
          
          <Link href="/dashboard/financeiro" className={`sidebar-link ${isActivePath('/dashboard/financeiro') ? 'active' : ''}`}>
            <DollarSign size={20} />
            <span>Financeiro</span>
          </Link>
        </nav>
      </aside>
      
      {/* Área principal */}
      <main className="w-full pl-72">
        {/* Header */}
        <header className="p-6 flex justify-between items-center border-b border-border-light">
          <div>
            {/* Título será colocado pelos componentes filhos */}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                U
              </div>
              
              <button 
                onClick={handleLogout}
                className="text-white/70 hover:text-white transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </header>
        
        {/* Conteúdo da página */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 