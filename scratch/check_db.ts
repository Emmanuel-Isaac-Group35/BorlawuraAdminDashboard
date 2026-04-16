import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
    const { data, error } = await supabase.from('system_settings').select('*').limit(1);
    if (error) {
        console.error('Error fetching system_settings:', error.message);
    } else {
        console.log('System settings table exists:', data);
    }
}

checkTable();
