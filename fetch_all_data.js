import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function getEnv(key) {
  const content = fs.readFileSync('.env', 'utf8');
  const lines = content.split('\n');
  const line = lines.find(l => l.startsWith(key + '='));
  return line ? line.split('=')[1].trim() : null;
}

console.log('Script started...');
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllData() {
  const tables = [
    'admins',
    'riders',
    'users',
    'pickups',
    'payments',
    'sms_logs',
    'feedback',
    'audit_logs'
  ];

  const allData = {};

  for (const table of tables) {
    console.log(`Fetching from ${table}...`);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.error(`Error fetching ${table}:`, error.message);
        allData[table] = { error: error.message };
      } else {
        allData[table] = data;
        console.log(`Successfully fetched ${data.length} rows from ${table}`);
      }
    } catch (err) {
      console.error(`Exception fetching ${table}:`, err.message);
      allData[table] = { error: err.message };
    }
  }

  fs.writeFileSync('all_db_data.json', JSON.stringify(allData, null, 2));
  console.log('Data saved to all_db_data.json');
}

fetchAllData();
