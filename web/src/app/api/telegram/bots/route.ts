import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com validação
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
  }
  
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Buscando todos os bots para webhook manager');

    const supabase = createSupabaseClient();

    // Buscar todos os bots com tokens
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, name, token, username, webhook_url');

    if (error) {
      console.error('❌ Erro ao buscar bots:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar bots' 
      }, { status: 500 });
    }

    if (!bots || bots.length === 0) {
      return NextResponse.json({ 
        success: true, 
        bots: [],
        message: 'Nenhum bot encontrado'
      });
    }

    // Formatar bots para o webhook manager
    const botsFormatted = bots.map((bot: any) => ({
      bot_id: bot.id,
      bot_name: bot.name,
      token: bot.token,
      username: bot.username,
      webhook_url: bot.webhook_url
    }));

    console.log(`✅ Encontrados ${botsFormatted.length} bots`);

    return NextResponse.json({
      success: true,
      bots: botsFormatted,
      total: botsFormatted.length
    });

  } catch (error) {
    console.error('❌ Erro ao buscar bots:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 