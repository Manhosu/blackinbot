import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

export interface WebhookSetupResult {
  success: boolean;
  message: string;
  webhookUrl?: string;
  error?: string;
}

// Cliente service_role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xcnhlmqkovfaqyjxwdje.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export class WebhookManager {
  private static baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackinbot.vercel.app';

  /**
   * Configura webhook para um bot específico
   */
  static async setupWebhookForBot(botId: string, token: string, supabaseClient?: any): Promise<WebhookSetupResult> {
    try {
      const webhookUrl = `${this.baseUrl}/api/webhook/${botId}`;
      
      console.log(`🔧 Configurando webhook para bot ${botId}...`);
      
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });

      const result = await response.json();

      if (result.ok) {
        // Atualizar banco de dados
        await this.updateBotWebhookStatus(botId, webhookUrl, 'active', supabaseClient);
        
        console.log(`✅ Webhook configurado com sucesso para bot ${botId}`);
        return {
          success: true,
          message: 'Webhook configurado com sucesso',
          webhookUrl
        };
      } else {
        await this.updateBotWebhookStatus(botId, webhookUrl, 'error', supabaseClient);
        
        console.error(`❌ Erro ao configurar webhook para bot ${botId}:`, result);
        return {
          success: false,
          message: `Erro do Telegram: ${result.description}`,
          error: result.description
        };
      }
    } catch (error) {
      const webhookUrl = `${this.baseUrl}/api/webhook/${botId}`;
      await this.updateBotWebhookStatus(botId, webhookUrl, 'error', supabaseClient);
      
      console.error(`❌ Erro de rede ao configurar webhook para bot ${botId}:`, error);
      return {
        success: false,
        message: `Erro de rede: ${error instanceof Error ? error.message : 'Desconhecido'}`,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Configura webhooks para todos os bots ativos
   */
  static async setupAllBotWebhooks(): Promise<{
    total: number;
    success: number;
    failed: number;
    results: Array<{ botId: string; success: boolean; message: string; }>
  }> {
    console.log('🔄 Configurando webhooks para todos os bots...');
    
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, token, name')
      .eq('status', 'active');

    if (error) {
      console.error('❌ Erro ao buscar bots:', error);
      throw new Error(`Erro ao buscar bots: ${error.message}`);
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const bot of bots || []) {
      const result = await this.setupWebhookForBot(bot.id, bot.token);
      
      results.push({
        botId: bot.id,
        botName: bot.name,
        success: result.success,
        message: result.message
      });

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    console.log(`✅ Configuração concluída: ${successCount} sucessos, ${failedCount} falhas`);

    return {
      total: bots?.length || 0,
      success: successCount,
      failed: failedCount,
      results
    };
  }

  /**
   * Verifica o status do webhook de um bot no Telegram
   */
  static async checkWebhookStatus(token: string): Promise<{
    configured: boolean;
    url?: string;
    lastError?: string;
    pendingUpdates?: number;
  }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const result = await response.json();

      if (result.ok) {
        return {
          configured: !!result.result.url,
          url: result.result.url,
          lastError: result.result.last_error_message,
          pendingUpdates: result.result.pending_update_count
        };
      } else {
        throw new Error(result.description);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status do webhook:', error);
      return {
        configured: false,
        lastError: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Remove webhook de um bot
   */
  static async removeWebhook(token: string): Promise<WebhookSetupResult> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.ok) {
        return {
          success: true,
          message: 'Webhook removido com sucesso'
        };
      } else {
        return {
          success: false,
          message: `Erro ao remover webhook: ${result.description}`,
          error: result.description
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro de rede: ${error instanceof Error ? error.message : 'Desconhecido'}`,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Monitora e reconfigura webhooks que estão com problemas
   */
  static async monitorAndFixWebhooks(): Promise<{
    checked: number;
    fixed: number;
    errors: number;
  }> {
    console.log('🔍 Monitorando webhooks...');
    
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, token, name, webhook_configured_at')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Erro ao buscar bots: ${error.message}`);
    }

    let checked = 0;
    let fixed = 0;
    let errors = 0;

    for (const bot of bots || []) {
      checked++;
      
      const status = await this.checkWebhookStatus(bot.token);
      const expectedUrl = `${this.baseUrl}/api/webhook/${bot.id}`;
      
      // Reconfigurar se:
      // 1. Webhook não está configurado
      // 2. URL está incorreta
      // 3. Há erros pendentes
      if (!status.configured || status.url !== expectedUrl || status.lastError) {
        console.log(`🔧 Reconfigurando webhook para bot ${bot.name}...`);
        
        const result = await this.setupWebhookForBot(bot.id, bot.token);
        
        if (result.success) {
          fixed++;
        } else {
          errors++;
        }
      }
    }

    console.log(`✅ Monitoramento concluído: ${checked} verificados, ${fixed} corrigidos, ${errors} erros`);

    return { checked, fixed, errors };
  }

  /**
   * Atualiza status do webhook no banco de dados
   */
  private static async updateBotWebhookStatus(
    botId: string, 
    webhookUrl: string, 
    status: 'active' | 'error' | 'pending',
    supabaseClient?: any
  ): Promise<void> {
    try {
      // Usar cliente fornecido (autenticado) ou cliente admin para bypass do RLS
      const client = supabaseClient || supabaseAdmin;
      
      // Atualizar tabela bots (sem RLS restritivo)
      const { error: botsError } = await client
        .from('bots')
        .update({
          webhook_configured_at: new Date().toISOString(),
          webhook_url: webhookUrl
        })
        .eq('id', botId);

      if (botsError) {
        console.warn('⚠️ Erro ao atualizar tabela bots:', botsError);
      }

      // Usar função RPC para salvar webhook_config (contorna RLS)
      if (webhookUrl) {
        try {
          const tokenHash = btoa(botId).substring(0, 16); // Hash simples para identificação
          
          const { data: webhookResult, error: webhookError } = await client
            .rpc('save_webhook_config', {
              p_bot_id: botId,
              p_token_hash: tokenHash,
              p_webhook_url: webhookUrl,
              p_status: status
            });

          if (webhookError) {
            console.warn('⚠️ Erro ao salvar via RPC save_webhook_config:', webhookError);
          } else {
            console.log(`✅ Webhook status atualizado no banco para bot ${botId} via RPC`);
          }
        } catch (rpcError) {
          console.warn('⚠️ Erro na função RPC save_webhook_config:', rpcError);
        }
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar status do webhook no banco:', error);
      // Não propagar o erro para não quebrar a criação do bot
    }
  }

  /**
   * Alias para setupAllBotWebhooks (compatibilidade)
   */
  static async setupAllBots() {
    return await this.setupAllBotWebhooks();
  }

  /**
   * Configura webhook automaticamente quando um novo bot é criado
   */
  static async autoSetupForNewBot(botId: string, token: string): Promise<void> {
    console.log(`🆕 Configuração automática para novo bot ${botId}...`);
    
    // Aguardar 2 segundos para garantir que o bot foi salvo no banco
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await this.setupWebhookForBot(botId, token);
    
    if (result.success) {
      console.log(`✅ Webhook configurado automaticamente para novo bot ${botId}`);
    } else {
      console.error(`❌ Falha na configuração automática para bot ${botId}:`, result.message);
    }
  }
} 