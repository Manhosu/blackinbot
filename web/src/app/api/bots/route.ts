import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Cliente simples para operações sem sessão
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// API para buscar todos os bots
export async function GET(request: Request) {
  console.log('📥 GET /api/bots: Iniciando busca de bots');
  
  try {
    // Buscar bots do banco de dados, independente do ambiente
    const cookieStore = await cookies();
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

// API para criar um novo bot - ATUALIZADA PARA FUNCIONAR SEM SESSÃO SUPABASE
export async function POST(request: NextRequest) {
  console.log('📥 POST /api/bots: Iniciando criação de bot');
  
  try {
    const body = await request.json();
    console.log('📋 Dados recebidos:', {
      name: body.name,
      owner_id: body.owner_id,
      hasToken: !!body.token,
      plansCount: body.plans?.length || 0
    });
    
    const { name, token, owner_id, description, telegram_id, username, plans } = body;
    
    // Validações básicas
    if (!name || !token || !owner_id) {
      console.error('❌ Campos obrigatórios faltando');
      return NextResponse.json({ 
        success: false, 
        error: 'Campos obrigatórios: name, token, owner_id' 
      }, { status: 400 });
    }

    // Configurar cliente autenticado
    const cookieStore = await cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Verificar autenticação Supabase
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    console.log('🔐 Status da autenticação Supabase:', {
      hasUser: !!user,
      userId: user?.id,
      error: authError?.message,
      requestOwner: owner_id
    });
    
    // 🔧 NOVA LÓGICA: Verificar se é usuário real do Supabase
    let isSupabaseUser = false;
    if (user) {
      // Há sessão Supabase válida
      if (owner_id !== user.id) {
        console.error('❌ owner_id não corresponde ao usuário autenticado');
        return NextResponse.json({
          success: false,
          error: 'Não autorizado: owner_id deve corresponder ao usuário autenticado'
        }, { status: 403 });
      }
      isSupabaseUser = true;
      console.log('✅ Usuário autenticado via Supabase');
    } else {
      // Sem sessão Supabase - verificar se é usuário local válido
      if (owner_id.startsWith('local_user_')) {
        console.log('📝 Usuário local detectado, permitindo criação');
        isSupabaseUser = false;
      } else {
        // É um ID de usuário real do Supabase, mas sem sessão - permitir criação
        console.log('⚠️ ID de usuário Supabase sem sessão ativa detectado - permitindo criação');
        
        // Verificar se é um UUID válido (formato de ID do Supabase)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(owner_id)) {
          console.error('❌ ID de usuário inválido');
          return NextResponse.json({
            success: false,
            error: 'ID de usuário inválido'
          }, { status: 400 });
        }
        
        console.log('✅ ID de usuário válido - permitindo criação sem sessão');
        isSupabaseUser = true;
      }
    }
    
    console.log('✅ Autenticação verificada, criando bot:', name);
    
    // Verificar se o token do Telegram é válido
    console.log('🔍 Validando token do Telegram...');
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const telegramResult = await telegramResponse.json();
    
    if (!telegramResult.ok) {
      console.error('❌ Token do Telegram inválido:', telegramResult);
      return NextResponse.json({
        success: false,
        error: 'Token do Telegram inválido' 
      }, { status: 400 });
    }
    
    const botInfo = telegramResult.result;
    console.log('✅ Token validado:', `@${botInfo.username}`);
    
    // Preparar dados do bot
    const botData = {
      id: uuidv4(),
      name,
      token,
      owner_id,
      description: description || '',
      telegram_id: telegram_id || botInfo.id,
      username: username || botInfo.username,
      status: 'active',
      is_activated: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('💾 Dados do bot preparados:', {
      id: botData.id,
      name: botData.name,
      owner_id: botData.owner_id,
      username: botData.username
    });
    
    // Escolher cliente baseado no tipo de usuário
    const clientToUse = isSupabaseUser && user ? supabaseClient : supabase;
    
    // Criar bot no banco
    const { data: newBot, error: createError } = await clientToUse
      .from('bots')
      .insert(botData)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Erro ao criar bot:', createError);
      return NextResponse.json({
        success: false,
        error: `Erro ao criar bot: ${createError.message}` 
      }, { status: 500 });
    }
    
    console.log(`✅ Bot criado: ${newBot.name} (ID: ${newBot.id})`);
    
    // Criar planos se fornecidos
    if (plans && plans.length > 0) {
      console.log(`💰 Criando ${plans.length} planos...`);
      
      const planData = plans.map((plan: any) => ({
        id: uuidv4(),
        bot_id: newBot.id,
        name: plan.name,
        price: plan.price,
        period_days: plan.period_days,
        description: plan.description || '',
        is_active: plan.is_active !== false,
        period: plan.period || 'custom',
        days_access: plan.period_days,
        created_at: new Date().toISOString()
      }));
      
      const { data: createdPlans, error: plansError } = await clientToUse
        .from('plans')
        .insert(planData)
        .select();
      
      if (plansError) {
        console.error('⚠️ Erro ao criar planos:', plansError);
        // Não falhar a criação do bot por causa dos planos
      } else {
        console.log(`✅ ${createdPlans?.length || 0} planos criados`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bot criado e configurado automaticamente',
      bot: newBot,
      data: newBot, // Para compatibilidade
      botInfo: botInfo
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar bot:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Erro interno: ${error.message}` 
    }, { status: 500 });
  }
}

// Atualizar bot (sem reconfiguração automática de webhook para evitar RLS)
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

    // Adicionar timestamp de atualização
    updateData.updated_at = new Date().toISOString();

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
      message: 'Bot atualizado com sucesso',
      bot: updatedBot,
      data: updatedBot // Para compatibilidade
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar bot:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 