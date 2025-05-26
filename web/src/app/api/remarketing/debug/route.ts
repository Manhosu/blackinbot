import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com validação
function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'x-bypass-rls': 'true'
      }
    }
  });
}

export async function GET(req: NextRequest) {
  const userId = '315cf688-6036-4c3e-b316-f821b2d326f9';
  
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Teste 1: Buscar bots
    const { data: bots, error: botsError } = await supabaseAdmin
      .from('bots')
      .select('*')
      .eq('owner_id', userId);
    
    console.log('🤖 Bots result:', { bots, botsError });
    
    // Teste 2: Buscar grupos
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('*');
      
    console.log('📍 All groups:', { groups, groupsError });
    
    // Teste 3: Buscar grupos por bot_id específico
    if (bots && bots.length > 0) {
      const botIds = bots.map(b => b.id);
      const { data: userGroups, error: userGroupsError } = await supabaseAdmin
        .from('groups')
        .select('*')
        .in('bot_id', botIds);
        
      console.log('📍 User groups:', { userGroups, userGroupsError, botIds });
      
      return NextResponse.json({
        success: true,
        data: {
          bots: bots,
          all_groups: groups,
          user_groups: userGroups,
          bot_ids: botIds
        },
        errors: {
          bots_error: botsError,
          groups_error: groupsError,
          user_groups_error: userGroupsError
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      data: {
        bots: bots,
        all_groups: groups
      },
      errors: {
        bots_error: botsError,
        groups_error: groupsError
      }
    });
    
  } catch (error) {
    console.error('❌ Debug test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 