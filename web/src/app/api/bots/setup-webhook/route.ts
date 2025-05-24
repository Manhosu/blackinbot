import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { saveWebhookConfig } from '@/lib/bot-functions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, botId } = body;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token é obrigatório'
      }, { status: 400 });
    }
    
    console.log('🔧 Configurando webhook para o bot...');
    
    // URL do webhook (em produção, usar domínio real)
    const webhookUrl = process.env.WEBHOOK_URL || 'https://your-domain.com/api/telegram/webhook';
    
    try {
      // Tentar configurar o webhook na API do Telegram
      const telegramApiUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
      console.log('📡 Configurando webhook:', webhookUrl);
      
      const response = await fetch(telegramApiUrl);
      const result = await response.json();
      
      if (!result.ok) {
        console.error('❌ Erro ao configurar webhook:', result);
        return NextResponse.json({
          success: false,
          error: result.description || 'Erro ao configurar webhook'
        }, { status: 500 });
      }
      
      console.log('✅ Webhook configurado com sucesso');
      
      // Salvar configuração no banco usando a nova função
      if (botId) {
        try {
          // Criar cliente Supabase para a rota
          const cookieStore = cookies();
          const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
          
          // Atualizar o bot com a URL do webhook
          const { data: botData, error: botError } = await supabaseClient
            .from('bots')
            .update({
              webhook_url: webhookUrl,
              webhook_set_at: new Date().toISOString()
            })
            .eq('id', botId)
            .select()
            .single();
          
          if (botError) {
            console.error('⚠️ Erro ao atualizar webhook do bot:', botError);
            // Continuar mesmo com erro, pelo menos o webhook foi configurado
          } else {
            console.log('✅ Configuração de webhook salva no banco de dados');
          }
          
          // Salvar na tabela de configurações de webhook também
          const tokenHash = Buffer.from(token.slice(-10)).toString('base64'); // Hash simples do token (últimos 10 caracteres)
          
          const { data: webhookData, error: webhookError } = await supabaseClient
            .from('webhook_configs')
            .upsert({
              bot_id: botId,
              token_hash: tokenHash,
              webhook_url: webhookUrl,
              configured_at: new Date().toISOString(),
              status: 'active'
            })
            .select()
            .single();
          
          if (webhookError) {
            console.error('⚠️ Erro ao salvar configuração de webhook:', webhookError);
          }
          
          return NextResponse.json({
            success: true,
            message: 'Webhook configurado com sucesso',
            data: botData || { webhook_url: webhookUrl }
          });
        } catch (dbError: any) {
          console.error('⚠️ Erro ao salvar configuração no banco:', dbError);
          
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
          message: 'Webhook configurado com sucesso, mas não foi associado a nenhum bot'
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
        const cookieStore = cookies();
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