'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useAuthStatus() {
  const { user, isLoading } = useAuth();
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    if (!isLoading) {
      setAuthStatus(user ? 'authenticated' : 'unauthenticated');
    }
  }, [user, isLoading]);

  const checkAuthBeforeAction = async (): Promise<boolean> => {
    if (authStatus === 'checking') {
      // Aguardar um pouco pela verificação
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (authStatus === 'unauthenticated') {
      throw new Error('Você precisa estar logado para realizar esta ação');
    }

    return true;
  };

  return {
    authStatus,
    isAuthenticated: authStatus === 'authenticated',
    isAuthenticating: authStatus === 'checking',
    checkAuthBeforeAction
  };
} 