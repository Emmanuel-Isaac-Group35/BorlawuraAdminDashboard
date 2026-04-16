import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY']; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('get_trigger_def', { trigger_name: 'on_auth_user_created' });
  if (error) {
     console.log('Cant find get_trigger_def');
  }
}
test();
