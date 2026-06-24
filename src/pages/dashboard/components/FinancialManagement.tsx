import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';
import { logActivity } from '../../../lib/audit';
import { PremiumCard, IconBox, StatusBadge, DesignInput, DesignButton } from './DesignCore';

interface Payment {
  id: string;
  amount: number;
  payment_status: string;
  payment_method: string;
  payment_reference: string | null;
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
  
  // Filtering and searching states
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'hubtel' | 'cash'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedTxn, setSelectedTxn] = useState<Payment | null>(null);
  
  // Analytics Toggle state
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'hubtel' | 'cash'>('all');

  // Dynamic Volume Pricing state
  const [volumePricing, setVolumePricing] = useState({
    small: 7,
    medium: 13,
    large: 25
  });
  const [savingPrices, setSavingPrices] = useState(false);

  // Live Hubtel Settlement Trace state
  const [hubtelTrace, setHubtelTrace] = useState<any>(null);
  const [fetchingTrace, setFetchingTrace] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const rawRole = userInfo.role || 'Admin';
  const roleKey = rawRole.toLowerCase().replace(/\s+/g, '_');
  const isFinanceAdmin = roleKey === 'admin' || roleKey === 'manager' || roleKey === 'finance_admin';

  useEffect(() => {
    fetchFinancials();

    // Setup Supabase Realtime Subscription for real-time status sync
    const channel = supabase
      .channel('public:orders_finance_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchFinancials();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset trace when selected transaction changes
  useEffect(() => {
    setHubtelTrace(null);
    setTraceError(null);
  }, [selectedTxn]);

  const fetchPricing = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'global_config')
        .single();
      if (data?.settings?.pricing) {
        const p = data.settings.pricing;
        setVolumePricing({
          small: p.volume_small ?? 7,
          medium: p.volume_medium ?? 13,
          large: p.volume_large ?? 25
        });
      }
    } catch (e) {
      console.warn('Error fetching global pricing:', e);
    }
  };

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      // Fetch financial transactions directly from the 'orders' table
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('orders')
        .select('*, users:user_id(full_name)')
        .order('created_at', { ascending: false });

      if (paymentsError) console.error('Error fetching transactions:', paymentsError);
      else setPayments((paymentsData as any) || []);

      // Fetch rider payout metrics
      const { data: ridersData, error: ridersError } = await supabase
        .from('riders')
        .select('*')
        .order('total_earnings', { ascending: false });

      if (ridersError) console.error('Error fetching riders:', ridersError);
      else setRiders(ridersData || []);

      // Fetch global volume pricing configurations
      await fetchPricing();
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVolumePricing = async () => {
    setSavingPrices(true);
    try {
      // 1. Fetch current settings to avoid wiping out other config blocks (zones, categories, etc.)
      const { data } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'global_config')
        .single();
      
      const currentSettings = data?.settings || {};
      const updatedPricing = {
        ...(currentSettings.pricing || {}),
        volume_small: volumePricing.small,
        volume_medium: volumePricing.medium,
        volume_large: volumePricing.large
      };
      
      const nextSettings = {
        ...currentSettings,
        pricing: updatedPricing
      };
      
      // 2. Upsert updated payload
      const { error } = await supabase
        .from('system_settings')
        .upsert([{
          id: 'global_config',
          settings: nextSettings,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });

      if (error) throw error;
      
      // 3. Log to Audit log
      await logActivity('Volume Pricing Regulated', 'system_settings', 'global_config', { 
        message: `Volume prices regulated: Small (₵${volumePricing.small}), Medium (₵${volumePricing.medium}), Large (₵${volumePricing.large}).`,
        admin: userInfo.fullName 
      }, userInfo);

      alert('Volume pricing regulations synced and updated successfully!');
    } catch (error: any) {
      console.error('Error saving pricing:', error);
      alert('Pricing sync error: ' + error.message);
    } finally {
      setSavingPrices(false);
    }
  };

  const handleFetchTrace = async (txnId: string) => {
    setFetchingTrace(true);
    setTraceError(null);
    try {
      const { data, error } = await supabase.functions.invoke('hubtel-checkout', {
        body: { action: 'verify', transactionId: txnId }
      });
      if (error) throw error;
      
      if (data?.success && data?.data) {
        // Hubtel returns a standard v2 status block
        const info = data.data.data || data.data;
        setHubtelTrace(info);
      } else {
        throw new Error(data?.error || 'Verification query returned invalid data');
      }
    } catch (err: any) {
      console.error('Trace fetch failed:', err);
      setTraceError(err.message || 'Could not verify payment via Cloud Edge Service.');
    } finally {
      setFetchingTrace(false);
    }
  };

  const calculateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();

    // Absolute totals for paid orders
    const totalHubtelPaid = payments
      .filter(p => p.payment_status === 'paid' && (p.payment_method === 'momo' || p.payment_method === 'card' || p.payment_method === 'hubtel'))
      .reduce((sum, p) => sum + (Number(p.amount_due ?? p.amount) || 0), 0);

    const totalCashPaid = payments
      .filter(p => p.payment_status === 'paid' && p.payment_method === 'cash')
      .reduce((sum, p) => sum + (Number(p.amount_due ?? p.amount) || 0), 0);

    // Filtered elements depending on source selection
    const filteredForStats = payments.filter(p => {
      if (revenueFilter === 'hubtel') return p.payment_method === 'momo' || p.payment_method === 'card' || p.payment_method === 'hubtel';
      if (revenueFilter === 'cash') return p.payment_method === 'cash';
      return true;
    });

    const todayRevenue = filteredForStats
      .filter(p => p.payment_status === 'paid' && p.created_at.startsWith(today))
      .reduce((sum, p) => sum + (Number(p.amount_due ?? p.amount) || 0), 0);

    const monthlyRevenue = filteredForStats
      .filter(p => p.payment_status === 'paid' && new Date(p.created_at).getMonth() === currentMonth)
      .reduce((sum, p) => sum + (Number(p.amount_due ?? p.amount) || 0), 0);

    const pendingPayouts = riders.reduce((sum, r) => sum + (Number(r.total_earnings) || 0), 0);
    const commission = monthlyRevenue * 0.1;

    return { todayRevenue, monthlyRevenue, pendingPayouts, commission, totalHubtelPaid, totalCashPaid };
  };

  const stats = calculateStats();

  const getStatusBadgeType = (status: string): any => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'approved':
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'unpaid':
      case 'failed':
        return 'error';
      default:
        return 'neutral';
    }
  };

  // Filter payments list according to search queries and selector values
  const filteredPayments = payments.filter(txn => {
    const matchesSearch = 
      (txn.users?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.payment_reference || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesMethod = 
      methodFilter === 'all' || 
      txn.payment_method === methodFilter;
      
    const matchesStatus = 
      statusFilter === 'all' || 
      txn.payment_status === statusFilter;
      
    return matchesSearch && matchesMethod && matchesStatus;
  });

  if (!isFinanceAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm mx-4">
        <i className="ri-wallet-line text-6xl text-slate-200 mb-6 font-thin"></i>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Financial Lock Active</h2>
        <p className="text-sm text-slate-500 max-w-sm text-center px-4">Sensitive financial synchronization required. Please contact treasury for access.</p>
      </div>
    );
  }

  const getFilterLabel = () => {
    if (revenueFilter === 'hubtel') return 'Online Only';
    if (revenueFilter === 'cash') return 'Cash Only';
    return 'All Sources';
  };

  const getCardHoverStyle = (color: string) => {
    switch (color) {
      case 'emerald': return 'hover:border-emerald-500/30 dark:hover:border-emerald-500/20';
      case 'amber': return 'hover:border-amber-500/30 dark:hover:border-amber-500/20';
      case 'indigo': return 'hover:border-indigo-500/30 dark:hover:border-indigo-500/20';
      default: return 'hover:border-slate-500/30 dark:hover:border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 font-['Montserrat'] animate-fade-in pb-10 px-1 md:px-0">
      
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Money & Payments</h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Track money coming in, payments to riders, and business profit</p>
        </div>
        <div className="flex items-center gap-4 self-start md:self-auto">
          <ExportButton 
            data={filteredPayments.map(p => ({
              ID: p.id,
              User: p.users?.full_name || 'Customer',
              Amount: p.amount,
              Gateway: p.payment_method === 'hubtel' ? 'Online / Card' : 'Cash/Pay on Completion',
              PaymentStatus: p.payment_status,
              TransactionReference: p.payment_reference || 'N/A',
              Date: new Date(p.created_at).toLocaleString()
            }))}
            fileName="Financial_Report"
            title="Export Report"
          />
        </div>
      </div>

      {/* Segmented Revenue Filter Block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
        <div>
          <h2 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 md:mb-1">Financial Intelligence</h2>
          <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Online Total: <strong className="text-emerald-500 font-black">₵{stats.totalHubtelPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
            <span className="hidden sm:inline text-slate-200 dark:text-slate-800">|</span>
            <span>Cash Total: <strong className="text-emerald-500 font-black">₵{stats.totalCashPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
          </div>
        </div>
        
        {/* Toggle segmented controls - Responsive layout */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl w-full lg:w-auto justify-center lg:justify-start">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'hubtel', label: 'Online / Card' },
            { id: 'cash', label: 'Cash Completion' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setRevenueFilter(item.id as any)}
              className={`flex-1 lg:flex-initial px-4 py-2.5 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${
                revenueFilter === item.id 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistical Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Today's Money", value: `₵${stats.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'emerald', icon: 'ri-funds-box-line', sub: `Calculated today (${getFilterLabel()})` },
          { label: "This Month's Money", value: `₵${stats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'amber', icon: 'ri-line-chart-line', sub: `Total this month (${getFilterLabel()})` },
          { label: 'Money to Riders', value: `₵${stats.pendingPayouts.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'indigo', icon: 'ri-wallet-3-line', sub: 'Pending payments' },
          { label: 'Business Profit', value: `₵${stats.commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'emerald', icon: 'ri-pie-chart-line', sub: `Our 10% share (${getFilterLabel()})` },
        ].map((stat, i) => (
          <div key={i} className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02] group ${getCardHoverStyle(stat.color)}`}>
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <IconBox icon={stat.icon} color={stat.color} />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none mb-3 md:mb-4">{stat.value}</h3>
            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-[8px] md:text-[9px] text-slate-400 font-bold opacity-60 mt-1 md:mt-2 uppercase tracking-tighter">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Listings & Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Payments Card Table */}
        <PremiumCard 
          title="Recent Payments" 
          subtitle="List of payments made by customers"
          className="lg:col-span-2"
          actions={
            <div className="flex h-2 w-2 relative">
               <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
               <div className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></div>
            </div>
          }
        >
          {/* Search & Filter Controls inside listing panel - Professional Layout */}
          <div className="p-6 border-b border-slate-50 dark:border-white/5 flex flex-col lg:flex-row gap-6 items-stretch lg:items-end justify-between bg-slate-50/10">
            <div className="flex-1 w-full lg:max-w-md">
              <DesignInput 
                label="Search Transactions"
                placeholder="Search customer, ID, or payment reference ID..."
                icon="ri-search-line"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full lg:flex lg:w-auto lg:items-end">
              <div className="w-full lg:w-auto space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Payment Method</label>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value as any)}
                  className="w-full lg:w-48 px-5 py-4 bg-slate-50 dark:bg-black/30 border border-transparent focus:border-emerald-500/30 text-sm font-bold uppercase rounded-2xl text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="all">All Methods</option>
                  <option value="hubtel">Online / Card Payments</option>
                  <option value="cash">Cash Payments</option>
                </select>
              </div>

              <div className="w-full lg:w-auto space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Payment Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full lg:w-48 px-5 py-4 bg-slate-50 dark:bg-black/30 border border-transparent focus:border-emerald-500/30 text-sm font-bold uppercase rounded-2xl text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="px-6 md:px-8 py-3 border-b border-slate-50 dark:border-white/5 bg-slate-50/5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Showing {filteredPayments.length} transaction{filteredPayments.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.01] text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-50 dark:border-white/5">
                  <th className="px-6 py-5 text-left font-bold">Customer & Reference</th>
                  <th className="px-6 py-5 text-left font-bold">Amount</th>
                  <th className="px-6 py-5 text-left font-bold">Gateway</th>
                  <th className="px-6 py-5 text-left font-bold">Status</th>
                  <th className="px-6 py-5 text-left font-bold">Date</th>
                  <th className="px-6 py-5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {filteredPayments.map((txn) => (
                  <tr 
                    key={txn.id} 
                    onClick={() => setSelectedTxn(txn)}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group cursor-pointer"
                  >
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-slate-100 dark:border-white/5 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          {txn.users?.full_name?.charAt(0) || 'G'}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white transition-colors">{txn.users?.full_name || 'Guest Participant'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">ID: {txn.id.slice(0, 8)}</span>
                            {txn.payment_reference && (
                              <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold tracking-tight">Ref: {txn.payment_reference.slice(0, 10)}...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-[14px] font-bold text-emerald-600">₵{(txn.amount_due ?? txn.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-6 py-6">
                      <span className="px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest text-[8px] border bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20">
                        {txn.payment_method === 'momo' ? 'Mobile Money' : txn.payment_method === 'card' ? 'Card' : txn.payment_method || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <StatusBadge label={txn.payment_status} type={getStatusBadgeType(txn.payment_status)} />
                    </td>
                    <td className="px-6 py-6 text-left">
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{new Date(txn.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedTxn(txn); }}
                        className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center justify-center transition-all shadow-sm mx-auto mr-0"
                      >
                        <i className="ri-external-link-line text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i className="ri-inbox-2-line text-2xl text-slate-300 dark:text-slate-700"></i>
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">No matching payments found</p>
                      <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Try adjusting your filters or search terms</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Payments View */}
          <div className="md:hidden divide-y divide-slate-50 dark:divide-white/5">
            {filteredPayments.map((txn) => (
              <div 
                key={txn.id} 
                onClick={() => setSelectedTxn(txn)}
                className="p-5 sm:p-6 space-y-4 cursor-pointer hover:bg-slate-50/20 dark:hover:bg-white/[0.01] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                       {txn.users?.full_name?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{txn.users?.full_name || 'Guest Participant'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(txn.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge label={txn.payment_status} type={getStatusBadgeType(txn.payment_status)} />
                    <span className="text-[9px] text-slate-400 font-mono">ID: {txn.id.slice(0, 8)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                   <div className="flex flex-col">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gateway</p>
                      <span className="mt-1">
                        {txn.payment_method === 'hubtel' ? (
                          <span className="px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest text-[8px] border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                            Online / Card
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl font-bold uppercase tracking-widest text-[8px] border bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                            Cash/Completion
                          </span>
                        )}
                      </span>
                   </div>
                   <div className="flex flex-col items-end">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount</p>
                      <p className="text-base font-black text-emerald-600">₵{txn.amount}</p>
                   </div>
                </div>
              </div>
            ))}
            {filteredPayments.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="ri-inbox-2-line text-2xl text-slate-300 dark:text-slate-700"></i>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">No matching payments found</p>
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </PremiumCard>

        {/* Right side panel stacking Staff Payouts & Volume Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 lg:space-y-6 lg:gap-0 self-start">
          
          {/* Staff Payouts Panel */}
          <PremiumCard 
            title="Staff Payouts" 
            subtitle="Performance manifest"
            actions={
              isFinanceAdmin && (
                <button className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:scale-[0.98] transition-all shadow-xl">
                  Pay All
                </button>
              )
            }
          >
            <div className="p-4 md:p-6 space-y-4">
               {riders.map((rider) => (
                  <div key={rider.id} className="p-4 md:p-5 rounded-3xl border border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01] hover:border-emerald-500/30 transition-all group">
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
                         <StatusBadge label="Pending" type="warning" />
                      </div>
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount to Pay</p>
                         <p className="text-lg font-bold text-emerald-600 tracking-tight">₵{rider.total_earnings}</p>
                      </div>
                  </div>
               ))}
               {riders.length === 0 && (
                  <div className="py-12 text-center">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No staff payouts registered</p>
                  </div>
               )}
            </div>
          </PremiumCard>
          
          {/* Volume Pricing Regulator Panel */}
          <PremiumCard
            title="Volume Pricing Regulator"
            subtitle="Regulate resident bag pricing tiers"
          >
            <div className="p-5 md:p-6 space-y-5">
              {[
                { label: 'Small Load (1 – 2 Bags)', key: 'small' },
                { label: 'Medium Load (3 – 5 Bags)', key: 'medium' },
                { label: 'Large Load (6+ Bags / Sacks)', key: 'large' },
              ].map((tier) => (
                <div key={tier.key} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
                    {tier.label}
                  </label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₵</span>
                    <input
                      type="number"
                      value={volumePricing[tier.key as keyof typeof volumePricing]}
                      onChange={(e) => setVolumePricing({
                        ...volumePricing,
                        [tier.key]: Number(e.target.value)
                      })}
                      className="w-full pl-10 pr-5 py-4 bg-slate-50 dark:bg-black rounded-2xl outline-none border border-slate-200 dark:border-white/5 focus:border-emerald-500/30 text-sm font-bold text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                </div>
              ))}
              
              <div className="pt-2">
                <DesignButton
                  onClick={handleUpdateVolumePricing}
                  loading={savingPrices}
                  className="w-full text-xs font-bold uppercase tracking-widest py-3.5"
                >
                  Apply Price Regulations
                </DesignButton>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedTxn(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[3rem] border border-slate-100 dark:border-white/10 shadow-2xl overflow-hidden animate-scale-up max-h-[95vh] overflow-y-auto">
            
            {/* Header */}
            <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.25em]">Transaction Details</h3>
                <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 tracking-widest">Receipt dossier</p>
              </div>
              <button 
                onClick={() => setSelectedTxn(null)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Identity & Status */}
              <div className="flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
                    {selectedTxn.users?.full_name?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{selectedTxn.users?.full_name || 'Guest Participant'}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Customer</p>
                  </div>
                </div>
                <StatusBadge label={selectedTxn.payment_status} type={getStatusBadgeType(selectedTxn.payment_status)} />
              </div>

              {/* Amount Info */}
              <div className="p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-white/5 text-center bg-emerald-50/50 dark:bg-emerald-500/[0.02]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction Amount</p>
                <p className="text-3xl font-black text-emerald-600">₵{Number(selectedTxn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Parameters List */}
              <div className="space-y-4">
                
                {/* Gateway */}
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Payment Method</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedTxn.payment_method === 'hubtel' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  }`}>
                    {selectedTxn.payment_method === 'hubtel' ? 'Online / Card Gateway' : 'Cash / Pay on Completion'}
                  </span>
                </div>

                {/* Gateway Reference ID */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50 dark:border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Gateway Reference ID</span>
                    {selectedTxn.payment_reference && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTxn.payment_reference || '');
                          alert('Copied to clipboard!');
                        }}
                        className="text-[9px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors uppercase tracking-widest flex items-center gap-1"
                      >
                        <i className="ri-file-copy-line"></i> Copy
                      </button>
                    )}
                  </div>
                  <p className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-black/30 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 break-all">
                    {selectedTxn.payment_reference || 'No transaction reference ID (Cash payment)'}
                  </p>
                </div>

                {/* Live Gateway Settlement Trace */}
                {selectedTxn.payment_method === 'hubtel' && selectedTxn.payment_reference && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-50 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.01] p-4 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-indigo-500 dark:text-indigo-400 uppercase text-[9px] tracking-widest flex items-center gap-1">
                        <i className="ri-shield-check-line text-[10px]"></i> Live Payment Verification
                      </span>
                      {!hubtelTrace && !fetchingTrace && (
                        <button
                          onClick={() => handleFetchTrace(selectedTxn.payment_reference!)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          Trace Receipt
                        </button>
                      )}
                    </div>

                    {fetchingTrace && (
                      <div className="py-4 text-center">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Connecting to Secure Payment Gateway...</p>
                      </div>
                    )}

                    {traceError && (
                      <div className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3 rounded-xl font-medium leading-relaxed">
                        <p className="font-bold uppercase tracking-wider mb-1">Trace Interrupted</p>
                        <p className="italic opacity-85">"{traceError}"</p>
                        <p className="mt-2 text-[9px] opacity-75 font-bold">To verify this transaction, you can manually search Transaction ID <span className="font-mono bg-white dark:bg-slate-900 px-1 rounded">{selectedTxn.payment_reference}</span> inside the Payment Gateway Provider Dashboard.</p>
                      </div>
                    )}

                    {hubtelTrace && (
                      <div className="space-y-2 mt-1">
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                          <div className="p-2 bg-white dark:bg-black/35 rounded-xl border border-slate-100 dark:border-white/5">
                            <p className="text-[8px] text-slate-400 uppercase mb-0.5">MoMo / Card Channel</p>
                            <p className="text-slate-800 dark:text-slate-200 truncate uppercase font-black">{hubtelTrace.paymentMethod || hubtelTrace.paymentChannel || 'MoMo Gateway'}</p>
                          </div>
                          <div className="p-2 bg-white dark:bg-black/35 rounded-xl border border-slate-100 dark:border-white/5">
                            <p className="text-[8px] text-slate-400 uppercase mb-0.5">Network Reference ID</p>
                            <p className="text-slate-800 dark:text-slate-200 truncate font-mono">{hubtelTrace.networkTransactionId || hubtelTrace.transactionId || 'N/A'}</p>
                          </div>
                          <div className="p-2 bg-white dark:bg-black/35 rounded-xl border border-slate-100 dark:border-white/5">
                            <p className="text-[8px] text-slate-400 uppercase mb-0.5">Gateway Fees Charged</p>
                            <p className="text-slate-800 dark:text-slate-200">₵{Number(hubtelTrace.charges || hubtelTrace.charge || 0).toFixed(2)}</p>
                          </div>
                          <div className="p-2 bg-white dark:bg-black/35 rounded-xl border border-slate-100 dark:border-white/5">
                            <p className="text-[8px] text-slate-400 uppercase mb-0.5">Settlement Status</p>
                            <p className="text-emerald-500 uppercase font-black">{hubtelTrace.status || 'Success'}</p>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center mt-2 italic opacity-60">Verified via Secure Payment Provider API</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Database Order ID */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50 dark:border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Internal Order ID</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTxn.id);
                        alert('Copied to clipboard!');
                      }}
                      className="text-[9px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors uppercase tracking-widest flex items-center gap-1"
                    >
                      <i className="ri-file-copy-line"></i> Copy
                    </button>
                  </div>
                  <p className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-black/30 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 break-all">
                    {selectedTxn.id}
                  </p>
                </div>

                {/* Transaction Date */}
                <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-50 dark:border-white/5">
                  <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Initiation Timestamp</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(selectedTxn.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-4">
                <DesignButton 
                  onClick={() => setSelectedTxn(null)}
                  variant="secondary"
                  className="w-full text-xs font-bold uppercase tracking-widest py-3.5 rounded-2xl"
                >
                  Dismiss Dossier
                </DesignButton>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
