import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Household {
  id: string;
  full_name: string;
  phone: string;
  location: string;
  subscription_type: string;
  status: string;
  total_pickups: number;
}

export default function HouseholdManagement() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHouseholds();
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
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'flagged':
        return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
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
    (h.phone || '').includes(searchQuery)
  );

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Households', value: totalHouseholds, icon: 'ri-community-line', color: 'emerald' },
          { label: 'Active Households', value: households.filter(h => h.status === 'active').length, icon: 'ri-checkbox-circle-line', color: 'emerald' },
          { label: 'Subscribed', value: subscriptionCount, icon: 'ri-vip-crown-2-line', color: 'emerald' },
          { label: 'Flagged', value: flaggedCount, icon: 'ri-error-warning-line', color: 'rose' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600 shadow-inner`}>
                <i className={`${stat.icon} text-lg`}></i>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">Household List</h3>
            <div className="relative group">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
              <input
                type="text"
                placeholder="Search households..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-2.5 text-[13px] font-medium border border-slate-200/60 dark:border-white/10 rounded-2xl bg-white dark:bg-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all w-64"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                <th className="px-8 py-5">Household Name</th>
                <th className="px-8 py-5">Phone Number</th>
                <th className="px-8 py-5">Area</th>
                <th className="px-8 py-5">Subscription</th>
                <th className="px-8 py-5">Pickups</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-4 tracking-widest">Loading...</p>
                  </td>
                </tr>
              ) : filteredHouseholds.map((household) => (
                <tr key={household.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        {household.full_name.charAt(0)}
                      </div>
                      <span className="text-[13px] font-bold text-slate-900 dark:text-white">{household.full_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-[13px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-tight">{household.phone}</td>
                  <td className="px-8 py-6 whitespace-nowrap text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">{household.location}</td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                      {household.subscription_type}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-[11px] font-bold text-slate-900 dark:text-white">{household.total_pickups} LOGS</td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border ${getStatusStyle(household.status)}`}>
                      {household.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                        <i className="ri-folder-user-line text-lg"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHouseholds.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-24 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                     No household records identified
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
