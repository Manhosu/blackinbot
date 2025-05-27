import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API para sincronizar administradores dos grupos do Telegram
 * Busca os administradores via API do Telegram e adiciona à tabela group_members
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, group_id, bot_token } = await request.json();
    
    console.log('🔄 Sincronizando administradores do grupo:', { user_id, group_id });
    
    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'user_id é obrigatório'
      }, { status: 400 });
    }

    // Buscar grupos do usuário
    let groupsToSync = [];
    
    if (group_id && bot_token) {
      // Sincronizar grupo específico
      const { data: group, error } = await supabase
        .from('groups')
        .select('*, bots:bot_id(token)')
        .eq('id', group_id)
        .single();
        
      if (error || !group) {
        return NextResponse.json({
          success: false,
          error: 'Grupo não encontrado'
        }, { status: 404 });
      }
      
      groupsToSync = [{ ...group, bot_token: bot_token }];
    } else {
      // Sincronizar todos os grupos do usuário
      const { data: userBots, error: botsError } = await supabase
        .from('bots')
        .select('id, token')
        .eq('owner_id', user_id);

      if (botsError || !userBots) {
        return NextResponse.json({
          success: false,
          error: 'Erro ao buscar bots do usuário'
        }, { status: 500 });
      }

      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*, bots:bot_id(token)')
        .in('bot_id', userBots.map(bot => bot.id));

      if (groupsError) {
        return NextResponse.json({
          success: false,
          error: 'Erro ao buscar grupos'
        }, { status: 500 });
      }

      groupsToSync = groups || [];
    }

    console.log(`📊 Sincronizando ${groupsToSync.length} grupos`);

    let totalAdminsAdded = 0;
    let errors = 0;

    for (const group of groupsToSync) {
      try {
        console.log(`🔍 Processando grupo: ${group.name} (${group.telegram_id})`);
        
        const botToken = group.bots?.token || group.bot_token;
        if (!botToken) {
          console.warn(`⚠️ Token do bot não encontrado para grupo ${group.name}`);
          errors++;
          continue;
        }

        // Buscar administradores do grupo via API do Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatAdministrators`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: group.telegram_id
          })
        });

        const telegramResult = await telegramResponse.json();
        
        if (!telegramResult.ok) {
          console.error(`❌ Erro ao buscar admins do grupo ${group.name}:`, telegramResult);
          errors++;
          continue;
        }

        const administrators = telegramResult.result || [];
        console.log(`👑 Encontrados ${administrators.length} administradores no grupo ${group.name}`);

        for (const admin of administrators) {
          try {
            // Pular bots que não sejam relevantes
            if (admin.user.is_bot) {
              continue;
            }

            // Buscar informações detalhadas do usuário
            let userInfo = admin.user;
            let avatarUrl = null;
            
            // Tentar buscar foto do perfil
            try {
              const photoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  user_id: admin.user.id,
                  limit: 1
                })
              });
              
              const photoResult = await photoResponse.json();
              if (photoResult.ok && photoResult.result.photos.length > 0) {
                const photo = photoResult.result.photos[0][0];
                
                // Buscar URL da foto
                const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    file_id: photo.file_id
                  })
                });
                
                const fileResult = await fileResponse.json();
                if (fileResult.ok) {
                  avatarUrl = `https://api.telegram.org/file/bot${botToken}/${fileResult.result.file_path}`;
                }
              }
            } catch (photoError) {
              console.warn(`⚠️ Erro ao buscar foto do usuário ${admin.user.id}:`, photoError);
            }

            // Verificar se é o dono do bot comparando com owner_id
            const { data: botOwner } = await supabase
              .from('bots')
              .select('owner_id')
              .eq('id', group.bot_id)
              .single();

            const adminData = {
              group_id: group.id,
              telegram_user_id: admin.user.id.toString(),
              name: `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'Admin',
              username: userInfo.username || null,
              avatar_url: avatarUrl,
              joined_at: new Date().toISOString(),
              status: 'active',
              is_admin: true,
              member_type: admin.status === 'creator' ? 'group_creator' : 'admin',
              expires_at: null // Admins não expiram
            };

            console.log(`➕ Adicionando admin: ${adminData.name} (@${adminData.username}) - Status: ${admin.status}`);

            // Inserir ou atualizar admin
            const { error: insertError } = await supabase
              .from('group_members')
              .upsert(adminData, {
                onConflict: 'group_id,telegram_user_id'
              });

            if (insertError) {
              console.error(`❌ Erro ao inserir admin ${adminData.name}:`, insertError);
              errors++;
            } else {
              totalAdminsAdded++;
            }

          } catch (adminError) {
            console.error(`❌ Erro ao processar admin:`, adminError);
            errors++;
          }
        }

      } catch (groupError) {
        console.error(`❌ Erro ao processar grupo ${group.name}:`, groupError);
        errors++;
      }
    }

    console.log(`✅ Sincronização concluída: ${totalAdminsAdded} admins adicionados, ${errors} erros`);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${totalAdminsAdded} administradores adicionados`,
      total_admins_added: totalAdminsAdded,
      errors: errors,
      groups_processed: groupsToSync.length
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização de administradores:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET - Buscar administradores atuais dos grupos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const groupId = searchParams.get('group_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'user_id é obrigatório'
      }, { status: 400 });
    }

    let query = supabase
      .from('group_members')
      .select(`
        *,
        groups:group_id (
          id,
          name,
          telegram_id,
          bot_id
        )
      `)
      .eq('is_admin', true);

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data: admins, error } = await query;

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar administradores'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      admins: admins || [],
      total: (admins || []).length
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar administradores:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 