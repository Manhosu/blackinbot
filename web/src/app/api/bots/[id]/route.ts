import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID do bot é obrigatório'
      }, { status: 400 });
    }

    console.log(`🗑️ Excluindo bot ${id}...`);

    // Criar cliente admin para contornar RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Buscar o bot primeiro para obter informações
    const { data: bot, error: fetchError } = await supabaseAdmin
      .from('bots')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !bot) {
      console.error('❌ Bot não encontrado:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    console.log(`🔍 Bot encontrado: ${bot.name} (owner: ${bot.owner_id})`);

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

    // Exclusão sequencial usando cliente admin
    console.log('🗑️ Iniciando exclusão sequencial...');
    
    // 1. Remover pagamentos relacionados aos planos do bot
    try {
      console.log('🗑️ Removendo pagamentos relacionados...');
      
      // Primeiro, buscar os IDs dos planos do bot
      const { data: plans, error: plansQueryError } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('bot_id', id);
      
      if (plansQueryError) {
        console.warn('⚠️ Erro ao buscar planos:', plansQueryError);
      } else if (plans && plans.length > 0) {
        const planIds = plans.map(plan => plan.id);
        
        // Agora remover os pagamentos relacionados a esses planos
        const { error: paymentsError } = await supabaseAdmin
          .from('payments')
          .delete()
          .in('plan_id', planIds);
        
        if (paymentsError) {
          console.warn('⚠️ Erro ao remover pagamentos:', paymentsError);
        } else {
          console.log(`✅ Pagamentos relacionados removidos (${planIds.length} planos)`);
        }
      } else {
        console.log('✅ Nenhum plano encontrado, pulando remoção de pagamentos');
      }
    } catch (paymentsError) {
      console.warn('⚠️ Erro ao limpar pagamentos:', paymentsError);
    }

    // 2. Remover grupos relacionados ao bot
    try {
      console.log('🗑️ Removendo grupos relacionados...');
      const { error: groupsError } = await supabaseAdmin
        .from('groups')
        .delete()
        .eq('bot_id', id);
      
      if (groupsError) {
        console.warn('⚠️ Erro ao remover grupos:', groupsError);
      } else {
        console.log('✅ Grupos relacionados removidos');
      }
    } catch (groupsError) {
      console.warn('⚠️ Erro ao limpar grupos:', groupsError);
    }

    // 3. Pular ativações (tabela não existe no esquema atual)
    console.log('⏭️ Pulando remoção de ativações (tabela não existe)');

    // 4. Remover configurações de webhook relacionadas
    try {
      console.log('🗑️ Removendo configurações de webhook...');
      const { error: webhookConfigError } = await supabaseAdmin
        .from('webhook_configs')
        .delete()
        .eq('bot_id', id);
      
      if (webhookConfigError) {
        console.warn('⚠️ Erro ao remover configurações de webhook:', webhookConfigError);
      } else {
        console.log('✅ Configurações de webhook removidas');
      }
    } catch (configError) {
      console.warn('⚠️ Erro ao limpar configurações de webhook:', configError);
    }

    // 5. Remover planos relacionados (agora que os pagamentos já foram removidos)
    try {
      console.log('🗑️ Removendo planos relacionados...');
      const { error: plansError } = await supabaseAdmin
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
    
    const { error: deleteError } = await supabaseAdmin
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

    // Verificar se o bot foi realmente excluído
    console.log('🔍 Verificando se o bot foi excluído...');
    const { data: checkBot, error: checkError } = await supabaseAdmin
      .from('bots')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!checkError && checkBot) {
      console.error('❌ Bot ainda existe no banco após exclusão!');
      return NextResponse.json({
        success: false,
        error: 'Falha na exclusão - bot ainda existe no banco'
      }, { status: 500 });
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
    
    // Tentar atualizar no banco de dados usando cliente admin
    try {
      console.log('🔄 Atualizando bot no banco usando cliente admin...');
      
      // Usar cliente admin para contornar RLS
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      const { data: updatedBot, error: updateError } = await supabaseAdmin
        .from('bots')
        .update(updateData)
        .eq('id', botId)
        .eq('owner_id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erro ao atualizar bot:', updateError.message);
        return NextResponse.json({ 
          success: false, 
          error: `Erro ao atualizar bot: ${updateError.message}`
        }, { status: 500 });
      }
      
      console.log('✅ Bot atualizado com sucesso');
      return NextResponse.json({
        success: true,
        data: updatedBot,
        message: 'Bot atualizado com sucesso'
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