-- Helper function to generate random phone numbers
CREATE OR REPLACE FUNCTION generate_phone() RETURNS TEXT AS $$
BEGIN
  RETURN '+233' || floor(random() * 900000000 + 100000000)::text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- NOTE: This seed file is for DEVELOPMENT / TESTING ONLY.
-- The actual riders table is now populated by the Rider Mobile App
-- via Supabase Auth + the profiles/riders tables directly.
-- Run this only if you need sample data in your local/dev environment.
-- ============================================================

-- 1. Insert Admins
-- (These are demo admin accounts for the dashboard login)
INSERT INTO public.admins (full_name, email, role, status, last_login)
VALUES 
  ('Kwame Nkrumah', 'kwame@borlawura.com', 'Super Admin', 'active', now() - interval '2 hours'),
  ('Ama Ata Aidoo', 'ama@borlawura.com', 'Operations Admin', 'active', now() - interval '5 hours')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Riders
-- Schema: id, full_name, phone_number, email, vehicle_type, vehicle_number,
--         status, rating, total_earnings, total_pickups, latitude, longitude, created_at
INSERT INTO public.riders (id, full_name, phone_number, email, vehicle_type, vehicle_number, status, rating, total_earnings, total_pickups)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Kofi Adu', generate_phone(), 'kofi@borlawura.com', 'Tricycle', 'GR-1234-24', 'active', 4.9, 4890.00, 245),
  ('22222222-2222-2222-2222-222222222222', 'Yaw Boateng', generate_phone(), 'yaw@borlawura.com', 'Tricycle', 'GR-5678-24', 'active', 4.8, 3960.00, 198),
  ('33333333-3333-3333-3333-333333333333', 'Kwabena Asante', generate_phone(), 'kwabena@borlawura.com', 'Tricycle', 'GR-9012-24', 'active', 4.7, 3300.00, 165)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Users (End Customers)
-- Schema: id, full_name, phone_number, email, address, location,
--         subscription_type, registration_status, status, balance, role, created_at
INSERT INTO public.users (id, full_name, phone_number, email, address, location, status, subscription_type, registration_status, balance)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'Akosua Mensah', generate_phone(), 'akosua@gmail.com', 'Osu, Accra', 'Accra Central', 'active', 'subscription', 'approved', 480.00),
  ('55555555-5555-5555-5555-555555555555', 'Kwame Osei', generate_phone(), 'kwame.o@gmail.com', 'Spintex Road, Accra', 'Spintex', 'active', 'pay-as-you-go', 'pending', 0.00),
  ('66666666-6666-6666-6666-666666666666', 'Abena Konadu', generate_phone(), 'abena@gmail.com', 'Tema Community 11', 'Tema', 'active', 'subscription', 'approved', 360.00)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Pickups
-- Schema: id, user_id, rider_id, status, pickup_time, location (JSONB), address, waste_type, waste_size, details, created_at, completed_at
-- NOTE: status CHECK IN ('requested', 'scheduled', 'in_progress', 'completed', 'cancelled')
INSERT INTO public.pickups (user_id, rider_id, status, address, waste_type, details, pickup_time, completed_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'completed', 'Accra Central Market', 'General Waste', 'Regular weekly pickup', now() - interval '2 days', now() - interval '2 days' + interval '1 hour'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'completed', 'Adabraka, Accra', 'Recyclables', 'Extra waste bag', now() - interval '1 week', now() - interval '1 week' + interval '2 hours'),
  ('55555555-5555-5555-5555-555555555555', NULL, 'requested', 'Spintex Road, Accra', 'General Waste', 'First time pickup request', now() + interval '1 day', NULL),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'in_progress', 'Tema Comm 11', 'Organic Waste', 'Urgent pickup', now(), NULL);

-- 5. Insert SMS Logs
-- Schema: id, recipient, sender_name, message, status, created_at
INSERT INTO public.sms_logs (recipient, sender_name, message, status)
VALUES 
  ('All Riders', 'BORLAWURA', 'Great job this week! Top riders get a bonus.', 'sent'),
  ('All Users', 'BORLAWURA', 'App will be down for 2 hours tonight for maintenance.', 'sent'),
  ('All', 'BORLAWURA', 'Happy Independence Day from the BorlaWura team!', 'sent'),
  ('All Users', 'BORLAWURA', 'Please sort your plastics before your next pickup.', 'pending'),
  ('All Riders', 'BORLAWURA', 'We are opening Osu zone next week. Stay tuned!', 'failed');

-- 6. Insert Feedback
-- Schema: id, user_id, type, rating, comment, status, created_at
-- NOTE: status CHECK IN ('pending', 'reviewed', 'resolved')
INSERT INTO public.feedback (user_id, type, rating, comment, status, created_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'rider', 5, 'Kofi was very polite and efficient. Highly recommend!', 'reviewed', now() - interval '2 days'),
  ('66666666-6666-6666-6666-666666666666', 'service', 4, 'Great service but app is a bit slow. Pickup was on time though.', 'pending', now() - interval '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'app', 3, 'App crashed twice when trying to make a payment.', 'resolved', now() - interval '1 week'),
  ('55555555-5555-5555-5555-555555555555', 'service', 5, 'Love the sustainability focus!', 'pending', now() - interval '3 hours'),
  ('66666666-6666-6666-6666-666666666666', 'rider', 2, 'Rider was late and rude.', 'pending', now() - interval '5 hours');

-- 7. Insert Audit Logs
-- Schema: id, admin_id (FK to admins), action, target_type, target_id, ip_address, details (JSONB), created_at
INSERT INTO public.audit_logs (action, target_type, target_id, ip_address, details, created_at)
VALUES 
  ('User Created', 'User Account', '44444444-4444-4444-4444-444444444444', '192.168.1.100', '{"message": "Created new user account with subscription plan", "user": "Akosua Mensah"}', now() - interval '2 hours'),
  ('Pickup Assigned', 'Pickup Request', '1', '192.168.1.105', '{"message": "Assigned pickup to rider Kofi Adu", "status_change": "pending -> assigned"}', now() - interval '5 hours'),
  ('Payment Processed', 'Payment', 'PAY-1523', '192.168.1.120', '{"message": "Processed payment for pickup"}', now() - interval '1 day'),
  ('Rider Suspended', 'Rider Account', '22222222-2222-2222-2222-222222222222', '192.168.1.100', '{"message": "Suspended rider due to rule violation", "rider": "Yaw Boateng"}', now() - interval '3 days'),
  ('Automated Backup', 'System', 'full-db', 'localhost', '{"message": "Daily backup completed successfully"}', now() - interval '12 hours');
