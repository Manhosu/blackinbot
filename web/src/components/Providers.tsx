'use client';

import React, { useState, useEffect } from 'react';
import { initDatabase } from '@/lib/db-schema';

interface ProvidersProps {
  children: React.ReactNode;
}

// Wrapper para garantir renderização apenas no cliente
function ClientOnlyProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white">Carregando...</div>;
  }

  return <>{children}</>;
}

export default function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    initDatabase();
  }, []);

  return <ClientOnlyProviders>{children}</ClientOnlyProviders>;
} 