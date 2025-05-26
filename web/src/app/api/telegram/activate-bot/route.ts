import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Ativar bot usando código de ativação
 * Esta API será chamada pelo bot do Telegram quando alguém enviar o código
 */
export async function POST(request: NextRequest) {
  try {
    const { activation_code, telegram_user_id, chat_id, chat_type } = await request.json();
    
    if (!activation_code || !telegram_user_id) {
      return NextResponse.json({
        success: false,
        error: 'Código de ativação e ID do usuário são obrigatórios'
      }, { status: 400 });
    }
    
    // Normalizar código
    const normalizedCode = activation_code.replace(/\s/g, '').toUpperCase();
    
    // Buscar código válido com informações do bot
    const { data: codeData, error: codeError } = await supabase
      .from('bot_activation_codes')
      .select(`
        id,
        bot_id,
        activation_code,
        expires_at,
        used_at,
        bots (
          id,
          name,
          token,
          owner_id,
          is_activated
        )
      `)
      .eq('activation_code', normalizedCode)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();
    
    if (codeError || !codeData) {
      return NextResponse.json({
        success: false,
        error: 'Código inválido ou expirado',
        message: '❌ Código de ativação inválido ou expirado'
      }, { status: 404 });
    }
    
    const bot = codeData.bots as any;
    
    // Verificar se bot já está ativado
    if (bot?.is_activated) {
      return NextResponse.json({
        success: false,
        error: 'Bot já está ativado',
        message: `❌ O bot "${bot.name}" já está ativado`
      }, { status: 400 });
    }
    
    // Marcar código como usado
    console.log('🔄 Marcando código como usado...');
    const { error: updateCodeError } = await supabase
      .from('bot_activation_codes')
      .update({
        used_at: new Date().toISOString(),
        used_by_telegram_id: telegram_user_id
      })
      .eq('id', codeData.id);
    
    if (updateCodeError) {
      console.error('❌ Erro ao marcar código como usado:', updateCodeError);
      throw updateCodeError;
    }
    console.log('✅ Código marcado como usado');
    
    // Ativar o bot
    console.log('🔄 Ativando bot no banco...');
    const { error: activateBotError } = await supabase
      .from('bots')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        activated_by_telegram_id: telegram_user_id
      })
      .eq('id', bot.id);
    
    if (activateBotError) {
      console.error('❌ Erro ao ativar bot:', activateBotError);
      throw activateBotError;
    }
    console.log('✅ Bot ativado no banco com sucesso');
    
    return NextResponse.json({
      success: true,
      message: `✅ Bot "${bot.name}" ativado com sucesso!`,
      bot: {
        id: bot.id,
        name: bot.name,
        activated_at: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Erro interno',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Verificar se código de ativação é válido (sem ativar)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activation_code = searchParams.get('code');
    
    if (!activation_code) {
      return NextResponse.json({
        success: false,
        error: 'Código de ativação é obrigatório'
      }, { status: 400 });
    }
    
    const normalizedCode = activation_code.replace(/\s/g, '').toUpperCase();
    
    // Buscar código
    const { data: codeData } = await supabase
      .from('bot_activation_codes')
      .select(`
        id,
        bot_id,
        activation_code,
        expires_at,
        used_at,
        bots (
          id,
          name,
          is_activated
        )
      `)
      .eq('activation_code', normalizedCode)
      .single();
    
    if (!codeData) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Código não encontrado'
      });
    }
    
    const now = new Date();
    const expiresAt = new Date(codeData.expires_at);
    const isExpired = now > expiresAt;
    const isUsed = !!codeData.used_at;
    const isBotActivated = (codeData.bots as any)?.is_activated;
    
    const isValid = !isExpired && !isUsed && !isBotActivated;
    
    return NextResponse.json({
      success: true,
      valid: isValid,
      code_info: {
        bot_name: (codeData.bots as any)?.name,
        expires_at: codeData.expires_at,
        is_expired: isExpired,
        is_used: isUsed,
        is_bot_activated: isBotActivated,
        minutes_remaining: isExpired ? 0 : Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)))
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar código:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 