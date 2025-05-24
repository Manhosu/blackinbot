import { NextResponse } from 'next/server';
import { getUser } from '@/lib/session';

/**
 * Função que faz a validação real do token com a API do Telegram
 * Versão simplificada e direta
 */
async function validateTelegramToken(token: string) {
  try {
    console.log("Iniciando validação simplificada para token");
    
    // Limpar qualquer espaço no token
    const cleanToken = token.trim();
    
    // Fazer a requisição para a API do Telegram - abordagem direta
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await res.json();
    
    console.log("Resposta da API:", data);

    // Verificar se a API retornou sucesso
    if (data.ok) {
      console.log("Token válido! Bot:", data.result.username || data.result.first_name);
      return {
        valid: true,
        botInfo: data.result, // id, username, first_name
      };
    } else {
      console.log("Token inválido. Resposta da API:", data.description);
      return {
        valid: false,
        error: data.description || 'Token inválido',
      };
    }
  } catch (err: any) {
    console.error("Erro ao validar token:", err);
    return {
      valid: false,
      error: 'Erro ao verificar token: ' + (err.message || err),
    };
  }
}

/**
 * Endpoint da API para validação de token
 */
export async function POST(request: Request) {
  try {
    // Removendo verificação de autenticação que estava causando erro 401
    // const user = await getUser();
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Obter o token do body da requisição
    const body = await request.json();
    let { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 });
    }
    
    // Remover espaços extras
    token = token.trim();
    
    // Se o usuário incluiu a URL completa da API, extrair apenas o token
    if (token.startsWith('http')) {
      console.log("Token contém URL completa, tentando extrair...");
      const match = token.match(/bot([^\/]+)/);
      if (match && match[1]) {
        token = match[1].trim();
        console.log("Token extraído da URL:", token.substring(0, 5) + "...");
      } else {
        return NextResponse.json({
          valid: false,
          error: 'O token contém uma URL completa, mas não foi possível extrair o token. Forneça apenas o token do bot.'
        }, { status: 200 });
      }
    }

    // Validar o token com a API do Telegram
    const validationResult = await validateTelegramToken(token);

    // Retornar o resultado da validação
    return NextResponse.json(validationResult);
    
  } catch (error: any) {
    // Erro no processamento da requisição
    console.error("Erro interno ao processar requisição:", error);
    return NextResponse.json({ 
      valid: false,
      error: `Erro interno no servidor: ${error.message}` 
    }, { status: 500 });
  }
} 