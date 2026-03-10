import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kpdyklcickeqmybngpea.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZHlrbGNpY2tlcW15Ym5ncGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjQ4MzIsImV4cCI6MjA4NTEwMDgzMn0.MReZzDKwhBnrCng-Bzalqj7t-Mrf7_kZUsoV2JkrI_g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllData() {
  console.log('--- Clearing Borla Wura Database ---');
  
  const tables = [
    'audit_logs',
    'sms_logs',
    'feedback',
    'pickups',
    'users',
    'riders',
    'admins'
  ];

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error(`Error clearing ${table}:`, error.message);
    } else {
      console.log(`Successfully cleared ${table}`);
    }
  }

  console.log('--- Database cleanup complete ---');
}

clearAllData();
