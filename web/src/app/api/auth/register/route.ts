import { NextRequest, NextResponse } from "next/server";

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

    // Em produção, aqui criaria o usuário no banco de dados
    
    // Simular resposta de sucesso
    const response = NextResponse.json(
      { message: "Conta criada com sucesso" },
      { status: 201 }
    );

    // Configurar cookie de sessão
    response.cookies.set({
      name: "auth_token",
      value: "novo-usuario-token-123",
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 