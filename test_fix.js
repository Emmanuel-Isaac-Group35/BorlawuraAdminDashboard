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
  const query = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'rider' THEN
    INSERT INTO public.riders (id, full_name, email, phone_number)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown Rider'), 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'phone_number', '0000000000')
    );
  ELSE
    INSERT INTO public.users (id, full_name, email, phone_number)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Member'), 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'phone_number', '0000000000')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  // We can't execute raw sql easily with supabase-js but we can try using RPC or just rewrite it
  const { data, error } = await supabase.rpc('hello'); // fake
}
test();
