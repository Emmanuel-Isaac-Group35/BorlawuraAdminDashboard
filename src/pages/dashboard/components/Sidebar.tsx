import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeSection, setActiveSection, isOpen, onClose }: SidebarProps) {
  const [userInfo, setUserInfo] = useState({
    fullName: 'Admin User',
    role: 'Admin',
    email: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('full_name, role, email')
          .eq('email', user.email)
          .maybeSingle();

        let role = adminData?.role || 'Admin';
        
        setUserInfo({
          fullName: adminData?.full_name || user.user_metadata?.full_name || 'Admin User',
          role: role,
          email: adminData?.email || user.email || ''
        });

        localStorage.setItem('user_profile', JSON.stringify({
           fullName: adminData?.full_name || 'Admin User',
           role: role,
           email: adminData?.email || user.email || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getMenuItems = () => {
    const roleKey = userInfo.role.toLowerCase().replace(/\s+/g, '_');
    
    // Clear and understandable menu names
    const allItems = [
      { id: 'overview', icon: 'ri-dashboard-3-line', label: 'Home', roles: ['super_admin', 'operations_admin', 'finance_admin', 'support_admin', 'admin', 'manager', 'dispatcher', 'Super Admin'], color: 'emerald' },
      { id: 'admins', icon: 'ri-shield-user-line', label: 'Staff', roles: ['super_admin', 'admin', 'Super Admin'], color: 'slate' },
      { id: 'riders', icon: 'ri-bike-line', label: 'Riders', roles: ['super_admin', 'operations_admin', 'admin', 'manager', 'dispatcher', 'Super Admin'], color: 'emerald' },
      { id: 'users', icon: 'ri-group-line', label: 'Users', roles: ['super_admin', 'operations_admin', 'admin', 'manager', 'Super Admin'], color: 'emerald' },
      { id: 'pickups', icon: 'ri-calendar-check-line', label: 'Pickups', roles: ['super_admin', 'operations_admin', 'admin', 'manager', 'dispatcher', 'Super Admin'], color: 'emerald' },
      { id: 'live-tracking', icon: 'ri-map-pin-user-line', label: 'Map', roles: ['super_admin', 'operations_admin', 'admin', 'dispatcher', 'Super Admin'], color: 'emerald' },
      { id: 'financials', icon: 'ri-wallet-3-line', label: 'Money', roles: ['super_admin', 'finance_admin', 'admin', 'manager', 'Super Admin'], color: 'amber' },
      { id: 'analytics', icon: 'ri-bar-chart-box-line', label: 'Reports', roles: ['super_admin', 'finance_admin', 'admin', 'manager', 'Super Admin'], color: 'orange' },
      { id: 'sms', icon: 'ri-chat-bubble-3-line', label: 'SMS', roles: ['super_admin', 'operations_admin', 'admin', 'manager', 'Super Admin'], color: 'emerald' },
      { id: 'feedback', icon: 'ri-star-smile-line', label: 'Feedback', roles: ['super_admin', 'support_admin', 'admin', 'manager', 'Super Admin'], color: 'emerald' },
      { id: 'audit', icon: 'ri-file-shield-2-line', label: 'History', roles: ['super_admin', 'admin', 'Super Admin'], color: 'slate' },
      { id: 'settings', icon: 'ri-settings-5-line', label: 'Settings', roles: ['super_admin', 'admin', 'manager', 'Super Admin'], color: 'gray' },
    ];

    if (roleKey === 'super_admin' || userInfo.role === 'Admin' || userInfo.role === 'Super Admin') return allItems;
    return allItems.filter(item => item.roles.includes(roleKey));
  };

  const menuItems = getMenuItems();

  const getColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) return 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/50';
    
    const colors: Record<string, string> = {
      emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
      indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
      teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
      cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
      violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
      purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
      amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
      orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
      pink: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',
      rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
      slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white',
      gray: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white',
    };
    return colors[color] || colors.emerald;
  };

  const getIconContainerClasses = (color: string, isActive: boolean) => {
    if (!isActive) return 'bg-white dark:bg-slate-900/50 text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm';
    
    const colors: Record<string, string> = {
      emerald: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
      indigo: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
      teal: 'bg-teal-600 text-white shadow-lg shadow-teal-600/30',
      cyan: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30',
      violet: 'bg-violet-600 text-white shadow-lg shadow-violet-600/30',
      purple: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
      amber: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
      orange: 'bg-orange-600 text-white shadow-lg shadow-orange-600/30',
      pink: 'bg-pink-600 text-white shadow-lg shadow-pink-600/30',
      rose: 'bg-rose-600 text-white shadow-lg shadow-rose-600/30',
      slate: 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-lg shadow-slate-900/30',
      gray: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg shadow-slate-900/30',
    };
    return colors[color] || colors.emerald;
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-[#0a0a0c] border-r border-slate-100 dark:border-slate-800/60 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full">
        
        {/* Brand Header */}
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-500/30 flex items-center justify-center">
              <i className="ri-leaf-line text-white text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">BorlaWura</h1>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] block mt-1.5 opacity-80">Admin Area</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100/50 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm border border-slate-50 dark:border-white/5">
                <i className="ri-shield-user-line text-lg"></i>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">{userInfo.fullName}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{userInfo.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5 custom-scrollbar">
          <p className="px-4 text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.25em] mb-4 mt-4">Menu</p>
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full group flex items-center gap-4 px-3 py-2.5 rounded-2xl transition-all relative overflow-hidden font-medium ${getColorClasses(item.color || 'emerald', activeSection === item.id)}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-active:scale-95 ${getIconContainerClasses(item.color || 'emerald', activeSection === item.id)}`}>
                <i className={`${item.icon} text-lg`}></i>
              </div>
              <span className={`text-[13px] font-bold tracking-tight transition-colors ${activeSection === item.id ? '' : 'opacity-80 group-hover:opacity-100 text-slate-600 dark:text-slate-400'}`}>
                {item.label}
              </span>
              {activeSection === item.id && (
                <div className="ml-auto w-1.5 h-6 rounded-full bg-current opacity-20"></div>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
