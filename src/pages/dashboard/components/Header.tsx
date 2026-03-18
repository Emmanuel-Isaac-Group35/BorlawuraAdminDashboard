import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import NotificationPanel from './NotificationPanel';

interface HeaderProps {
  onLogout: () => void;
  onMenuClick: () => void;
  onNavigate: (section: string) => void;
}

export default function Header({ onLogout, onMenuClick, onNavigate }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userInfo, setUserInfo] = useState({
    fullName: 'Super Admin',
    role: 'Super Admin',
    email: 'admin@borlawura.gh'
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    fetchUserProfile();
    fetchUnreadCount();

    // Set up real-time subscription for notification badge
    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const savedProfileStr = localStorage.getItem('user_profile');
      const savedProfile = savedProfileStr ? JSON.parse(savedProfileStr) : null;

      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('full_name, role')
          .eq('email', user.email)
          .maybeSingle();

        setUserInfo({
          fullName: savedProfile?.fullName || adminData?.full_name || 'Admin User',
          role: savedProfile?.role || adminData?.role || 'Admin',
          email: user.email || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <header className="h-[76px] bg-white/70 dark:bg-[#0a0a0c]/80 backdrop-blur-2xl border-b border-slate-100 dark:border-white/10 flex items-center justify-between px-6 md:px-10 sticky top-0 z-[60] font-['Montserrat']">
      <div className="flex items-center gap-6">
        <button
          onClick={onMenuClick}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/10 hover:bg-slate-100 md:hidden transition-all shadow-sm"
        >
          <i className="ri-menu-4-fill text-xl text-slate-700 dark:text-slate-300"></i>
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
             <h2 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight uppercase">BorlaWura Control</h2>
          </div>
          <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Waste Management</p>
        </div>
      </div>

      <div className="flex items-center gap-4">

        {/* Global Action Grid */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm group"
             title="Change Theme"
          >
            {isDarkMode ? (
              <i className="ri-sun-cloudy-line text-amber-500 text-xl group-hover:rotate-12 transition-transform duration-500"></i>
            ) : (
              <i className="ri-moon-clear-line text-indigo-600 text-xl group-hover:-rotate-12 transition-transform duration-500"></i>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all relative group shadow-sm ${
                showNotifications 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <i className="ri-notification-4-line text-xl transition-transform group-active:scale-90"></i>
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-950 shadow-sm animate-pulse"></span>
              )}
            </button>

            <NotificationPanel 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>
        </div>

        <div className="h-8 w-px bg-slate-100 dark:bg-white/10 mx-2"></div>

        {/* Executive Profile Cluster */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className={`flex items-center gap-3.5 pl-1.5 pr-2 py-1.5 rounded-2xl transition-all group ${
              showProfile ? 'bg-slate-50 dark:bg-white/[0.05]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-105 relative overflow-hidden">
               <span className="relative z-10">{userInfo.fullName.charAt(0)}</span>
               <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{userInfo.fullName}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{userInfo.role.replace('_', ' ')}</p>
            </div>
            <i className={`ri-arrow-down-s-line text-slate-400 transition-transform duration-300 ${showProfile ? 'rotate-180' : ''}`}></i>
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-[70]" onClick={() => setShowProfile(false)}></div>
              <div className="absolute right-0 mt-4 w-64 bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/10 z-[80] overflow-hidden animate-scale-up origin-top-right">
                <div className="p-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.02]">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{userInfo.fullName}</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-1">{userInfo.email}</p>
                </div>
                <div className="p-2.5">
                  <button 
                    onClick={() => { setShowProfile(false); onNavigate('profile'); }}
                    className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-2xl transition-all uppercase tracking-widest group"
                  >
                     <i className="ri-user-settings-line text-lg text-slate-400 group-hover:text-emerald-500 transition-colors"></i>
                     <span>My Profile</span>
                  </button>
                  <button 
                    onClick={() => { setShowProfile(false); onNavigate('profile'); }}
                    className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-2xl transition-all uppercase tracking-widest group"
                  >
                     <i className="ri-shield-keyhole-line text-lg text-slate-400 group-hover:text-emerald-500 transition-colors"></i>
                     <span>Security</span>
                   </button>
                  <div className="h-px bg-slate-100 dark:bg-white/5 my-2 mx-4"></div>
                  <button 
                    onClick={() => {
                      setShowProfile(false);
                      onLogout();
                    }} 
                    className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all uppercase tracking-widest group"
                  >
                    <i className="ri-shut-down-line text-lg group-hover:scale-110 transition-transform"></i>
                     <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
