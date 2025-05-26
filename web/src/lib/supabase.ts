import { createClient } from '@supabase/supabase-js';
// Remova o tipo Database se não existir em web/src/types/supabase

// URLs do Supabase - usar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validação será feita no primeiro uso, não na inicialização
function validateSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas! Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

console.log('🔧 Configuração Supabase:');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Anon Key configurada:', supabaseAnonKey ? 'Sim' : 'Não');

// Cliente Supabase configurado - com fallback para build
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder', 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Exportação padrão para compatibilidade
export default supabase; 