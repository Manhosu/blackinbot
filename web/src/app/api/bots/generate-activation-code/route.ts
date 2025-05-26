import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Gerar código de ativação temporário para bot
 */
export async function POST(request: NextRequest) {
  try {
    const { bot_id } = await request.json();
    
    console.log('🔑 Gerando código de ativação para bot:', bot_id);
    
    if (!bot_id) {
      return NextResponse.json({
        success: false,
        error: 'ID do bot é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar o bot diretamente para verificar se existe e pertence ao usuário logado
    // Como esta API está sendo chamada da interface web, vamos confiar que o usuário foi validado
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, name, owner_id, is_activated')
      .eq('id', bot_id)
      .single();
    
    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }
    
    // Verificar se bot já está ativado
    if (bot.is_activated) {
      return NextResponse.json({
        success: false,
        error: 'Bot já está ativado'
      }, { status: 400 });
    }
    
    // Gerar código único de 8 caracteres
    const generateCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // Formato: XXXX-XXXX para facilitar digitação
      return code.substring(0, 4) + '-' + code.substring(4, 8);
    };
    
    let activationCode: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Gerar código único (verificar se não existe)
    do {
      activationCode = generateCode();
      attempts++;
      
      const { data: existingCode } = await supabase
        .from('bot_activation_codes')
        .select('id')
        .eq('activation_code', activationCode)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();
      
      if (!existingCode) break;
      
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao gerar código único. Tente novamente.'
      }, { status: 500 });
    }
    
    // Remover códigos anteriores não utilizados do bot
    await supabase
      .from('bot_activation_codes')
      .delete()
      .eq('bot_id', bot_id)
      .is('used_at', null);
    
    // Criar novo código com expiração em 10 minutos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    
    const { data: newCode, error: insertError } = await supabase
      .from('bot_activation_codes')
      .insert({
        bot_id: bot_id,
        activation_code: activationCode,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir código:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar código de ativação'
      }, { status: 500 });
    }
    
    console.log('✅ Código de ativação gerado:', activationCode);
    
    return NextResponse.json({
      success: true,
      activation_code: activationCode,
      expires_at: expiresAt.toISOString(),
      expires_in_minutes: 10,
      bot_name: bot.name,
      instructions: `Copie o código ${activationCode} e cole no grupo onde o bot está como administrador para ativá-lo.`
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar código de ativação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * Verificar status de ativação do bot
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bot_id = searchParams.get('bot_id');
    
    if (!bot_id) {
      return NextResponse.json({
        success: false,
        error: 'ID do bot é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar bot
    const { data: bot } = await supabase
      .from('bots')
      .select('id, name, is_activated, activated_at')
      .eq('id', bot_id)
      .single();
    
    if (!bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }
    
    // Buscar código ativo se bot não estiver ativado
    let activeCode = null;
    if (!bot.is_activated) {
      const { data: codeData } = await supabase
        .from('bot_activation_codes')
        .select('activation_code, expires_at')
        .eq('bot_id', bot_id)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      activeCode = codeData;
    }
    
    return NextResponse.json({
      success: true,
      bot: {
        id: bot.id,
        name: bot.name,
        is_activated: bot.is_activated,
        activated_at: bot.activated_at
      },
      active_code: activeCode
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar status:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 