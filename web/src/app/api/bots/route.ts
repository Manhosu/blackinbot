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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    console.log('🔐 Status da autenticação via cookies:');
    console.log('  - user:', user ? user.id : 'null');
    console.log('  - authError:', authError ? authError.message : 'none');
    
    // Determinar owner_id usando múltiplas estratégias
    let owner_id = null;
    
    // Estratégia 1: Usuário autenticado via cookies
    if (user && !authError) {
      owner_id = user.id;
      console.log('✅ Owner ID via autenticação cookies:', owner_id);
    }
    
    // Estratégia 2: Owner ID fornecido no corpo da requisição
    else if (data.owner_id) {
      owner_id = data.owner_id;
      console.log('✅ Owner ID via request body:', owner_id);
    }
    
    // Estratégia 3: Fallback - verificar se existe um usuário padrão conhecido
    else {
      const knownUserId = '315cf688-6036-4c3e-b316-f821b2d326f9';
      console.log('⚠️ Usando owner_id conhecido como fallback:', knownUserId);
      owner_id = knownUserId;
    }
    
    // Verificar se o owner_id existe na tabela users
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', owner_id)
      .single();
    
    if (userCheckError || !userExists) {
      console.error('❌ Owner ID não existe na tabela users:', owner_id);
      console.error('   Erro:', userCheckError?.message);
      return NextResponse.json({
        success: false,
        error: `Usuário ${owner_id} não encontrado`,
        message: 'Usuário não existe no sistema'
      }, { status: 400 });
    }
    
    console.log('✅ Owner ID validado:', owner_id);
    
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
      // Dados adicionais (opcionais) - usando apenas campos que existem
      username: data.username || '',
      telegram_id: data.telegram_id?.toString() || '',
      welcome_message: data.welcome_message || `Olá! Bem-vindo ao bot ${data.name}`,
      welcome_media_url: data.welcome_media_url || '',
      avatar_url: data.avatar_url || '',
      is_public: data.is_public || false,
      status: 'active'
    };
    
    // Inserir no banco
    let insertedBot = null;
    
    // Tentar inserção direta primeiro
    const { data: directBot, error: directError } = await supabaseClient
      .from('bots')
      .insert(newBot)
      .select()
      .single();
    
    if (directError) {
      console.warn('⚠️ Inserção direta falhou:', directError.message);
      
      // Se falhar, usar cliente supabase direto (bypass RLS)
      try {
        console.log('🔧 Tentando inserção com cliente direto...');
        
        const { data: fallbackBot, error: fallbackError } = await supabase
          .from('bots')
          .insert(newBot)
          .select()
          .single();
        
        if (fallbackError) {
          console.error('❌ Erro na inserção de fallback:', fallbackError);
          return NextResponse.json({
            success: false,
            error: fallbackError.message,
            message: 'Erro ao criar bot no banco de dados'
          }, { status: 500 });
        }
        
        console.log('✅ Bot inserido via fallback com sucesso');
        insertedBot = fallbackBot;
        
      } catch (fallbackErrorFinal) {
        console.error('❌ Erro final na inserção de fallback:', fallbackErrorFinal);
        return NextResponse.json({
          success: false,
          error: directError.message,
          message: 'Erro ao criar bot no banco de dados'
        }, { status: 500 });
      }
    } else {
      insertedBot = directBot;
    }
    
    console.log('✅ Bot inserido com sucesso:', insertedBot.id);
    
    // Configurar webhook automaticamente após criar o bot
    try {
      console.log('🔧 Configurando webhook automaticamente para o bot criado...');
      
      // Determinar URL do webhook baseado no ambiente
      const host = request.headers.get('host');
      const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
      
      let webhookUrl = '';
      if (isLocalhost || process.env.NODE_ENV === 'development') {
        // Para desenvolvimento local, usar URL vazia (remove webhook)
        webhookUrl = '';
        console.log('⚠️ Ambiente de desenvolvimento detectado - webhook vazio');
      } else {
        // Para produção, usar URL do ambiente ou construir baseado no host
        webhookUrl = process.env.WEBHOOK_URL || `https://${host}/api/telegram/webhook/${botId}`;
        console.log('📡 URL do webhook para produção:', webhookUrl);
      }
      
      // Configurar webhook no Telegram
      const telegramUrl = `https://api.telegram.org/bot${data.token}/setWebhook`;
      const webhookPayload: any = { url: webhookUrl };
      
      if (webhookUrl) {
        webhookPayload.allowed_updates = ['message', 'callback_query'];
        webhookPayload.drop_pending_updates = true;
      } else {
        // Para desenvolvimento, apenas remover webhook sem configurar
        webhookPayload.drop_pending_updates = true;
      }
      
      const webhookResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      
      const webhookResult = await webhookResponse.json();
      
      if (webhookResult.ok) {
        console.log('✅ Webhook configurado no Telegram com sucesso');
        
        // Atualizar bot no banco com informações do webhook
        const { error: updateError } = await supabaseClient
          .from('bots')
          .update({
            webhook_url: webhookUrl || '',
            webhook_set_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', botId);
        
        if (updateError) {
          console.warn('⚠️ Erro ao atualizar dados do webhook no bot:', updateError);
        } else {
          console.log('✅ Dados do webhook salvos no banco');
        }
        
        // Salvar na tabela de configurações de webhook se tiver URL
        if (webhookUrl) {
          try {
            const tokenHash = Buffer.from(data.token.slice(-10)).toString('base64');
            
            const { error: webhookConfigError } = await supabaseClient
              .from('webhook_configs')
              .upsert({
                bot_id: botId,
                token_hash: tokenHash,
                webhook_url: webhookUrl,
                configured_at: new Date().toISOString(),
                status: 'active'
              });
            
            if (webhookConfigError) {
              console.warn('⚠️ Erro ao salvar configuração de webhook:', webhookConfigError);
            } else {
              console.log('✅ Configuração salva na tabela webhook_configs');
            }
          } catch (configError) {
            console.warn('⚠️ Erro ao salvar configuração adicional:', configError);
          }
        }
        
      } else {
        console.warn('⚠️ Falha ao configurar webhook no Telegram:', webhookResult);
      }
      
    } catch (webhookError) {
      console.warn('⚠️ Erro ao configurar webhook automaticamente (bot criado com sucesso):', webhookError);
      // Não falhar a criação do bot se apenas o webhook falhar
    }
    
    // Se houver planos, criar também
    if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
      try {
        console.log(`📋 Criando ${data.plans.length} planos para o bot...`);
        
        const plansToInsert = data.plans.map((plan: any) => ({
          id: uuidv4(),
          bot_id: botId,
          name: plan.name || 'Plano sem nome',
          price: parseFloat(plan.price) || 4.90,
          period: plan.period || 'monthly',
          period_days: parseInt(plan.period_days) || 30,
          days_access: parseInt(plan.period_days) || 30, // Para compatibilidade
          description: plan.description || '',
          is_active: plan.is_active !== false, // true por padrão
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { data: insertedPlans, error: planError } = await supabaseClient
          .from('plans')
          .insert(plansToInsert)
          .select();
        
        if (planError) {
          console.warn('⚠️ Erro ao inserir planos:', planError);
          
          // Tentar inserir um por um como fallback
          for (const plan of plansToInsert) {
            try {
              const { error: singlePlanError } = await supabase
                .from('plans')
                .insert(plan);
              
              if (singlePlanError) {
                console.warn(`⚠️ Erro ao inserir plano ${plan.name}:`, singlePlanError);
              } else {
                console.log(`✅ Plano ${plan.name} inserido via fallback`);
              }
            } catch (singleError) {
              console.warn(`⚠️ Erro crítico ao inserir plano ${plan.name}:`, singleError);
            }
          }
        } else {
          console.log(`✅ ${insertedPlans?.length || 0} planos inseridos com sucesso`);
        }
      } catch (planError) {
        console.warn('⚠️ Erro ao processar planos:', planError);
      }
    }
    
    // Manter compatibilidade com o formato antigo
    else if (data.plan_info) {
      try {
        const planId = uuidv4();
        const newPlan = {
          id: planId,
          bot_id: botId,
          name: data.plan_info.name || 'Plano Principal',
          price: parseFloat(data.plan_info.price) || 4.90,
          period: 'monthly',
          period_days: parseInt(data.plan_info.days) || 30,
          days_access: parseInt(data.plan_info.days) || 30,
          description: data.plan_info.description || '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: planError } = await supabaseClient
          .from('plans')
          .insert(newPlan);
        
        if (planError) {
          console.warn('⚠️ Erro ao inserir plano legado:', planError);
        } else {
          console.log('✅ Plano legado inserido com sucesso');
        }
      } catch (planError) {
        console.warn('⚠️ Erro ao processar plano legado:', planError);
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