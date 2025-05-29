import { supabase } from './supabase';

export interface WebhookSetupResult {
  success: boolean;
  message: string;
  webhookUrl?: string;
  error?: string;
}

export class WebhookManager {
  private static baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackinbot.vercel.app';

  /**
   * Configura webhook para um bot específico
   */
  static async setupWebhookForBot(botId: string, token: string): Promise<WebhookSetupResult> {
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
        await this.updateBotWebhookStatus(botId, webhookUrl, 'active');
        
        console.log(`✅ Webhook configurado com sucesso para bot ${botId}`);
        return {
          success: true,
          message: 'Webhook configurado com sucesso',
          webhookUrl
        };
      } else {
        await this.updateBotWebhookStatus(botId, webhookUrl, 'error');
        
        console.error(`❌ Erro ao configurar webhook para bot ${botId}:`, result);
        return {
          success: false,
          message: `Erro do Telegram: ${result.description}`,
          error: result.description
        };
      }
    } catch (error) {
      const webhookUrl = `${this.baseUrl}/api/webhook/${botId}`;
      await this.updateBotWebhookStatus(botId, webhookUrl, 'error');
      
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
    status: 'active' | 'error' | 'pending'
  ): Promise<void> {
    try {
      // Atualizar tabela bots
      await supabase
        .from('bots')
        .update({
          webhook_configured_at: new Date().toISOString(),
          webhook_url: webhookUrl
        })
        .eq('id', botId);

      // Atualizar ou inserir em webhook_configs
      await supabase
        .from('webhook_configs')
        .upsert({
          bot_id: botId,
          webhook_url: webhookUrl,
          status: status,
          configured_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('❌ Erro ao atualizar status do webhook no banco:', error);
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