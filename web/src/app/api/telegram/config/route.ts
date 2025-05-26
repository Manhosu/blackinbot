import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Buscar configuração do bot pelo token
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token do bot é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar bot pelo token
    const { data: bot, error } = await supabase
      .from('bots')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error || !bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      bot: {
        id: bot.id,
        name: bot.name,
        description: bot.description,
        is_activated: bot.is_activated || false,
        welcome_message: bot.welcome_message,
        welcome_media_url: bot.welcome_media_url,
        welcome_media_type: bot.welcome_media_type
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao buscar configuração do bot:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 