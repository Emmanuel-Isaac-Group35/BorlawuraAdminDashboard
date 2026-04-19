import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSMSBalance } from '../../../lib/sms';
import { PremiumCard, IconBox, StatusBadge } from './DesignCore';

interface OverviewProps {
  onNavigate?: (section: string) => void;
  adminInfo?: any;
}

export default function Overview({ onNavigate, adminInfo }: OverviewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [recentPickups, setRecentPickups] = useState<any[]>([]);
  const [topRiders, setTopRiders] = useState<any[]>([]);

  const getSessionProfile = () => {
    try {
      const stored = localStorage.getItem('user_profile');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  };

  const userInfo = adminInfo || getSessionProfile();
  const rawRole = userInfo?.role || 'Admin';
  const roleKey = String(rawRole).toLowerCase().trim().replace(/\s+/g, '_');
  const isFullAdmin = roleKey === 'admin';
    
  useEffect(() => {
    fetchDashboardData();

    const ordersChannel = supabase
      .channel('live-dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData(); 
      })
      .subscribe();

    const ridersChannel = supabase
      .channel('live-dashboard-riders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ridersChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const results = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('riders').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount').eq('status', 'paid'),
        supabase.from('feedback').select('*'),
        getSMSBalance(),
        supabase.from('orders').select('*, users(full_name)').order('created_at', { ascending: false }).limit(6),
        supabase.from('riders').select('*').order('total_pickups', { ascending: false }).limit(4)
      ]);

      const [
        { count: userCount },
        { count: riderCount },
        { data: payments },
        { data: feedback },
        smsResult,
        { data: pickupsResult },
        { data: topRiderData }
      ] = results;

      const totalRevenue = payments?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
      const avgRating = feedback?.length ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length).toFixed(1) : '5.0';
      
      let smsDisplayToken = 'N/A';
      if (smsResult?.success) {
        smsDisplayToken = Number(smsResult.balance).toLocaleString();
      }

      const allStats = [
        { id: 1, title: 'Total Residents', value: (userCount || 0).toLocaleString(), icon: 'ri-user-heart-line', color: 'emerald', trend: 'Humans', label: 'Citizens', roles: ['admin', 'manager', 'dispatcher'] },
        { id: 2, title: 'Total Fleet Personnel', value: (riderCount || 0).toLocaleString(), icon: 'ri-e-bike-2-line', color: 'slate', trend: 'Fleet', label: 'Field Staff', roles: ['admin', 'manager', 'dispatcher'] },
        { id: 3, title: 'SMS Balance', value: smsDisplayToken, icon: 'ri-message-3-line', color: 'emerald', trend: 'Units', label: 'Arkesel Ptr', roles: ['admin', 'manager', 'support_admin'] },
        { id: 5, title: 'Satisfaction', value: avgRating, icon: 'ri-star-smile-line', color: 'emerald', trend: 'Avg', label: 'User Rating', roles: ['admin', 'manager', 'support_admin'] },
      ];

      setStats(allStats.filter(s => isFullAdmin || (s.roles && s.roles.includes(roleKey))).slice(0, 4));
      setRecentPickups(pickupsResult || []);
      setTopRiders(topRiderData || []);
    } catch (error) {
      console.error('Dashboard synchronization protocol failure:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeType = (status: string): any => {
    switch (status) {
      case 'requested': return 'warning';
      case 'scheduled': return 'info';
      case 'in_progress': return 'indigo';
      case 'completed': return 'success';
      default: return 'neutral';
    }
  };

  const shortcuts = [
    { id: 'feedback', icon: 'ri-customer-service-2-line', label: 'Support Desk', roles: ['admin', 'support_admin', 'manager'] },
    { id: 'sms', icon: 'ri-chat-voice-line', label: 'SMS', roles: ['admin', 'support_admin', 'manager'] },
    { id: 'pickups', icon: 'ri-map-pin-2-line', label: 'Dispatch', roles: ['admin', 'dispatcher', 'manager'] },
    { id: 'users', icon: 'ri-user-follow-line', label: 'Manage Users', roles: ['admin', 'manager', 'support_admin'] },
  ].filter(s => isFullAdmin || s.roles.includes(roleKey));

  return (
    <div className="space-y-10 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Home</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Operational Summary & Real-time Manifest</p>
        </div>
        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-[1.5rem] shadow-sm shadow-emerald-500/5 transition-all hover:scale-105">
           <div className="flex h-2 w-2 relative">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></div>
           </div>
           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1">Live Database Connection</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-xl group">
            <div className="flex items-center justify-between mb-6">
              <IconBox icon={stat.icon} color={stat.color} />
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em] group-hover:text-emerald-500 transition-colors">Real-time</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter mb-4">{stat.value}</h3>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-black text-emerald-500 uppercase px-2 py-0.5 bg-emerald-500/10 rounded-full">{stat.trend}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase opacity-60 italic">{stat.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <PremiumCard 
          title="Active Missions" 
          subtitle="Real-time order manifest"
          className="lg:col-span-2"
          actions={<button onClick={() => onNavigate?.('pickups')} className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors">Manage All</button>}
        >
          <div className="divide-y divide-slate-50 dark:divide-white/5 mt-4">
             {recentPickups.map((pickup) => (
                <div key={pickup.id} className="px-10 py-6 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                      <i className="ri-truck-line text-lg"></i>
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">
                        {pickup.users?.full_name || pickup.customer_name || 'Anonymous User'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">{pickup.address}</p>
                   </div>
                   <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge label={pickup.status} type={getStatusBadgeType(pickup.status)} />
                      <span className="text-[9px] font-bold text-slate-400">{new Date(pickup.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                </div>
             ))}
             {recentPickups.length === 0 && (
                <div className="py-20 text-center text-[11px] text-gray-400 font-bold uppercase tracking-widest">No recent pickup requests</div>
             )}
          </div>
        </PremiumCard>

        <div className="space-y-8">
          <PremiumCard title="Quick Actions" subtitle="Administrative control panel">
            <div className="p-8 grid grid-cols-2 gap-4">
               {shortcuts.map((action) => (
                  <button 
                    key={action.id}
                    onClick={() => onNavigate?.(action.id)}
                    className="p-5 rounded-3xl border border-gray-50 dark:border-gray-800/40 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all group text-center"
                  >
                     <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-900 group-hover:scale-110 transition-transform`}>
                        <i className={`${action.icon} text-xl text-gray-400 group-hover:text-emerald-500`}></i>
                     </div>
                     <span className="text-[11px] font-bold text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{action.label}</span>
                  </button>
               ))}
            </div>
          </PremiumCard>

          <PremiumCard title="Top Riders" subtitle="Performance manifest">
              <div className="p-8 grid grid-cols-1 gap-4">
                 {topRiders.map((rider) => (
                    <div key={rider.id} className="p-5 rounded-3xl border border-gray-50 dark:border-gray-800/40 bg-gray-50/30 dark:bg-white/[0.01] flex items-center gap-4 group hover:border-emerald-500/30 transition-colors">
                       <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-emerald-500/20">
                          {rider.full_name.charAt(0)}
                       </div>
                       <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{rider.full_name}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                             <span className="text-[10px] font-bold text-emerald-600">{rider.total_pickups} Orders</span>
                             <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                <i className="ri-star-fill text-[8px]"></i> {rider.rating || '5.0'}
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
