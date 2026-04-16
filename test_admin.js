import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const newAdmin = {
    full_name: 'Test Admin',
    email: 'testadmin2@example.com',
    role: 'dispatcher',
    password: 'password123',
    avatar_url: ''
  };

  const { error: authError } = await supabase.auth.signUp({
    email: newAdmin.email,
    password: newAdmin.password,
    options: { data: { full_name: newAdmin.full_name, role: newAdmin.role, phone_number: '0000000000' } }
  });

  if (authError) {
    console.log("AUTH ERROR:", JSON.stringify(authError, null, 2));
    return;
  }

  const { error: profileError } = await supabase
    .from('admins')
    .insert([{
      full_name: newAdmin.full_name,
      email: newAdmin.email,
      role: newAdmin.role,
      status: 'active',
      avatar_url: newAdmin.avatar_url
    }]);

  if (profileError) {
    console.log("DB ERROR:", profileError.message, profileError.details, profileError.hint);
  } else {
    console.log("SUCCESS");
  }
}
test();
