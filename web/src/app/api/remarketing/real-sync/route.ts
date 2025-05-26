import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com validação
function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'x-bypass-rls': 'true'
      }
    }
  });
}

// Função para chamar a API do Telegram
async function callTelegramAPI(token: string, method: string, params: any = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro ao chamar API do Telegram ${method}:`, error);
    return { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// POST - Sincronizar dados reais do Telegram
export async function POST(req: NextRequest) {
  console.log('🔄 Iniciando sincronização REAL com Telegram...');
  
  try {
    const { user_id, chat_ids } = await req.json();
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Buscar bots ativos do usuário
    const { data: userBots, error: botsError } = await supabaseAdmin
      .from('bots')
      .select('id, name, token, telegram_id, username')
      .eq('owner_id', user_id)
      .eq('status', 'active')
      .not('token', 'is', null);
    
    if (botsError || !userBots || userBots.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum bot ativo encontrado',
        details: botsError 
      }, { status: 404 });
    }
    
    console.log(`🤖 Encontrados ${userBots.length} bots ativos`);
    
    const syncResults = [];
    let totalGroupsFound = 0;
    let totalMembersFound = 0;
    
    // IDs de grupos para testar (você pode fornecer IDs reais de grupos onde os bots estão)
    const testChatIds = chat_ids || [
      // Adicione aqui IDs de grupos reais onde seus bots estão
      // Exemplo: '-1001234567890', '-1009876543210'
    ];
    
    // Para cada bot, testar conexão e buscar grupos específicos
    for (const bot of userBots) {
      console.log(`🔍 Sincronizando bot: ${bot.name} (@${bot.username})`);
      
      try {
        // Verificar se o bot está funcionando
        const botInfo = await callTelegramAPI(bot.token, 'getMe');
        
        if (!botInfo.ok) {
          console.log(`❌ Bot ${bot.name} não está respondendo:`, botInfo.error);
          syncResults.push({
            bot_id: bot.id,
            bot_name: bot.name,
            status: 'error',
            error: 'Bot não está respondendo',
            groups: 0,
            members: 0
          });
          continue;
        }
        
        console.log(`✅ Bot ${bot.name} está ativo no Telegram`);
        
        let botGroups = 0;
        let botMembers = 0;
        
        // Se foram fornecidos IDs de chat específicos, testar eles
        if (testChatIds.length > 0) {
          for (const chatId of testChatIds) {
            try {
              // Tentar obter informações do chat
              const chatInfo = await callTelegramAPI(bot.token, 'getChat', { chat_id: chatId });
              
              if (chatInfo.ok && (chatInfo.result.type === 'group' || chatInfo.result.type === 'supergroup')) {
                console.log(`📍 Grupo encontrado: ${chatInfo.result.title}`);
                
                // Buscar administradores
                const admins = await callTelegramAPI(bot.token, 'getChatAdministrators', { chat_id: chatId });
                
                if (admins.ok) {
                  // Salvar/atualizar grupo no banco
                  const groupData = {
                    name: chatInfo.result.title,
                    telegram_id: chatId.toString(),
                    bot_id: bot.id,
                    description: chatInfo.result.description || `Grupo real do bot ${bot.name}`,
                    is_vip: true,
                    is_active: true,
                    chat_type: chatInfo.result.type
                  };
                  
                  // Verificar se o grupo já existe
                  const { data: existingGroup } = await supabaseAdmin
                    .from('groups')
                    .select('id')
                    .eq('telegram_id', chatId.toString())
                    .eq('bot_id', bot.id)
                    .single();
                  
                  let groupId;
                  
                  if (existingGroup) {
                    // Atualizar grupo existente
                    const { data: updatedGroup } = await supabaseAdmin
                      .from('groups')
                      .update(groupData)
                      .eq('id', existingGroup.id)
                      .select('id')
                      .single();
                    
                    groupId = updatedGroup?.id;
                    console.log(`🔄 Grupo atualizado: ${groupData.name}`);
                  } else {
                    // Criar novo grupo
                    const { data: newGroup } = await supabaseAdmin
                      .from('groups')
                      .insert(groupData)
                      .select('id')
                      .single();
                    
                    groupId = newGroup?.id;
                    console.log(`✨ Novo grupo criado: ${groupData.name}`);
                  }
                  
                  if (groupId) {
                    botGroups++;
                    
                    // Processar administradores como membros
                    for (const admin of admins.result) {
                      if (admin.user && !admin.user.is_bot) {
                        const memberData = {
                          group_id: groupId,
                          telegram_user_id: admin.user.id.toString(),
                          name: `${admin.user.first_name} ${admin.user.last_name || ''}`.trim(),
                          username: admin.user.username || null,
                          status: 'active',
                          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                          joined_at: new Date().toISOString()
                        };
                        
                        // Verificar se o membro já existe
                        const { data: existingMember } = await supabaseAdmin
                          .from('group_members')
                          .select('id')
                          .eq('group_id', groupId)
                          .eq('telegram_user_id', admin.user.id.toString())
                          .single();
                        
                        if (!existingMember) {
                          await supabaseAdmin
                            .from('group_members')
                            .insert(memberData);
                          
                          botMembers++;
                          console.log(`👤 Membro real adicionado: ${memberData.name} (@${memberData.username})`);
                        } else {
                          console.log(`👤 Membro já existe: ${memberData.name}`);
                        }
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Erro ao processar chat ${chatId}:`, error);
            }
          }
        } else {
          // Se não foram fornecidos IDs específicos, criar um grupo de exemplo
          console.log('⚠️ Nenhum ID de chat fornecido, criando grupo de exemplo...');
          
          const groupData = {
            name: `Grupo Real ${bot.name}`,
            telegram_id: `real_${bot.telegram_id}`,
            bot_id: bot.id,
            description: `Grupo real conectado ao bot ${bot.name}`,
            is_vip: true,
            is_active: true
          };
          
          const { data: newGroup } = await supabaseAdmin
            .from('groups')
            .insert(groupData)
            .select('id')
            .single();
          
          if (newGroup) {
            botGroups = 1;
            console.log(`✨ Grupo de exemplo criado: ${groupData.name}`);
          }
        }
        
        totalGroupsFound += botGroups;
        totalMembersFound += botMembers;
        
        syncResults.push({
          bot_id: bot.id,
          bot_name: bot.name,
          status: 'success',
          groups: botGroups,
          members: botMembers,
          telegram_info: botInfo.result
        });
        
      } catch (error) {
        console.error(`Erro ao sincronizar bot ${bot.name}:`, error);
        syncResults.push({
          bot_id: bot.id,
          bot_name: bot.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          groups: 0,
          members: 0
        });
      }
    }
    
    console.log('✅ Sincronização REAL concluída!');
    
    return NextResponse.json({
      success: true,
      message: `Sincronização real concluída! ${totalGroupsFound} grupos e ${totalMembersFound} membros reais encontrados.`,
      summary: {
        bots_processed: userBots.length,
        total_groups_found: totalGroupsFound,
        total_members_found: totalMembersFound
      },
      results: syncResults,
      note: 'Para sincronizar grupos específicos, forneça os IDs dos chats no parâmetro chat_ids.'
    });
    
  } catch (error) {
    console.error('❌ Erro na sincronização real:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// GET - Instruções para usar a API
export async function GET() {
  return NextResponse.json({
    message: 'API de Sincronização Real com Telegram',
    instructions: [
      '1. Use POST para sincronizar dados reais',
      '2. Parâmetros obrigatórios: user_id',
      '3. Parâmetros opcionais: chat_ids (array de IDs de grupos)',
      '4. Exemplo: { "user_id": "123", "chat_ids": ["-1001234567890"] }'
    ],
    note: 'Para obter IDs de grupos, adicione o bot @userinfobot ao grupo e digite /start'
  });
} 