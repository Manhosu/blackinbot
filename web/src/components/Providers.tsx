'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { initDatabase } from '@/lib/db-schema';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  // Inicializar banco de dados quando o componente montar
  useEffect(() => {
    // Executar de forma assíncrona em modo cliente
    if (typeof window !== 'undefined') {
      initDatabase()
        .then(success => {
          if (success) {
            console.log('✅ Estrutura do banco de dados verificada com sucesso');
          }
        })
        .catch(error => {
          console.error('❌ Erro ao verificar banco de dados:', error);
        });
    }
  }, []);

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
} 