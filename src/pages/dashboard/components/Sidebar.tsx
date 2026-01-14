interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const menuItems = [
    { id: 'overview', icon: 'ri-dashboard-line', label: 'Overview' },
    { id: 'admins', icon: 'ri-admin-line', label: 'Admin Management' },
    { id: 'riders', icon: 'ri-e-bike-2-line', label: 'Rider Management' },
    { id: 'users', icon: 'ri-user-line', label: 'User Management' },
    { id: 'households', icon: 'ri-home-4-line', label: 'Household Management' },
    { id: 'pickups', icon: 'ri-map-pin-line', label: 'Pickup Operations' },
    { id: 'live-tracking', icon: 'ri-map-2-line', label: 'Live Tracking' },
    { id: 'route-optimization', icon: 'ri-route-line', label: 'Route Optimization' },
    { id: 'financial', icon: 'ri-money-dollar-circle-line', label: 'Financial Management' },
    { id: 'analytics', icon: 'ri-bar-chart-box-line', label: 'Analytics & Reports' },
    { id: 'sms', icon: 'ri-message-3-line', label: 'SMS Management' },
    { id: 'feedback', icon: 'ri-chat-smile-3-line', label: 'Feedback & Ratings' },
    { id: 'settings', icon: 'ri-settings-3-line', label: 'System Settings' },
    { id: 'audit', icon: 'ri-file-list-3-line', label: 'Audit Log' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
            <img 
              src="https://static.readdy.ai/image/f36f7d597113fd33528bc296679291a8/dc15fdc5d53c2e34f7f6945da4837d77.png" 
              alt="Borla Wura Logo" 
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Borla Wura</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap cursor-pointer rounded-lg mb-1 ${
              activeSection === item.id
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className={`${item.icon} text-lg`}></i>
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
            <i className="ri-user-line text-white text-lg"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Admin User</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
