import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');
    
    if (!botId) {
      return NextResponse.json({
        success: false,
        error: 'Bot ID é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔍 Verificando status do webhook para bot ${botId}...`);

    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });

    // Buscar dados do bot
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id, name, token, webhook_url, webhook_set_at')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    // Verificar webhook na API do Telegram
    try {
      const telegramUrl = `https://api.telegram.org/bot${bot.token}/getWebhookInfo`;
      const response = await fetch(telegramUrl);
      const webhookInfo = await response.json();

      if (!webhookInfo.ok) {
        console.error('❌ Erro ao verificar webhook no Telegram:', webhookInfo);
        return NextResponse.json({
          success: false,
          error: 'Erro ao verificar webhook no Telegram',
          bot: {
            id: bot.id,
            name: bot.name,
            webhook_url: bot.webhook_url,
            webhook_set_at: bot.webhook_set_at
          }
        });
      }

      const webhookData = webhookInfo.result;
      
      console.log(`✅ Status do webhook obtido:`, {
        url: webhookData.url,
        has_custom_certificate: webhookData.has_custom_certificate,
        pending_update_count: webhookData.pending_update_count,
        last_error_date: webhookData.last_error_date,
        last_error_message: webhookData.last_error_message
      });

      return NextResponse.json({
        success: true,
        bot: {
          id: bot.id,
          name: bot.name,
          webhook_url: bot.webhook_url,
          webhook_set_at: bot.webhook_set_at
        },
        telegram_webhook: {
          url: webhookData.url || '',
          has_custom_certificate: webhookData.has_custom_certificate || false,
          pending_update_count: webhookData.pending_update_count || 0,
          last_error_date: webhookData.last_error_date || null,
          last_error_message: webhookData.last_error_message || null,
          max_connections: webhookData.max_connections || 40,
          allowed_updates: webhookData.allowed_updates || []
        },
        status: {
          is_configured: !!webhookData.url,
          is_working: !webhookData.last_error_date || (Date.now() / 1000 - webhookData.last_error_date) > 3600,
          has_pending_updates: (webhookData.pending_update_count || 0) > 0,
          last_check: new Date().toISOString()
        }
      });

    } catch (telegramError) {
      console.error('❌ Erro ao conectar com API do Telegram:', telegramError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao conectar com API do Telegram',
        bot: {
          id: bot.id,
          name: bot.name,
          webhook_url: bot.webhook_url,
          webhook_set_at: bot.webhook_set_at
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Erro geral ao verificar webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, action } = body;
    
    if (!botId) {
      return NextResponse.json({
        success: false,
        error: 'Bot ID é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔧 Ação no webhook: ${action} para bot ${botId}`);

    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });

    // Buscar dados do bot
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id, name, token')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    if (action === 'configure') {
      // Configurar webhook
      const host = request.headers.get('host');
      const webhookUrl = process.env.WEBHOOK_URL || `https://${host}/api/webhook/${botId}`;
      
      const telegramUrl = `https://api.telegram.org/bot${bot.token}/setWebhook`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        // Atualizar no banco
        await supabaseClient
          .from('bots')
          .update({
            webhook_url: webhookUrl,
            webhook_set_at: new Date().toISOString()
          })
          .eq('id', botId);

        return NextResponse.json({
          success: true,
          message: 'Webhook configurado com sucesso',
          webhook_url: webhookUrl
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.description || 'Erro ao configurar webhook'
        });
      }
    } else if (action === 'remove') {
      // Remover webhook
      const telegramUrl = `https://api.telegram.org/bot${bot.token}/deleteWebhook`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drop_pending_updates: true
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        // Atualizar no banco
        await supabaseClient
          .from('bots')
          .update({
            webhook_url: null,
            webhook_set_at: null
          })
          .eq('id', botId);

        return NextResponse.json({
          success: true,
          message: 'Webhook removido com sucesso'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.description || 'Erro ao remover webhook'
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Ação inválida'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Erro ao processar ação do webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 