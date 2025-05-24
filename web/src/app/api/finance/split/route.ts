import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateSplitFees } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configurações padrão do Split
const DEFAULT_SPLIT_CONFIG = {
  fixed_fee: 1.48, // R$ 1,48
  percentage_fee: 0.05, // 5%
  platform_name: 'PushinPay',
  description: 'Comissão automática descontada na API da PushinPay'
};

// GET - Buscar configuração do split do usuário
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    const { data: splitConfig, error } = await supabase
      .from('user_split_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
      console.error('Erro ao buscar configuração do split:', error);
      return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
    }

    // Se não existir configuração, retornar padrão
    if (!splitConfig) {
      return NextResponse.json({
        config: {
          ...DEFAULT_SPLIT_CONFIG,
          user_id: userId,
          active: true
        },
        is_default: true
      });
    }

    return NextResponse.json({
      config: splitConfig,
      is_default: false
    });

  } catch (err: any) {
    console.error('Erro ao buscar split:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar/Atualizar configuração do split
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id,
      fixed_fee,
      percentage_fee,
      active = true,
      custom_settings = {}
    } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    // Usar valores padrão se não fornecidos
    const finalFixedFee = fixed_fee !== undefined ? parseFloat(fixed_fee) : DEFAULT_SPLIT_CONFIG.fixed_fee;
    const finalPercentageFee = percentage_fee !== undefined ? parseFloat(percentage_fee) : DEFAULT_SPLIT_CONFIG.percentage_fee;

    // Verificar se já existe configuração
    const { data: existingConfig, error: checkError } = await supabase
      .from('user_split_configs')
      .select('id')
      .eq('user_id', user_id)
      .single();

    let result;
    
    if (existingConfig) {
      // Atualizar existente
      const { data: updatedConfig, error: updateError } = await supabase
        .from('user_split_configs')
        .update({
          fixed_fee: finalFixedFee,
          percentage_fee: finalPercentageFee,
          active,
          custom_settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar split config:', updateError);
        return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 });
      }

      result = updatedConfig;
    } else {
      // Criar novo
      const { data: newConfig, error: insertError } = await supabase
        .from('user_split_configs')
        .insert([{
          user_id,
          fixed_fee: finalFixedFee,
          percentage_fee: finalPercentageFee,
          platform_name: DEFAULT_SPLIT_CONFIG.platform_name,
          description: DEFAULT_SPLIT_CONFIG.description,
          active,
          custom_settings
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar split config:', insertError);
        return NextResponse.json({ error: 'Erro ao criar configuração' }, { status: 500 });
      }

      result = newConfig;
    }

    return NextResponse.json({ 
      success: true, 
      config: result,
      message: 'Configuração de Split atualizada com sucesso'
    });

  } catch (err: any) {
    console.error('Erro ao salvar split:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 