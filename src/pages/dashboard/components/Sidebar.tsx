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
      const savedRole = localStorage.getItem('simulatedRole');

      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('full_name, role, email')
          .eq('email', user.email)
          .maybeSingle();

        setUserInfo({
          fullName: adminData?.full_name || 'Admin User',
          role: savedRole || adminData?.role || 'Admin',
          email: adminData?.email || user.email || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getMenuItems = () => {
    const allItems = [
      { id: 'overview', icon: 'ri-dashboard-3-line', label: 'Dashboard', roles: ['super_admin', 'manager', 'dispatcher', 'Admin'] },
      { id: 'admins', icon: 'ri-shield-user-line', label: 'Admin Management', roles: ['super_admin'] },
      { id: 'riders', icon: 'ri-e-bike-2-line', label: 'Rider Management', roles: ['super_admin', 'manager', 'dispatcher', 'Admin'] },
      { id: 'users', icon: 'ri-group-line', label: 'User Management', roles: ['super_admin', 'manager', 'Admin'] },
      { id: 'pickups', icon: 'ri-map-pin-line', label: 'Pickup Operations', roles: ['super_admin', 'manager', 'dispatcher', 'Admin'] },
      { id: 'live-tracking', icon: 'ri-radar-line', label: 'Live Tracking', roles: ['super_admin', 'dispatcher', 'Admin'] },
      { id: 'analytics', icon: 'ri-bar-chart-box-line', label: 'Analytics', roles: ['super_admin', 'manager', 'Admin'] },
      { id: 'sms', icon: 'ri-message-3-line', label: 'SMS Management', roles: ['super_admin', 'manager', 'Admin'] },
      { id: 'feedback', icon: 'ri-chat-smile-3-line', label: 'Feedback & Ratings', roles: ['super_admin', 'manager', 'Admin'] },
      { id: 'audit', icon: 'ri-history-line', label: 'Audit Log', roles: ['super_admin', 'Admin'] },
      { id: 'settings', icon: 'ri-settings-4-line', label: 'Settings', roles: ['super_admin', 'manager', 'Admin'] },
    ];
    return allItems.filter(item => item.roles.includes(userInfo.role));
  };

  const menuItems = getMenuItems();

  return (
    <aside className={`fixed md:relative inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-lg transition-transform duration-300 md:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } font-['Montserrat']`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <i className="ri-delete-bin-line text-white text-xl"></i>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">BorlaWura</h1>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-xl ${
                activeSection === item.id
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <i className={`${item.icon} text-lg`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 px-2">
           <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400">
              {userInfo.fullName.charAt(0)}
           </div>
           <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{userInfo.fullName}</p>
              <p className="text-[10px] text-gray-500 uppercase truncate">{userInfo.role.replace('_', ' ')}</p>
           </div>
        </div>
      </div>
    </aside>
  );
}
