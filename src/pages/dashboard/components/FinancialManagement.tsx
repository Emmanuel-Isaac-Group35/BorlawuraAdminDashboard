import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  users?: {
    full_name: string;
  };
}

interface Rider {
  id: string;
  full_name: string;
  total_earnings: number;
  total_pickups: number;
  status: string;
}

interface FinancialManagementProps {
  adminInfo?: any;
}

export default function FinancialManagement({ adminInfo }: FinancialManagementProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();

    const channel = supabase
      .channel('public:payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchFinancials();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false });

      if (paymentsError) console.error('Error fetching payments:', paymentsError);
      else setPayments(paymentsData || []);

      const { data: ridersData, error: ridersError } = await supabase
        .from('riders')
        .select('*')
        .order('total_earnings', { ascending: false });

      if (ridersError) console.error('Error fetching riders:', ridersError);
      else setRiders(ridersData || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();

    const todayRevenue = payments
      .filter(p => p.status === 'paid' && p.created_at.startsWith(today))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const monthlyRevenue = payments
      .filter(p => p.status === 'paid' && new Date(p.created_at).getMonth() === currentMonth)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const pendingPayouts = riders.reduce((sum, r) => sum + (Number(r.total_earnings) || 0), 0);
    const commission = monthlyRevenue * 0.1;

    return { todayRevenue, monthlyRevenue, pendingPayouts, commission };
  };

  const stats = calculateStats();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'approved':
      case 'active':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'pending':
        return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
    }
  };

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const rawRole = userInfo.role || 'Super Admin';
  const roleKey = rawRole.toLowerCase().replace(/\s+/g, '_');
  const isFinanceAdmin = roleKey === 'super_admin' || roleKey === 'manager' || roleKey === 'finance_admin';

  return (
    <div className="space-y-10 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Money & Payments</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Track money coming in, payments to riders, and business profit</p>
        </div>
        <div className="flex items-center gap-4">
          <ExportButton 
            data={payments.map(p => ({
              ID: p.id,
              User: p.users?.full_name || 'Customer',
              Amount: p.amount,
              Status: p.status,
              Date: new Date(p.created_at).toLocaleString()
            }))}
            fileName="Financial_Report"
            title="Recent Payments"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Today's Money", value: `₵${stats.todayRevenue.toLocaleString()}`, color: 'emerald', icon: 'ri-funds-box-line', sub: 'Calculated today' },
          { label: "This Month's Money", value: `₵${stats.monthlyRevenue.toLocaleString()}`, color: 'amber', icon: 'ri-line-chart-line', sub: 'Total this month' },
          { label: 'Money to Riders', value: `₵${stats.pendingPayouts.toLocaleString()}`, color: 'emerald', icon: 'ri-wallet-3-line', sub: 'Pending payments' },
          { label: 'Business Profit', value: `₵${stats.commission.toLocaleString()}`, color: 'emerald', icon: 'ri-pie-chart-line', sub: 'Our 10% share' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-5">
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600`}>
                <i className={`${stat.icon} text-xl`}></i>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Summary</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none mb-4">{stat.value}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-[10px] text-slate-400 font-medium opacity-60 mt-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
          <div className="px-10 py-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">Recent Payments</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">List of payments made by customers</p>
            </div>
            <div className="flex h-2 w-2 relative">
               <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
               <div className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></div>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.01] text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-50 dark:border-white/5">
                  <th className="px-10 py-5 text-left font-bold">Customer</th>
                  <th className="px-10 py-5 text-left font-bold">Amount</th>
                  <th className="px-10 py-5 text-left font-bold">Status</th>
                  <th className="px-10 py-5 text-right font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {payments.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-100 dark:border-white/5">
                          {txn.users?.full_name?.charAt(0) || 'G'}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white transition-colors group-hover:text-emerald-600">{txn.users?.full_name || 'Guest Participant'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">ID: {txn.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-[14px] font-bold text-emerald-600">₵{txn.amount}</p>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${getStatusStyle(txn.status)}`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{new Date(txn.created_at).toLocaleDateString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Payments View */}
          <div className="md:hidden divide-y divide-slate-50 dark:divide-white/5">
            {payments.map((txn) => (
              <div key={txn.id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                       {txn.users?.full_name?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white">{txn.users?.full_name || 'Guest Participant'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(txn.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[9px] font-bold uppercase border ${getStatusStyle(txn.status)}`}>
                    {txn.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Amount</p>
                   <p className="text-lg font-bold text-emerald-600">₵{txn.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-fit">
          <div className="px-10 py-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">Payments to Staff</h3>
            {isFinanceAdmin && (
              <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-[0.98] transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/5">
                Pay All Riders
              </button>
            )}
          </div>
          <div className="p-6 space-y-4">
             {riders.map((rider) => (
                <div key={rider.id} className="p-5 rounded-3xl border border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01] hover:border-emerald-500/30 transition-all group">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
                            {rider.full_name.charAt(0)}
                         </div>
                          <div>
                            <h4 className="text-[12px] font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors uppercase">{rider.full_name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{rider.total_pickups} Pickups</p>
                          </div>
                       </div>
                       <span className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest border ${getStatusStyle('pending')}`}>
                        Pending
                       </span>
                    </div>
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount to Pay</p>
                       <p className="text-lg font-bold text-emerald-600 tracking-tight">₵{rider.total_earnings}</p>
                    </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
