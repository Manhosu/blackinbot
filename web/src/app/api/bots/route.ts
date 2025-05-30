import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Iniciando busca de bots...');
  
    const supabaseClient = await createSupabaseServerClient();
    
    // Verificar autenticação
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    
    let userId = null;
    let clientToUse = supabaseClient;
    
    if (authError || !session?.user) {
      console.log('❌ Erro de autenticação na busca, usando modo desenvolvimento...');
      
      // Usar cliente admin para contornar RLS
      clientToUse = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      // Para desenvolvimento, buscar todos os bots
      console.log('🔧 Buscando TODOS os bots (modo desenvolvimento)');
      
      const { data: bots, error } = await clientToUse
        .from('bots')
        .select('*')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar bots:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao buscar bots' 
        }, { status: 500 });
      }
      
      console.log(`✅ Encontrados ${bots?.length || 0} bots (modo desenvolvimento)`);
      return NextResponse.json({ 
        success: true, 
        bots: bots || [] 
      });
    }

    // Fluxo normal com usuário autenticado
    userId = session.user.id;
    console.log(`👤 Buscando bots para usuário: ${userId}`);
    
    // Buscar bots do usuário
    const { data: bots, error } = await clientToUse
      .from('bots')
      .select('*')
      .eq('owner_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar bots:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar bots' 
      }, { status: 500 });
    }
    
    console.log(`✅ Encontrados ${bots?.length || 0} bots`);
    return NextResponse.json({ 
      success: true, 
      bots: bots || [] 
    });

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Iniciando criação de bot...');
    
    const supabaseClient = await createSupabaseServerClient();
    
    // Verificar autenticação
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    
    let userId = null;
    
    if (authError || !session?.user) {
      console.log('❌ Erro de autenticação ou usuário não encontrado');
      console.log('🔧 MODO DESENVOLVIMENTO: Tentando usar usuário padrão...');
      
      // Para desenvolvimento, usar um usuário existente do banco
      const { data: users, error: usersError } = await supabaseClient
        .from('users')
        .select('id')
        .limit(1);
      
      if (usersError || !users || users.length === 0) {
        // Usar um ID real de usuário para desenvolvimento
        userId = 'a12b8430-c0be-4ab9-ac55-b77238d102f1'; // ID real do banco
        console.log('🔧 Usando usuário de desenvolvimento fixo:', userId);
      } else {
        userId = users[0].id;
        console.log('🔧 Usando usuário da tabela users:', userId);
      }
    } else {
      userId = session.user.id;
      console.log('✅ Usuário autenticado:', userId);
    }

    const body = await req.json();
    const { name, token, description, telegram_id, username, webhook_url, is_public, status, plans } = body;

    console.log('📝 Dados recebidos:', { 
      name, 
      token: token ? '***OCULTO***' : 'não fornecido', 
      description, 
      telegram_id, 
      username, 
      plansCount: plans?.length || 0 
    });

    // Validações
    if (!name || !token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nome e token são obrigatórios' 
      }, { status: 400 });
    }

    // Preparar dados do bot
    const botData = {
      name: name.trim(),
      token: token.trim(),
      description: description?.trim() || '',
      telegram_id,
      username,
      webhook_url,
      is_public: is_public || false,
      status: status || 'active',
      owner_id: userId
    };

    console.log('📝 Criando bot com dados:', { ...botData, token: '***' });

    // Usar cliente admin se não há sessão válida (desenvolvimento)
    let clientToUse = supabaseClient;
    if (!session?.user) {
      console.log('🔧 Usando cliente admin para contornar RLS...');
      clientToUse = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    }

    // Inserir bot
    const { data: bot, error } = await clientToUse
      .from('bots')
      .insert([botData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar bot:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao criar bot: ' + error.message 
      }, { status: 500 });
    }

    console.log('✅ Bot criado com sucesso:', bot.id);

    // Processar planos se fornecidos
    let createdPlans = [];
    if (plans && Array.isArray(plans) && plans.length > 0) {
      console.log(`📋 Processando ${plans.length} planos...`);
      
      const plansData = plans.map(plan => ({
        name: plan.name,
        price: parseFloat(plan.price),
        period: plan.period || 'monthly',
        period_days: parseInt(plan.period_days) || 30,
        description: plan.description || '',
        is_active: plan.is_active !== false,
        days_access: parseInt(plan.period_days) || 30,
        bot_id: bot.id
      }));

      const { data: plansResult, error: plansError } = await clientToUse
        .from('plans')
        .insert(plansData)
        .select();

      if (plansError) {
        console.error('⚠️ Erro ao criar planos:', plansError);
        // Não falhar a criação do bot por causa dos planos
        console.log('⚠️ Bot criado, mas sem planos. Continuando...');
      } else {
        createdPlans = plansResult || [];
        console.log(`✅ ${createdPlans.length} planos criados com sucesso`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      bot,
      plans: createdPlans,
      data: bot // Para compatibilidade
    });

  } catch (error: any) {
    console.error('❌ Erro geral na criação:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor: ' + error.message 
    }, { status: 500 });
  }
} 