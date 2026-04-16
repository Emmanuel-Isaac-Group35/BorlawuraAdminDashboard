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
  const { error: authError } = await supabase.auth.signUp({
    email: 'customer11@example.com',
    password: 'password11',
    options: { data: { phone_number: '1231231233' } }
  });
  console.log("Customer Auth Error:", authError?.message || "SUCCESS");

  const { error: riderError } = await supabase.auth.signUp({
    email: 'rider11@example.com',
    password: 'password11',
    options: { data: { role: 'rider', phone_number: '3333333333' } }
  });
  console.log("Rider Auth Error:", riderError?.message || "SUCCESS");
}
test();
