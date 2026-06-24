import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function getEnv(key) {
  const content = fs.readFileSync('.env', 'utf8');
  const lines = content.split('\r').join('').split('\n');
  const line = lines.find(l => l.startsWith(key + '='));
  if (!line) return null;
  let val = line.split('=')[1].trim();
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.substring(1, val.length - 1);
  }
  return val;
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 'global_config')
    .maybeSingle();

  if (error) {
    console.error('Error fetching global_config:', error);
  } else if (!data) {
    console.log('No global_config found in system_settings table.');
  } else {
    console.log('Found settings:', JSON.stringify(data, null, 2));
  }
}

checkSettings();
