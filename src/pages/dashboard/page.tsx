import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import AdminManagement from './components/AdminManagement';
import RiderManagement from './components/RiderManagement';
import UserManagement from './components/UserManagement';
import HouseholdManagement from './components/HouseholdManagement';
import PickupOperations from './components/PickupOperations';
import Analytics from './components/Analytics';
import SystemSettings from './components/SystemSettings';
import AuditLog from './components/AuditLog';
import SMSManagement from './components/SMSManagement';
import LiveTracking from './components/LiveTracking';
import RouteOptimization from './components/RouteOptimization';
import FeedbackRatings from './components/FeedbackRatings';
import LogoutDialog from './components/LogoutDialog';
import FinancialManagement from './components/FinancialManagement';
import ProfileView from './components/ProfileView';

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
  icon: string;
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState('Super Admin');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // 1. Listen for new Pickups
    const pickupSub = supabase
      .channel('live_pickups')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pickups' }, () => {
        addToast(`New service request incoming`, 'info', 'ri-truck-line');
      })
      .subscribe();

    // 2. Listen for Audit Logs (Security & System Signals)
    const auditSub = supabase
      .channel('live_audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        const action = payload.new.action || 'System Event';
        const lowerAction = action.toLowerCase();
        const details = payload.new.details?.message || action;

        if (lowerAction.includes('register') || lowerAction.includes('onboard') || lowerAction.includes('provision')) {
           addToast(details, 'success', 'ri-user-add-line');
        } else if (lowerAction.includes('role') || lowerAction.includes('update') || lowerAction.includes('assign')) {
           addToast(details, 'info', 'ri-shield-user-line');
        } else if (lowerAction.includes('delete') || lowerAction.includes('suspend') || lowerAction.includes('remove')) {
           addToast(`Security Alert: ${details}`, 'warning', 'ri-error-warning-line');
        } else {
           addToast(details, 'info', 'ri-notification-3-line');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pickupSub);
      supabase.removeChannel(auditSub);
    };
  }, []);

  const addToast = (message: string, type: Toast['type'], icon: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const renderContent = () => {
    const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
    const rawRole = userInfo.role || 'Admin';
    const roleKey = rawRole.toLowerCase().replace(/\s+/g, '_');
    const isSuperAdmin = roleKey === 'super_admin';

    // Permissions Map (Standardized for Hierarchy)
    const permissions: Record<string, string[]> = {
      overview: ['super_admin', 'admin', 'finance_admin', 'operations_admin', 'manager', 'dispatcher', 'support_admin'],
      admins: ['super_admin'], // Only Super Admin manages staff
      riders: ['super_admin', 'admin', 'operations_admin', 'manager', 'dispatcher'],
      users: ['super_admin', 'admin', 'operations_admin', 'manager', 'support_admin'],
      households: ['super_admin', 'admin', 'operations_admin', 'manager', 'support_admin'],
      pickups: ['super_admin', 'admin', 'operations_admin', 'manager', 'dispatcher'],
      'live-tracking': ['super_admin', 'operations_admin', 'dispatcher'],
      'route-optimization': ['super_admin', 'operations_admin', 'dispatcher'],
      financials: ['super_admin', 'finance_admin', 'manager'],
      analytics: ['super_admin', 'finance_admin', 'manager'],
      sms: ['super_admin', 'operations_admin', 'manager', 'support_admin'],
      feedback: ['super_admin', 'admin', 'manager', 'support_admin'],
      settings: ['super_admin', 'manager'],
      audit: ['super_admin'], // Security logs for Super Admin only
      profile: ['super_admin', 'admin', 'finance_admin', 'operations_admin', 'manager', 'dispatcher', 'support_admin'],
    };

    const isPermitted = isSuperAdmin || (permissions[activeSection] && permissions[activeSection].includes(roleKey));

    if (!isPermitted) {
      return <Overview onNavigate={setActiveSection} />;
    }

    switch (activeSection) {
      case 'overview': return <Overview onNavigate={setActiveSection} />;
      case 'admins': return <AdminManagement />;
      case 'riders': return <RiderManagement />;
      case 'users': return <UserManagement />;
      case 'households': return <HouseholdManagement />;
      case 'pickups': return <PickupOperations />;
      case 'live-tracking': return <LiveTracking />;
      case 'route-optimization': return <RouteOptimization />;
      case 'financials': return <FinancialManagement />;
      case 'analytics': return <Analytics />;
      case 'sms': return <SMSManagement />;
      case 'feedback': return <FeedbackRatings />;
      case 'settings': return <SystemSettings />;
      case 'audit': return <AuditLog />;
      case 'profile': return <ProfileView />;
      default: return <Overview onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0a0c] flex font-['Montserrat']">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={(section) => {
          setActiveSection(section);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-20 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header
          onLogout={() => setShowLogoutDialog(true)}
          onMenuClick={() => setIsSidebarOpen(true)}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth scrollbar-hide">
          <div key={activeSection} className="animate-fade-in max-w-[1400px] mx-auto pb-10">
            {renderContent()}
          </div>
        </main>
      </div>

      <LogoutDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
      />

      {/* Modern Notification System */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl animate-scale-up origin-bottom-right transform transition-all min-w-[320px]`}
          >
             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
               toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
               toast.type === 'warning' ? 'bg-rose-500/10 text-rose-600' :
               'bg-indigo-500/10 text-indigo-600'
             }`}>
                <i className={`${toast.icon} text-xl`}></i>
             </div>
             <div className="flex-1">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Notification</p>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-white leading-tight">{toast.message}</p>
             </div>
             <button 
               onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
               className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors"
             >
                <i className="ri-close-line text-lg"></i>
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}
