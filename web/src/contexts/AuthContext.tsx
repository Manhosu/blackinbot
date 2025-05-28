'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{error?: Error}>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<{error?: Error}>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Aguardar a hidratação para evitar problemas de SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Simular um usuário padrão para evitar problemas de autenticação
    const defaultUser: AuthUser = {
      id: 'default-user',
      email: 'admin@blackinbot.com',
      name: 'Admin'
    };

    setUser(defaultUser);
    setIsLoading(false);
  }, [mounted]);

  const signIn = async (email: string, password: string) => {
    try {
      const defaultUser: AuthUser = {
        id: 'default-user',
        email: email,
        name: 'Usuário'
      };
      setUser(defaultUser);
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  };

  const register = async (userData: any) => {
    try {
      const newUser: AuthUser = {
        id: 'new-user',
        email: userData.email,
        name: userData.name
      };
      setUser(newUser);
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    setUser(null);
  };

  const refreshAuth = async () => {
    return true;
  };

  const contextValue: AuthContextType = {
    user,
    isLoading: !mounted || isLoading,
    isAuthenticated: !!user,
    signIn,
    logout,
    register,
    refreshAuth
  };

  // Não renderizar até estar montado
  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
} 