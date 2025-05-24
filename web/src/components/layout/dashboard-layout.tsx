'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, Bot, CreditCard, Settings, 
  Menu, X, ChevronDown, User, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutGrid,
      active: pathname === '/dashboard',
    },
    {
      name: 'Bots',
      href: '/bots',
      icon: Bot,
      active: pathname === '/bots' || pathname?.startsWith('/bots/'),
    },
    {
      name: 'Pagamentos',
      href: '/payments',
      icon: CreditCard,
      active: pathname === '/payments',
    },
    {
      name: 'Configurações',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar superior */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Botão do menu móvel */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-bold text-xl">BlackInBot</span>
            </Link>
          </div>
          
          {/* Menu do usuário */}
          <div className="relative">
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
              <span className="hidden sm:inline-block">Usuário</span>
              <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border py-1 z-40">
                <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-muted">
                  Perfil
                </Link>
                <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-muted">
                  Configurações
                </Link>
                <hr className="my-1 border-border" />
                <Link href="/auth/logout" className="block px-4 py-2 text-sm text-red-500 hover:bg-muted">
                  <span className="flex items-center gap-2">
                    <LogOut size={16} />
                    Sair
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar para desktop */}
        <aside className="hidden md:flex flex-col w-64 border-r bg-card">
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                  ${item.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                `}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Menu móvel */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-20 md:hidden">
            <div 
              className="fixed inset-0 bg-black/50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-card shadow-xl p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-xl">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={20} />
                </Button>
              </div>
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                      ${item.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                    `}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 