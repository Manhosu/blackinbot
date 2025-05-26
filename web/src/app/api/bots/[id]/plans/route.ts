import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET - Buscar planos de um bot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const botId = params.id;
    console.log('🔍 Buscando planos do bot:', botId);

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
    const botId = params.id;
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
    const botId = params.id;
    const { plans } = await request.json();
    
    console.log(`📋 Atualizando planos do bot ${botId}:`, plans?.length);

    if (!Array.isArray(plans)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de planos inválido'
      }, { status: 400 });
    }

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

    // Desativar todos os planos existentes
    const { error: deactivateError } = await supabase
      .from('plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('bot_id', botId);

    if (deactivateError) {
      console.error('❌ Erro ao desativar planos:', deactivateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar planos'
      }, { status: 500 });
    }

    // Criar/atualizar novos planos
    const results = [];
    
    for (const plan of plans) {
      if (!plan.name || !plan.price || !plan.period_days) {
        continue; // Pular planos inválidos
      }

      if (parseFloat(plan.price) < 4.90) {
        continue; // Pular planos com valor baixo
      }

      const planData = {
        bot_id: botId,
        name: plan.name,
        price: parseFloat(plan.price),
        period: plan.period || 'custom',
        period_days: parseInt(plan.period_days),
        days_access: parseInt(plan.period_days),
        description: plan.description || '',
        is_active: plan.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (plan.id) {
        // Atualizar plano existente
        const { data: updatedPlan, error: updateError } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', plan.id)
          .eq('bot_id', botId)
          .select()
          .single();

        if (!updateError && updatedPlan) {
          results.push(updatedPlan);
        }
      } else {
        // Criar novo plano
        const { data: newPlan, error: insertError } = await supabase
          .from('plans')
          .insert(planData)
          .select()
          .single();

        if (!insertError && newPlan) {
          results.push(newPlan);
        }
      }
    }

    console.log(`✅ ${results.length} planos processados com sucesso`);

    return NextResponse.json({
      success: true,
      plans: results
    });

  } catch (error: any) {
    console.error('❌ Erro na atualização de planos:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 