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
  const formData = {
    full_name: 'Test Member',
    phone_number: '0123456789',
    email: 'testx@example.com',
    address: 'test',
    location: 'Accra Central',
    balance: 0,
    role: 'customer',
    subscription_type: 'pay-as-you-go',
    avatar_url: ''
  };

  const { data, error } = await supabase
    .from('users')
    .insert([{
      ...formData,
      status: 'active'
    }])
    .select();

  if (error) {
    console.log("ERROR MESSAGE:", error.message);
    console.log("DETAILS:", error.details);
    console.log("HINT:", error.hint);
  } else {
    console.log("SUCCESS:", data);
  }
}
test();
