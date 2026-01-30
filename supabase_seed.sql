-- Helper function to generate random phone numbers
CREATE OR REPLACE FUNCTION generate_phone() RETURNS TEXT AS $$
BEGIN
  RETURN '+233' || floor(random() * 900000000 + 100000000)::text;
END;
$$ LANGUAGE plpgsql;

-- 1. Insert Admins
INSERT INTO public.admins (full_name, email, role, status, last_login)
VALUES 
  ('Kwame Nkrumah', 'kwame@borlawura.com', 'Super Admin', 'active', now() - interval '2 hours'),
  ('Ama Ata Aidoo', 'ama@borlawura.com', 'Operations Admin', 'active', now() - interval '5 hours');

-- 2. Insert Riders
INSERT INTO public.riders (id, full_name, phone, email, zone, status, tricycle_number, rating, total_earnings, total_pickups, national_id, address)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Kofi Adu', generate_phone(), 'kofi@borlawura.com', 'Accra Central', 'active', 'GR-1234-24', 4.9, 4890.00, 245, 'GHA-123456789-0', 'Adabraka'),
  ('22222222-2222-2222-2222-222222222222', 'Yaw Boateng', generate_phone(), 'yaw@borlawura.com', 'Osu', 'active', 'GR-5678-24', 4.8, 3960.00, 198, 'GHA-987654321-0', 'Osu RE'),
  ('33333333-3333-3333-3333-333333333333', 'Kwabena Asante', generate_phone(), 'kwabena@borlawura.com', 'Madina', 'active', 'GR-9012-24', 4.7, 3300.00, 165, 'GHA-456123789-0', 'Madina Market');

-- 3. Insert Users
INSERT INTO public.users (id, full_name, phone, email, location, status, subscription_type, total_spent, total_pickups, registration_status)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'Akosua Mensah', generate_phone(), 'akosua@gmail.com', 'Accra Central', 'active', 'subscription', 480.00, 24, 'approved'),
  ('55555555-5555-5555-5555-555555555555', 'Kwame Osei', generate_phone(), 'kwame.o@gmail.com', 'Spintex', 'pending', 'pay-as-you-go', 0.00, 0, 'pending'),
  ('66666666-6666-6666-6666-666666666666', 'Abena Konadu', generate_phone(), 'abena@gmail.com', 'Tema', 'active', 'subscription', 360.00, 18, 'approved');

-- 4. Insert Pickups
INSERT INTO public.pickups (user_id, rider_id, status, location, pickup_time, details, completed_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'completed', 'Accra Central Market', now() - interval '2 days', 'Regular weekly pickup', now() - interval '2 days' + interval '1 hour'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'completed', 'Adabraka', now() - interval '1 weeks', 'Extra waste bag', now() - interval '1 weeks' + interval '2 hour'),
  ('55555555-5555-5555-5555-555555555555', NULL, 'pending', 'Spintex Road', now() + interval '1 day', 'First time pickup request', NULL),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'in-progress', 'Tema Comm 11', now(), 'Urgent pickup', NULL);

-- 5. Insert Payments (Removed)
-- INSERT INTO public.payments (user_id, pickup_id, amount, status)
-- VALUES 
--   ('44444444-4444-4444-4444-444444444444', (SELECT id FROM public.pickups LIMIT 1), 20.00, 'paid'),
--   ('44444444-4444-4444-4444-444444444444', (SELECT id FROM public.pickups OFFSET 1 LIMIT 1), 15.00, 'paid'),
--   ('66666666-6666-6666-6666-666666666666', (SELECT id FROM public.pickups OFFSET 3 LIMIT 1), 25.00, 'pending');

-- 6. Insert SMS Logs
INSERT INTO public.sms_logs (recipient_group, subject, message, status, recipient_count, sent_at)
VALUES 
  ('riders', 'Weekly Bonus', 'Great job this week! Top riders get a bonus.', 'sent', 56, now() - interval '2 days'),
  ('users', 'System Maintenance', 'App will be down for 2 hours tonight.', 'sent', 1200, now() - interval '5 days'),
  ('both', 'Holiday Greetings', 'Happy Independance Day!', 'sent', 1500, now() - interval '1 weeks'),
  ('users', 'Waste Sorting Reminder', 'Please sort your plastics.', 'scheduled', 1250, now() + interval '1 day'),
  ('riders', 'New Zone', 'We are opening Osu zone next week.', 'failed', 45, now() - interval '1 hour');

-- 7. Insert Feedback
INSERT INTO public.feedback (user_id, type, rating, comment, status, created_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'rider', 5, 'Kofi was very polite and efficient.', 'reviewed', now() - interval '2 days'),
  ('66666666-6666-6666-6666-666666666666', 'service', 4, 'Great service but app is a bit slow. Pickup was on time though.', 'new', now() - interval '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'app', 3, 'App crashed twice when trying to make a payment.', 'resolved', now() - interval '1 weeks'),
  ('55555555-5555-5555-5555-555555555555', 'service', 5, 'Love the sustainability focus!', 'new', now() - interval '3 hours'),
  ('66666666-6666-6666-6666-666666666666', 'rider', 2, 'Rider was late and rude.', 'new', now() - interval '5 hours');

-- 8. Insert Audit Logs
INSERT INTO public.audit_logs (user_name, user_role, action, target, target_type, ip_address, device, status, details, changes, created_at)
VALUES 
  ('Admin User', 'Super Admin', 'User Created', 'Kwame Mensah', 'User Account', '192.168.1.100', 'Chrome on Windows', 'Success', 'Created new user account with subscription plan', '{"before": null, "after": {"name": "Kwame Mensah", "status": "Active"}}', now() - interval '2 hours'),
  ('John Doe', 'Admin', 'Pickup Assigned', 'PU-2847', 'Pickup Request', '192.168.1.105', 'Safari on MacOS', 'Success', 'Assigned pickup to rider Kofi Adu', '{"before": {"status": "Pending"}, "after": {"status": "Assigned"}}', now() - interval '5 hours'),
  ('Jane Smith', 'Finance Admin', 'Payment Processed', 'PAY-1523', 'Payment', '192.168.1.120', 'Firefox on Linux', 'Success', 'Processed payment for pickup', NULL, now() - interval '1 day'),
  ('Admin User', 'Super Admin', 'Rider Suspended', 'Yaw Boateng', 'Rider Account', '192.168.1.100', 'Chrome on Windows', 'Success', 'Suspended rider due to rule violation', '{"before": {"status": "Active"}, "after": {"status": "Suspended"}}', now() - interval '3 days'),
  ('System', 'System', 'Automated Backup', 'Full DB', 'System', 'localhost', 'Server', 'Success', 'Daily backup completed', NULL, now() - interval '12 hours');
