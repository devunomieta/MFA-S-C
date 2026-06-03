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
  console.log("Testing transaction types against check constraint...");
  const typesToTest = [
    'deposit', 'transfer', 'fee', 'service_charge', 'debit', 'credit', 
    'system_revenue', 'admin_revenue', 'penalty', 'super_invalid_type'
  ];

  for (const t of typesToTest) {
    const { error } = await supabase.from('transactions').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
      amount: 1,
      type: t,
      status: 'completed',
      description: 'test'
    });
    
    if (error && error.message.includes('transactions_type_check')) {
      console.log(`[REJECTED] Type '${t}' is NOT allowed by the constraint.`);
    } else if (error) {
       console.log(`[ALLOWED] Type '${t}' passed type check! (Failed with: ${error.message})`);
    } else {
       console.log(`[ALLOWED] Type '${t}' passed type check and inserted successfully!`);
    }
  }
}

run();
