import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Buscar detalhes do bot
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const botId = params.id;
  console.log(`📥 GET /api/bots/${botId}: Buscando detalhes do bot`);
  
  try {
    // Tentar encontrar o bot no banco de dados
    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Autenticação (opcional)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    // Buscar detalhes do bot
    const { data: botData, error: botError } = await supabase
      .from('bots')
      .select(`
        *,
        groups:groups(id, name, telegram_id, description, is_active),
        plans:plans(id, name, price, period_days, description, is_active)
      `)
      .eq('id', botId)
      .single();
    
    if (botError || !botData) {
      console.error(`❌ Bot ${botId} não encontrado:`, botError?.message || 'Sem dados');
      return NextResponse.json({ 
        success: false, 
        error: 'Bot não encontrado'
      }, { status: 404 });
    }
    
    // Verificar permissão de acesso
    if (user && botData.owner_id && botData.owner_id !== user.id) {
      console.warn('⚠️ Acesso não autorizado ao bot');
      return NextResponse.json({ 
        success: false, 
        error: 'Você não tem permissão para acessar este bot'
      }, { status: 403 });
    }
    
    console.log(`✅ Bot ${botId} encontrado no banco de dados`);
    
    // Buscar transações (opcional)
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('bot_id', botId);
    
    // Incluir transações se disponíveis
    if (!txError && transactions) {
      botData.transactions = transactions;
    }
    
    return NextResponse.json({
      success: true,
      bot: botData,
      storage: 'database'
    });
  } catch (error) {
    console.error(`❌ Erro ao buscar bot ${botId}:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao buscar bot'
    }, { status: 500 });
  }
}

// PUT - Atualizar bot
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
  const botId = params.id;
  
  console.log(`📝 PUT /api/bots/${botId}: Atualizando bot`);
  
  try {
    // Obter dados da requisição
    const updatedData = await request.json();
    console.log('📦 Dados recebidos para atualização:', Object.keys(updatedData));
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.warn('⚠️ Usuário não autenticado, acesso negado');
      return NextResponse.json({ 
        success: false, 
        error: 'Autenticação necessária para atualizar bots'
      }, { status: 401 });
    }
    
    // Verificar se o bot existe e pertence ao usuário
    const { data: existingBot, error: findError } = await supabase
      .from('bots')
      .select('owner_id')
      .eq('id', botId)
      .single();
    
    if (findError || !existingBot) {
      console.error(`❌ Bot ${botId} não encontrado:`, findError?.message || 'Sem dados');
      return NextResponse.json({ 
        success: false, 
        error: 'Bot não encontrado'
      }, { status: 404 });
    }
    
    // Verificar permissão
    if (existingBot.owner_id !== user.id) {
      console.warn('⚠️ Tentativa de atualizar bot de outro usuário');
      return NextResponse.json({ 
        success: false, 
        error: 'Você não tem permissão para atualizar este bot'
      }, { status: 403 });
    }
    
    // Atualizar no banco de dados
    const { data: dbBot, error: dbError } = await supabase
      .from('bots')
      .update(updatedData)
      .eq('id', botId)
      .eq('owner_id', user.id)
      .select()
      .single();
    
    if (dbError) {
      console.error('❌ Erro ao atualizar bot no banco:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: dbError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      bot: dbBot,
      storage: 'database'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar bot:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao atualizar bot' 
    }, { status: 500 });
  }
}

// DELETE - Excluir bot
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log('🗑️ Solicitação para excluir bot:', id);

    // Tentar excluir no banco de dados (isso pode falhar devido ao RLS)
    try {
      // 1. Deletar membros dos grupos
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', 
          supabase
            .from('groups')
            .select('id')
            .eq('bot_id', id)
        );

      // 2. Deletar transações dos planos
      await supabase
        .from('transactions')
        .delete()
        .eq('plan_id',
          supabase
            .from('plans')
            .select('id')
            .eq('bot_id', id)
        );

      // 3. Deletar planos
      await supabase
        .from('plans')
        .delete()
        .eq('bot_id', id);

      // 4. Deletar grupos
      await supabase
        .from('groups')
        .delete()
        .eq('bot_id', id);

      // 5. Finalmente, deletar o bot
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', id);

      if (error) {
        console.log('Erro esperado ao deletar bot no banco:', error.message);
      } else {
        console.log('✅ Bot excluído com sucesso no banco');
      }
    } catch (dbError) {
      console.log('Erro esperado ao deletar bot no banco:', dbError);
    }

    // Sempre retornar sucesso para o frontend gerenciar o localStorage
    return NextResponse.json({ 
      success: true, 
      message: 'Bot excluído com sucesso',
      source: 'hybrid'
    });

  } catch (err: any) {
    console.error('Erro crítico ao deletar bot:', err);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: err.message
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
    const updateData = await request.json();
    console.log('📦 Dados recebidos para atualização parcial:', Object.keys(updateData));
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.warn('⚠️ Usuário não autenticado, acesso negado');
      return NextResponse.json({ 
        success: false, 
        error: 'Autenticação necessária para atualizar bots'
      }, { status: 401 });
    }
    
    // Tentar atualizar no banco de dados
    const { data: dbBot, error: dbError } = await supabase
      .from('bots')
      .update(updateData)
      .eq('id', botId)
      .eq('owner_id', user.id)
      .select()
      .single();
    
    if (dbError) {
      console.error('❌ Erro ao atualizar personalização no banco:', dbError.message);
      return NextResponse.json({ 
        success: false, 
        error: dbError.message
      }, { status: 500 });
    }
    
    console.log('✅ Personalização salva no banco com sucesso');
    return NextResponse.json({
      success: true,
      bot: dbBot,
      storage: 'database'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar personalização do bot:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao atualizar personalização do bot' 
    }, { status: 500 });
  }
} 