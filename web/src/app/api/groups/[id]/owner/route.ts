import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API para buscar informações reais do dono do grupo via Telegram
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = id;
  
  try {
    console.log('🔍 Buscando informações do dono do grupo:', groupId);
    
    // Buscar grupo e bot
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        *,
        bots:bot_id (
          id,
          name,
          token,
          owner_id
        )
      `)
      .eq('id', groupId)
      .single();
    
    if (groupError || !group) {
      return NextResponse.json({
        success: false,
        error: 'Grupo não encontrado'
      }, { status: 404 });
    }
    
    const bot = group.bots;
    if (!bot || !bot.token) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado ou token inválido'
      }, { status: 400 });
    }
    
    console.log(`🤖 Buscando administradores do grupo ${group.name} via API do Telegram`);
    
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
    
    if (!telegramResult.ok) {
      console.error('❌ Erro ao buscar admins do Telegram:', telegramResult);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar administradores do Telegram',
        details: telegramResult.description
      }, { status: 500 });
    }
    
    const administrators = telegramResult.result || [];
    console.log(`👑 Encontrados ${administrators.length} administradores`);
    
    // Buscar o criador do grupo (owner)
    const groupCreator = administrators.find((admin: any) => admin.status === 'creator');
    
    if (!groupCreator) {
      return NextResponse.json({
        success: false,
        error: 'Criador do grupo não encontrado'
      }, { status: 404 });
    }
    
    console.log('👤 Criador encontrado:', groupCreator.user.first_name, groupCreator.user.username);
    
    // Buscar foto do perfil do criador
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
        const photo = photoResult.result.photos[0][0]; // Melhor qualidade
        
        // Buscar URL da foto
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
          console.log('📸 Foto do perfil encontrada:', avatarUrl);
        }
      }
    } catch (photoError) {
      console.warn('⚠️ Erro ao buscar foto do perfil:', photoError);
    }
    
    // Dados do dono real
    const ownerInfo = {
      telegram_id: groupCreator.user.id.toString(),
      name: `${groupCreator.user.first_name || ''} ${groupCreator.user.last_name || ''}`.trim(),
      username: groupCreator.user.username || null,
      avatar_url: avatarUrl,
      is_bot: groupCreator.user.is_bot,
      status: groupCreator.status,
      can_be_edited: groupCreator.can_be_edited,
      can_manage_chat: groupCreator.can_manage_chat,
      can_delete_messages: groupCreator.can_delete_messages,
      can_manage_video_chats: groupCreator.can_manage_video_chats,
      can_restrict_members: groupCreator.can_restrict_members,
      can_promote_members: groupCreator.can_promote_members,
      can_change_info: groupCreator.can_change_info,
      can_invite_users: groupCreator.can_invite_users,
      can_pin_messages: groupCreator.can_pin_messages
    };
    
    // Salvar/atualizar o dono na base de dados
    const ownerData = {
      group_id: groupId,
      telegram_user_id: ownerInfo.telegram_id,
      name: ownerInfo.name || 'Dono do Grupo',
      username: ownerInfo.username,
      avatar_url: ownerInfo.avatar_url,
      joined_at: new Date().toISOString(),
      status: 'active',
      is_admin: true,
      member_type: 'group_creator',
      expires_at: null
    };
    
    console.log('💾 Salvando informações do dono na base de dados');
    
    const { error: upsertError } = await supabase
      .from('group_members')
      .upsert(ownerData, {
        onConflict: 'group_id,telegram_user_id'
      });
    
    if (upsertError) {
      console.error('❌ Erro ao salvar dono do grupo:', upsertError);
    }
    
    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        telegram_id: group.telegram_id
      },
      owner: ownerInfo,
      total_admins: administrators.length,
      saved_to_database: !upsertError
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar dono do grupo:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST - Forçar atualização do perfil do dono
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const groupId = id;
    
    // Chamar GET para atualizar
    const response = await GET(request, { params });
    return response;
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Erro ao atualizar perfil do dono'
    }, { status: 500 });
  }
} 