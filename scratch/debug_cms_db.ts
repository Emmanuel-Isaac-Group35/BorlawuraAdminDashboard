import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function check() {
  const { data, error } = await supabase.from('system_settings').select('*');
  console.log('--- SYSTEM SETTINGS ROWS ---');
  data?.forEach(row => {
    console.log(`ID: ${row.id} | Last Updated: ${row.updated_at}`);
    if (row.id === 'cms_config_v3') {
        console.log('Banners Count:', row.settings?.user?.banners?.length);
        console.log('Popup Active:', row.settings?.user?.announcement?.enabled);
    }
  });
  if (error) console.error(error);
}

check();
