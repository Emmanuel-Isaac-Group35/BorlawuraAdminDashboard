-- BorneoWura Database Security Update: Enforce Rider & User Suspension RLS
-- This script prevents suspended riders and users from retrieving profiles or interacting with pickups.

-- 1. Tighten RLS for public.riders
-- Only allow access if the authenticated rider's status is 'active' (not suspended)
DROP POLICY IF EXISTS "Self Rider Access" ON public.riders;
CREATE POLICY "Self Rider Access" ON public.riders FOR ALL 
USING (auth.uid() = id AND status = 'active') 
WITH CHECK (auth.uid() = id AND status = 'active');

-- 2. Tighten RLS for public.users
-- Only allow access if the authenticated user's status is 'active' (not suspended)
DROP POLICY IF EXISTS "Self User Access" ON public.users;
CREATE POLICY "Self User Access" ON public.users FOR ALL 
USING (auth.uid() = id AND status = 'active') 
WITH CHECK (auth.uid() = id AND status = 'active');

-- 3. Tighten RLS for public.pickups view for riders
-- Riders can only see requested/assigned pickups if they are active (not suspended)
DROP POLICY IF EXISTS "Rider Pickup View" ON public.pickups;
CREATE POLICY "Rider Pickup View" ON public.pickups FOR SELECT 
USING (
  (status = 'requested' OR auth.uid() = rider_id) 
  AND EXISTS (
    SELECT 1 FROM public.riders WHERE id = auth.uid() AND status = 'active'
  )
);

-- 4. Tighten RLS for public.pickups update for riders
-- Riders can only update pickups assigned to them if they are active (not suspended)
DROP POLICY IF EXISTS "Rider Pickup UpdateSelf" ON public.pickups;
CREATE POLICY "Rider Pickup UpdateSelf" ON public.pickups FOR UPDATE 
USING (
  auth.uid() = rider_id 
  AND EXISTS (
    SELECT 1 FROM public.riders WHERE id = auth.uid() AND status = 'active'
  )
) 
WITH CHECK (
  auth.uid() = rider_id 
  AND EXISTS (
    SELECT 1 FROM public.riders WHERE id = auth.uid() AND status = 'active'
  )
);

-- 5. Broadcast Schema Cache Reload to PostgREST
NOTIFY pgrst, 'reload schema';
