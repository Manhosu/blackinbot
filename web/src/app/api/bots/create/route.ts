import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Configuração do Supabase
const SUPABASE_URL = 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U';

// Cliente simples para chamadas anônimas
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: NextRequest) {
  console.log('=== CRIAÇÃO DE BOT - MODO SUPABASE E LOCALSTORAGE ===');
  
  try {
    // Obter cliente autenticado do Supabase com cookies
    const cookieStore = cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError);
      return NextResponse.json({ 
        success: false, 
        message: 'Não autorizado',
        error: authError.message
      }, { status: 401 });
    }
    
    const body = await request.json();
    console.log('✓ Dados recebidos:', {
      name: body.name,
      token: body.token?.slice(0, 20) + '...',
      owner_id: body.owner_id || user?.id,
      plan_name: body.plan_name,
      plan_price: body.plan_price,
      planos_adicionais: body.additional_plans?.length || 0
    });

    // Gerar ID único para o bot
    const botId = uuidv4();
    const username = body.name.toLowerCase().replace(/\s+/g, '_') + '_bot';
    
    // Criar bot completo
    const newBot = {
      id: botId,
      name: body.name,
      username: username,
      description: body.welcome_message || 'Bot comercial',
      welcome_message: body.welcome_message || 'Bem-vindo!',
      token: body.token,
      owner_id: body.owner_id || user?.id,
      avatar_url: body.avatar_url || null,
      welcome_media_url: body.welcome_media_url || null,
      telegram_group_link: body.telegram_group_link || '',
      plan_name: body.plan_name || 'Plano Básico',
      plan_price: parseFloat(body.plan_price) || 0,
      plan_period: body.plan_period || '30',
      plan_days_access: parseInt(body.plan_days_access) || 30,
      status: 'active', // SEMPRE ATIVO
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Armazenar todos os planos incluindo o principal
      plans: [
        {
          id: `plan_${Date.now()}_main`,
          name: body.plan_name || 'Plano Básico',
          price: parseFloat(body.plan_price) || 0,
          period_days: parseInt(body.plan_days_access) || 30,
          is_active: true,
          bot_id: botId,
          sales: 0
        },
        ...(body.additional_plans || []).map((plan: any, index: number) => ({
          id: `plan_${Date.now()}_${index}`,
          name: plan.name || `Plano Adicional ${index + 1}`,
          price: parseFloat(plan.price) || 0,
          period_days: parseInt(plan.days_access) || 30,
          is_active: true,
          bot_id: botId,
          sales: 0
        }))
      ],
      
      // Armazenar planos adicionais também separadamente (para compatibilidade)
      additional_plans: (body.additional_plans || []).map((plan: any, index: number) => ({
        id: `plan_${Date.now()}_${index}`,
        name: plan.name || `Plano Adicional ${index + 1}`,
        price: parseFloat(plan.price) || 0,
        period_days: parseInt(plan.days_access) || 30,
        is_active: true,
        bot_id: botId,
        sales: 0
      })),
      
      // Totalização
      totalRevenue: 0,
      totalSales: 0
    };

    // Primeiro, salvar no Supabase
    let supabaseSaveSuccess = false;
    try {
      // Inserir o bot principal
      const { error: botError } = await supabaseAuth.from('bots').insert({
        id: botId,
        name: body.name,
        username: username,
        description: body.welcome_message || 'Bot comercial',
        token: body.token,
        owner_id: body.owner_id || user?.id,
        welcome_message: body.welcome_message || 'Bem-vindo!',
        avatar_url: body.avatar_url || null,
        welcome_media_url: body.welcome_media_url || null,
        telegram_group_link: body.telegram_group_link || '',
        plan_name: body.plan_name || 'Plano Básico',
        plan_price: parseFloat(body.plan_price) || 0,
        plan_days_access: parseInt(body.plan_days_access) || 30,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      if (botError) {
        console.error('❌ Erro ao salvar bot no Supabase:', botError.message);
      } else {
        // Inserir os planos
        const mainPlan = {
          bot_id: botId,
          name: body.plan_name || 'Plano Básico',
          price: parseFloat(body.plan_price) || 0,
          days_access: parseInt(body.plan_days_access) || 30,
          is_active: true,
          created_at: new Date().toISOString(),
          sales: 0
        };
        
        const { error: mainPlanError } = await supabaseAuth.from('plans').insert(mainPlan);
        
        if (mainPlanError) {
          console.error('❌ Erro ao salvar plano principal no Supabase:', mainPlanError.message);
        }
        
        // Inserir planos adicionais se houverem
        if (body.additional_plans && body.additional_plans.length > 0) {
          const additionalPlansData = body.additional_plans.map((plan: any) => ({
            bot_id: botId,
            name: plan.name || 'Plano Adicional',
            price: parseFloat(plan.price) || 0,
            days_access: parseInt(plan.days_access) || 30,
            is_active: true,
            created_at: new Date().toISOString(),
            sales: 0
          }));
          
          const { error: additionalPlansError } = await supabaseAuth.from('plans').insert(additionalPlansData);
          
          if (additionalPlansError) {
            console.error('❌ Erro ao salvar planos adicionais no Supabase:', additionalPlansError.message);
          }
        }
        
        supabaseSaveSuccess = true;
        console.log('✅ Bot salvo com sucesso no Supabase');
        
        // Configurar webhook automaticamente após criar o bot no Supabase
        try {
          console.log('🔧 Configurando webhook automaticamente para o bot criado no Supabase...');
          
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
          const telegramUrl = `https://api.telegram.org/bot${body.token}/setWebhook`;
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
            const { error: updateError } = await supabaseAuth
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
                const tokenHash = Buffer.from(body.token.slice(-10)).toString('base64');
                
                const { error: webhookConfigError } = await supabaseAuth
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
      }
    } catch (dbError) {
      console.error('❌ Erro ao salvar no Supabase:', dbError);
    }

    // Sempre salvar no localStorage também (como fallback)
    console.log('💾 Salvando bot no localStorage:', botId);
    
    // Criamos um script para injetar no frontend que salvará o bot no localStorage
    const localStorageScript = `
      <script>
        (function() {
          try {
            // Obter bots existentes
            var existingBots = JSON.parse(localStorage.getItem('demo_bots') || '[]');
            
            // Criar objeto do novo bot
            var newBot = ${JSON.stringify(newBot)};
            
            // Verificar se já existe um bot com este ID
            var existingIndex = existingBots.findIndex(function(bot) { return bot.id === newBot.id; });
            if (existingIndex !== -1) {
              // Atualizar bot existente
              existingBots[existingIndex] = newBot;
            } else {
              // Adicionar novo bot
              existingBots.push(newBot);
            }
            
            // Salvar no localStorage
            localStorage.setItem('demo_bots', JSON.stringify(existingBots));
            console.log('Bot salvo no localStorage com sucesso!');
            
            // Disparar evento para notificar outras abas
            window.dispatchEvent(new Event('storage'));
          } catch (error) {
            console.error('Erro ao salvar bot no localStorage:', error);
          }
        })();
      </script>
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Bot criado com sucesso!',
      bot_data: newBot,
      save_to_supabase: supabaseSaveSuccess,
      save_to_localStorage: true,
      username: username,
      link: `https://t.me/${username}`,
      localStorage_script: localStorageScript
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro crítico:', error);
    
    // Criar resposta de erro
    return NextResponse.json({ 
      success: false,
      message: 'Erro ao criar bot',
      error: error?.message || 'Erro desconhecido'
    }, { status: 500 });
  }
} 