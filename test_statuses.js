import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || supabaseKey;
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await supabase.from('user_plans').select('status');
  if (error) {
    console.error("Error fetching statuses:", error.message);
  } else {
    const statuses = new Set(data.map(r => r.status));
    console.log("Distinct statuses in user_plans:", Array.from(statuses));
  }
}

run();
