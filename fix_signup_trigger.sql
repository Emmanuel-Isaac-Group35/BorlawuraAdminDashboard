-- BorlaWura Unified Sign-Up Trigger Fix
-- Run this script in the Supabase SQL Editor to resolve the "Database error saving new user" issue.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Provide strict coalescing fallbacks for ALL potentially NOT NULL columns
  IF (NEW.raw_user_meta_data->>'role') = 'rider' THEN
    INSERT INTO public.riders (id, full_name, email, phone_number)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown Rider'), 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'phone_number', '0000000000')
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone_number = EXCLUDED.phone_number;
  ELSE
    INSERT INTO public.users (id, full_name, email, phone_number, role, status, registration_status)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'phone_number', '0000000000'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
      'active',
      'approved'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone_number = EXCLUDED.phone_number,
      role = EXCLUDED.role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is active and pointing to the fixed function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the sync trigger doesn't conflict
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;

NOTIFY pgrst, 'reload schema';
