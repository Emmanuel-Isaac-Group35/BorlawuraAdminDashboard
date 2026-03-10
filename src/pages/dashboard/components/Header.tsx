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
      const savedRole = localStorage.getItem('simulatedRole');

      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('full_name, role')
          .eq('email', user.email)
          .maybeSingle();

        setUserInfo({
          fullName: adminData?.full_name || 'Admin User',
          role: savedRole || adminData?.role || 'Admin',
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
    localStorage.setItem('simulatedRole', role);
    window.location.reload();
  };

  const notifications = [
    { id: 1, title: 'New pickup request', message: 'Kwame Mensah requested pickup', time: '5 mins ago', unread: true, icon: 'ri-map-pin-add-line', color: 'teal' },
    { id: 2, title: 'Rider completed pickup', message: 'Kofi Adu completed PU-2847', time: '15 mins ago', unread: true, icon: 'ri-checkbox-circle-line', color: 'emerald' },
    { id: 3, title: 'Payment received', message: '₵45 payment from Ama Serwaa', time: '1 hour ago', unread: false, icon: 'ri-money-dollar-circle-line', color: 'blue' },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-10 font-['Montserrat']">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden transition-colors"
        >
          <i className="ri-menu-2-line text-xl text-gray-600 dark:text-gray-300"></i>
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent truncate">Admin Dashboard</h2>
          {/* Subtle Role Indicator/Toggler for Admin request */}
          <div className="hidden md:flex gap-2 mt-0.5">
            {['super_admin', 'manager', 'dispatcher'].map((r) => (
              <button
                key={r}
                onClick={() => simulateRole(r)}
                className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  userInfo.role === r ? 'bg-teal-500 text-white' : 'text-gray-400 hover:text-teal-500'
                }`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer group"
        >
          {isDarkMode ? (
            <i className="ri-sun-line text-amber-500 text-xl group-hover:rotate-90 transition-transform duration-300"></i>
          ) : (
            <i className="ri-moon-line text-gray-600 text-xl group-hover:-rotate-12 transition-transform duration-300"></i>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all relative cursor-pointer group"
          >
            <i className="ri-notification-3-line text-gray-600 dark:text-gray-400 text-xl group-hover:scale-110 transition-transform"></i>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-${notif.color}-100 dark:bg-${notif.color}-900/30 flex items-center justify-center flex-shrink-0`}>
                          <i className={`${notif.icon} text-${notif.color}-600 dark:text-${notif.color}-400`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{notif.title}</p>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-teal-500/20">
              {userInfo.fullName.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-gray-900 dark:text-white">{userInfo.fullName}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">{userInfo.role.replace('_', ' ')}</p>
            </div>
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)}></div>
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{userInfo.fullName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{userInfo.email}</p>
                </div>
                <div className="p-2">
                  <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors cursor-pointer font-bold">
                    <i className="ri-logout-box-line"></i>
                    <span>Logout</span>
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
