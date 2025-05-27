import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com Service Role Key
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, serviceKey);
}

// Função para buscar informações do usuário via Telegram
async function getTelegramUserInfo(botToken: string, userId: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: userId })
    });

    const result = await response.json();
    
    if (result.ok) {
      return {
        id: result.result.id,
        first_name: result.result.first_name,
        last_name: result.result.last_name,
        username: result.result.username,
        type: result.result.type
      };
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Erro ao buscar info do usuário:', error);
    return null;
  }
}

// Função para buscar foto do perfil do usuário
async function getUserProfilePhoto(botToken: string, userId: string) {
  try {
    const photoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        limit: 1
      })
    });

    const photoResult = await photoResponse.json();
    
    if (photoResult.ok && photoResult.result.photos.length > 0) {
      const photo = photoResult.result.photos[0][0];
      
      const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: photo.file_id })
      });

      const fileResult = await fileResponse.json();
      
      if (fileResult.ok) {
        return `https://api.telegram.org/file/bot${botToken}/${fileResult.result.file_path}`;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Erro ao buscar foto do perfil:', error);
    return null;
  }
}

// Função para encontrar o melhor grupo para adicionar o usuário
async function findBestGroupForBot(supabase: any, botId: string) {
  try {
    // Buscar grupos do bot ordenados por prioridade
    const { data: groups, error } = await supabase
      .from('groups')
      .select('id, name, telegram_id, is_vip, member_limit')
      .eq('bot_id', botId)
      .eq('is_active', true)
      .order('is_vip', { ascending: false }) // VIP primeiro
      .order('created_at', { ascending: false }); // Mais recentes primeiro

    if (error || !groups || groups.length === 0) {
      console.warn('⚠️ Nenhum grupo encontrado para o bot:', botId);
      return null;
    }

    // Retornar o primeiro grupo (mais prioritário)
    return groups[0];
  } catch (error) {
    console.error('❌ Erro ao buscar grupo:', error);
    return null;
  }
}

// Função para adicionar usuário ao grupo
async function addUserToTelegramGroup(botToken: string, groupTelegramId: string, userId: string) {
  try {
    // Se o grupo for um canal/supergrupo, gerar link de convite
    if (groupTelegramId.startsWith('@') || groupTelegramId.startsWith('-100')) {
      const inviteResponse = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: groupTelegramId,
          expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 horas
          member_limit: 1
        })
      });

      const inviteResult = await inviteResponse.json();
      
      if (inviteResult.ok) {
        // Enviar link de convite para o usuário
        const messageResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: `🎉 **Acesso liberado!**\n\n📱 Clique no link abaixo para entrar no grupo:\n${inviteResult.result.invite_link}\n\n⏰ Link válido por 24 horas`,
            parse_mode: 'Markdown'
          })
        });

        return {
          success: true,
          method: 'invite_link',
          invite_link: inviteResult.result.invite_link
        };
      }
    }

    return { success: false, error: 'Não foi possível adicionar ao grupo' };
  } catch (error) {
    console.error('❌ Erro ao adicionar ao grupo:', error);
    return { success: false, error: error };
  }
}

/**
 * Webhook do PushinPay para receber notificações de pagamento
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Webhook PushinPay recebido');
    
    const body = await request.json();
    console.log('📋 Dados do webhook:', JSON.stringify(body, null, 2));

    // Validar estrutura do webhook
    if (!body.event || !body.data) {
      console.error('❌ Webhook inválido - estrutura incorreta');
      return NextResponse.json({ 
        success: false, 
        error: 'Estrutura de webhook inválida' 
      }, { status: 400 });
    }

    const { event, data: paymentData } = body;

    // Processar apenas eventos de mudança de status de pagamento
    if (event !== 'payment.status_changed') {
      console.log(`ℹ️ Evento ignorado: ${event}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Evento ignorado' 
      });
    }

    const { id: pushinpayId, status } = paymentData;

    if (!pushinpayId || !status) {
      console.error('❌ Dados do pagamento incompletos');
      return NextResponse.json({ 
        success: false, 
        error: 'Dados incompletos' 
      }, { status: 400 });
    }

    console.log(`💳 Processando pagamento ${pushinpayId} - Status: ${status}`);

    const supabase = createSupabaseAdmin();

    // Buscar pagamento no banco pelo pushinpay_id
    console.log('🔍 Buscando pagamento com pushinpay_id:', pushinpayId);
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        bots!inner(id, name, token, owner_id),
        plans!inner(id, name, period_days)
      `)
      .eq('pushinpay_id', pushinpayId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado no banco:', paymentError);
      return NextResponse.json({ 
        success: false, 
        error: 'Pagamento não encontrado' 
      }, { status: 404 });
    }

    console.log(`📋 Pagamento encontrado: ${payment.id} - Status atual: ${payment.status}`);

    // Processar apenas se o status mudou para 'paid' ou 'approved'
    if ((status === 'paid' || status === 'approved') && payment.status !== 'completed') {
      console.log('✅ Pagamento aprovado! Processando...');

      try {
        // 1. Atualizar status do pagamento
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              ...payment.metadata,
              pushinpay_status: status,
              processed_at: new Date().toISOString(),
              webhook_received_at: new Date().toISOString()
            }
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar pagamento:', updateError);
          throw updateError;
        }

        console.log('✅ Status do pagamento atualizado para completed');

        // 2. Calcular e processar split financeiro
        const totalAmount = Number(payment.amount);
        const platformFee = 1.48 + (totalAmount * 0.05);
        const ownerAmount = totalAmount - platformFee;

        console.log(`💰 Split: Total R$ ${totalAmount.toFixed(2)} | Plataforma: R$ ${platformFee.toFixed(2)} | Dono: R$ ${ownerAmount.toFixed(2)}`);

        // 3. Atualizar saldo financeiro para o dono do bot
        const { data: currentFinance } = await supabase
          .from('user_finances')
          .select('available_balance, total_revenue')
          .eq('user_id', payment.bots.owner_id)
          .single();

        const currentBalance = Number(currentFinance?.available_balance || 0);
        const currentRevenue = Number(currentFinance?.total_revenue || 0);

        const { error: financeError } = await supabase
          .from('user_finances')
          .upsert({
            user_id: payment.bots.owner_id,
            available_balance: currentBalance + ownerAmount,
            total_revenue: currentRevenue + ownerAmount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (financeError) {
          console.warn('⚠️ Erro ao registrar financeiro (não crítico):', financeError);
        } else {
          console.log('✅ Saldo financeiro atualizado');
        }

        // 4. Liberar acesso do usuário ao bot
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + payment.plans.period_days);

        const { error: accessError } = await supabase
          .from('bot_user_access')
          .upsert({
            bot_id: payment.bot_id,
            user_telegram_id: payment.user_telegram_id,
            plan_id: payment.plan_id,
            payment_id: payment.id,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
            metadata: {
              payment_amount: payment.amount,
              plan_name: payment.plans.name,
              granted_via: 'pushinpay_webhook'
            }
          }, {
            onConflict: 'bot_id,user_telegram_id'
          });

        if (accessError) {
          console.error('❌ Erro ao liberar acesso:', accessError);
        } else {
          console.log(`✅ Acesso liberado até ${expiresAt.toISOString()}`);
        }

        // 5. Encontrar grupo para adicionar o usuário
        const targetGroup = await findBestGroupForBot(supabase, payment.bot_id);
        
        if (targetGroup) {
          console.log(`👥 Adicionando usuário ao grupo: ${targetGroup.name}`);
          
          // Buscar informações do usuário no Telegram
          const userInfo = await getTelegramUserInfo(payment.bots.token, payment.user_telegram_id);
          const avatarUrl = await getUserProfilePhoto(payment.bots.token, payment.user_telegram_id);
          
          // Adicionar como membro do grupo no banco de dados
          const memberData = {
            group_id: targetGroup.id,
            telegram_user_id: payment.user_telegram_id,
            name: payment.user_name || userInfo?.first_name || 'Usuário',
            username: userInfo?.username || null,
            avatar_url: avatarUrl,
            joined_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            status: 'active',
            is_admin: false,
            member_type: 'premium',
            payment_id: payment.id,
            plan_id: payment.plan_id
          };

          const { error: memberError } = await supabase
            .from('group_members')
            .upsert(memberData, {
              onConflict: 'group_id,telegram_user_id'
            });

          if (memberError) {
            console.error('❌ Erro ao adicionar membro ao grupo:', memberError);
          } else {
            console.log('✅ Membro adicionado ao grupo no banco de dados');
          }

          // Tentar adicionar ao grupo do Telegram
          const addResult = await addUserToTelegramGroup(
            payment.bots.token,
            targetGroup.telegram_id,
            payment.user_telegram_id
          );

          if (addResult.success) {
            console.log('✅ Usuário adicionado ao grupo do Telegram');
          } else {
            console.warn('⚠️ Não foi possível adicionar ao grupo do Telegram:', addResult.error);
          }
        } else {
          console.warn('⚠️ Nenhum grupo encontrado para adicionar o usuário');
        }

        // 6. Enviar mensagem de confirmação para o usuário
        try {
          const confirmationMessage = `🎉 **PAGAMENTO CONFIRMADO!**

✅ **Plano ativado:** ${payment.plans.name}
⏰ **Válido até:** ${expiresAt.toLocaleDateString('pt-BR', {
  day: '2-digit',
  month: '2-digit', 
  year: 'numeric'
})}
💰 **Valor pago:** R$ ${totalAmount.toFixed(2).replace('.', ',')}

🎯 **Seu acesso foi liberado automaticamente!**
${targetGroup ? `👥 **Você será adicionado ao grupo:** ${targetGroup.name}` : ''}

Obrigado pela preferência! 🙏`;

          await fetch(`https://api.telegram.org/bot${payment.bots.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: payment.user_telegram_id,
              text: confirmationMessage,
              parse_mode: 'Markdown'
            })
          });

          console.log('✅ Mensagem de confirmação enviada');
        } catch (telegramError) {
          console.warn('⚠️ Erro ao enviar mensagem de confirmação:', telegramError);
        }

        // 7. Registrar transação para o dashboard de vendas
        try {
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              id: payment.id,
              bot_id: payment.bot_id,
              user_telegram_id: payment.user_telegram_id,
              user_name: payment.user_name,
              plan_id: payment.plan_id,
              plan_name: payment.plans.name,
              amount: payment.amount.toString(),
              status: 'completed',
              payment_method: 'pix',
              created_at: payment.created_at,
              completed_at: new Date().toISOString(),
              metadata: {
                pushinpay_id: pushinpayId,
                group_added: targetGroup?.name || null
              }
            });

          if (transactionError) {
            console.warn('⚠️ Erro ao registrar transação:', transactionError);
          } else {
            console.log('✅ Transação registrada para o dashboard');
          }
        } catch (transactionLogError) {
          console.warn('⚠️ Erro no log de transação:', transactionLogError);
        }

        // 8. Log de auditoria
        const { error: auditError } = await supabase
          .from('payment_audit_log')
          .insert({
            payment_id: payment.id,
            event_type: 'payment_completed',
            event_data: {
              pushinpay_id: pushinpayId,
              status: status,
              amount: totalAmount,
              platform_fee: platformFee,
              owner_amount: ownerAmount,
              group_added: targetGroup?.name || null,
              processed_at: new Date().toISOString()
            },
            created_at: new Date().toISOString()
          });

        if (auditError) {
          console.warn('⚠️ Erro no log de auditoria:', auditError);
        }

        console.log('🎉 Pagamento processado com sucesso!');

        return NextResponse.json({
          success: true,
          message: 'Pagamento processado com sucesso',
          payment_id: payment.id,
          status: 'completed',
          group_added: targetGroup?.name || null
        });

      } catch (processingError: any) {
        console.error('❌ Erro ao processar pagamento:', processingError);
        
        // Reverter status se houve erro crítico
        await supabase
          .from('payments')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
            metadata: {
              ...payment.metadata,
              error_message: processingError?.message || 'Erro desconhecido',
              error_at: new Date().toISOString()
            }
          })
          .eq('id', payment.id);

        return NextResponse.json({
          success: false,
          error: 'Erro ao processar pagamento',
          payment_id: payment.id
        }, { status: 500 });
      }
    } 
    
    // Status não relevante ou já processado
    else if (status === 'cancelled' || status === 'failed' || status === 'expired') {
      console.log(`📋 Pagamento ${status} - atualizando status`);
      
      await supabase
        .from('payments')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
          metadata: {
            ...payment.metadata,
            pushinpay_status: status,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', payment.id);

      return NextResponse.json({
        success: true,
        message: `Status atualizado para ${status}`,
        payment_id: payment.id
      });
    }
    
    else {
      console.log(`ℹ️ Status ${status} - nenhuma ação necessária`);
      return NextResponse.json({
        success: true,
        message: 'Status recebido, nenhuma ação necessária'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro no webhook PushinPay:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET para verificar se o webhook está ativo
 */
export async function GET() {
  return NextResponse.json({
    service: 'PushinPay Webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app'}/api/webhooks/pushinpay`
  });
} 