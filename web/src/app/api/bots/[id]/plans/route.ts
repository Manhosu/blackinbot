import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Buscar todos os planos de um bot
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const { data: plans, error } = await supabase
      .from('plans')
      .select(`
        *,
        _count_transactions:transactions(count)
      `)
      .eq('bot_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar planos:', error);
      return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });

  } catch (err: any) {
    console.error('Erro ao buscar planos:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar novo plano
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: botId } = params;
    const body = await req.json();
    
    const {
      name,
      description,
      price,
      period,
      days_access
    } = body;

    // Validar dados obrigatórios
    if (!name || !price || !days_access) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: name, price, days_access' 
      }, { status: 400 });
    }

    const { data: newPlan, error } = await supabase
      .from('plans')
      .insert([{
        bot_id: botId,
        name,
        description: description || '',
        price: parseFloat(price),
        period: period || 'monthly',
        days_access: parseInt(days_access),
        active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar plano:', error);
      return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: newPlan });

  } catch (err: any) {
    console.error('Erro ao criar plano:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 