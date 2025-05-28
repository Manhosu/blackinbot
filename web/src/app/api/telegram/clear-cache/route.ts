import { NextResponse } from 'next/server';

// Esta é uma API simples para forçar limpeza de cache no webhook
export async function POST() {
  try {
    // Fazer request para o webhook com um token fake para trigger da limpeza
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        update_id: Date.now(),
        message: {
          message_id: 1,
          from: {
            id: 999999999,
            is_bot: false,
            first_name: "Cache Cleaner"
          },
          chat: {
            id: 999999999,
            type: "private"
          },
          date: Math.floor(Date.now() / 1000),
          text: "/clear_cache_internal"
        }
      })
    });
    
    return NextResponse.json({
      success: true,
      message: 'Cache clearing triggered'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache'
    }, { status: 500 });
  }
} 