import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com bypass RLS
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  console.log('🚀 API Remarketing chamada!');
  
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    console.log('🔍 Buscando grupos para remarketing - usuário:', userId);

    if (!userId) {
      console.log('❌ user_id não fornecido');
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

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

    const botIds = userBots.map(bot => bot.id);
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

    // Para cada grupo, buscar membros reais
    console.log('📡 Buscando membros dos grupos...');
    const groupsWithMembers = await Promise.all(
      groupsWithBots.map(async (group) => {
        console.log(`🔍 Buscando membros do grupo: ${group.name}`);
        
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
            shouldBeRemoved: status === 'expired' && diffDays < -2
          };
        });

        const stats = {
          total: processedMembers.length,
          active: processedMembers.filter(m => m.status === 'active').length,
          expiring_soon: processedMembers.filter(m => m.status === 'expiring_soon').length,
          expired: processedMembers.filter(m => m.status === 'expired').length
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