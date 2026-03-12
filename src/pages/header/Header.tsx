import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface HeaderProps {
  onLogout: () => void;
  onMenuClick: () => void;
}

export default function Header({ onLogout, onMenuClick }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userInfo, setUserInfo] = useState({
    fullName: 'Admin User',
    role: 'Admin',
    email: 'admin@borlawura.com'
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
  }, []);

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

  const simulateRole = (role: string) => {
    const newProfile = { ...userInfo, role };
    localStorage.setItem('user_profile', JSON.stringify(newProfile));
    localStorage.setItem('simulatedRole', role);
    window.location.reload();
  };

  const notifications = [
    { id: 1, title: 'Pickup Request', message: 'Kwame Mensah requested a pickup', time: '5 mins ago', unread: true, icon: 'ri-map-pin-add-line', color: 'indigo' },
    { id: 2, title: 'Rider Status', message: 'Kofi Adu completed delivery PU-2847', time: '15 mins ago', unread: true, icon: 'ri-checkbox-circle-line', color: 'emerald' },
    { id: 3, title: 'Payment Alert', message: '₵45 received from Ama Serwaa', time: '1 hour ago', unread: false, icon: 'ri-money-dollar-circle-line', color: 'amber' },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="h-[72px] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 font-['Montserrat']">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 md:hidden transition-all"
        >
          <i className="ri-menu-2-line text-lg text-gray-600 dark:text-gray-300"></i>
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
             <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Management Overview</h2>
          </div>
          <div className="hidden md:flex gap-1.5 mt-1">
            {['super_admin', 'manager', 'dispatcher'].map((r) => (
              <button
                key={r}
                onClick={() => simulateRole(r)}
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-all border ${
                  userInfo.role === r 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' 
                  : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Switcher */}
        <button
          onClick={toggleDarkMode}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group"
          title="Toggle Theme"
        >
          {isDarkMode ? (
            <i className="ri-sun-line text-amber-500 text-lg group-hover:rotate-45 transition-transform duration-500"></i>
          ) : (
            <i className="ri-moon-line text-slate-600 text-lg group-hover:-rotate-12 transition-transform duration-500"></i>
          )}
        </button>

        {/* Notifications Center */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-100 transition-all relative group"
          >
            <i className="ri-notification-3-line text-gray-500 dark:text-gray-400 text-lg group-hover:scale-110 transition-transform"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-950 shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute right-0 mt-4 w-80 md:w-96 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800/60 z-20 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800/40 flex justify-between items-center bg-gray-50/30 dark:bg-gray-900/10">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Recent Activity</h3>
                  <button className="text-[10px] text-emerald-500 font-bold hover:underline">Mark all read</button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-900/50">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
                          <i className={`${notif.icon} text-gray-500 dark:text-gray-400`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">{notif.title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">{notif.message}</p>
                          <p className="text-[10px] text-emerald-500 font-medium mt-1.5">{notif.time}</p>
                        </div>
                        {notif.unread && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5"></div>}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full py-3 text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white border-t border-gray-100 dark:border-gray-900/50 transition-colors">See all notifications</button>
              </div>
            </>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>

        {/* User Account */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 pl-1 pr-1 md:pr-3 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-emerald-500/10 transition-transform group-hover:scale-105">
              {userInfo.fullName.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">{userInfo.fullName}</p>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{userInfo.role}</p>
            </div>
            <i className="ri-arrow-down-s-line text-gray-400 group-hover:translate-y-0.5 transition-transform"></i>
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)}></div>
              <div className="absolute right-0 mt-3 w-60 bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800/60 z-20 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800/40 bg-gray-50/20 dark:bg-gray-900/20">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{userInfo.fullName}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{userInfo.email}</p>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-lg transition-all">
                     <i className="ri-user-settings-line text-lg"></i>
                     <span>My Profile</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-lg transition-all">
                     <i className="ri-lock-2-line text-lg"></i>
                     <span>Security Settings</span>
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-gray-900 my-1 mx-2"></div>
                  <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-all">
                    <i className="ri-logout-box-r-line text-lg"></i>
                    <span>Log Out</span>
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
