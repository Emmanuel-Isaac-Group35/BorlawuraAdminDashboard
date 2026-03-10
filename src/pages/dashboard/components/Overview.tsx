import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface OverviewProps {
  onNavigate?: (section: string) => void;
}

export default function Overview({ onNavigate }: OverviewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { id: 1, title: 'Total Pickups', value: '0', icon: 'ri-truck-line', color: 'teal', trend: '+0%' },
    { id: 2, title: 'Active Riders', value: '0', icon: 'ri-steering-2-line', color: 'blue', trend: 'LIVE' },
    { id: 3, title: 'SMS Balance', value: '0', icon: 'ri-message-3-line', color: 'indigo', trend: 'Units' },
    { id: 4, title: 'Total Revenue', value: '₵0.00', icon: 'ri-money-dollar-circle-line', color: 'emerald', trend: '+0%' },
  ]);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [topRiders, setTopRiders] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Real-time subscriptions
    const pickupsChannel = supabase.channel('public:pickups').on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, () => fetchDashboardData()).subscribe();
    const usersChannel = supabase.channel('public:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchDashboardData()).subscribe();
    const ridersChannel = supabase.channel('public:riders').on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => fetchDashboardData()).subscribe();

    return () => {
      supabase.removeChannel(pickupsChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(ridersChannel);
    };
  }, []);

  const fetchSmsBalance = async () => {
    try {
      const apiKey = import.meta.env.VITE_ARKESEL_API_KEY || 'UEJrVktDRnBqeWZpdmxXSG1WbHk';
      const response = await fetch('https://sms.arkesel.com/api/v2/clients/balance', {
        headers: { 'api-key': apiKey }
      });
      if (response.ok) {
        const data = await response.json();
        const balance = data.data?.sms_balance || data.balance || 0;
        setStats(prev => prev.map(stat => stat.title === 'SMS Balance' ? { ...stat, value: Number(balance).toLocaleString() } : stat));
      }
    } catch (error) {
      console.error('SMS Balance fetch error:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Basic Counts
      const { data: pickups } = await supabase.from('pickups').select('*', { count: 'exact' });
      const { data: riders } = await supabase.from('riders').select('*').eq('status', 'active');
      const { data: users } = await supabase.from('users').select('balance');

      const totalRevenue = users?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

      setStats(prev => prev.map(stat => {
        if (stat.title === 'Total Pickups') return { ...stat, value: (pickups?.length || 0).toLocaleString() };
        if (stat.title === 'Active Riders') return { ...stat, value: (riders?.length || 0).toLocaleString() };
        if (stat.title === 'Total Revenue') return { ...stat, value: `₵${(totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}` };
        return stat;
      }));

      // 2. Fetch Recent Activities
      const { data: activities } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6);
      if (activities) setRecentActivities(activities);

      // 3. Fetch Top Riders
      const { data: topRiderData } = await supabase.from('riders').select('*').order('total_pickups', { ascending: false }).limit(4);
      if (topRiderData) setTopRiders(topRiderData);
      
      fetchSmsBalance();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Compiling Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Integrated visibility across all service channels</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
           <span className="flex h-2 w-2 relative mx-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
           </span>
           <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest pr-2">System Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
               <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                  <i className={`${stat.icon} text-2xl`}></i>
               </div>
               <span className={`text-[9px] font-bold px-2 py-1 rounded bg-gray-50 dark:bg-gray-900 text-gray-500`}>{stat.trend}</span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {/* Section 1: Recent Activity */}
           <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                 <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Live Audit Stream</h2>
                 <button onClick={() => onNavigate?.('audit')} className="text-[10px] font-bold text-teal-600 hover:underline">VIEW ALL</button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                 {recentActivities.map((activity) => (
                    <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                       <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400">
                          <i className="ri-history-line text-sm"></i>
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{activity.action}</p>
                          <p className="text-[9px] text-gray-500 uppercase">{new Date(activity.created_at).toLocaleString()}</p>
                       </div>
                       <div className="text-right">
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">{activity.ip_address || 'System'}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Section 2: Top Riders */}
           <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                 <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Fleet Performance</h2>
                 <button onClick={() => onNavigate?.('riders')} className="text-[10px] font-bold text-teal-600 hover:underline">MANAGE FLEET</button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {topRiders.map((rider) => (
                    <div key={rider.id} className="p-4 rounded-xl border border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/30 flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold">
                          {rider.full_name.charAt(0)}
                       </div>
                       <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase truncate">{rider.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-[9px] font-bold text-teal-600">{rider.total_pickups} Trips</span>
                             <span className="text-[9px] font-bold px-1 rounded bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                                <i className="ri-star-fill"></i> {rider.rating}
                             </span>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-6">
           {/* Quick Launch */}
           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">Quick Launch</h2>
              <div className="grid grid-cols-2 gap-4">
                 {[
                    { id: 'sms', icon: 'ri-chat-broadcast-line', label: 'SMS Blast', color: 'teal' },
                    { id: 'riders', icon: 'ri-user-add-line', label: 'Add Rider', color: 'blue' },
                    { id: 'users', icon: 'ri-group-line', label: 'Registry', color: 'indigo' },
                    { id: 'analytics', icon: 'ri-file-chart-line', label: 'Report', color: 'rose' },
                 ].map((action) => (
                    <button 
                      key={action.id}
                      onClick={() => onNavigate?.(action.id)}
                      className="p-4 rounded-xl border border-gray-50 dark:border-gray-700 hover:bg-teal-500 hover:text-white transition-all group text-center"
                    >
                       <i className={`${action.icon} text-2xl mb-2 block text-${action.color}-500 group-hover:text-white transition-colors`}></i>
                       <span className="text-[10px] font-bold uppercase tracking-widest">{action.label}</span>
                    </button>
                 ))}
              </div>
           </div>

           {/* System Health */}
           <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-6 rounded-2xl shadow-lg shadow-teal-500/20 text-white">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 opacity-80">Security Protocol</h2>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">DB Integrity</span>
                    <i className="ri-checkbox-circle-fill text-emerald-300"></i>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Auth Encryption</span>
                    <i className="ri-checkbox-circle-fill text-emerald-300"></i>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Real-time Node</span>
                    <i className="ri-checkbox-circle-fill text-emerald-300"></i>
                 </div>
              </div>
              <div className="mt-8 p-3 bg-white/10 rounded-xl">
                 <p className="text-[10px] font-bold opacity-80 mb-1">NETWORK LATENCY</p>
                 <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-[85%] h-full bg-white rounded-full"></div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
