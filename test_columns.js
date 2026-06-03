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
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const checkTable = async (tableName) => {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      console.log(`Table ${tableName} error:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Table ${tableName} columns:`, Object.keys(data[0]).join(', '));
    } else {
      console.log(`Table ${tableName} is empty, but query succeeded.`);
      // We can also try inserting to see columns if empty, but let's just see.
    }
  }

  await checkTable('transactions');
  await checkTable('activity_logs');
  await checkTable('user_plans');
  await checkTable('profiles');
}

run();
