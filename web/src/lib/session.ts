import { supabase } from './supabase';

/**
 * Obtém o usuário atual da sessão do Supabase
 * @returns O usuário atual ou null se não estiver autenticado
 */
export async function getUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return null;
    }
    
    if (!session) {
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 * @returns true se o usuário estiver autenticado, false caso contrário
 */
export async function isAuthenticated() {
  const user = await getUser();
  return !!user;
}

/**
 * Obtém o token de acesso do usuário atual
 * @returns O token de acesso ou null se não estiver autenticado
 */
export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
} 