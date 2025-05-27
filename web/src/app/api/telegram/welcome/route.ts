import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API para buscar dados de boas-vindas do bot para envio no Telegram
 * Esta API será chamada quando um usuário enviar /start para o bot
 */
export async function POST(request: NextRequest) {
  try {
    const { bot_token, user_id, chat_id, user_name } = await request.json();
    
    console.log('📨 Solicitação de boas-vindas recebida:', {
      bot_token: bot_token?.substring(0, 10) + '...',
      user_id,
      chat_id,
      user_name
    });
    
    if (!bot_token) {
      return NextResponse.json({
        success: false,
        error: 'Token do bot é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar bot pelo token
    const { data: bots, error: botError } = await supabase
      .from('bots')
      .select(`
        id,
        name,
        token,
        welcome_message,
        welcome_media_url,
        owner_id,
        status,
        plans:plans(
          id,
          name,
          price,
          period_days,
          description,
          is_active
        )
      `)
      .eq('token', bot_token)
      .eq('status', 'active')
      .single();
    
    if (botError || !bots) {
      console.error('❌ Bot não encontrado:', botError?.message);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado ou inativo'
      }, { status: 404 });
    }
    
    console.log('✅ Bot encontrado:', bots.name);
    
    // Registrar o usuário se não existir
    try {
      const { error: userError } = await supabase
        .from('bot_users')
        .upsert({
          telegram_id: user_id.toString(),
          bot_id: bots.id,
          name: user_name || 'Usuário',
          username: user_name || '',
          first_interaction: new Date().toISOString(),
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'telegram_id,bot_id'
        });
      
      if (userError) {
        console.warn('⚠️ Erro ao registrar usuário:', userError.message);
      } else {
        console.log('✅ Usuário registrado/atualizado');
      }
    } catch (userRegistrationError) {
      console.warn('⚠️ Falha no registro do usuário:', userRegistrationError);
    }
    
    // Preparar mensagem de boas-vindas
    let welcomeMessage = bots.welcome_message || `Olá {nome}! 👋\n\nBem-vindo ao ${bots.name}!`;
    
    // Substituir placeholder do nome
    welcomeMessage = welcomeMessage.replace(/\{nome\}/g, user_name || 'amigo');
    
    // Adicionar informações dos planos se existirem
    if (bots.plans && bots.plans.length > 0) {
      welcomeMessage += '\n\n💰 **Planos Disponíveis:**\n';
      
      bots.plans
        .filter((plan: any) => plan.is_active)
        .forEach((plan: any, index: number) => {
          const period = plan.period_days >= 365 
            ? `${Math.floor(plan.period_days / 365)} ano(s)`
            : plan.period_days >= 30 
            ? `${Math.floor(plan.period_days / 30)} mês(es)`
            : `${plan.period_days} dias`;
          
          welcomeMessage += `\n${index + 1}. **${plan.name}**`;
          welcomeMessage += `\n   💵 R$ ${plan.price.toFixed(2)}`;
          welcomeMessage += `\n   ⏰ ${period}\n`;
          
          if (plan.description) {
            welcomeMessage += `   📝 ${plan.description}\n`;
          }
        });
      
      welcomeMessage += '\n🔗 Entre em contato para adquirir seu plano!';
    }
    
    // Resposta estruturada para o bot do Telegram
    const response = {
      success: true,
      bot: {
        id: bots.id,
        name: bots.name,
        owner_id: bots.owner_id
      },
      welcome: {
        message: welcomeMessage,
        media_url: bots.welcome_media_url || null,
        has_media: !!bots.welcome_media_url
      },
      plans: bots.plans?.filter((plan: any) => plan.is_active) || [],
      user_registered: true
    };
    
    console.log('📤 Enviando resposta de boas-vindas para o bot');
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erro ao processar boas-vindas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * API PUT para atualizar mensagem de boas vindas
 */
export async function PUT(request: NextRequest) {
  try {
    const { bot_id, welcome_message } = await request.json();
    
    console.log('🔄 Atualizando mensagem de boas vindas:', {
      bot_id,
      message_length: welcome_message?.length || 0
    });
    
    if (!bot_id || !welcome_message) {
      return NextResponse.json({
        success: false,
        error: 'bot_id e welcome_message são obrigatórios'
      }, { status: 400 });
    }
    
    // Atualizar mensagem no banco
    const { error } = await supabase
      .from('bots')
      .update({
        welcome_message: welcome_message.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bot_id);
    
    if (error) {
      console.error('❌ Erro ao atualizar mensagem:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar mensagem no banco de dados'
      }, { status: 500 });
    }
    
    console.log('✅ Mensagem de boas vindas atualizada com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Mensagem de boas vindas atualizada com sucesso',
      updated_at: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao atualizar mensagem de boas vindas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * API GET para testar conectividade
 */
export async function GET() {
  return NextResponse.json({
    service: 'Telegram Welcome API',
    status: 'online',
    timestamp: new Date().toISOString()
  });
} 