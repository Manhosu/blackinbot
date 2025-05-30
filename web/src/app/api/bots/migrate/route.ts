import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Função para migrar bots do localStorage para o Supabase
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 INICIANDO MIGRAÇÃO DE BOTS DO LOCALSTORAGE PARA SUPABASE');
    
    // Obter dados dos bots do request body
    const { localBots = [] } = await req.json();
    console.log('📦 Recebidos ' + localBots.length + ' bots para migração');
    
    if (localBots.length === 0) {
      return NextResponse.json({
        success: true,
        results: {
          total: 0,
          migrated: 0,
          already_exists: 0,
          failed: 0,
          details: []
        }
      });
    }
    
    // Verificar autenticação
    const cookieStore = cookies();
    const routeHandlerClient = createSupabaseServerClient();
    
    try {
      const { data: { user }, error: authError } = await routeHandlerClient.auth.getUser();
      
      if (authError || !user) {
        console.warn('⚠️ Usuário não autenticado:', authError?.message || 'Auth session missing!');
        console.warn('⚠️ Sem usuário autenticado, usando todos os bots');
        
        // Prosseguir para retornar bots do localStorage como migrados (modo offline)
        return NextResponse.json({
          success: true,
          results: {
            total: localBots.length,
            migrated: 0,
            already_exists: 0,
            failed: localBots.length,
            offline: true,
            details: localBots.map((bot: any) => ({
              bot_id: bot.id,
              name: bot.name,
              status: 'offline',
              error: 'Usuário não autenticado, usando modo offline'
            }))
          }
        });
      }
      
      // Verificar bots existentes para evitar duplicação
      const { data: existingBots, error: fetchError } = await routeHandlerClient
        .from('bots')
        .select('id, name')
        .eq('owner_id', user.id);
      
      if (fetchError) {
        console.error('❌ Erro ao verificar bots existentes:', fetchError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao verificar bots existentes',
          details: fetchError
        }, { status: 500 });
      }
      
      // Criar mapa de IDs para verificação rápida
      const existingBotIds = (existingBots || []).reduce((acc: Record<string, boolean>, bot: any) => {
        acc[bot.id] = true;
        return acc;
      }, {});
      
      console.log('🔍 ' + (existingBots?.length || 0) + ' bots já existem no Supabase');
      
      // Filtrar apenas bots que não existem
      const botsToMigrate = localBots.filter((bot: any) => !existingBotIds[bot.id]);
      console.log('✨ ' + botsToMigrate.length + ' bots serão migrados');
      
      // Registros de resultado da migração
      const migrationResults = {
        total: localBots.length,
        migrated: 0,
        already_exists: existingBots?.length || 0,
        failed: 0,
        details: [] as any[]
      };
      
      // Migrar cada bot individualmente
      for (const bot of botsToMigrate) {
        try {
          // Converter IDs temporários para UUID se necessário
          if (!bot.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.log('🔄 Convertendo ID ' + bot.id + ' para UUID');
            bot.id = uuidv4();
          }
          
          // Preparar dados para inserção - com os campos corretos!
          const botData = {
            id: bot.id,
            name: bot.name,
            username: bot.username,
            token: bot.token,
            description: bot.description || '',
            avatar_url: bot.avatar_url || '',
            webhook_url: bot.webhook_url || '',
            status: bot.status || 'active',
            owner_id: user.id,
            created_at: bot.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            welcome_message: bot.welcome_message || '',
            access_denied_message: bot.access_denied_message || '',
            plan_price: bot.plan_price || 9.90,
            plan_name: bot.plan_name || 'Plano Padrão',
            plan_days: bot.plan_days || 30
          };
          
          // Verificar o esquema da tabela para garantir compatibilidade
          const { data: tableInfo, error: tableError } = await routeHandlerClient
            .from('bots')
            .select('*')
            .limit(1);
          
          if (tableError) {
            console.error('❌ Erro ao verificar esquema da tabela:', tableError);
            throw new Error(`Erro ao verificar esquema: ${tableError.message}`);
          }
          
          // Adicionar o bot ao localStorage de qualquer maneira (garantia)
          try {
            const localBotsJSON = global.localStorage?.getItem('demo_bots') || '[]';
            let storedBots = JSON.parse(localBotsJSON);
            
            // Verificar se o bot já existe
            const existingIndex = storedBots.findIndex((b: any) => b.id === bot.id);
            
            if (existingIndex >= 0) {
              // Atualizar bot existente
              storedBots[existingIndex] = {...bot, storage_type: 'local_with_migration_error'};
            } else {
              // Adicionar novo bot
              storedBots.push({...bot, storage_type: 'local_with_migration_error'});
            }
            
            // Salvar de volta
            global.localStorage?.setItem('demo_bots', JSON.stringify(storedBots));
            console.log('✅ Bot salvo no localStorage (backup):', bot.name);
          } catch (localError) {
            console.warn('⚠️ Erro ao salvar bot no localStorage:', localError);
          }
          
          // Tentar inserir no banco
          const { error: insertError } = await routeHandlerClient
            .from('bots')
            .insert(botData);
          
          if (insertError) {
            console.error('❌ Erro ao migrar bot ' + bot.name + ':', insertError);
            migrationResults.failed++;
            migrationResults.details.push({
              bot_id: bot.id,
              name: bot.name,
              status: 'failed',
              error: insertError.message
            });
          } else {
            console.log('✅ Bot ' + bot.name + ' migrado com sucesso!');
            migrationResults.migrated++;
            migrationResults.details.push({
              bot_id: bot.id,
              name: bot.name,
              status: 'success'
            });
            
            // Migrar planos adicionais se existirem
            if (bot.additional_plans && bot.additional_plans.length > 0) {
              for (const plan of bot.additional_plans) {
                try {
                  const planData = {
                    id: plan.id || uuidv4(),
                    name: plan.name,
                    price: plan.price || 9.90,
                    days_access: plan.days_access || 30,
                    bot_id: bot.id,
                    is_active: plan.is_active !== undefined ? plan.is_active : true,
                    created_at: plan.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  
                  await routeHandlerClient
                    .from('plans')
                    .insert(planData);
                } catch (planError) {
                  console.warn('⚠️ Erro ao migrar plano adicional:', planError);
                  // Não falhar a migração por causa de planos
                }
              }
            }
          }
        } catch (botError: any) {
          console.error('❌ Erro ao migrar bot ' + bot.name + ':', botError);
          migrationResults.failed++;
          migrationResults.details.push({
            bot_id: bot.id,
            name: bot.name,
            status: 'failed',
            error: botError.message || 'Erro desconhecido'
          });
        }
      }
      
      console.log('🏁 MIGRAÇÃO CONCLUÍDA:', migrationResults);
      
      return NextResponse.json({
        success: true,
        results: migrationResults
      });
      
    } catch (authError: any) {
      console.error('❌ Erro de autenticação:', authError);
      
      // Prosseguir com todos os bots em modo offline
      return NextResponse.json({
        success: true,
        results: {
          total: localBots.length,
          migrated: 0,
          already_exists: 0,
          failed: localBots.length,
          offline: true,
          details: localBots.map((bot: any) => ({
            bot_id: bot.id,
            name: bot.name,
            status: 'offline',
            error: 'Erro de autenticação: ' + (authError.message || 'Desconhecido')
          }))
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ Erro na migração:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
} 
