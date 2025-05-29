import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, invitation_code } = await request.json();

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: name, email, password'
      }, { status: 400 });
    }

    // Corrigir cookies para Next.js 15
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    console.log('🔧 Garantindo que usuário existe:', { name, email, password });

    // Usar a função do Supabase para garantir que o usuário existe
    const { data, error } = await supabase.rpc('ensure_user_profile', {
      p_user_id: name,
      p_user_email: email,
      p_user_name: name
    });

    if (error) {
      console.error('❌ Erro ao garantir usuário:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Usuário garantido:', data);

    return NextResponse.json({
      success: true,
      user: data
    });

  } catch (error) {
    console.error("❌ Erro na API ensure user:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 