import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { WebhookManager } from '@/lib/webhook-manager';

// API para buscar todos os bots
export async function GET(request: Request) {
  console.log('📥 GET /api/bots: Iniciando busca de bots');
  
  try {
    // Buscar bots do banco de dados, independente do ambiente
    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Verificar autenticação
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.log('⚠️ Usuário não autenticado, buscando apenas bots públicos');
      
      // Buscar todos os bots (para demonstração)
      const { data: allBots, error } = await supabase
        .from('bots')
        .select('*');
      
      if (error) {
        console.error('❌ Erro ao buscar bots:', error);
        return NextResponse.json({ 
          success: false, 
          bots: [],
          error: error.message,
          message: 'Erro ao buscar bots'
        });
      }
      
      return NextResponse.json({
        success: true,
        bots: allBots || [],
        message: 'Bots públicos carregados com sucesso'
      });
    }
    
    // Buscar bots do usuário
    const { data: userBots, error } = await supabaseClient
      .from('bots')
      .select('*')
      .eq('owner_id', user.id);
    
    if (error) {
      console.error('❌ Erro ao buscar bots do usuário:', error);
      return NextResponse.json({ 
        success: false, 
        bots: [],
        error: error.message,
        message: 'Erro ao buscar bots do usuário'
      });
    }
    
    return NextResponse.json({
      success: true,
      bots: userBots || [],
      message: 'Bots carregados com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro geral ao buscar bots:', error);
    
    return NextResponse.json({ 
      success: false, 
      bots: [],
      message: 'Erro ao processar requisição'
    });
  }
}

// API para criar um novo bot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, token, owner_id, welcome_message } = body;

    // Validações básicas
    if (!name || !token || !owner_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Campos obrigatórios: name, token, owner_id' 
      }, { status: 400 });
    }

    // Verificar se o token é válido
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token do Telegram inválido' 
      }, { status: 400 });
    }

    const botInfo = telegramResult.result;

    // Criar bot no banco
    const { data: newBot, error: createError } = await supabase
      .from('bots')
      .insert({
        name,
        token,
        owner_id,
        username: botInfo.username,
        welcome_message: welcome_message || `Olá! Bem-vindo ao ${name}!`,
        status: 'active',
        is_activated: false // Será ativado quando adicionado a um grupo
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Erro ao criar bot:', createError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao criar bot no banco de dados' 
      }, { status: 500 });
    }

    console.log(`✅ Bot criado: ${newBot.name} (ID: ${newBot.id})`);

    // 🎯 CONFIGURAÇÃO AUTOMÁTICA DE WEBHOOK
    try {
      console.log(`🔧 Configurando webhook automaticamente para ${newBot.name}...`);
      
      const webhookResult = await WebhookManager.setupWebhookForBot(newBot.id, newBot.token);
      
      if (webhookResult.success) {
        console.log(`✅ Webhook configurado automaticamente: ${newBot.name}`);
        
        // Atualizar bot com informações do webhook
        await supabase
          .from('bots')
          .update({ 
            webhook_configured_at: new Date().toISOString(),
            webhook_url: webhookResult.webhookUrl 
          })
          .eq('id', newBot.id);
      } else {
        console.warn(`⚠️ Falha na configuração automática do webhook: ${webhookResult.message}`);
      }
    } catch (webhookError) {
      console.error(`❌ Erro na configuração automática do webhook:`, webhookError);
      // Não falhar a criação do bot por causa do webhook
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bot criado e configurado automaticamente',
      bot: newBot,
      botInfo: botInfo
    });

  } catch (error) {
    console.error('❌ Erro ao criar bot:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// Atualizar bot (com reconfiguração automática se necessário)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID do bot é obrigatório' 
      }, { status: 400 });
    }

    // Se o token foi alterado, reconfigurar webhook
    let webhookReconfigured = false;
    if (updateData.token) {
      try {
        const webhookResult = await WebhookManager.setupWebhookForBot(id, updateData.token);
        if (webhookResult.success) {
          updateData.webhook_configured_at = new Date().toISOString();
          updateData.webhook_url = webhookResult.webhookUrl;
          webhookReconfigured = true;
          console.log(`✅ Webhook reconfigurado para bot ${id}`);
        }
      } catch (webhookError) {
        console.error(`❌ Erro ao reconfigurar webhook:`, webhookError);
      }
    }

    const { data: updatedBot, error } = await supabase
      .from('bots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: webhookReconfigured ? 'Bot atualizado e webhook reconfigurado' : 'Bot atualizado',
      bot: updatedBot 
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar bot:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 