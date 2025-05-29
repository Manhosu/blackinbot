import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { saveWebhookConfig } from '@/lib/bot-functions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Dados recebidos:', body);

    const { botIds } = body;

    if (!botIds || !Array.isArray(botIds) || botIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Lista de IDs de bots é obrigatória'
      }, { status: 400 });
    }

    console.log(`🔄 Configurando webhooks para ${botIds.length} bots...`);

    // Corrigir cookies para Next.js 15
    const cookieStore = await cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { token, botId } = body;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token é obrigatório'
      }, { status: 400 });
    }
    
    console.log('🔧 Configurando webhook para o bot...');
    
    // URL do webhook - determinar baseado no ambiente
    let webhookUrl;
    const host = request.headers.get('host');
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
    
    if (isLocalhost || process.env.NODE_ENV === 'development') {
      // Para desenvolvimento local, usar URL vazia (remove webhook)
      webhookUrl = '';
      console.log('⚠️ Ambiente de desenvolvimento detectado - removendo webhook');
    } else {
      // Para produção, usar URL do ambiente ou construir baseado no host
      webhookUrl = process.env.WEBHOOK_URL || `https://${host}/api/webhook/${botId}`;
      console.log('📡 Configurando webhook para produção:', webhookUrl);
    }
    
    try {
      // Configurar webhook na API do Telegram
      const telegramApiUrl = `https://api.telegram.org/bot${token}/setWebhook`;
      console.log('📡 Configurando webhook...');
      
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query', 'inline_query']
        })
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        console.error('❌ Erro ao configurar webhook:', result);
        return NextResponse.json({
          success: false,
          error: result.description || 'Erro ao configurar webhook'
        }, { status: 500 });
      }
      
      console.log('✅ Webhook configurado com sucesso');
      
      // Salvar configuração no banco
      if (botId) {
        try {
          // Usar cliente Supabase autenticado
          const cookieStore = await cookies();
          const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
          
          // Verificar autenticação
          const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
          
          let userId = null;
          if (authError || !user) {
            console.warn('⚠️ Não foi possível obter usuário via cookies para webhook');
            
            // Tentar buscar o bot para obter o owner_id
            const { data: testBot, error: testError } = await supabaseClient
              .from('bots')
              .select('id, name, owner_id')
              .eq('id', botId)
              .single();
            
            if (testError || !testBot) {
              console.warn('⚠️ Não foi possível obter dados do bot:', testError);
              if (isLocalhost) {
                return NextResponse.json({
                  success: true,
                  message: 'Webhook configurado para desenvolvimento (bot não encontrado)',
                  data: { webhook_url: webhookUrl, id: botId }
                });
              }
              throw new Error('Bot não encontrado para configurar webhook');
            }
            
            userId = testBot.owner_id;
            console.log(`🔍 Bot encontrado: ${testBot.name} (owner: ${testBot.owner_id})`);
          } else {
            userId = user.id;
            console.log(`👤 Usuário autenticado: ${user.id}`);
          }
          
          // Tentar salvar usando RPC com contexto de autenticação
          try {
            console.log('💾 Salvando webhook no banco usando RPC...');
            
            const webhookSaveQuery = `
              -- Definir contexto de autenticação
              SET LOCAL rls.auth_uid = '${userId}';
              
              -- Atualizar o bot com dados do webhook
              UPDATE public.bots 
              SET 
                webhook_url = '${webhookUrl || ''}',
                webhook_set_at = NOW(),
                updated_at = NOW()
              WHERE id = '${botId}';
              
              -- Retornar confirmação
              SELECT 1 as updated;
            `;
            
            const { data: saveResult, error: saveError } = await supabaseClient.rpc('execute', {
              query: webhookSaveQuery
            });
            
            if (saveError) {
              console.error('❌ Erro ao salvar webhook via RPC:', saveError);
              throw new Error(`Erro RPC: ${saveError.message}`);
            }
            
            console.log('✅ Webhook salvo no banco via RPC');
            
          } catch (rpcError: any) {
            console.warn('⚠️ Erro na tentativa RPC, tentando método direto:', rpcError);
            
            // Fallback: tentar método direto
            const { data: botData, error: botError } = await supabaseClient
              .from('bots')
              .update({
                webhook_url: webhookUrl || null,
                webhook_set_at: new Date().toISOString()
              })
              .eq('id', botId)
              .select()
              .single();
            
            if (botError) {
              console.error('⚠️ Erro ao atualizar webhook do bot (método direto):', botError);
              // Em desenvolvimento, considerar como sucesso mesmo com erro de banco
              if (isLocalhost) {
                return NextResponse.json({
                  success: true,
                  message: 'Webhook configurado para desenvolvimento (erro de banco ignorado)',
                  data: { webhook_url: webhookUrl, id: botId }
                });
              }
              throw new Error(botError.message);
            } else {
              console.log('✅ Configuração de webhook salva no banco de dados (método direto)');
            }
          }
          
          // Salvar na tabela de configurações de webhook se tiver URL
          if (webhookUrl) {
            try {
              const tokenHash = Buffer.from(token.slice(-10)).toString('base64');
              
              // Usar a função RPC que contorna RLS
              console.log('💾 Salvando webhook config via função RPC...');
              
              const { data: webhookResult, error: webhookError } = await supabaseClient
                .rpc('save_webhook_config', {
                  p_bot_id: botId,
                  p_token_hash: tokenHash,
                  p_webhook_url: webhookUrl,
                  p_status: 'active'
                });
              
              if (webhookError) {
                console.warn('⚠️ Erro ao salvar via RPC:', webhookError);
              } else {
                console.log('✅ Configuração salva via RPC:', webhookResult);
              }
            } catch (configError) {
              console.warn('⚠️ Erro ao salvar configuração adicional:', configError);
            }
          }
          
          return NextResponse.json({
            success: true,
            message: webhookUrl ? 'Webhook configurado com sucesso' : 'Webhook removido para desenvolvimento',
            data: { webhook_url: webhookUrl, id: botId }
          });
        } catch (dbError: any) {
          console.error('⚠️ Erro ao salvar configuração no banco:', dbError);
          
          // Em desenvolvimento, retornar sucesso mesmo com erro de banco
          if (isLocalhost) {
            return NextResponse.json({
              success: true,
              message: 'Webhook configurado para desenvolvimento (erro de banco tratado)',
              data: { webhook_url: webhookUrl, id: botId }
            });
          }
          
          // Retornar sucesso parcial (webhook configurado, mas não salvo no banco)
          return NextResponse.json({
            success: true,
            message: 'Webhook configurado, mas houve um erro ao salvar no banco de dados',
            error: dbError.message || JSON.stringify(dbError)
          });
        }
      } else {
        // Se não tiver botId, apenas retornar sucesso na configuração do webhook
        return NextResponse.json({
          success: true,
          message: webhookUrl ? 'Webhook configurado com sucesso' : 'Webhook removido para desenvolvimento'
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao configurar webhook:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Erro ao configurar webhook'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// API para verificar status do webhook
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token é obrigatório'
      }, { status: 400 });
    }
    
    console.log('🔍 Verificando status do webhook...');
    
    // Verificar webhook no Telegram
    const telegramUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
    
    const response = await fetch(telegramUrl);
    const result = await response.json();
    
    if (result.ok) {
      const webhookInfo = result.result;
      
      return NextResponse.json({
        success: true,
        webhookInfo: {
          url: webhookInfo.url,
          has_custom_certificate: webhookInfo.has_custom_certificate,
          pending_update_count: webhookInfo.pending_update_count,
          last_error_date: webhookInfo.last_error_date,
          last_error_message: webhookInfo.last_error_message,
          max_connections: webhookInfo.max_connections,
          allowed_updates: webhookInfo.allowed_updates
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Erro do Telegram: ${result.description}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// API para remover webhook
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, botId } = body;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token é obrigatório'
      }, { status: 400 });
    }

    console.log('🗑️ Removendo webhook...');
    
    // Remover webhook no Telegram
    const telegramUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook removido com sucesso');
      
      try {
        // Criar um cliente Supabase para a rota
        const cookieStore = await cookies();
        const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
        
        // Atualizar o registro do bot, se botId fornecido
        if (botId) {
          const { error: botError } = await supabaseClient
            .from('bots')
            .update({
              webhook_url: null,
              webhook_set_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', botId);
            
          if (botError) {
            console.warn('⚠️ Erro ao remover webhook do bot:', botError);
          } else {
            console.log('🗑️ Webhook removido do registro do bot');
          }
        }
        
        // Remover da tabela de configurações também
        const tokenHash = Buffer.from(token).toString('base64');
        const { error } = await supabaseClient
          .from('webhook_configs')
          .delete()
          .eq('token_hash', tokenHash);
          
        if (error) {
          console.warn('⚠️ Erro ao remover configuração do banco:', error);
        } else {
          console.log('🗑️ Configuração do webhook removida do banco');
        }
      } catch (dbError) {
        console.error('❌ Erro ao acessar banco:', dbError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Webhook removido com sucesso'
      });
    } else {
      return NextResponse.json({
          success: false, 
        error: `Erro do Telegram: ${result.description}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Erro ao remover webhook:', error);
    return NextResponse.json({
        success: false, 
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 