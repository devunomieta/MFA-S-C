
import { createClient } from '@supabase/supabase-js';

// Load from .env file manually or just paste key for debug session
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vtwdvgqzampjionqlivw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d2R2Z3F6YW1wamlvbnFsaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDEzODYsImV4cCI6MjA4NTAxNzM4Nn0.PIXKb3z13oLHs34OTQYUmsf_3Yemyu3faO_CGtlPAUU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Attempting to fetch transactions as ANON...");

    const { data, error } = await supabase
        .from('transactions')
        .select('*, profile:profiles(full_name, email, phone), plan:plans(name)')
        .limit(1);

    if (error) {
        console.error("FATAL ERROR (Query Structure?):", JSON.stringify(error, null, 2));
    } else {
        console.log("Success (Data might be empty):", data);
    }
}

testFetch();
