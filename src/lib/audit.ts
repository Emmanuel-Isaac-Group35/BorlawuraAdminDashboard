import { supabase } from './supabase';

export const logActivity = async (
  action: string,
  targetType: string,
  targetId: string,
  details: any
) => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
    let adminId = userInfo.id || null;

    // Ensure adminId is a valid UUID or null to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (adminId && !uuidRegex.test(adminId)) {
      console.warn('Invalid Admin ID format:', adminId);
      adminId = null;
    }

    if (!adminId) {
       console.warn('Attempted to log activity without valid admin Context. Action will be logged under SYSTEM.');
    }

    const { error } = await supabase.from('audit_logs').insert([
      {
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details: {
            ...details,
            admin_name: userInfo.fullName,
            timestamp: new Date().toISOString()
        },
        ip_address: '127.0.0.1' // In a real app, you'd fetch this from a service or server
      }
    ]);

    if (error) throw error;
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};
