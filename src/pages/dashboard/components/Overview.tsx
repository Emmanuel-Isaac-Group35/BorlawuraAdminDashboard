import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSMSBalance } from '../../../lib/sms';

interface OverviewProps {
  onNavigate?: (section: string) => void;
}

export default function Overview({ onNavigate }: OverviewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { id: 1, title: 'Service Pickups', value: '0', icon: 'ri-truck-line', color: 'emerald', trend: '+12%', label: 'Total Volume' },
    { id: 2, title: 'Active Riders', value: '0', icon: 'ri-e-bike-2-line', color: 'slate', trend: 'Live', label: 'Field Personnel' },
    { id: 3, title: 'SMS Credits', value: '0', icon: 'ri-message-3-line', color: 'emerald', trend: 'Units', label: 'Communication' },
    { id: 4, title: 'Total Revenue', value: '₵0.00', icon: 'ri-wallet-3-line', color: 'amber', trend: '+8.4%', label: 'Financial Gain' },
  ]);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [topRiders, setTopRiders] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    
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
      const result = await getSMSBalance();
      if (result.success) {
        setStats(prev => prev.map(stat => 
          stat.title === 'SMS Credits' 
            ? { ...stat, value: Number(result.balance).toLocaleString() } 
            : stat
        ));
      }
    } catch (error) {
      console.error('SMS Balance fetch error:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { count: pickupCount } = await supabase.from('pickups').select('*', { count: 'exact', head: true });
      const { data: riders } = await supabase.from('riders').select('*').eq('status', 'active');
      const { data: users } = await supabase.from('users').select('balance');

      const totalRevenue = users?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

      setStats(prev => prev.map(stat => {
        if (stat.title === 'Service Pickups') return { ...stat, value: (pickupCount || 0).toLocaleString() };
        if (stat.title === 'Active Riders') return { ...stat, value: (riders?.length || 0).toLocaleString() };
        if (stat.title === 'Total Revenue') return { ...stat, value: `₵${(totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}` };
        return stat;
      }));

      const { data: activities } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6);
      if (activities) setRecentActivities(activities);

      const { data: topRiderData } = await supabase.from('riders').select('*').order('total_pickups', { ascending: false }).limit(4);
      if (topRiderData) setTopRiders(topRiderData);
      
      fetchSmsBalance();
    } catch (error) {
      console.error('Dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Synchronizing Data...</p>
        </div>
      </div>
    );
  }

  const statColors: Record<string, string> = {
    emerald: 'from-emerald-600/10 to-emerald-600/5 text-emerald-600 border-emerald-100 dark:border-emerald-500/20',
    slate: 'from-slate-600/10 to-slate-600/5 text-slate-600 border-slate-100 dark:border-slate-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-100 dark:border-amber-500/20',
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Holistic view of platform performance and field operations</p>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl shadow-sm">
           <div className="flex h-2 w-2 relative">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></div>
           </div>
           <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Real-time Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.id} className={`bg-gradient-to-br ${statColors[stat.color]} p-6 rounded-[2rem] border transition-all hover:scale-[1.02] cursor-default group`}>
            <div className="flex items-center justify-between mb-5">
               <div className={`w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center group-hover:rotate-6 transition-transform`}>
                  <i className={`${stat.icon} text-xl`}></i>
               </div>
               <div className="text-right">
                 <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/20 text-current">{stat.trend}</span>
                 <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter mt-1">{stat.label}</p>
               </div>
            </div>
            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest mb-1.5">{stat.title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-800/40 flex justify-between items-center">
                 <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Platform Activity</h2>
                 <button onClick={() => onNavigate?.('audit')} className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors">View Logs</button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
                 {recentActivities.map((activity) => (
                    <div key={activity.id} className="px-8 py-5 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                       <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                          <i className="ri-time-line text-lg"></i>
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">{activity.action}</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-1">{new Date(activity.created_at).toLocaleString()}</p>
                       </div>
                       <span className="text-[10px] font-bold px-3 py-1 bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-full border border-gray-200/50 dark:border-gray-800/50">{activity.ip_address || 'System'}</span>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-800/40 flex justify-between items-center">
                 <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Elite Riders</h2>
                 <button onClick={() => onNavigate?.('riders')} className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors">Full Fleet</button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <i className="ri-star-fill text-[8px]"></i> {rider.rating}
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white dark:bg-gray-950 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/60 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-8">Management Shortcuts</h2>
              <div className="grid grid-cols-2 gap-4">
                 {[
                    { id: 'sms', icon: 'ri-chat-voice-line', label: 'Broadcast', color: 'emerald' },
                    { id: 'pickups', icon: 'ri-map-pin-2-line', label: 'Dispatch', color: 'emerald' },
                    { id: 'users', icon: 'ri-user-follow-line', label: 'User Registry', color: 'emerald' },
                    { id: 'financials', icon: 'ri-line-chart-line', label: 'Balance', color: 'amber' },
                 ].map((action) => (
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
           </div>

           <div className="bg-slate-900 dark:bg-white/5 p-8 rounded-[2.5rem] text-white relative overflow-hidden group">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6 opacity-60">Status Integrity</h2>
              <div className="space-y-4">
                 {[
                   { label: 'Database Node', active: true },
                   { label: 'Cloud Systems', active: true },
                   { label: 'Asset Tracking', active: true },
                 ].map((sys, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold opacity-80">{sys.label}</span>
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <i className="ri-check-line text-xs text-emerald-400"></i>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/5">
                 <div className="flex justify-between items-center mb-2">
                   <p className="text-[10px] font-bold opacity-60 uppercase">Node Reliability</p>
                   <p className="text-[10px] font-bold text-emerald-400">99.8%</p>
                 </div>
                 <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[99.8%] h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 </div>
              </div>
              {/* Background Glow */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] group-hover:bg-emerald-500/20 transition-all"></div>
           </div>
        </div>
      </div>
    </div>
  );
}
