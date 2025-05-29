import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API PUT para atualizar mensagem de remarketing de um bot
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { remarketing_message } = await request.json();
    
    console.log('🔄 Atualizando mensagem de remarketing para bot:', {
      bot_id: id,
      message_length: remarketing_message?.length || 0
    });
    
    if (!remarketing_message && remarketing_message !== '') {
      return NextResponse.json({
        success: false,
        error: 'remarketing_message é obrigatório'
      }, { status: 400 });
    }
    
    // Atualizar mensagem no banco
    const { error } = await supabase
      .from('bots')
      .update({
        remarketing_message: remarketing_message.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao atualizar mensagem de remarketing:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar mensagem no banco de dados'
      }, { status: 500 });
    }
    
    console.log('✅ Mensagem de remarketing atualizada com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Mensagem de remarketing atualizada com sucesso',
      updated_at: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao atualizar mensagem de remarketing:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * API GET para buscar mensagem de remarketing de um bot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🔍 Buscando mensagem de remarketing para bot:', id);
    
    const { data: bot, error } = await supabase
      .from('bots')
      .select('remarketing_message')
      .eq('id', id)
      .single();
    
    if (error || !bot) {
      console.error('❌ Bot não encontrado:', error?.message);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      remarketing_message: bot.remarketing_message || ''
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar mensagem de remarketing:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Salvar mensagem de remarketing
    const { error } = await supabase
      .from('bots')
      .update({
        remarketing_message: body.message,
        remarketing_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao salvar mensagem de remarketing:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao salvar mensagem de remarketing'
      }, { status: 500 });
    }
    
    console.log('✅ Mensagem de remarketing salva com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Mensagem de remarketing salva com sucesso'
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao salvar mensagem de remarketing:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 