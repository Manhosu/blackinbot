require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getToken() {
  const { data: bot } = await supabase
    .from('bots')
    .select('token')
    .eq('id', 'd7a8f37c-8367-482a-9df2-cc17101a5677')
    .single();
  
  console.log('Token:', bot.token);
}

getToken(); 