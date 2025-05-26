import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Lista planos disponíveis para um bot
 */
export async function POST(request: NextRequest) {
  try {
    const { bot_id } = await request.json();
    
    if (!bot_id) {
      return NextResponse.json({
        success: false,
        error: 'bot_id é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar planos ativos do bot
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('bot_id', bot_id)
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar planos:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar planos'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      plans: plans || []
    });
    
  } catch (error: any) {
    console.error('Erro ao listar planos:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 