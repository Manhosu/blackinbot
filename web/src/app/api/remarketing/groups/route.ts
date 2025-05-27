import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com validação
function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
  }
  
  return createClient(url, key);
}



// GET - Buscar todos os grupos do usuário com membros e status
export async function GET(req: NextRequest) {
  console.log('🚀 API Remarketing chamada!');
  
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    console.log('🔍 Buscando grupos para remarketing - usuário:', userId);

    if (!userId) {
      console.log('❌ user_id não fornecido');
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Buscar todos os bots do usuário
    console.log('📡 Buscando bots do usuário...');
    const { data: userBots, error: botsError } = await supabaseAdmin
      .from('bots')
      .select('id, name, token, status')
      .eq('owner_id', userId);

    if (botsError) {
      console.error('❌ Erro ao buscar bots:', botsError);
      return NextResponse.json({ error: 'Erro ao buscar bots', details: botsError }, { status: 500 });
    }

    console.log(`📊 Bots encontrados: ${userBots?.length || 0}`, userBots);

    if (!userBots || userBots.length === 0) {
      console.log('⚠️ Nenhum bot encontrado');
      return NextResponse.json({
        groups: [],
        total_stats: { total: 0, active: 0, expiring_soon: 0, expired: 0 },
        summary: {
          total_groups: 0,
          total_members: 0,
          active_members: 0,
          members_to_remove: 0
        },
        demo_mode: false
      });
    }

    const botIds = userBots.map((bot: any) => bot.id);
    console.log('🤖 IDs dos bots:', botIds);

    // Buscar grupos dos bots do usuário
    console.log('📡 Buscando grupos...');
    console.log('🔍 Bot IDs para buscar grupos:', botIds);
    
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('*')
      .in('bot_id', botIds)
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('❌ Erro ao buscar grupos:', groupsError);
      return NextResponse.json({ error: 'Erro ao buscar grupos', details: groupsError }, { status: 500 });
    }

    console.log(`📍 Grupos encontrados: ${groups?.length || 0}`);
    console.log('📍 Dados dos grupos:', JSON.stringify(groups, null, 2));

    if (!groups || groups.length === 0) {
      console.log('⚠️ Nenhum grupo encontrado para os bots do usuário');
      return NextResponse.json({
        groups: [],
        total_stats: { total: 0, active: 0, expiring_soon: 0, expired: 0 },
        summary: {
          total_groups: 0,
          total_members: 0,
          active_members: 0,
          members_to_remove: 0
        },
        demo_mode: false
      });
    }

    // Buscar informações dos bots para cada grupo
    const groupsWithBots = groups.map(group => {
      const bot = userBots.find(b => b.id === group.bot_id);
      return {
        ...group,
        bots: { name: bot?.name || 'Bot não encontrado' }
      };
    });

    // Para cada grupo, buscar membros reais e sincronizar donos automaticamente
    console.log('📡 Buscando membros dos grupos...');
    const groupsWithMembers = await Promise.all(
      groupsWithBots.map(async (group) => {
        console.log(`🔍 Buscando membros do grupo: ${group.name}`);
        
        // Primeiro, tentar sincronizar o dono do grupo automaticamente
        try {
          const bot = userBots.find(b => b.id === group.bot_id);
          if (bot && bot.token) {
            console.log(`🔄 Sincronizando dono do grupo ${group.name} automaticamente...`);
            
            // Buscar administradores via API do Telegram
            const telegramResponse = await fetch(`https://api.telegram.org/bot${bot.token}/getChatAdministrators`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chat_id: group.telegram_id
              })
            });
            
            const telegramResult = await telegramResponse.json();
            
            if (telegramResult.ok) {
              const administrators = telegramResult.result || [];
                              const groupCreator = administrators.find((admin: any) => admin.status === 'creator');
              
              if (groupCreator && !groupCreator.user.is_bot) {
                // Buscar foto do perfil
                let avatarUrl = null;
                try {
                  const photoResponse = await fetch(`https://api.telegram.org/bot${bot.token}/getUserProfilePhotos`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      user_id: groupCreator.user.id,
                      limit: 1
                    })
                  });
                  
                  const photoResult = await photoResponse.json();
                  if (photoResult.ok && photoResult.result.photos.length > 0) {
                    const photo = photoResult.result.photos[0][0];
                    
                    const fileResponse = await fetch(`https://api.telegram.org/bot${bot.token}/getFile`, {
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
                      avatarUrl = `https://api.telegram.org/file/bot${bot.token}/${fileResult.result.file_path}`;
                    }
                  }
                } catch (photoError) {
                  console.warn(`⚠️ Erro ao buscar foto do dono do grupo ${group.name}:`, photoError);
                }
                
                // Salvar dono na base de dados
                const ownerData = {
                  group_id: group.id,
                  telegram_user_id: groupCreator.user.id.toString(),
                  name: `${groupCreator.user.first_name || ''} ${groupCreator.user.last_name || ''}`.trim() || 'Dono do Grupo',
                  username: groupCreator.user.username || null,
                  avatar_url: avatarUrl,
                  joined_at: new Date().toISOString(),
                  status: 'active',
                  is_admin: true,
                  member_type: 'group_creator',
                  expires_at: null
                };
                
                await supabaseAdmin
                  .from('group_members')
                  .upsert(ownerData, {
                    onConflict: 'group_id,telegram_user_id'
                  });
                
                console.log(`✅ Dono do grupo ${group.name} sincronizado: ${ownerData.name}`);
              }
            }
          }
        } catch (syncError) {
          console.warn(`⚠️ Erro ao sincronizar dono do grupo ${group.name}:`, syncError);
        }
        
        // Agora buscar todos os membros do grupo
        const { data: members, error: membersError } = await supabaseAdmin
          .from('group_members')
          .select('*')
          .eq('group_id', group.id)
          .order('joined_at', { ascending: false });

        if (membersError) {
          console.error(`❌ Erro ao buscar membros do grupo ${group.name}:`, membersError);
          return {
            ...group,
            members: [],
            stats: { total: 0, active: 0, expiring_soon: 0, expired: 0 }
          };
        }

        console.log(`👥 Membros encontrados para ${group.name}: ${members?.length || 0}`);

        if (!members || members.length === 0) {
          return {
            ...group,
            members: [],
            stats: { total: 0, active: 0, expiring_soon: 0, expired: 0 }
          };
        }

        // Processar status dos membros reais
        const processedMembers = members.map(member => {
          // Se é admin, não precisa de validação de expiração
          if (member.is_admin || member.member_type === 'admin' || member.member_type === 'bot_owner') {
            return {
              ...member,
              users: { 
                name: member.name || 'Nome não disponível', 
                username: member.username || 'sem_username', 
                avatar_url: member.avatar_url 
              },
              status: 'admin',
              statusLabel: 'ADMIN',
              statusColor: 'blue',
              daysUntilExpiry: null,
              shouldBeRemoved: false,
              isAdmin: true
            };
          }

          // Para membros regulares, verificar expiração
          if (!member.expires_at) {
            // Sem data de expiração - pode ser admin ou membro sem plano
            return {
              ...member,
              users: { 
                name: member.name || 'Nome não disponível', 
                username: member.username || 'sem_username', 
                avatar_url: member.avatar_url 
              },
              status: 'no_plan',
              statusLabel: 'Sem Plano',
              statusColor: 'gray',
              daysUntilExpiry: null,
              shouldBeRemoved: false,
              isAdmin: false
            };
          }

          const expiresAt = new Date(member.expires_at);
          const now = new Date();
          const diffTime = expiresAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let status = 'pending';
          let statusLabel = 'Pendente';
          let statusColor = 'yellow';

          if (diffDays > 2) {
            status = 'active';
            statusLabel = 'Ativo';
            statusColor = 'green';
          } else if (diffDays > 0 && diffDays <= 2) {
            status = 'expiring_soon';
            statusLabel = 'Expirando em breve';
            statusColor = 'orange';
          } else {
            status = 'expired';
            statusLabel = 'Expirado';
            statusColor = 'red';
          }

          return {
            ...member,
            users: { 
              name: member.name || 'Nome não disponível', 
              username: member.username || 'sem_username', 
              avatar_url: member.avatar_url 
            },
            status,
            statusLabel,
            statusColor,
            daysUntilExpiry: diffDays,
            shouldBeRemoved: status === 'expired' && diffDays < -2,
            isAdmin: false
          };
        });

        const stats = {
          total: processedMembers.length,
          active: processedMembers.filter(m => m.status === 'active' || m.status === 'admin').length,
          expiring_soon: processedMembers.filter(m => m.status === 'expiring_soon').length,
          expired: processedMembers.filter(m => m.status === 'expired').length,
          admins: processedMembers.filter(m => m.status === 'admin').length
        };

        console.log(`📊 Stats do grupo ${group.name}:`, stats);

        return {
          ...group,
          members: processedMembers,
          stats
        };
      })
    );

    // Calcular estatísticas gerais
    const totalStats = groupsWithMembers.reduce(
      (acc, group) => ({
        total: acc.total + group.stats.total,
        active: acc.active + group.stats.active,
        expiring_soon: acc.expiring_soon + group.stats.expiring_soon,
        expired: acc.expired + group.stats.expired
      }),
      { total: 0, active: 0, expiring_soon: 0, expired: 0 }
    );

    console.log('📊 Estatísticas totais:', totalStats);
    console.log('✅ Dados de remarketing carregados com sucesso');

    return NextResponse.json({
      groups: groupsWithMembers,
      total_stats: totalStats,
      summary: {
        total_groups: groupsWithMembers.length,
        total_members: totalStats.total,
        active_members: totalStats.active,
        members_to_remove: groupsWithMembers.reduce(
          (acc, group) => acc + group.members.filter((m: any) => m.shouldBeRemoved).length,
          0
        )
      },
      demo_mode: false,
      simulated_data: false
    });

  } catch (err: any) {
    console.error('❌ Erro ao buscar dados de remarketing:', err);
    return NextResponse.json({ error: 'Erro interno do servidor', details: err.message }, { status: 500 });
  }
}

// POST - Remover membros expirados automaticamente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, auto_remove = false, group_ids = [] } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    let removedCount = 0;

    if (auto_remove) {
      // Buscar membros que devem ser removidos (expirados há mais de 2 dias)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 2);

      const query = supabaseAdmin
        .from('group_members')
        .select(`
          *,
          transactions:transaction_id (
            expires_at
          )
        `);

      // Se group_ids fornecidos, filtrar por eles
      if (group_ids.length > 0) {
        query.in('group_id', group_ids);
      }

      const { data: expiredMembers, error: fetchError } = await query;

      if (fetchError) {
        console.error('Erro ao buscar membros expirados:', fetchError);
        return NextResponse.json({ error: 'Erro ao buscar membros' }, { status: 500 });
      }

      // Filtrar membros que devem ser removidos
      const membersToRemove = (expiredMembers || []).filter((member: any) => {
        if (!member.transactions || !member.transactions.expires_at) return false;
        
        const expiresAt = new Date(member.transactions.expires_at);
        return expiresAt < cutoffDate;
      });

      if (membersToRemove.length > 0) {
        const memberIds = membersToRemove.map((m: any) => m.id);
        
        // Remover membros
        const { error: removeError } = await supabaseAdmin
          .from('group_members')
          .delete()
          .in('id', memberIds);

        if (removeError) {
          console.error('Erro ao remover membros:', removeError);
          return NextResponse.json({ error: 'Erro ao remover membros' }, { status: 500 });
        }

        removedCount = memberIds.length;
      }
    }

    return NextResponse.json({
      success: true,
      removed_count: removedCount,
      message: auto_remove 
        ? `${removedCount} membros removidos automaticamente`
        : 'Nenhuma ação realizada'
    });

  } catch (err: any) {
    console.error('Erro na remoção automática:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 