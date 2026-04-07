import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function getEnv(key) {
  const content = fs.readFileSync('.env', 'utf8');
  const lines = content.split('\n');
  const line = lines.find(l => l.startsWith(key + '='));
  return line ? line.split('=')[1].trim() : null;
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    // This is a hacky way to check if a table exists since Supabase JS doesn't have a listTables method
    const tablesToCheck = ['users', 'riders', 'pickups', 'orders', 'audit_logs', 'sms_logs', 'admins', 'payments', 'feedback'];
    
    for (const table of tablesToCheck) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table} does NOT exist or is inaccessible: ${error.message}`);
        } else {
            console.log(`Table ${table} EXISTS.`);
        }
    }
}

checkTables();
