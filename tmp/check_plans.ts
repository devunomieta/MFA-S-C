import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkPlans() {
    const { data, error } = await supabase.from('plans').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log('--- PLANS DATA ---');
    data.forEach(p => {
        console.log(`Plan: ${p.name}`);
        console.log(`  Type: ${p.type}`);
        console.log(`  Service Charge Type: ${p.service_charge_type}`);
        console.log(`  Service Charge (legacy): ${p.service_charge}`);
        console.log(`  Service Charge Fixed: ${p.service_charge_fixed}`);
        console.log(`  Service Charge Percentage: ${p.service_charge_percentage}`);
        console.log(`  Service Charge Tiers: ${JSON.stringify(p.service_charge_tiers)}`);
        console.log('------------------');
    });
}

checkPlans();
