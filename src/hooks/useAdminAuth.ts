import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminProfile {
  id: string;
  fullName: string;
  role: string;
  email: string;
  avatar_url: string;
}

export function useAdminAuth() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleKey, setRoleKey] = useState<string>('customer');

  const fetchProfile = async () => {
    try {
      // Polymorphic fallback: Load from cache first
      const stored = localStorage.getItem('user_profile');
      if (stored) {
        const p = JSON.parse(stored);
        const adminP = {
          id: p.id || '',
          fullName: p.fullName || p.full_name || 'Super Admin',
          role: p.role || 'Super Admin',
          email: p.email || '',
          avatar_url: p.avatar_url || ''
        };
        setProfile(adminP);
        setRoleKey(adminP.role.toLowerCase().replace(/\s+/g, '_'));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const rawRoleInDb = adminData?.role || user.user_metadata?.role || 'Admin';
      const normalizedRole = String(rawRoleInDb).toLowerCase().includes('super') ? 'admin' : rawRoleInDb;

      const updatedProfile = {
        id: adminData?.id || user.id,
        fullName: adminData?.full_name || user.user_metadata?.full_name || 'Admin',
        role: normalizedRole,
        email: adminData?.email || user.email,
        avatar_url: adminData?.avatar_url || user.user_metadata?.avatar_url || ''
      };

      // Atomic Update: Only commit to state and cache if we have a valid result
      if (updatedProfile.id) {
        setProfile(updatedProfile);
        setRoleKey(String(updatedProfile.role).toLowerCase().replace(/\s+/g, '_'));
        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      }
    } catch (error) {
      console.error('Core Auth Synchronization Protocol Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Live Authority Sync: Listen for remote role/profile changes
    const channel = supabase
      .channel('master-auth-sync')
      .on('postgres_changes', { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'admins' 
      }, (payload) => {
         // If "I" am the one who was updated, force a profile refresh
         const stored = JSON.parse(localStorage.getItem('user_profile') || '{}');
         if (payload.new.id === stored.id || payload.new.email === stored.email) {
            console.log("Remote authority change detected. Synchronizing...");
            fetchProfile();
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { profile, roleKey, loading, refresh: fetchProfile };
}
