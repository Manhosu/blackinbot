import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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
 * GET - Buscar plano específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = id;
    console.log('🔍 Buscando plano:', planId);

    const supabase = createSupabaseServiceClient();

    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar plano:', error);
      return NextResponse.json({
        success: false,
        error: 'Plano não encontrado'
      }, { status: 404 });
    }

    console.log('✅ Plano encontrado:', plan.name);

    return NextResponse.json({
      success: true,
      plan
    });

  } catch (error: any) {
    console.error('❌ Erro na busca do plano:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * DELETE - Excluir plano específico
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = id;
    console.log('🗑️ Excluindo plano:', planId);

    const supabase = createSupabaseServiceClient();

    // Verificar se o plano existe
    const { data: plan, error: fetchError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (fetchError || !plan) {
      return NextResponse.json({
        success: false,
        error: 'Plano não encontrado'
      }, { status: 404 });
    }

    // Excluir o plano
    const { error: deleteError } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId);

    if (deleteError) {
      console.error('❌ Erro ao excluir plano:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao excluir plano'
      }, { status: 500 });
    }

    console.log('✅ Plano excluído com sucesso:', plan.name);

    return NextResponse.json({
      success: true,
      message: `Plano "${plan.name}" excluído com sucesso`
    });

  } catch (error: any) {
    console.error('❌ Erro na exclusão do plano:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
    }
}

/**
 * PUT - Atualizar plano
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = id;
    const body = await request.json();
    
    console.log('📝 Atualizando plano:', planId);

    // Validar dados obrigatórios
    if (!body.name || !body.price || !body.period_days) {
      return NextResponse.json({
        success: false,
        error: 'Nome, preço e período são obrigatórios'
      }, { status: 400 });
    }

    // Validar valor mínimo
    if (parseFloat(body.price) < 4.90) {
      return NextResponse.json({ 
        success: false,
        error: 'Valor mínimo é R$ 4,90'
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    // Verificar se o plano existe
    const { data: existingPlan, error: fetchError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (fetchError || !existingPlan) {
      return NextResponse.json({
        success: false,
        error: 'Plano não encontrado'
      }, { status: 404 });
    }

    // Atualizar plano
    const updateData = {
      name: body.name,
      price: parseFloat(body.price),
      period: body.period || 'custom',
      period_days: parseInt(body.period_days),
      days_access: parseInt(body.period_days), // Para compatibilidade
      description: body.description || '',
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString()
    };

    const { data: updatedPlan, error: updateError } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar plano:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar plano'
      }, { status: 500 });
    }

    console.log('✅ Plano atualizado com sucesso:', updatedPlan.name);

    return NextResponse.json({
      success: true,
      plan: updatedPlan
    });

  } catch (error: any) {
    console.error('❌ Erro na atualização do plano:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 