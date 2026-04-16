import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSMSBalance } from '../../../lib/sms';
import NotificationPanel from './NotificationPanel';

interface HeaderProps {
  onLogout: () => void;
  onMenuClick: () => void;
  onNavigate: (section: string) => void;
  adminInfo: any;
}

export default function Header({ onLogout, onMenuClick, onNavigate, adminInfo }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [smsBalance, setSmsBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const userInfo = adminInfo || {
    fullName: 'Admin',
    role: 'Admin',
    email: 'admin@borlawura.gh',
    avatar_url: ''
  };
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    fetchUnreadCount();
    fetchUnreadCount();
    fetchBalance();

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

  const fetchBalance = async () => {
    setLoadingBalance(true);
    const result = await getSMSBalance();
    if (result.success) {
      setSmsBalance(result.balance);
    }
    setLoadingBalance(false);
  };

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    setUnreadCount(count || 0);
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
            className={`flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-[1.25rem] transition-all group ${
              showProfile ? 'bg-slate-100 dark:bg-white/[0.08] ring-1 ring-slate-200 dark:ring-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-105 overflow-hidden ring-2 ring-white dark:ring-slate-900">
                {userInfo.avatar_url ? (
                  <img 
                    src={userInfo.avatar_url} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="relative z-10">{userInfo.fullName.charAt(0)}</span>
                )}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              {/* Online Indicator Dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
            </div>
            
            <div className="hidden lg:block text-left ml-1">
              <p className="text-[11px] font-black text-slate-800 dark:text-white leading-none uppercase tracking-tight">{userInfo.fullName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                 <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-tighter bg-emerald-500/5 px-1 rounded-sm leading-none">{userInfo.role.replace('_', ' ')}</span>
              </div>
            </div>
            <i className={`ri-arrow-down-s-line text-slate-400 text-sm transition-transform duration-300 ${showProfile ? 'rotate-180' : ''}`}></i>
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-[70]" onClick={() => setShowProfile(false)}></div>
              <div className="absolute right-0 mt-4 w-72 bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-white/10 z-[80] overflow-hidden animate-scale-up origin-top-right">
                <div className="p-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.02] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-emerald-500/20 overflow-hidden ring-4 ring-white dark:ring-slate-900">
                    {userInfo.avatar_url ? (
                      <img src={userInfo.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      userInfo.fullName.charAt(0)
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{userInfo.fullName}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 truncate max-w-full italic">{userInfo.email}</p>
                  <div className="mt-4 px-3 py-1 bg-emerald-100/50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                     <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{userInfo.role.replace('_', ' ')}</span>
                  </div>
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
