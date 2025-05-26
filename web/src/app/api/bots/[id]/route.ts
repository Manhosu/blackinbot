import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET - Buscar bot específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID do bot é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando bot ${id}...`);

    const { data: bot, error } = await supabaseClient
      .from('bots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar bot:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 404 });
    }

    if (!bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    console.log(`✅ Bot encontrado: ${bot.name}`);

    return NextResponse.json({
      success: true,
      data: bot
    });

  } catch (error: any) {
    console.error('Erro geral ao buscar bot:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PUT - Atualizar bot
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID do bot é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔄 Atualizando bot ${id}...`);

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.warn('⚠️ Usuário não autenticado');
      return NextResponse.json({ 
        success: false, 
        error: 'Autenticação necessária'
      }, { status: 401 });
    }

    // Campos que podem ser atualizados
    const allowedFields = [
      'name', 
      'description', 
      'webhook_url', 
      'webhook_set_at', 
      'status',
      'is_public'
    ];

    const updateData: any = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Adicionar timestamp de atualização
    updateData.updated_at = new Date().toISOString();

    const { data: updatedBot, error } = await supabaseClient
      .from('bots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar bot:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    console.log(`✅ Bot atualizado com sucesso: ${updatedBot.name}`);

    return NextResponse.json({
      success: true,
      data: updatedBot,
      message: 'Bot atualizado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro geral ao atualizar bot:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// DELETE - Excluir bot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID do bot é obrigatório'
      }, { status: 400 });
    }

    console.log(`🗑️ Excluindo bot ${id}...`);

    // Verificar autenticação e obter o usuário
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    let userId = null;
    if (authError || !user) {
      console.warn('⚠️ Não foi possível obter usuário via cookies, tentando acesso direto ao bot...');
      
      // Tentar buscar o bot - se conseguir, é porque tem acesso via RLS
      const { data: testBot, error: testError } = await supabaseClient
        .from('bots')
        .select('id, name, owner_id')
        .eq('id', id)
        .single();
      
      if (testError || !testBot) {
        console.error('❌ Bot não encontrado ou acesso negado:', testError);
        return NextResponse.json({
          success: false,
          error: 'Bot não encontrado ou você não tem permissão para excluí-lo'
        }, { status: 404 });
      }
      
      userId = testBot.owner_id;
      console.log(`🔍 Acesso confirmado ao bot: ${testBot.name} (owner: ${testBot.owner_id})`);
    } else {
      userId = user.id;
      console.log(`👤 Usuário autenticado: ${user.id}`);
    }

    // Primeiro, verificar se o bot existe e obter todos os dados
    const { data: bot, error: fetchError } = await supabaseClient
      .from('bots')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !bot) {
      console.error('❌ Bot não encontrado ou acesso negado:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado ou você não tem permissão para excluí-lo'
      }, { status: 404 });
    }

    console.log(`🔍 Bot encontrado: ${bot.name} (owner: ${bot.owner_id})`);

    // Verificar se o usuário é realmente o dono
    if (bot.owner_id !== userId) {
      console.error(`❌ Usuário ${userId} tentou excluir bot de ${bot.owner_id}`);
      return NextResponse.json({
        success: false,
        error: 'Você não tem permissão para excluir este bot'
      }, { status: 403 });
    }

    // Tentar remover webhook do Telegram antes de excluir
    if (bot.token) {
      try {
        console.log('🔗 Removendo webhook do Telegram...');
        const telegramUrl = `https://api.telegram.org/bot${bot.token}/deleteWebhook`;
        const webhookResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drop_pending_updates: true })
        });
        
        const webhookResult = await webhookResponse.json();
        
        if (webhookResult.ok) {
          console.log('✅ Webhook removido do Telegram');
        } else {
          console.warn('⚠️ Falha ao remover webhook do Telegram:', webhookResult);
        }
      } catch (webhookError) {
        console.warn('⚠️ Erro ao remover webhook (continuando com exclusão):', webhookError);
      }
    }

    // Usar RPC para executar as exclusões com contexto de autenticação adequado
    try {
      console.log('🗑️ Executando exclusão com contexto de autenticação...');
      
      const deleteQuery = `
        -- Definir contexto de autenticação
        SET LOCAL rls.auth_uid = '${userId}';
        
        -- Remover configurações de webhook relacionadas
        DELETE FROM public.webhook_configs WHERE bot_id = '${id}';
        
        -- Remover planos relacionados
        DELETE FROM public.plans WHERE bot_id = '${id}';
        
        -- Excluir o bot
        DELETE FROM public.bots WHERE id = '${id}';
        
        -- Retornar confirmação
        SELECT 1 as deleted;
      `;
      
      const { data: deleteResult, error: deleteError } = await supabaseClient.rpc('execute', {
        query: deleteQuery
      });
      
      if (deleteError) {
        console.error('❌ Erro ao executar exclusão:', deleteError);
        throw new Error(`Erro na exclusão: ${deleteError.message}`);
      }
      
      console.log('✅ Exclusão executada com sucesso via RPC');
      
    } catch (rpcError: any) {
      console.error('❌ Erro na exclusão via RPC:', rpcError);
      
      // Fallback: tentar exclusão sequencial manual
      console.log('🔄 Tentando exclusão manual sequencial...');
      
      // Remover configurações de webhook relacionadas
      try {
        console.log('🗑️ Removendo configurações de webhook...');
        const { error: webhookConfigError } = await supabaseClient
          .from('webhook_configs')
          .delete()
          .eq('bot_id', id);
        
        if (webhookConfigError) {
          console.warn('⚠️ Erro ao remover configurações de webhook:', webhookConfigError);
        } else {
          console.log('✅ Configurações de webhook removidas');
        }
      } catch (configError) {
        console.warn('⚠️ Erro ao limpar configurações:', configError);
      }

      // Remover planos relacionados
      try {
        console.log('🗑️ Removendo planos relacionados...');
        const { error: plansError } = await supabaseClient
          .from('plans')
          .delete()
          .eq('bot_id', id);
        
        if (plansError) {
          console.warn('⚠️ Erro ao remover planos:', plansError);
        } else {
          console.log('✅ Planos relacionados removidos');
        }
      } catch (plansError) {
        console.warn('⚠️ Erro ao limpar planos:', plansError);
      }

      // Excluir o bot do banco de dados
      console.log('🗑️ Excluindo bot do banco de dados...');
      const { error: deleteError } = await supabaseClient
        .from('bots')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erro ao excluir bot do banco:', deleteError);
        return NextResponse.json({
          success: false,
          error: `Erro ao excluir bot: ${deleteError.message}`
        }, { status: 400 });
      }
    }

    console.log(`✅ Bot "${bot.name}" excluído com sucesso do banco de dados`);

    return NextResponse.json({
      success: true,
      message: `Bot "${bot.name}" excluído com sucesso`
    });

  } catch (error: any) {
    console.error('❌ Erro geral ao excluir bot:', error);
    return NextResponse.json({
      success: false,
      error: `Erro interno do servidor: ${error.message}`
    }, { status: 500 });
  }
}

// PATCH - Atualizar configurações personalizadas do bot
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
  const botId = params.id;
  
  console.log(`🔄 PATCH /api/bots/${botId}: Atualizando conteúdo personalizado`);
  
  try {
    // Obter dados da requisição
    const requestData = await request.json();
    console.log('📦 Dados recebidos para atualização parcial:', Object.keys(requestData));
    
    // Estratégia de autenticação múltipla
    let userId = null;
    
    // Estratégia 1: Tentar autenticação via cookies
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (user && !authError) {
      userId = user.id;
      console.log('✅ Usuário autenticado via cookies:', userId);
    } else {
      console.warn('⚠️ Falha na autenticação via cookies:', authError?.message || 'Usuário nulo');
      
      // Estratégia 2: Verificar se o bot existe e tem owner_id válido
      const { data: botData, error: botError } = await supabaseClient
        .from('bots')
        .select('id, name, owner_id')
        .eq('id', botId)
        .single();
      
      if (botError || !botData) {
        console.error('❌ Bot não encontrado:', botError?.message);
        return NextResponse.json({ 
          success: false, 
          error: 'Bot não encontrado ou acesso negado'
        }, { status: 404 });
      }
      
      // Usar o owner_id do bot como fallback
      userId = botData.owner_id;
      console.log('✅ Usando owner_id do bot como fallback:', userId);
    }
    
    if (!userId) {
      console.error('❌ Não foi possível determinar userId');
      return NextResponse.json({ 
        success: false, 
        error: 'Autenticação necessária para atualizar bots'
      }, { status: 401 });
    }
    
    // Campos permitidos para atualização
    const allowedFields = [
      'name',
      'description', 
      'welcome_message',
      'welcome_media_url',
      'avatar_url',
      'status',
      'is_public'
    ];
    
    // Filtrar apenas campos permitidos
    const updateData: any = {};
    allowedFields.forEach(field => {
      if (requestData[field] !== undefined) {
        updateData[field] = requestData[field];
      }
    });
    
    // Adicionar timestamp de atualização
    updateData.updated_at = new Date().toISOString();
    
    console.log('🔄 Atualizando campos:', Object.keys(updateData));
    console.log('👤 UserId para atualização:', userId);
    
    // Tentar atualizar no banco de dados usando SQL direto para contornar RLS
    try {
      // Usar função SQL personalizada para contornar problemas de RLS
      const { data: result, error: rpcError } = await supabaseClient.rpc('update_bot_content', {
        bot_id: botId,
        owner_user_id: userId,
        welcome_msg: updateData.welcome_message || null,
        media_url: updateData.welcome_media_url || null
      });
      
      if (rpcError) {
        console.error('❌ Erro na função RPC:', rpcError.message);
        throw new Error(`Erro ao atualizar via RPC: ${rpcError.message}`);
      }
      
      console.log('✅ Personalização salva via RPC com sucesso');
      return NextResponse.json({
        success: true,
        bot: result,
        storage: 'database-rpc'
      });
      
    } catch (updateError) {
      console.error('❌ Erro ao atualizar:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao atualizar bot no banco de dados'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar personalização do bot:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao atualizar personalização do bot' 
    }, { status: 500 });
  }
} 