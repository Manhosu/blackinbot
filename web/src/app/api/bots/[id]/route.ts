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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📝 PATCH /api/bots/${params.id} - Iniciando atualização...`);
    
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ Usuário não autenticado');
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Dados recebidos:', body);

    // Validar dados obrigatórios para personalização
    if (body.welcome_message !== undefined) {
      if (!body.welcome_message || body.welcome_message.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Mensagem de boas-vindas é obrigatória' },
          { status: 400 }
        );
      }
    }

    // ✅ MAPEAMENTO MELHORADO: Compatibilidade com o novo sistema de upload
    const updateData: any = {};
    
    // Dados básicos do bot
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    
    // ✅ PERSONALIZAÇÃO AVANÇADA: Suporte total ao novo sistema
    if (body.welcome_message !== undefined) {
      updateData.welcome_message = body.welcome_message.trim();
      console.log(`📝 Mensagem atualizada: ${updateData.welcome_message.substring(0, 50)}...`);
    }
    
    if (body.welcome_media_url !== undefined) {
      updateData.welcome_media_url = body.welcome_media_url || null;
      console.log(`🖼️ URL de mídia: ${updateData.welcome_media_url ? 'Configurada' : 'Removida'}`);
    }
    
    if (body.welcome_media_type !== undefined) {
      // ✅ MAPEAMENTO INTELIGENTE: Frontend → Banco de dados
      let mappedType = body.welcome_media_type;
      
      // Mapear 'image' do frontend para 'photo' do banco (compatibilidade Telegram)
      if (mappedType === 'image') {
        mappedType = 'photo';
      }
      
      // Limpar tipo se não houver URL
      if (!body.welcome_media_url) {
        mappedType = null;
      }
      
      updateData.welcome_media_type = mappedType;
      console.log(`🎬 Tipo de mídia: ${mappedType || 'Removido'}`);
    }

    // ✅ VALIDAÇÃO INTELIGENTE: Consistência entre URL e tipo
    if (updateData.welcome_media_url && !updateData.welcome_media_type) {
      // Se há URL mas não há tipo, tentar detectar automaticamente
      const url = updateData.welcome_media_url.toLowerCase();
      if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('.mkv') || url.includes('.webm')) {
        updateData.welcome_media_type = 'video';
        console.log('🔍 Tipo detectado automaticamente: video');
      } else if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')) {
        updateData.welcome_media_type = 'photo';
        console.log('🔍 Tipo detectado automaticamente: photo');
      }
    } else if (!updateData.welcome_media_url && updateData.welcome_media_type) {
      // Se não há URL mas há tipo, remover o tipo também
      updateData.welcome_media_type = null;
      console.log('🧹 Tipo removido (sem URL correspondente)');
    }

    console.log('💾 Dados finais para atualização:', updateData);

    // Atualizar no banco de dados
    const supabase = createSupabaseAdmin();
    
    const { data: updatedBot, error } = await supabase
      .from('bots')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id) // Segurança: apenas o dono pode atualizar
      .select('*')
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar bot no Supabase:', error);
      
      // ✅ TRATAMENTO ESPECÍFICO: Constraint de media_type
      if (error.message?.includes('welcome_media_type_check')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Tipo de mídia inválido. Use apenas: photo, video ou deixe vazio.',
            details: 'Erro de validação no banco de dados'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `Erro no banco: ${error.message}` },
        { status: 500 }
      );
    }

    if (!updatedBot) {
      console.log('❌ Bot não encontrado ou sem permissão');
      return NextResponse.json(
        { success: false, error: 'Bot não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    console.log('✅ Bot atualizado com sucesso!');
    
    // ✅ RESPOSTA OTIMIZADA: Dados limpos para o frontend
    const responseData = {
      ...updatedBot,
      // Mapear de volta para o frontend (photo → image)
      welcome_media_type: updatedBot.welcome_media_type === 'photo' ? 'image' : updatedBot.welcome_media_type
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Bot atualizado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro geral na API PATCH:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
} 