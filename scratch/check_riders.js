import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\r\n').join('\n').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  const key = parts[0];
  const value = parts.slice(1).join('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying riders table...');
  const { data, error } = await supabase.from('riders').select('*').limit(1);
  if (error) {
    console.error('Error fetching riders:', error);
  } else {
    console.log('Sample rider columns:', data[0] ? Object.keys(data[0]) : 'No data, but table exists');
  }
}
check();
