-- Enhanced Role Synchronization Trigger
-- This handles syncing users to both 'admins' and 'riders' tables when roles change

-- First, ensure phone_number column exists in admins (from previous script, but safe to repeat)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE OR REPLACE FUNCTION public.sync_user_to_staff()
RETURNS TRIGGER AS $$
BEGIN
    -- If promoted to an Admin/Staff role
    IF NEW.role IN ('super_admin', 'manager', 'finance_admin', 'dispatcher', 'support_admin', 'admin') THEN
        INSERT INTO public.admins (email, full_name, role, status, phone_number)
        VALUES (NEW.email, NEW.full_name, NEW.role, 'active', NEW.phone_number)
        ON CONFLICT (email) 
        DO UPDATE SET 
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            phone_number = EXCLUDED.phone_number,
            status = 'active';
            
    -- If promoted to a Rider role
    ELSIF NEW.role = 'rider' THEN
        INSERT INTO public.riders (email, full_name, phone_number, status)
        VALUES (NEW.email, NEW.full_name, NEW.phone_number, 'active')
        ON CONFLICT (email) 
        DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            phone_number = EXCLUDED.phone_number,
            status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger to use the enhanced function
DROP TRIGGER IF EXISTS on_user_role_updated ON public.users;
CREATE TRIGGER on_user_role_updated
    AFTER UPDATE OF role ON public.users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.sync_user_to_staff();
