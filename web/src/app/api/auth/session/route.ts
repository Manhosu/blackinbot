import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return NextResponse.json({ session: null, error: error.message }, { status: 401 });
    }
    
    return NextResponse.json({ session, error: null });
  } catch (error) {
    console.error('Erro interno na sessão:', error);
    return NextResponse.json({ session: null, error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return NextResponse.json({ session: null, error: error.message }, { status: 401 });
    }
    
    return NextResponse.json({ session, error: null });
  } catch (error) {
    console.error('Erro interno na sessão:', error);
    return NextResponse.json({ session: null, error: 'Erro interno' }, { status: 500 });
  }
} 