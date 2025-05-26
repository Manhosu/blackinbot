import { NextRequest, NextResponse } from 'next/server';
import { getBotHandler } from '@/lib/telegram';

interface RouteParams {
  params: {
    botId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { botId } = params;
  
  // Validar botId
  if (!botId || typeof botId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Bot ID inválido' }, 
      { status: 400 }
    );
  }

  // Obter handler específico para este bot
  const telegramHandler = await getBotHandler(botId);
  
  // Executar o handler
  return telegramHandler(request);
}

// Permitir apenas POST
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Método não permitido' }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Método não permitido' }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Método não permitido' }, 
    { status: 405 }
  );
} 