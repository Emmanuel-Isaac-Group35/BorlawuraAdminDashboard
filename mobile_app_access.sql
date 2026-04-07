-- BorneoWura Mobile App Access & Security Script
-- This script enables precise RLS for Rider and User mobile applications.

-- 1. Enable RLS on core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. USER APP ACCESS (Customers)
-- Users can see and update their own profile
DROP POLICY IF EXISTS "Self User Access" ON public.users;
CREATE POLICY "Self User Access" ON public.users FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Users can create pickups (Orders)
DROP POLICY IF EXISTS "User Pickup Creation" ON public.pickups;
CREATE POLICY "User Pickup Creation" ON public.pickups FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can see their own pickups
DROP POLICY IF EXISTS "User Self View Pickups" ON public.pickups;
CREATE POLICY "User Self View Pickups" ON public.pickups FOR SELECT 
USING (auth.uid() = user_id);

-- 3. RIDER APP ACCESS (Fleet Staff)
-- Riders can see and update their own fleet record
DROP POLICY IF EXISTS "Self Rider Access" ON public.riders;
CREATE POLICY "Self Rider Access" ON public.riders FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Riders can see ALL 'requested' pickups (to claim them) OR pickups assigned to them
DROP POLICY IF EXISTS "Rider Pickup View" ON public.pickups;
CREATE POLICY "Rider Pickup View" ON public.pickups FOR SELECT 
USING (status = 'requested' OR auth.uid() = rider_id);

-- Riders can UPDATE pickups assigned to them (change status, add details)
DROP POLICY IF EXISTS "Rider Pickup UpdateSelf" ON public.pickups;
CREATE POLICY "Rider Pickup UpdateSelf" ON public.pickups FOR UPDATE 
USING (auth.uid() = rider_id) 
WITH CHECK (auth.uid() = rider_id);

-- 4. PUBLIC DATA (Optional: Allow riders to see public users if needed for contact)
-- For now, keep it restricted.

-- 5. ADMIN OVERRIDE (Already handled in setup, but we add it again for safety)
-- This ensures the Admin Dashboard you are using still works!
DROP POLICY IF EXISTS "Admin absolute access on users" ON public.users;
CREATE POLICY "Admin absolute access on users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin absolute access on riders" ON public.riders;
CREATE POLICY "Admin absolute access on riders" ON public.riders FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin absolute access on pickups" ON public.pickups;
CREATE POLICY "Admin absolute access on pickups" ON public.pickups FOR ALL USING (true);

-- 6. Trigger: Auto-Provision public record on Auth Signup
-- This ensures that when a user signs up using Auth, a record is automatically created in public.users or public.riders.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'rider' THEN
    INSERT INTO public.riders (id, full_name, email, phone_number)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone_number');
  ELSE
    INSERT INTO public.users (id, full_name, email, phone_number)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone_number');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Force Refresh
NOTIFY pgrst, 'reload schema';
