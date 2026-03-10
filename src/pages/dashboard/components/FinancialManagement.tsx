import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

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

export default function FinancialManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      // Fetch Payments with User details
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false });

      if (paymentsError) console.error('Error fetching payments:', paymentsError);
      else setPayments(paymentsData || []);

      // Fetch Riders for Payouts view
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

    // Mock pending payouts logic based on earnings
    const pendingPayouts = riders.reduce((sum, r) => sum + (Number(r.total_earnings) || 0), 0);
    const commission = monthlyRevenue * 0.1; // 10% commission

    return { todayRevenue, monthlyRevenue, pendingPayouts, commission };
  };

  const stats = calculateStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'approved':
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage payments, payouts, and financial reports</p>
        </div>
        <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-download-line"></i>
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Today Revenue</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-emerald-600 dark:text-emerald-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">₵{stats.todayRevenue.toLocaleString()}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">+8% from yesterday</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue</span>
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <i className="ri-line-chart-line text-teal-600 dark:text-teal-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">₵{stats.monthlyRevenue.toLocaleString()}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">+12% from last month</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Pending Payouts</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="ri-wallet-line text-amber-600 dark:text-amber-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">₵{stats.pendingPayouts.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{riders.length} riders</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Commission</span>
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <i className="ri-percent-line text-rose-600 dark:text-rose-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">₵{stats.commission.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">10% platform fee</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Party</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{txn.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{txn.users?.full_name || 'Unknown User'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">₵{txn.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Payment</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rider Payouts</h3>
              <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
                Approve All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Rider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Pickups</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Net Payout</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {riders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{rider.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{rider.total_pickups}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">₵{rider.total_earnings}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(rider.status === 'active' ? 'pending' : rider.status)}`}>
                        {rider.status === 'active' ? 'pending' : rider.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
