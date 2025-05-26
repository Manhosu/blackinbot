import { createClient } from '@supabase/supabase-js';
// Remova o tipo Database se não existir em web/src/types/supabase

// URLs do Supabase - OBRIGATÓRIO usar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Variáveis de ambiente do Supabase não configuradas! Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

console.log('🔧 Configuração Supabase:');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Anon Key configurada:', supabaseAnonKey ? 'Sim' : 'Não');

// Cliente Supabase configurado
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Exportação padrão para compatibilidade
export default supabase; 