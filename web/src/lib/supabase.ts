import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'blackinpay-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    });

export default supabase; 