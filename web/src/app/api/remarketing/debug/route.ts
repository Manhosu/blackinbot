import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com bypass RLS
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'x-bypass-rls': 'true'
    }
  }
});

export async function GET(req: NextRequest) {
  const userId = '315cf688-6036-4c3e-b316-f821b2d326f9';
  
  try {
    console.log('🔍 Testing Supabase connection...');
    
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