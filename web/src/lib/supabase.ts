import { createClient } from '@supabase/supabase-js';
// Remova o tipo Database se não existir em web/src/types/supabase

// URLs do Supabase - usar variáveis de ambiente com fallbacks seguros
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U';

// Função para validar configuração (apenas log de aviso, não erro fatal)
function validateSupabaseConfig() {
  console.log('🔧 Configuração Supabase:');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Anon Key configurada:', supabaseAnonKey ? 'Sim' : 'Não');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Usando valores fallback do Supabase - configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para produção');
  } else {
    console.log('✅ Variáveis de ambiente do Supabase carregadas corretamente');
  }
}

// Executar validação na inicialização
if (typeof window !== 'undefined') {
  validateSupabaseConfig();
}

// Cliente Supabase configurado como singleton
let supabaseInstance: any = null;

function createSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Desabilitar para evitar conflitos
        storageKey: 'blackinpay-auth', // Chave única
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      global: {
        headers: {
          'X-Client-Info': 'blackinpay-web'
        }
      }
    });
  }
  return supabaseInstance;
}

export const supabase = createSupabaseClient();

// Exportação padrão para compatibilidade
export default supabase; 