import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vtwdvgqzampjionqlivw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("VITE_SUPABASE_ANON_KEY is missing from environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('app_settings').select('*');
  console.log("=== APP SETTINGS ===");
  console.log(JSON.stringify(data, null, 2));
  if (error) console.error("Error:", error);
}

inspect();
