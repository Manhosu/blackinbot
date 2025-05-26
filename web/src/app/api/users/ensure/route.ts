import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { user_id, email, name } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json(
        { message: "user_id e email são obrigatórios" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    console.log('🔧 Garantindo que usuário existe:', { user_id, email, name });

    // Usar a função do Supabase para garantir que o usuário existe
    const { data, error } = await supabase.rpc('ensure_user_profile', {
      p_user_id: user_id,
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