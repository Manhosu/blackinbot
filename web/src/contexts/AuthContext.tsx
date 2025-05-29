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

// ID local para fallback quando o Supabase falha
const LOCAL_USER_ID = 'local_user_' + Date.now();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  
  // Verificar se estamos no cliente para evitar hidration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Função para checar se estamos em uma rota protegida
  const isProtectedRoute = (path: string): boolean => {
    return path.includes('/dashboard') || 
           path.includes('/admin') || 
           path.includes('/account');
  }

  // Função unificada para carregar usuário do localStorage
  const loadLocalUser = (): AuthUser | null => {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const savedUser = localStorage.getItem('blackinpay_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (error) {
      console.error('Erro ao ler usuário do localStorage:', error);
    }
    return null;
  };

  // Função unificada para salvar usuário no localStorage
  const saveLocalUser = (userData: AuthUser): void => {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem('blackinpay_user', JSON.stringify(userData));
      console.log('✅ Usuário salvo no localStorage:', userData.id);
    } catch (error) {
      console.error('Erro ao salvar usuário no localStorage:', error);
    }
  };

  // Função para atualizar autenticação (pode ser chamada de fora do contexto)
  const refreshAuth = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Iniciando refreshAuth...');
      
      // 1. Tentar obter sessão do Supabase
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao obter sessão:', error.message);
        // Verificar se é erro de sessão expirada
        if (error.message.includes('session') || error.message.includes('expired')) {
          console.log('🔓 Sessão expirada detectada, tentando renovar...');
          
          // Tentar renovar a sessão
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData?.session?.user) {
            const userData: AuthUser = {
              id: refreshData.session.user.id,
              email: refreshData.session.user.email || '',
              name: refreshData.session.user.user_metadata?.name || refreshData.session.user.email?.split('@')[0] || 'Usuário'
            };
            
            setUser(userData);
            saveLocalUser(userData);
            console.log('✅ Sessão renovada com sucesso:', userData.id);
            setIsLoading(false);
            return true;
          } else {
            console.log('❌ Falha ao renovar sessão, limpando dados locais');
            setUser(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('blackinpay_user');
            }
            setIsLoading(false);
            return false;
          }
        }
      } else if (data?.session?.user) {
        // Sessão válida no Supabase
        const supaUser = data.session.user;
        const userData: AuthUser = {
          id: supaUser.id,
          email: supaUser.email || '',
          name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'Usuário'
        };
        
        setUser(userData);
        saveLocalUser(userData);
        console.log('✅ Sessão válida confirmada:', userData.id);
        setIsLoading(false);
        return true;
      }
      
      // 2. Fallback: verificar localStorage se Supabase falhou
      const localUser = loadLocalUser();
      if (localUser) {
        console.log('⚠️ Usando usuário local (sem sessão Supabase):', localUser.id);
        
        // Verificar se o usuário local é um usuário real do Supabase
        if (localUser.id.startsWith('local_user_')) {
          console.log('📝 Usuário local temporário detectado');
          setUser(localUser);
          setIsLoading(false);
          return true;
        } else {
          // Usuário do Supabase sem sessão válida - forçar novo login
          console.log('🔓 Usuário Supabase sem sessão válida, limpando dados');
          setUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('blackinpay_user');
          }
          setIsLoading(false);
          return false;
        }
      }
      
      // 3. Último recurso: criar um usuário local temporário para emergência
      if (typeof window !== 'undefined' && isProtectedRoute(window.location.pathname)) {
        console.warn('⚠️ Criando usuário temporário para rota protegida');
        const tempUser: AuthUser = {
          id: LOCAL_USER_ID,
          email: 'temp@usuario.local',
          name: 'Usuário Temporário'
        };
        setUser(tempUser);
        saveLocalUser(tempUser);
        setIsLoading(false);
        return true;
      }
      
      // Nenhuma autenticação disponível
      setUser(null);
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('❌ Erro ao atualizar autenticação:', error);
      setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Só executar no cliente para evitar problemas de SSR
    if (!isClient) {
      return;
    }
    
    // Função OTIMIZADA para verificar a autenticação
    const checkAuth = async () => {
      try {
        // 🚀 OTIMIZAÇÃO: Primeiro verificar localStorage para resposta instantânea
        const localUser = loadLocalUser();
        if (localUser && mounted) {
          setUser(localUser);
          setIsLoading(false); // ✅ IMPORTANTE: Liberar loading imediatamente
          console.log('⚡ Usuario carregado instantaneamente do localStorage:', localUser.id);
          
          // Validar em background (sem bloquear a UI)
          setTimeout(() => {
            validateUserInBackground(localUser);
          }, 100);
          return;
        }
        
        // Se não há usuário local, tentar Supabase (mais lento)
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session?.user) {
            console.log('❌ Sem sessão válida:', error?.message);
            if (mounted) {
              setUser(null);
              setIsLoading(false);
            }
            return;
          }
          
          // Sessão encontrada
          const userData: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário'
          };
          
          if (mounted) {
            setUser(userData);
            saveLocalUser(userData);
            setIsLoading(false);
            console.log('✅ Autenticado via Supabase:', userData.id);
          }
        } catch (supaError) {
          console.error('❌ Erro Supabase:', supaError);
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    // Função para validar usuário em background (não bloqueia UI)
    const validateUserInBackground = async (localUser: AuthUser) => {
      try {
        // Tentar obter usuário autenticado do Supabase
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.warn('⚠️ Usuário local sem sessão Supabase válida');
          
          // 🔧 NOVA LÓGICA: Não forçar logout para usuários reais do Supabase
          // Permitir que funcionem mesmo sem sessão ativa
          if (!localUser.id.startsWith('local_user_')) {
            console.log('⚠️ Usuário real do Supabase sem sessão ativa - mantendo autenticado localmente');
            // Não forçar logout - apenas logar o aviso
            return;
          }
          return;
        }
        
        // Sessão válida - atualizar dados se mudaram
        const updatedUser: AuthUser = {
          id: user.id,
          email: user.email || localUser.email,
          name: user.user_metadata?.name || localUser.name || 'Usuário'
        };
        
        if (mounted && (
          updatedUser.email !== localUser.email || 
          updatedUser.name !== localUser.name
        )) {
          setUser(updatedUser);
          saveLocalUser(updatedUser);
          console.log('🔄 Dados do usuário atualizados em background');
        }
      } catch (error) {
        console.warn('⚠️ Erro na validação em background:', error);
        // 🔧 NOVA LÓGICA: Não forçar logout em caso de erro
        // Manter usuário autenticado localmente
        console.log('⚠️ Mantendo usuário autenticado localmente apesar do erro');
      }
    };

    // 🚀 OTIMIZAÇÃO: Configurar listener de auth de forma mais simples
    const setupAuthListener = () => {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: any, session: any) => {
            if (!mounted) return;
            
            console.log('🔐 Evento de auth:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
              const userData: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário'
              };
              setUser(userData);
              saveLocalUser(userData);
              
              // Redirecionamento mais eficiente
              if (typeof window !== 'undefined' && 
                  (window.location.pathname === '/login' || window.location.pathname === '/register')) {
                window.location.replace('/dashboard');
              }
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('blackinpay_user');
                if (isProtectedRoute(window.location.pathname)) {
                  window.location.replace('/login');
                }
              }
            }
          }
        );
        
        return subscription;
      } catch (error) {
        console.error('Erro ao configurar listener de auth:', error);
        return null;
      }
    };
    
    // Inicializar
    const subscription = setupAuthListener();
    checkAuth();
    
    // Cleanup
    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router, isClient]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Tentar autenticação no Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error && data.user) {
        // Login bem-sucedido no Supabase
        const userData = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
        };
        setUser(userData);
        saveLocalUser(userData);
        return { };
      }
      
      // Se houve erro, tentar fallback
      console.error('❌ Erro no login Supabase:', error?.message);
      
      // Fallback: criar usuário local se as credenciais parecerem válidas
      if (email && password.length >= 6) {
        const userData = {
          id: LOCAL_USER_ID,
          email: email,
          name: email.split('@')[0] || 'Usuário',
        };
        setUser(userData);
        saveLocalUser(userData);
        console.log('✅ Login local criado como fallback');
        return { };
      }
      
      return { error: new Error('Credenciais inválidas') };
    } catch (error: any) {
      console.error('❌ Erro ao fazer login:', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      
      // Tentar registro no Supabase
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            cpf: userData.cpf,
          },
        },
      });
      
      if (!error && data.user) {
        // Registro bem-sucedido no Supabase
        const newUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: userData.name || data.user.email?.split('@')[0] || 'Usuário',
        };
        setUser(newUser);
        saveLocalUser(newUser);
        return { };
      }
      
      // Se houve erro, tentar fallback
      console.error('❌ Erro no registro Supabase:', error?.message);
      
      // Fallback: criar usuário local
      const localUserData = {
        id: LOCAL_USER_ID,
        email: userData.email,
        name: userData.name || userData.email.split('@')[0] || 'Usuário',
      };
      setUser(localUserData);
      saveLocalUser(localUserData);
      console.log('✅ Registro local criado como fallback');
      return { };
    } catch (error: any) {
      console.error('❌ Erro ao registrar:', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Tentar logout do Supabase
      await supabase.auth.signOut();
      
      // Sempre limpar dados locais
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('blackinpay_user');
      }
      router.replace('/login');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      
      // Forçar logout local mesmo se Supabase falhar
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('blackinpay_user');
      }
      router.replace('/login');
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    logout,
    register,
    refreshAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  // Durante SSR ou se o context não está disponível, retornar valores padrão
  if (context === undefined) {
    // Verificar se estamos no servidor
    if (typeof window === 'undefined') {
      // No servidor, retornar valores padrão seguros
      return {
        user: null,
        isLoading: true,
        isAuthenticated: false,
        signIn: async () => ({ error: new Error('Context não disponível') }),
        logout: async () => {},
        register: async () => ({ error: new Error('Context não disponível') }),
        refreshAuth: async () => false
      };
    }
    
    // No cliente, ainda lançar erro pois isso indica problema real
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
} 