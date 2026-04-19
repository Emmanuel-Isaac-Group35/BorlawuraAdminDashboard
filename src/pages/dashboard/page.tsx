import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import LogoutDialog from './components/LogoutDialog';
import FinancialManagement from './components/FinancialManagement';
import ProfileView from './components/ProfileView';
import CMSManagement from './components/CMSManagement';
import SupportDesk from './components/SupportDesk';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
  icon: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  
  const { profile, loading } = useAdminAuth();

  useEffect(() => {
    if (profile) setAdminProfile(profile);
  }, [profile]);

  useEffect(() => {
    // 1. Listen for Orders (New & Status Updates)
    const pickupSub = supabase
      .channel('live_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async () => {
        addToast(`New service request incoming`, 'info', 'ri-truck-line');
        await supabase.from('notifications').insert([{
           type: 'pickup',
           title: 'New Service Request',
           message: 'A resident has requested a waste collection pickup.',
           priority: 'high'
        }]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const status = payload.new.status;
        addToast(`Job status updated to ${status.replace('_', ' ')}`, 'info', 'ri-refresh-line');
      })
      .subscribe();

    // 2. Listen for User Registrations
    const userSub = supabase
      .channel('live_users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, async (payload) => {
        addToast(`New Customer Registered: ${payload.new.full_name}`, 'success', 'ri-user-add-line');
        await supabase.from('notifications').insert([{
           type: 'system',
           title: 'New User Registered',
           message: `A new resident (${payload.new.full_name}) has joined the platform.`,
           priority: 'medium'
        }]);
      })
      .subscribe();

    // 2. Listen for Audit Logs (Security & Notifications)
    const auditSub = supabase
      .channel('live_audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, async (payload) => {
        const action = payload.new.action || 'System Event';
        const lowerAction = action.toLowerCase();
        const details = payload.new.details?.message || action;

        if (lowerAction.includes('register') || lowerAction.includes('onboard') || lowerAction.includes('provision')) {
           addToast(details, 'success', 'ri-user-add-line');
        } else if (lowerAction.includes('role') || lowerAction.includes('update') || lowerAction.includes('assign')) {
           addToast(details, 'info', 'ri-shield-user-line');
        } else if (lowerAction.includes('delete') || lowerAction.includes('suspend') || lowerAction.includes('remove')) {
           addToast(`Security Alert: ${details}`, 'warning', 'ri-error-warning-line');
           await supabase.from('notifications').insert([{
              type: 'alert',
              title: 'Security Protocol Violation',
              message: details,
              priority: 'high'
           }]);
        } else {
           addToast(details, 'info', 'ri-notification-3-line');
        }
      })
      .subscribe();

    // 3. Listen for Current Admin Session Status
    const setupAdminListener = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const adminChannel = supabase
          .channel(`admin-security-${authUser.id}`)
          .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'admins',
              filter: `id=eq.${authUser.id}`
            }, (payload) => {
              const status = payload.new.status || 'active';
              if (status === 'inactive' || status === 'suspended') {
                console.log('Security Alert: Administrative access revoked by system.');
                supabase.auth.signOut().then(() => {
                  navigate('/login');
                });
              }
            })
          .subscribe();
        
        return adminChannel;
      }
      return null;
    };

    let adminChannel: any = null;
    setupAdminListener().then(channel => {
      adminChannel = channel;
    });

    return () => {
      supabase.removeChannel(pickupSub);
      supabase.removeChannel(userSub);
      supabase.removeChannel(auditSub);
      if (adminChannel) supabase.removeChannel(adminChannel);
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
    if (loading) return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-black/20 rounded-[3rem] border border-slate-100 dark:border-white/5 mx-auto max-w-2xl mt-12">
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20"></div>
        <div className="mt-8 text-center">
           <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">BorlaWura Protocol</p>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Synchronizing Global Database...</p>
        </div>
      </div>
    );
    
    try {
      // Priority 1: Real-time Parent Identity. Priority 2: Safe Recovery Fallback
      const activeAdmin = adminProfile || JSON.parse(localStorage.getItem('user_profile') || '{}');
      const rawRole = activeAdmin.role || 'Admin';
      const roleKey = String(rawRole).toLowerCase().trim().replace(/\s+/g, '_');
      const isAdminRole = roleKey === 'admin';
      
      const permissions: Record<string, string[]> = {
        overview: ['admin', 'manager', 'dispatcher', 'finance_admin', 'support_admin'],
        admins: ['admin'],
        users: ['admin', 'manager', 'support_admin'],
        households: ['admin', 'manager', 'support_admin'],
        riders: ['admin', 'manager', 'dispatcher'],
        pickups: ['admin', 'manager', 'dispatcher'],
        'live-tracking': ['admin', 'manager', 'dispatcher'],
        'route-optimization': ['admin', 'dispatcher'],
        financials: ['admin', 'finance_admin', 'manager'],
        analytics: ['admin', 'finance_admin', 'manager'],
        sms: ['admin', 'manager', 'support_admin'],
        feedback: ['admin', 'manager', 'support_admin'],
        settings: ['admin'],
        cms: ['admin', 'manager'],
        audit: ['admin'],
        profile: ['admin', 'finance_admin', 'manager', 'dispatcher', 'support_admin']
      };

      const hasPermission = isAdminRole || (permissions[activeSection] && permissions[activeSection].includes(roleKey));

      if (!hasPermission) {
        return (
          <div className="flex flex-col items-center justify-center p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl animate-fade-in mt-10">
             <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-8">
                <i className="ri-shield-keyhole-line text-4xl"></i>
             </div>
             <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Access Restricted</h3>
             <p className="max-w-md text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed mt-3 uppercase tracking-tighter">Clearance Level ({roleKey.replace('_', ' ')}) Insufficient</p>
             <button onClick={() => setActiveSection('overview')} className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">Emergency Home Override</button>
          </div>
        );
      }

      switch (activeSection) {
        case 'overview': return <Overview onNavigate={setActiveSection} adminInfo={activeAdmin} />;
        case 'admins': return <AdminManagement adminInfo={activeAdmin} />;
        case 'riders': return <RiderManagement adminInfo={activeAdmin} />;
        case 'users': return <UserManagement adminInfo={activeAdmin} />;
        case 'households': return <HouseholdManagement adminInfo={activeAdmin} />;
        case 'pickups': return <PickupOperations adminInfo={activeAdmin} />;
        case 'live-tracking': return <LiveTracking adminInfo={activeAdmin} />;
        case 'route-optimization': return <RouteOptimization adminInfo={activeAdmin} />;
        case 'financials': return <FinancialManagement adminInfo={activeAdmin} />;
        case 'analytics': return <Analytics adminInfo={activeAdmin} />;
        case 'sms': return <SMSManagement adminInfo={activeAdmin} />;
        case 'feedback': return <SupportDesk adminInfo={activeAdmin} />;
        case 'cms': return <CMSManagement adminInfo={activeAdmin} />;
        case 'settings': return <SystemSettings adminInfo={activeAdmin} />;
        case 'audit': return <AuditLog adminInfo={activeAdmin} />;
        case 'profile': return <ProfileView adminInfo={activeAdmin} />;
        default: return <Overview onNavigate={setActiveSection} adminInfo={activeAdmin} />;
      }
    } catch (error) {
       return (
          <div className="flex flex-col items-center justify-center p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl animate-fade-in mt-10">
             <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-8 animate-pulse">
                <i className="ri-error-warning-line text-4xl"></i>
             </div>
             <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">System Protocol Interrupted</h3>
             <p className="max-w-md text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                A localized identity mismatch occurred while initializing this section. This usually happens when administrative permissions are updated mid-session.
             </p>
             <div className="flex gap-4">
                <button 
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all"
                >
                   Repair & Reset Session
                </button>
             </div>
          </div>
       );
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0a0c] flex font-['Montserrat']">
      <Sidebar
        adminInfo={adminProfile}
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
          adminInfo={adminProfile}
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
