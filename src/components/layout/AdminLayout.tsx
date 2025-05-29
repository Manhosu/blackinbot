import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Bot, Users, CreditCard, BarChart, Settings, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
}

const NavItem = ({ href, icon, title }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {icon}
      {title}
    </Link>
  );
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  // Verificar se o usuário está autenticado
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Carregando...</h1>
          <p className="mt-2 text-muted-foreground">Aguarde um momento.</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, não renderizar o conteúdo
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r bg-background">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Black-in-Bot</h2>
        </div>
        <nav className="space-y-1 p-4">
          <NavItem href="/admin/dashboard" icon={<BarChart className="h-5 w-5" />} title="Dashboard" />
          <NavItem href="/admin/bots" icon={<Bot className="h-5 w-5" />} title="Bots" />
          <NavItem href="/admin/groups" icon={<MessageSquare className="h-5 w-5" />} title="Grupos" />
          <NavItem href="/admin/plans" icon={<CreditCard className="h-5 w-5" />} title="Planos" />
          <NavItem href="/admin/users" icon={<Users className="h-5 w-5" />} title="Usuários" />
          <NavItem href="/admin/settings" icon={<Settings className="h-5 w-5" />} title="Configurações" />
          
          <div className="mt-auto pt-4">
            <button 
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </div>
        </nav>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="h-16 border-b bg-background px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Painel de Controle</h1>
          <div className="text-sm text-muted-foreground">
            {user.email}
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 