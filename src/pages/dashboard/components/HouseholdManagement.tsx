import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';

interface Household {
  id: string;
  full_name: string;
  phone_number: string;
  location: string;
  subscription_type: string;
  status: string;
  total_pickups: number;
  avatar_url?: string;
}

export default function HouseholdManagement({ adminInfo }: { adminInfo?: any }) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHouseholds();

    const channel = supabase
      .channel('public:households')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchHouseholds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchHouseholds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('registration_status', 'approved') 
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching households:', error);
      } else {
        setHouseholds(data || []);
      }
    } catch (error) {
      console.error('Error in fetchHouseholds:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'active':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'suspended':
        return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      case 'flagged':
        return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'pending':
        return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    }
  };

  const totalHouseholds = households.length;
  const subscriptionCount = households.filter(h => h.subscription_type === 'subscription').length;
  const payAsYouGoCount = households.filter(h => (h.subscription_type || '').toLowerCase().includes('pay')).length;
  const flaggedCount = households.filter(h => h.status === 'flagged').length;

  const filteredHouseholds = households.filter(h => 
    h.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.phone_number || '').includes(searchQuery)
  );

  const handleToggleStatus = async (id: string, currentStatus: string) => {
     const status = (currentStatus || '').toLowerCase().trim();
     const newStatus = status === 'active' ? 'suspended' : 'active';
     const actionText = newStatus === 'suspended' ? 'suspend' : 'reactivate';
     
     if (!window.confirm(`Are you sure you want to ${actionText} this household account?`)) return;

     try {
       const { error } = await supabase
         .from('users')
         .update({ status: newStatus })
         .eq('id', id);

       if (error) throw error;
       
       const actionLabel = newStatus === 'suspended' ? 'Suspended Household Account' : 'Activated Household Account';
       await logActivity(actionLabel, 'users', id, { 
         status: newStatus,
         message: `${actionLabel} for ID #${id.slice(0,8)}`
       });

       fetchHouseholds();
     } catch (err: any) {
       alert('Operation failed: ' + err.message);
     }
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Households</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage your registered households and their accounts</p>
        </div>
        <button 
          onClick={fetchHouseholds}
          className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-[2rem] text-[10px] font-bold uppercase tracking-widest border border-slate-200/60 dark:border-white/10 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <i className="ri-refresh-line"></i>
          Refresh List
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Households', value: totalHouseholds, icon: 'ri-community-line', color: 'emerald' },
          { label: 'Active Service', value: households.filter(h => h.status === 'active').length, icon: 'ri-checkbox-circle-line', color: 'emerald' },
          { label: 'Subscribed', value: subscriptionCount, icon: 'ri-vip-crown-2-line', color: 'emerald' },
          { label: 'Flagged', value: flaggedCount, icon: 'ri-error-warning-line', color: 'rose' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02] flex flex-row sm:flex-col justify-between items-center sm:items-start gap-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-3">{stat.label}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tighter">{stat.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color === 'emerald' ? 'from-emerald-500/10 to-teal-500/5 text-emerald-600' : 'from-rose-500/10 to-pink-500/5 text-rose-600'} flex items-center justify-center text-xl shadow-inner`}>
              <i className={stat.icon}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden min-h-[400px]">
        <div className="px-6 md:px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">Household List</h3>
            <div className="relative group w-full sm:w-auto">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
              <input
                type="text"
                placeholder="Search households..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-12 pr-4 py-3 text-[13px] font-medium border border-slate-200/60 dark:border-white/10 rounded-2xl bg-white dark:bg-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-4 tracking-[0.2em] animate-pulse">Syncing Customer Records...</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                    <th className="px-8 py-5">Household Name</th>
                    <th className="px-8 py-5">Phone Number</th>
                    <th className="px-8 py-5">Area</th>
                    <th className="px-8 py-5">Subscription</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filteredHouseholds.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center text-slate-500 font-bold text-sm shadow-sm group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:text-white transition-all overflow-hidden">
                            {h.avatar_url ? (
                               <img src={h.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : h.full_name.charAt(0)}
                          </div>
                          <span className="text-[13px] font-bold text-slate-900 dark:text-white">{h.full_name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-[13px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-tight">{h.phone_number}</td>
                      <td className="px-8 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">{h.location}</td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                          {h.subscription_type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => handleToggleStatus(h.id, h.status)}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 transition-all shadow-sm ${h.status === 'flagged' ? 'text-emerald-500 hover:border-emerald-200' : 'text-slate-400 hover:text-rose-600 hover:border-rose-200'}`}
                          >
                            <i className={h.status === 'flagged' ? 'ri-checkbox-circle-line text-lg' : 'ri-flag-line text-lg'}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {filteredHouseholds.map((h) => (
                <div key={h.id} className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-emerald-500/20 overflow-hidden">
                        {h.avatar_url ? (
                           <img src={h.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : h.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[150px]">{h.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{h.phone_number}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(h.status)}`}>
                      {h.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Area</p>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{h.location}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Pickups</p>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-white">{h.total_pickups} Complete</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                     <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/5 px-2 py-1 rounded-lg uppercase">{h.subscription_type}</span>
                     <button 
                        onClick={() => handleToggleStatus(h.id, h.status)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-sm ${h.status === 'flagged' ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        <i className={h.status === 'flagged' ? 'ri-checkbox-circle-line text-lg' : 'ri-flag-line text-lg'}></i>
                      </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredHouseholds.length === 0 && (
              <div className="py-24 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                 No customers found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
