import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Verificar se existe o cookie de autenticação
    const authToken = req.cookies.get("auth_token")?.value;

    if (!authToken) {
      return NextResponse.json(
        { 
          authenticated: false,
          message: "Usuário não autenticado" 
        },
        { status: 401 }
      );
    }

    // Aqui você verificaria a validade do token e buscaria os dados do usuário
    // no banco de dados. Por enquanto, simulamos um usuário autenticado.
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: "user-123",
        name: "Usuário Teste",
        email: "usuario@teste.com",
      }
    });
    
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    return NextResponse.json(
      { 
        authenticated: false,
        message: "Erro ao verificar autenticação" 
      },
      { status: 500 }
    );
  }
} 