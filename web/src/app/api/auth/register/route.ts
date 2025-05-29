import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  console.log('🚀 API de registro iniciada');
  
  try {
    const body = await req.json();
    const { name, email, password, phone, cpf } = body;

    console.log('📝 Dados recebidos para registro');

    // Validações básicas
    if (!email?.trim()) {
      return NextResponse.json({ message: "Email é obrigatório" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ message: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }

    if (!name?.trim() || name.trim().length < 3) {
      return NextResponse.json({ message: "Nome deve ter pelo menos 3 caracteres" }, { status: 400 });
    }

    if (!phone?.trim()) {
      return NextResponse.json({ message: "Telefone é obrigatório" }, { status: 400 });
    }

    if (!cpf?.trim()) {
      return NextResponse.json({ message: "CPF é obrigatório" }, { status: 400 });
    }

    console.log('✅ Validações básicas passaram');

    // Criar cliente Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    console.log('📝 Criando usuário no Supabase Auth...');

    // Criar usuário no Supabase Auth (operação principal)
    const { data: userData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          phone: phone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
        },
      },
    });

    if (authError) {
      console.error('❌ Erro no Supabase Auth:', authError.message);
      
      // Tratar erros específicos
      if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
        return NextResponse.json({ message: "Este email já está cadastrado" }, { status: 400 });
      }
      
      return NextResponse.json({ message: authError.message || "Erro ao criar conta" }, { status: 400 });
    }

    if (!userData.user) {
      console.error('❌ Usuário não foi criado');
      return NextResponse.json({ message: "Erro ao criar conta" }, { status: 500 });
    }

    console.log('✅ Usuário criado no Auth:', userData.user.id);

    // Retornar sucesso imediatamente (remover operações extras que podem falhar)
    return NextResponse.json(
      { 
        message: "Conta criada com sucesso",
        user: {
          id: userData.user.id,
          email: userData.user.email
        }
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ Erro geral no registro:", error);
    console.error("❌ Stack trace:", error?.stack);
    
    return NextResponse.json(
      { message: "Erro interno do servidor. Tente novamente." },
      { status: 500 }
    );
  }
} 