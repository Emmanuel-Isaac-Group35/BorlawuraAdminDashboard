const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract supabase URL and Key from a file or just try to find them
// Usually they are in src/lib/supabase.ts
const supabaseFile = fs.readFileSync('c:/BorlaWura_Project/BorlawuraAdminDashboard/src/lib/supabase.ts', 'utf8');
const urlMatch = supabaseFile.match(/const supabaseUrl = ['"](.*)['"]/);
const keyMatch = supabaseFile.match(/const supabaseKey = ['"](.*)['"]/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[2]);
  
  async function listAdmins() {
    const { data, error } = await supabase.from('admins').select('*');
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Admins:', JSON.stringify(data, null, 2));
    }
  }
  
  listAdmins();
} else {
  console.error('Could not find Supabase credentials');
}
