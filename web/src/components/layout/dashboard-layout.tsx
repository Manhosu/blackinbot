import React, { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Mock user data - normalmente viria do estado de autenticação
  const user = {
    name: 'Eduardo',
    avatar: undefined,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <Header user={user} />
      <main className="pt-16 pl-64">
        <div className="container p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 