'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({ error: new Error('Not initialized') }),
  logout: async () => {},
  register: async () => ({ error: new Error('Not initialized') }),
  refreshAuth: async () => false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Verificar se está montado no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Refresh auth status
  const refreshAuth = async (): Promise<boolean> => {
    if (!isMounted) return false;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email
        });
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      setUser(null);
      return false;
    }
  };

  // Sign in
  const signIn = async (email: string, password: string): Promise<{error?: Error}> => {
    if (!isMounted) return { error: new Error('Not ready') };
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email
        });
        router.push('/dashboard');
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Register
  const register = async (userData: any): Promise<{error?: Error}> => {
    if (!isMounted) return { error: new Error('Not ready') };
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
          }
        }
      });

      if (error) {
        return { error };
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    if (!isMounted) return;
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Initialize auth
  useEffect(() => {
    if (!isMounted) return;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email
            });
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isMounted]);

  // Se não estiver montado, renderizar contexto padrão
  if (!isMounted) {
    return (
      <AuthContext.Provider value={defaultAuthContext}>
        {children}
      </AuthContext.Provider>
    );
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    logout,
    register,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    // Retornar contexto padrão se não estiver disponível
    return defaultAuthContext;
  }
  return context;
} 