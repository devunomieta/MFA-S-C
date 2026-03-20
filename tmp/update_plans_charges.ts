import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtwdvgqzampjionqlivw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d2R2Z3F6YW1wamlvbnFsaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDEzODYsImV4cCI6MjA4NTAxNzM4Nn0.PIXKb3z13oLHs34OTQYUmsf_3Yemyu3faO_CGtlPAUU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePlans() {
    console.log('Updating plan service charges...');

    // 1. Daily Drop: 100% of first deposit
    const { error: e1 } = await supabase.from('plans').update({
        service_charge_type: 'percentage',
        service_charge_percentage: 100,
        service_charge_fixed: 0
    }).eq('type', 'daily_drop');

    // 2. Monthly Bloom: Fixed 2000
    const { error: e2 } = await supabase.from('plans').update({
        service_charge_type: 'fixed',
        service_charge_fixed: 2000
    }).eq('type', 'monthly_bloom');

    // 3. Step Up: Tiered
    const { error: e3 } = await supabase.from('plans').update({
        service_charge_type: 'tiered',
        service_charge_tiers: [
            { min: 5000, max: 10000, fee: 200 },
            { min: 15000, max: 20000, fee: 300 },
            { min: 25000, max: 30000, fee: 400 },
            { min: 40000, max: 50000, fee: 500 }
        ]
    }).eq('type', 'step_up');

    // 4. Ajo Circle: Tiered
    const { error: e4 } = await supabase.from('plans').update({
        service_charge_type: 'tiered',
        service_charge_tiers: [
            { min: 10000, max: 14999, fee: 200 },
            { min: 15000, max: 19999, fee: 300 },
            { min: 20000, max: 999999, fee: 500 },
            { min: 1000000, max: 999999999, fee: 1000 }
        ]
    }).eq('type', 'ajo_circle');

    if (e1 || e2 || e3 || e4) {
        console.error('Errors occurred during update:', { e1, e2, e3, e4 });
    } else {
        console.log('Successfully updated all plan service charges.');
    }
}

updatePlans();
