import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kpdyklcickeqmybngpea.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZHlrbGNpY2tlcW15Ym5ncGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjQ4MzIsImV4cCI6MjA4NTEwMDgzMn0.MReZzDKwhBnrCng-Bzalqj7t-Mrf7_kZUsoV2JkrI_g';

async function listAdmins() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('admins').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

listAdmins();
