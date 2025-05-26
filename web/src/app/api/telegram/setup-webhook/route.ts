import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com validação
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
  }
  
  return createClient(url, key);
}

interface SetWebhookRequest {
  bot_id?: string;  // Se não fornecido, configura todos os bots
  webhook_url?: string; // Se não fornecido, usa a URL atual da Vercel
}

async function setTelegramWebhook(botToken: string, webhookUrl: string) {
  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true
    })
  });
  
  return response.json();
}

async function deleteTelegramWebhook(botToken: string) {
  const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      drop_pending_updates: true
    })
  });
  
  return response.json();
}

async function getWebhookInfo(botToken: string) {
  const url = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
  
  const response = await fetch(url, {
    method: 'GET'
  });
  
  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: SetWebhookRequest = await request.json();
    const { bot_id, webhook_url } = body;

    // Determinar URL do webhook
    const baseUrl = webhook_url || `https://${request.headers.get('host')}`;
    
    console.log(`🔧 Configurando webhooks com base URL: ${baseUrl}`);

    const supabase = createSupabaseClient();

    // Buscar bots para configurar
    let query = supabase
      .from('bots')
      .select('id, name, token, username');

    if (bot_id) {
      query = query.eq('id', bot_id);
    }

    const { data: bots, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar bots:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar bots' 
      }, { status: 500 });
    }

    if (!bots || bots.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhum bot encontrado' 
      }, { status: 404 });
    }

    const results = [];

    for (const bot of bots) {
      try {
        const webhookUrl = `${baseUrl}/api/webhook/${bot.id}`;
        
        console.log(`🔧 Configurando webhook para bot ${bot.name}: ${webhookUrl}`);
        
        const result = await setTelegramWebhook(bot.token, webhookUrl);
        
        if (result.ok) {
          console.log(`✅ Webhook configurado para bot ${bot.name}`);
          
          // Atualizar URL do webhook no banco
          await supabase
            .from('bots')
            .update({ 
              webhook_url: webhookUrl,
              webhook_configured_at: new Date().toISOString()
            })
            .eq('id', bot.id);

          results.push({
            bot_id: bot.id,
            bot_name: bot.name,
            success: true,
            webhook_url: webhookUrl
          });
        } else {
          console.error(`❌ Erro ao configurar webhook para bot ${bot.name}:`, result);
          results.push({
            bot_id: bot.id,
            bot_name: bot.name,
            success: false,
            error: result.description || 'Erro desconhecido'
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao configurar bot ${bot.name}:`, error);
        results.push({
          bot_id: bot.id,
          bot_name: bot.name,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount}/${totalCount} webhooks configurados`,
      results,
      base_url: baseUrl
    });

  } catch (error) {
    console.error('❌ Erro na configuração de webhooks:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body: SetWebhookRequest = await request.json();
    const { bot_id } = body;

    console.log(`🗑️ Removendo webhooks${bot_id ? ` para bot ${bot_id}` : ' de todos os bots'}`);

    const supabase = createSupabaseClient();

    // Buscar bots para remover webhook
    let query = supabase
      .from('bots')
      .select('id, name, token');

    if (bot_id) {
      query = query.eq('id', bot_id);
    }

    const { data: bots, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar bots:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar bots' 
      }, { status: 500 });
    }

    if (!bots || bots.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhum bot encontrado' 
      }, { status: 404 });
    }

    const results = [];

    for (const bot of bots) {
      try {
        console.log(`🗑️ Removendo webhook do bot ${bot.name}`);
        
        const result = await deleteTelegramWebhook(bot.token);
        
        if (result.ok) {
          console.log(`✅ Webhook removido do bot ${bot.name}`);
          
          // Limpar URL do webhook no banco
          await supabase
            .from('bots')
            .update({ 
              webhook_url: null,
              webhook_configured_at: null
            })
            .eq('id', bot.id);

          results.push({
            bot_id: bot.id,
            bot_name: bot.name,
            success: true
          });
        } else {
          console.error(`❌ Erro ao remover webhook do bot ${bot.name}:`, result);
          results.push({
            bot_id: bot.id,
            bot_name: bot.name,
            success: false,
            error: result.description || 'Erro desconhecido'
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao remover webhook do bot ${bot.name}:`, error);
        results.push({
          bot_id: bot.id,
          bot_name: bot.name,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount}/${totalCount} webhooks removidos`,
      results
    });

  } catch (error) {
    console.error('❌ Erro na remoção de webhooks:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const bot_id = url.searchParams.get('bot_id');

    console.log(`🔍 Verificando status dos webhooks${bot_id ? ` para bot ${bot_id}` : ''}`);

    const supabase = createSupabaseClient();

    // Buscar bots
    let query = supabase
      .from('bots')
      .select('id, name, token, webhook_url');

    if (bot_id) {
      query = query.eq('id', bot_id);
    }

    const { data: bots, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar bots:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar bots' 
      }, { status: 500 });
    }

    if (!bots || bots.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhum bot encontrado' 
      }, { status: 404 });
    }

    const results = [];

    for (const bot of bots) {
      try {
        const webhookInfo = await getWebhookInfo(bot.token);
        
        if (webhookInfo.ok) {
          results.push({
            bot_id: bot.id,
            bot_name: bot.name,
            webhook_url: webhookInfo.result.url || null,
            webhook_active: !!webhookInfo.result.url,
            has_custom_certificate: webhookInfo.result.has_custom_certificate,
            pending_update_count: webhookInfo.result.pending_update_count,
            last_error_date: webhookInfo.result.last_error_date,
            last_error_message: webhookInfo.result.last_error_message,
            max_connections: webhookInfo.result.max_connections
          });
        } else {
          results.push({
            bot_id: bot.id,
            bot_name: bot.name,
            error: webhookInfo.description || 'Erro ao buscar informações'
          });
        }
      } catch (error) {
        results.push({
          bot_id: bot.id,
          bot_name: bot.name,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      bots: results
    });

  } catch (error) {
    console.error('❌ Erro ao verificar webhooks:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 