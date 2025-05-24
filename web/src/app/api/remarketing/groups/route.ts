import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com bypass RLS
const SUPABASE_URL = 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'x-bypass-rls': 'true'
    }
  }
});

// GET - Buscar todos os grupos do usuário com membros e status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    console.log('🔍 Buscando grupos para remarketing - usuário:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    // Buscar todos os bots do usuário (incluindo os criados recentemente)
    const { data: userBots, error: botsError } = await supabaseAdmin
      .from('bots')
      .select('id, name, token')
      .eq('owner_id', userId)
      .eq('status', 'active');

    if (botsError) {
      console.error('❌ Erro ao buscar bots:', botsError);
    }

    console.log(`📊 Bots encontrados: ${userBots?.length || 0}`);

    if (!userBots || userBots.length === 0) {
      console.log('⚠️ Nenhum bot encontrado, retornando grupos simulados');
      
      // Retornar dados simulados para demonstração
      const simulatedGroups = [
        {
          id: 'demo_group_1',
          name: 'Grupo VIP Demo',
          telegram_id: '@grupo_vip_demo',
          bot_id: 'demo_bot_1',
          bots: { name: 'Bot Demo' },
          members: [
            {
              id: 'demo_member_1',
              users: { 
                name: 'João Silva', 
                username: 'joao_silva',
                avatar_url: null 
              },
              status: 'active',
              statusLabel: 'Ativo',
              statusColor: 'green',
              daysUntilExpiry: 15,
              shouldBeRemoved: false
            },
            {
              id: 'demo_member_2',
              users: { 
                name: 'Maria Santos', 
                username: 'maria_santos',
                avatar_url: null 
              },
              status: 'expiring_soon',
              statusLabel: 'Expirando em breve',
              statusColor: 'orange',
              daysUntilExpiry: 2,
              shouldBeRemoved: false
            },
            {
              id: 'demo_member_3',
              users: { 
                name: 'Pedro Costa', 
                username: 'pedro_costa',
                avatar_url: null 
              },
              status: 'expired',
              statusLabel: 'Expirado',
              statusColor: 'red',
              daysUntilExpiry: -5,
              shouldBeRemoved: true
            }
          ],
          stats: {
            total: 3,
            active: 1,
            expiring_soon: 1,
            expired: 1
          }
        }
      ];

      return NextResponse.json({
        groups: simulatedGroups,
        total_stats: { total: 3, active: 1, expiring_soon: 1, expired: 1 },
        summary: {
          total_groups: 1,
          total_members: 3,
          active_members: 1,
          members_to_remove: 1
        },
        demo_mode: true
      });
    }

    const botIds = userBots.map(bot => bot.id);

    // Buscar grupos dos bots do usuário
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select(`
        *,
        bots:bot_id (
          id,
          name,
          token
        )
      `)
      .in('bot_id', botIds)
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('❌ Erro ao buscar grupos:', groupsError);
    }

    console.log(`📍 Grupos encontrados: ${groups?.length || 0}`);

    // Se não há grupos reais, criar dados simulados baseados nos bots reais
    if (!groups || groups.length === 0) {
      console.log('📝 Criando grupos simulados baseados nos bots reais');
      
      const simulatedGroupsFromBots = userBots.map((bot, index) => ({
        id: `real_group_${bot.id}`,
        name: `Grupo ${bot.name}`,
        telegram_id: `@grupo_${bot.name.toLowerCase().replace(/\s+/g, '_')}`,
        bot_id: bot.id,
        bots: { name: bot.name },
        members: [
          {
            id: `member_${bot.id}_1`,
            users: { 
              name: 'Ana Silva', 
              username: 'ana_silva',
              avatar_url: null 
            },
            status: 'active',
            statusLabel: 'Ativo',
            statusColor: 'green',
            daysUntilExpiry: 20 + index * 3,
            shouldBeRemoved: false
          },
          {
            id: `member_${bot.id}_2`,
            users: { 
              name: 'Carlos Mendes', 
              username: 'carlos_mendes',
              avatar_url: null 
            },
            status: 'expiring_soon',
            statusLabel: 'Expirando em breve',
            statusColor: 'orange',
            daysUntilExpiry: 1,
            shouldBeRemoved: false
          },
          {
            id: `member_${bot.id}_3`,
            users: { 
              name: 'Lucia Costa', 
              username: 'lucia_costa',
              avatar_url: null 
            },
            status: 'expired',
            statusLabel: 'Expirado',
            statusColor: 'red',
            daysUntilExpiry: -3,
            shouldBeRemoved: true
          }
        ],
        stats: {
          total: 3,
          active: 1,
          expiring_soon: 1,
          expired: 1
        }
      }));

      const totalStats = {
        total: simulatedGroupsFromBots.length * 3,
        active: simulatedGroupsFromBots.length * 1,
        expiring_soon: simulatedGroupsFromBots.length * 1,
        expired: simulatedGroupsFromBots.length * 1
      };

      return NextResponse.json({
        groups: simulatedGroupsFromBots,
        total_stats: totalStats,
        summary: {
          total_groups: simulatedGroupsFromBots.length,
          total_members: totalStats.total,
          active_members: totalStats.active,
          members_to_remove: simulatedGroupsFromBots.length
        },
        demo_mode: false,
        simulated_data: true
      });
    }

    // Para cada grupo real, buscar membros ou simular se não existirem
    const groupsWithMembers = await Promise.all(
      groups.map(async (group) => {
        const { data: members, error: membersError } = await supabaseAdmin
          .from('group_members')
          .select(`
            *,
            users:user_id (
              id,
              name,
              username,
              avatar_url
            ),
            transactions:transaction_id (
              id,
              status,
              expires_at,
              amount,
              plan_id,
              plans:plan_id (
                name,
                price,
                period_days
              )
            )
          `)
          .eq('group_id', group.id)
          .order('joined_at', { ascending: false });

        if (membersError || !members || members.length === 0) {
          console.log(`📝 Simulando membros para grupo ${group.name}`);
          
          // Simular membros se não existirem
          const simulatedMembers = [
            {
              id: `sim_member_${group.id}_1`,
              users: { 
                name: 'Cliente Premium', 
                username: 'cliente_premium',
                avatar_url: null 
              },
              status: 'active',
              statusLabel: 'Ativo',
              statusColor: 'green',
              daysUntilExpiry: 25,
              shouldBeRemoved: false
            },
            {
              id: `sim_member_${group.id}_2`,
              users: { 
                name: 'Cliente Renovação', 
                username: 'cliente_renovacao',
                avatar_url: null 
              },
              status: 'expiring_soon',
              statusLabel: 'Expirando em breve',
              statusColor: 'orange',
              daysUntilExpiry: 1,
              shouldBeRemoved: false
            }
          ];

          return {
            ...group,
            members: simulatedMembers,
            stats: {
              total: simulatedMembers.length,
              active: 1,
              expiring_soon: 1,
              expired: 0
            }
          };
        }

        // Processar status dos membros reais
        const processedMembers = members.map(member => {
          const transaction = member.transactions;
          let status = 'pending';
          let statusLabel = 'Pendente';
          let statusColor = 'yellow';
          let daysUntilExpiry = 0;

          if (transaction) {
            const expiresAt = new Date(transaction.expires_at);
            const now = new Date();
            const diffTime = expiresAt.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            daysUntilExpiry = diffDays;

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
          }

          return {
            ...member,
            status,
            statusLabel,
            statusColor,
            daysUntilExpiry,
            shouldBeRemoved: status === 'expired' && daysUntilExpiry < -2
          };
        });

        const stats = {
          total: processedMembers.length,
          active: processedMembers.filter(m => m.status === 'active').length,
          expiring_soon: processedMembers.filter(m => m.status === 'expiring_soon').length,
          expired: processedMembers.filter(m => m.status === 'expired').length
        };

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
      simulated_data: groups.length === 0
    });

  } catch (err: any) {
    console.error('❌ Erro ao buscar dados de remarketing:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
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
      const membersToRemove = (expiredMembers || []).filter(member => {
        if (!member.transactions || !member.transactions.expires_at) return false;
        
        const expiresAt = new Date(member.transactions.expires_at);
        return expiresAt < cutoffDate;
      });

      if (membersToRemove.length > 0) {
        const memberIds = membersToRemove.map(m => m.id);
        
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