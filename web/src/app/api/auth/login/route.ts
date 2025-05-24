import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    // Em produção, aqui verificaria as credenciais com um banco de dados
    // Por enquanto, simulamos um login bem-sucedido
    if (email === "teste@teste.com" && password === "teste123") {
      // Criar cookie de sessão
      const response = NextResponse.json(
        { message: "Login realizado com sucesso" },
        { status: 200 }
      );

      // Configurar cookie de sessão
      response.cookies.set({
        name: "auth_token",
        value: "usuario-token-teste-123",
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 dias
      });

      return response;
    }

    // Para fins de teste, vamos permitir qualquer login
    const response = NextResponse.json(
      { message: "Login realizado com sucesso" },
      { status: 200 }
    );

    // Configurar cookie de sessão
    response.cookies.set({
      name: "auth_token",
      value: "usuario-token-teste-123",
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 