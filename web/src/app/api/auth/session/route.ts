import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Erro ao buscar sessão:", error);
      return NextResponse.json({ session: null, error: error.message }, { status: 401 });
    }

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("Erro geral na sessão:", error);
    return NextResponse.json({ session: null, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Erro no login:", error);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ session: data.session, user: data.user });
  } catch (error: any) {
    console.error("Erro geral no login:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
} 