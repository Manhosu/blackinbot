import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return NextResponse.json({ 
        success: false, 
        user: null, 
        error: error.message 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      user: session?.user || null 
    });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return NextResponse.json({ 
      success: false, 
      user: null, 
      error: 'Erro interno do servidor' 
    });
  }
}

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    await supabase.auth.signOut();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logout realizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao fazer logout' 
    });
  }
} 