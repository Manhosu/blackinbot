import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Criar resposta que apaga o cookie auth_token
    const response = NextResponse.json(
      { message: 'Logout realizado com sucesso' },
      { status: 200 }
    );

    // Remover cookie
    response.cookies.set({
      name: 'auth_token',
      value: '',
      path: '/',
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    return NextResponse.json(
      { message: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
} 