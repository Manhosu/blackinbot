import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Verificar se o bucket existe
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Procurar o bucket específico
    const botAvatarsBucket = data.find(bucket => bucket.name === 'bot-avatars');
    
    // Tentar listar arquivos se o bucket existir
    let files = null;
    if (botAvatarsBucket) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('bot-avatars')
        .list();
      
      if (!fileError) {
        files = fileData;
      }
    }

    return NextResponse.json({
      buckets: data,
      hasBotAvatarsBucket: !!botAvatarsBucket,
      botAvatarsBucket,
      files
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 