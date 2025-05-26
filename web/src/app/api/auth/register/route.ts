import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, cpf } = await req.json();

    // Validações básicas
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Dados incompletos. Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    if (!phone || !cpf) {
      return NextResponse.json(
        { message: "Telefone e CPF são obrigatórios." },
        { status: 400 }
      );
    }

    // Criar cliente Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    console.log('📝 Criando usuário via API:', { email, name });

    // Criar usuário no Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
        },
      },
    });

    if (authError) {
      console.error('❌ Erro no Auth:', authError);
      return NextResponse.json(
        { message: authError.message },
        { status: 400 }
      );
    }

    console.log('✅ Usuário criado no Auth:', userData.user?.id);

    // Aguardar trigger processar e verificar se usuário foi criado na tabela users
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (userData.user?.id) {
      // Verificar se usuário foi criado na tabela users
      const { data: userCheck, error: checkError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', userData.user.id)
        .single();

      if (checkError) {
        console.warn('⚠️ Usuário não encontrado na tabela users, criando manualmente...');
        
        // Criar manualmente se o trigger falhou
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userData.user.id,
            email: userData.user.email,
            name: name,
            telegram_id: phone.replace(/\D/g, ""),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Erro ao inserir usuário manualmente:', insertError);
        }
      }

      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userData.user.id,
          full_name: name,
          phone: phone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError && profileError.code !== '23505') {
        console.warn('⚠️ Erro ao criar perfil:', profileError.message);
      }

      // Criar registro financeiro se não existir
      const { error: financeError } = await supabase
        .from('user_finances')
        .insert({
          user_id: userData.user.id,
          total_revenue: 0.00,
          available_balance: 0.00,
          pending_balance: 0.00,
          total_withdrawals: 0.00
        });

      if (financeError && financeError.code !== '23505') {
        console.warn('⚠️ Erro ao criar registro financeiro:', financeError.message);
      }
    }

    return NextResponse.json(
      { 
        message: "Conta criada com sucesso",
        user: {
          id: userData.user?.id,
          email: userData.user?.email
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("❌ Erro no registro:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 