import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// API para buscar todos os bots
export async function GET(request: Request) {
  console.log('📥 GET /api/bots: Iniciando busca de bots');
  
  try {
    // Buscar bots do banco de dados, independente do ambiente
    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Verificar autenticação
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.log('⚠️ Usuário não autenticado, buscando apenas bots públicos');
      
      // Buscar todos os bots (para demonstração)
      const { data: allBots, error } = await supabase
        .from('bots')
        .select('*');
      
      if (error) {
        console.error('❌ Erro ao buscar bots:', error);
        return NextResponse.json({ 
          success: false, 
          bots: [],
          error: error.message,
          message: 'Erro ao buscar bots'
        });
      }
      
      return NextResponse.json({
        success: true,
        bots: allBots || [],
        message: 'Bots públicos carregados com sucesso'
      });
    }
    
    // Buscar bots do usuário
    const { data: userBots, error } = await supabaseClient
      .from('bots')
      .select('*')
      .eq('owner_id', user.id);
    
    if (error) {
      console.error('❌ Erro ao buscar bots do usuário:', error);
      return NextResponse.json({ 
        success: false, 
        bots: [],
        error: error.message,
        message: 'Erro ao buscar bots do usuário'
      });
    }
    
    return NextResponse.json({
      success: true,
      bots: userBots || [],
      message: 'Bots carregados com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro geral ao buscar bots:', error);
    
    return NextResponse.json({ 
      success: false, 
      bots: [],
      message: 'Erro ao processar requisição'
    });
  }
}

// API para criar um novo bot
export async function POST(request: Request) {
  console.log('📥 POST /api/bots: Iniciando criação de bot');
  
  try {
    // Obter dados do request
    const data = await request.json();
    console.log('📦 Dados recebidos:', { 
      name: data.name, 
      token: data.token ? data.token.substring(0, 10) + '...' : 'não fornecido'
    });
    
    if (!data.name || !data.token) {
      console.error('❌ Campos obrigatórios faltando');
      return NextResponse.json({ 
        success: false, 
        error: 'Campos name e token são obrigatórios',
        message: 'Campos obrigatórios faltando'
      }, { status: 400 });
    }
    
    // Verificar autenticação
    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Determinar owner_id (usuário autenticado ou temporário)
    const owner_id = user ? user.id : uuidv4();
    
    // Criar bot no banco de dados
    const botId = uuidv4();
    const newBot = {
      id: botId,
      name: data.name,
      description: data.description || '',
      token: data.token,
      owner_id: owner_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Dados adicionais (opcionais)
      username: data.username || '',
      welcome_message: data.welcome_message || `Olá! Bem-vindo ao bot ${data.name}`,
      media_url: data.media_url || '',
      media_type: data.media_type || 'none',
      status: 'active'
    };
    
    // Inserir no banco
    const { data: insertedBot, error } = await supabaseClient
      .from('bots')
      .insert(newBot)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao inserir bot:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Erro ao criar bot no banco de dados'
      }, { status: 500 });
    }
    
    console.log('✅ Bot inserido com sucesso:', insertedBot.id);
    
    // Se houver planos, criar também
    if (data.plan_info) {
      try {
        const planId = uuidv4();
        const newPlan = {
          id: planId,
          bot_id: botId,
          name: data.plan_info.name || 'Plano Principal',
          price: parseFloat(data.plan_info.price) || 0,
          period_days: parseInt(data.plan_info.days) || 30,
          description: data.plan_info.description || '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: planError } = await supabaseClient
          .from('plans')
          .insert(newPlan);
        
        if (planError) {
          console.warn('⚠️ Erro ao inserir plano:', planError);
        } else {
          console.log('✅ Plano inserido com sucesso');
        }
      } catch (planError) {
        console.warn('⚠️ Erro ao processar plano:', planError);
      }
    }
    
    return NextResponse.json({
      success: true,
      bot: insertedBot,
      message: 'Bot criado com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao processar requisição:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro desconhecido',
      message: 'Erro ao criar bot'
    }, { status: 500 });
  }
} 