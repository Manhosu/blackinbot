import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com Service Role Key
function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas para Service Role');
  }
  
  return createClient(url, serviceKey);
}

/**
 * GET - Buscar planos de um bot específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: botId } = await params; // Fix: await params no Next.js 15
    console.log('🔍 Buscando planos do bot:', botId);

    // Criar cliente Supabase
    const supabase = createSupabaseServiceClient();

    // Buscar planos do bot
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('bot_id', botId)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar planos:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar planos'
      }, { status: 500 });
    }

    console.log(`✅ ${plans?.length || 0} planos encontrados`);

    return NextResponse.json({
      success: true,
      plans: plans || []
    });

  } catch (error: any) {
    console.error('❌ Erro na busca de planos:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * POST - Criar novo plano para o bot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: botId } = await params; // Fix: await params no Next.js 15
    const data = await request.json();
    
    console.log('📋 Criando plano para bot:', botId);

    // Validar dados obrigatórios
    if (!data.name || !data.price || !data.period_days) {
      return NextResponse.json({
        success: false,
        error: 'Nome, preço e período são obrigatórios'
      }, { status: 400 });
    }

    // Validar valor mínimo
    if (parseFloat(data.price) < 4.90) {
      return NextResponse.json({
        success: false,
        error: 'Valor mínimo é R$ 4,90'
      }, { status: 400 });
    }

    // Criar cliente Supabase
    const supabase = createSupabaseServiceClient();

    // Verificar se o bot existe
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    // Criar plano
    const newPlan = {
      bot_id: botId,
      name: data.name,
      price: parseFloat(data.price),
      period: data.period || 'custom',
      period_days: parseInt(data.period_days),
      days_access: parseInt(data.period_days), // Para compatibilidade
      description: data.description || '',
      is_active: data.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedPlan, error: insertError } = await supabase
      .from('plans')
      .insert(newPlan)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir plano:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar plano'
      }, { status: 500 });
    }

    console.log('✅ Plano criado com sucesso:', insertedPlan.id);

    return NextResponse.json({
      success: true,
      plan: insertedPlan
    });

  } catch (error: any) {
    console.error('❌ Erro na criação de plano:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * PUT - Atualizar planos do bot
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: botId } = await params; // Fix: await params no Next.js 15
    const { plans } = await request.json();
    
    console.log(`📋 Atualizando planos do bot ${botId}:`, plans?.length);

    if (!Array.isArray(plans)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de planos inválido'
      }, { status: 400 });
    }

    // Criar cliente Supabase
    const supabase = createSupabaseServiceClient();

    // Verificar se o bot existe
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    console.log('✅ Bot encontrado, iniciando atualização de planos...');

    // ESTRATÉGIA MAIS SEGURA: Marcar como inativo e depois deletar
    console.log('🔄 Marcando planos existentes como inativos...');
    const { error: deactivateError } = await supabase
      .from('plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('bot_id', botId);

    if (deactivateError) {
      console.error('❌ Erro ao desativar planos:', deactivateError);
      return NextResponse.json({
        success: false,
        error: `Erro ao desativar planos: ${deactivateError.message}`
      }, { status: 500 });
    }

    console.log('✅ Planos existentes marcados como inativos');

    // Aguardar um pouco para evitar conflitos
    await new Promise(resolve => setTimeout(resolve, 100));

    // Agora deletar os planos inativos
    console.log('🗑️ Removendo planos inativos...');
    const { error: deleteError } = await supabase
      .from('plans')
      .delete()
      .eq('bot_id', botId)
      .eq('is_active', false);

    if (deleteError) {
      console.warn('⚠️ Aviso ao deletar planos:', deleteError.message);
      // Não falhar aqui, continuar com inserção
    } else {
      console.log('✅ Planos antigos removidos');
    }

    // Criar novos planos
    const results = [];
    console.log(`📝 Criando ${plans.length} novos planos...`);
    
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      console.log(`📝 Processando plano ${i + 1}/${plans.length}: ${plan.name}`);
      
      if (!plan.name || !plan.price || !plan.period_days) {
        console.warn(`⚠️ Plano ${i + 1} inválido:`, { name: plan.name, price: plan.price, period_days: plan.period_days });
        continue; // Pular planos inválidos
      }

      if (parseFloat(plan.price) < 4.90) {
        console.warn(`⚠️ Plano ${i + 1} com preço muito baixo:`, plan.price);
        continue; // Pular planos com valor baixo
      }

      const planData = {
        bot_id: botId,
        name: plan.name.trim(),
        price: parseFloat(plan.price),
        period: plan.period || 'custom',
        period_days: parseInt(plan.period_days),
        days_access: parseInt(plan.period_days),
        description: (plan.description || '').trim(),
        is_active: true, // Novos planos sempre ativos
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log(`📋 Dados do plano ${i + 1}:`, planData);

      const { data: savedPlan, error: saveError } = await supabase
          .from('plans')
          .insert(planData)
          .select()
          .single();

      if (saveError) {
        console.error(`❌ Erro ao salvar plano ${i + 1}:`, saveError);
        // Continuar com próximo plano ao invés de falhar tudo
        continue;
      }

      console.log(`✅ Plano ${i + 1} salvo com sucesso:`, savedPlan.id);
      results.push(savedPlan);
    }

    console.log(`✅ Processamento concluído: ${results.length}/${plans.length} planos salvos`);

    return NextResponse.json({
      success: true,
      plans: results,
      message: `${results.length} planos salvos com sucesso`
    });

  } catch (error: any) {
    console.error('❌ Erro na atualização de planos:', error);
    return NextResponse.json({
      success: false,
      error: `Erro interno: ${error.message}`
    }, { status: 500 });
  }
} 