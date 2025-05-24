import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// PUT - Atualizar plano
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    
    const {
      name,
      description,
      price,
      period,
      days_access,
      active
    } = body;

    const { data: updatedPlan, error } = await supabase
      .from('plans')
      .update({
        name,
        description,
        price: parseFloat(price),
        period,
        days_access: parseInt(days_access),
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar plano:', error);
      return NextResponse.json({ error: 'Erro ao atualizar plano' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: updatedPlan });

  } catch (err: any) {
    console.error('Erro ao atualizar plano:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir plano
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Verificar se há transações ativas para este plano
    const { data: activeTransactions, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('plan_id', id)
      .eq('status', 'active')
      .limit(1);

    if (checkError) {
      console.error('Erro ao verificar transações:', checkError);
      return NextResponse.json({ error: 'Erro ao verificar transações' }, { status: 500 });
    }

    if (activeTransactions && activeTransactions.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir plano com assinantes ativos' 
      }, { status: 400 });
    }

    // Deletar transações relacionadas primeiro
    await supabase
      .from('transactions')
      .delete()
      .eq('plan_id', id);

    // Deletar o plano
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar plano:', error);
      return NextResponse.json({ error: 'Erro ao deletar plano' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Plano excluído com sucesso' });

  } catch (err: any) {
    console.error('Erro ao deletar plano:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 