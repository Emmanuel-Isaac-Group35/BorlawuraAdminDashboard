import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import AdminManagement from './components/AdminManagement';
import RiderManagement from './components/RiderManagement';
import UserManagement from './components/UserManagement';
import HouseholdManagement from './components/HouseholdManagement';
import PickupOperations from './components/PickupOperations';
import FinancialManagement from './components/FinancialManagement';
import Analytics from './components/Analytics';
import SystemSettings from './components/SystemSettings';
import AuditLog from './components/AuditLog';
import SMSManagement from './components/SMSManagement';
import LiveTracking from './components/LiveTracking';
import RouteOptimization from './components/RouteOptimization';
import FeedbackRatings from './components/FeedbackRatings';
import LogoutDialog from './components/LogoutDialog';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    sessionStorage.clear();
    
    // Show success message
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
    toast.innerHTML = `
      <i class="ri-check-line text-lg"></i>
      <span class="font-medium">Logged out successfully</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
      // Redirect to login page or home
      window.location.href = '/';
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
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
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onLogout={() => setShowLogoutDialog(true)} 
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeSection === 'overview' && <Overview onNavigate={setActiveSection} />}
          {activeSection === 'admins' && <AdminManagement />}
          {activeSection === 'riders' && <RiderManagement />}
          {activeSection === 'users' && <UserManagement />}
          {activeSection === 'households' && <HouseholdManagement />}
          {activeSection === 'pickups' && <PickupOperations />}
          {activeSection === 'live-tracking' && <LiveTracking />}
          {activeSection === 'route-optimization' && <RouteOptimization />}
          {activeSection === 'financial' && <FinancialManagement />}
          {activeSection === 'analytics' && <Analytics />}
          {activeSection === 'sms' && <SMSManagement />}
          {activeSection === 'feedback' && <FeedbackRatings />}
          {activeSection === 'settings' && <SystemSettings />}
          {activeSection === 'audit' && <AuditLog />}
        </main>
      </div>

      <LogoutDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
      />
    </div>
  );
}
