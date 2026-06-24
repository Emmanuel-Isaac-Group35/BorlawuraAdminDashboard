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

async function seedPricing() {
  // Fetch current
  const { data } = await supabase
    .from('system_settings')
    .select('settings')
    .eq('id', 'global_config')
    .single();
  
  const currentSettings = data?.settings || {};
  const updatedPricing = {
    ...(currentSettings.pricing || {}),
    volume_small: 7,
    volume_medium: 13,
    volume_large: 25
  };
  
  const nextSettings = {
    ...currentSettings,
    pricing: updatedPricing
  };

  const { error } = await supabase
    .from('system_settings')
    .upsert([{
      id: 'global_config',
      settings: nextSettings,
      updated_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Error seeding pricing:', error);
  } else {
    console.log('Successfully seeded default volume pricing in global_config settings:', nextSettings);
  }
}

seedPricing();
