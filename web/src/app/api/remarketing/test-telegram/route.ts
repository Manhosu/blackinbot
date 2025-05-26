import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
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

// Função simplificada para testar API do Telegram
async function testTelegramBot(token: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  
  if (!userId) {
    return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
  }
  
  try {
    console.log('🧪 Testando bots do Telegram...');
    
    // Buscar bots ativos do usuário
    const { data: userBots, error: botsError } = await supabaseAdmin
      .from('bots')
      .select('id, name, token, username')
      .eq('owner_id', userId)
      .eq('status', 'active')
      .not('token', 'is', null);
    
    if (botsError || !userBots || userBots.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum bot ativo encontrado',
        details: botsError 
      });
    }
    
    console.log(`🤖 Testando ${userBots.length} bots`);
    
    const testResults = [];
    
    for (const bot of userBots) {
      console.log(`🔍 Testando bot: ${bot.name}`);
      
      const result = await testTelegramBot(bot.token);
      
      testResults.push({
        bot_id: bot.id,
        bot_name: bot.name,
        username: bot.username,
        telegram_working: result.ok,
        telegram_data: result.ok ? result.result : null,
        error: result.ok ? null : result.error
      });
    }
    
    return NextResponse.json({
      success: true,
      total_bots: userBots.length,
      working_bots: testResults.filter(r => r.telegram_working).length,
      results: testResults
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 