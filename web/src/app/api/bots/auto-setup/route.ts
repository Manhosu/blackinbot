import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface Bot {
  id: string;
  token: string;
  name: string;
  webhook_configured_at: string | null;
  status: string;
}

interface WebhookSetupResult {
  botId: string;
  botName: string;
  success: boolean;
  message: string;
  webhookUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando configuração automática de webhooks...');
    
    // 1. Buscar todos os bots ativos
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, token, name, webhook_configured_at, status')
      .eq('status', 'active');

    if (error) {
      console.error('❌ Erro ao buscar bots:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao buscar bots',
        error: error.message 
      }, { status: 500 });
    }

    if (!bots || bots.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum bot ativo encontrado',
        results: []
      });
    }

    console.log(`📋 Encontrados ${bots.length} bots ativos`);

    const results: WebhookSetupResult[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackinbot.vercel.app';

    // 2. Configurar webhook para cada bot
    for (const bot of bots) {
      const result = await setupWebhookForBot(bot, baseUrl);
      results.push(result);
      
      // Atualizar status no banco se foi configurado com sucesso
      if (result.success) {
        await supabase
          .from('bots')
          .update({ 
            webhook_configured_at: new Date().toISOString(),
            webhook_url: result.webhookUrl
          })
          .eq('id', bot.id);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✅ Configuração concluída: ${successCount} sucessos, ${failCount} falhas`);

    return NextResponse.json({
      success: true,
      message: `Configuração concluída: ${successCount} sucessos, ${failCount} falhas`,
      summary: {
        total: bots.length,
        success: successCount,
        failed: failCount
      },
      results: results
    });

  } catch (error) {
    console.error('❌ Erro na configuração automática:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

async function setupWebhookForBot(bot: Bot, baseUrl: string): Promise<WebhookSetupResult> {
  try {
    const webhookUrl = `${baseUrl}/api/webhook/${bot.id}`;
    
    console.log(`🔧 Configurando webhook para bot ${bot.name} (${bot.id})...`);
    console.log(`📡 URL do webhook: ${webhookUrl}`);

    // Configurar webhook no Telegram
    const telegramUrl = `https://api.telegram.org/bot${bot.token}/setWebhook`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log(`✅ Webhook configurado com sucesso para ${bot.name}`);
      return {
        botId: bot.id,
        botName: bot.name,
        success: true,
        message: 'Webhook configurado com sucesso',
        webhookUrl: webhookUrl
      };
    } else {
      console.error(`❌ Falha ao configurar webhook para ${bot.name}:`, result);
      return {
        botId: bot.id,
        botName: bot.name,
        success: false,
        message: `Erro do Telegram: ${result.description || 'Erro desconhecido'}`
      };
    }

  } catch (error) {
    console.error(`❌ Erro ao configurar webhook para ${bot.name}:`, error);
    return {
      botId: bot.id,
      botName: bot.name,
      success: false,
      message: `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

// Endpoint GET para verificar status dos webhooks
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando status dos webhooks...');
    
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, token, name, webhook_configured_at, status')
      .eq('status', 'active');

    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao buscar bots',
        error: error.message 
      }, { status: 500 });
    }

    const webhookStatuses = [];

    for (const bot of bots || []) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${bot.token}/getWebhookInfo`;
        const response = await fetch(telegramUrl);
        const result = await response.json();

        webhookStatuses.push({
          botId: bot.id,
          botName: bot.name,
          webhookConfigured: !!result.result?.url,
          webhookUrl: result.result?.url || null,
          lastErrorDate: result.result?.last_error_date || null,
          lastErrorMessage: result.result?.last_error_message || null,
          pendingUpdateCount: result.result?.pending_update_count || 0
        });
      } catch (error) {
        webhookStatuses.push({
          botId: bot.id,
          botName: bot.name,
          webhookConfigured: false,
          error: `Erro ao verificar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Status dos webhooks verificado',
      webhooks: webhookStatuses
    });

  } catch (error) {
    console.error('❌ Erro ao verificar webhooks:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 