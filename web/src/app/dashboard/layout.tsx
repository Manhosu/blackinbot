'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
} 