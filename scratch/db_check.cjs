
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient("https://kpdyklcickeqmybngpea.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZHlrbGNpY2tlcW15Ym5ncGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjQ4MzIsImV4cCI6MjA4NTEwMDgzMn0.MReZzDKwhBnrCng-Bzalqj7t-Mrf7_kZUsoV2JkrI_g");

async function check() {
  console.log('--- Checking CMS Config v3 ---');
  const { data: cms } = await supabase.from('system_settings').select('*').eq('id', 'cms_config_v3').single();
  console.log('V3 Settings:', JSON.stringify(cms?.settings, null, 2));

  console.log('--- Checking Global Config ---');
  const { data: global } = await supabase.from('system_settings').select('*').eq('id', 'global_config').single();
  console.log('Global Settings MobileApp:', JSON.stringify(global?.settings?.mobileApp, null, 2));
}

check();
