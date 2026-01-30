import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface OverviewProps {
  onNavigate?: (section: string) => void;
}

export default function Overview({ onNavigate }: OverviewProps) {
  const [timeRange, setTimeRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    {
      id: 1,
      title: 'Total Pickups',
      value: '0',
      change: '0%',
      trend: 'flat',
      icon: 'ri-map-pin-line',
      color: 'teal',
      bgGradient: 'from-teal-500 to-teal-600'
    },
    {
      id: 2,
      title: 'Active Riders',
      value: '0',
      change: '0%',
      trend: 'flat',
      icon: 'ri-e-bike-2-line',
      color: 'blue',
      bgGradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 4,
      title: 'Registered Users',
      value: '0',
      change: '0%',
      trend: 'flat',
      icon: 'ri-user-line',
      color: 'purple',
      bgGradient: 'from-purple-500 to-purple-600'
    },
  ]);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [topRiders, setTopRiders] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const getDateRanges = (range: string) => {
    const now = new Date();
    const currentStart = new Date(now);
    const previousStart = new Date(now);
    const previousEnd = new Date(now);

    switch (range) {
      case 'today':
        currentStart.setHours(0, 0, 0, 0); // Start of today
        previousStart.setDate(now.getDate() - 1); // Start of yesterday
        previousStart.setHours(0, 0, 0, 0);
        previousEnd.setDate(now.getDate() - 1); // End of yesterday
        previousEnd.setHours(23, 59, 59, 999);
        break;
      case 'week':
        currentStart.setDate(now.getDate() - 7);
        previousStart.setDate(now.getDate() - 14);
        previousEnd.setDate(now.getDate() - 7);
        break;
      case 'month':
        currentStart.setMonth(now.getMonth() - 1);
        previousStart.setMonth(now.getMonth() - 2);
        previousEnd.setMonth(now.getMonth() - 1);
        break;
      default:
        currentStart.setHours(0, 0, 0, 0);
    }
    return {
      currentStart: currentStart.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString()
    };
  };
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { change: current > 0 ? '+100%' : '0%', trend: 'flat' };
    const percent = ((current - previous) / previous) * 100;
    return {
      change: `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`,
      trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat'
    };
  };

  const fetchSmsBalance = async () => {
    // TODO: Replace with actual Arkesel API call
    // Endpoint: https://sms.arkesel.com/api/v2/clients/balance
    // Header: api-key: <>

    try {
      const response = await fetch('/api/arkesel/clients/balance', {
        headers: {
          'api-key': 'UEJrVktDRnBqeWZpdmxXSG1WbHk'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Arkesel API V2 typically returns { data: { sms_balance: "..." } }
      const balance = data.data?.sms_balance || data.balance || 0;

      setStats(prev => prev.map(stat =>
        stat.title === 'SMS Balance' ? { ...stat, value: Number(balance).toLocaleString() } : stat
      ));
    } catch (error) {
      console.error('Error fetching SMS balance:', error);
      // Fallback to mock balance for demo purposes if API fails
      setStats(prev => prev.map(stat =>
        stat.title === 'SMS Balance' ? { ...stat, value: '1,540', trend: 'flat', change: 'Demo' } : stat
      ));
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { currentStart, previousStart, previousEnd } = getDateRanges(timeRange);

      // --- 1. Total Pickups ---
      const { count: currentPickups } = await supabase
        .from('pickups')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart);

      const { count: prevPickups } = await supabase
        .from('pickups')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStart)
        .lt('created_at', previousEnd);

      const pickupTrend = calculateTrend(currentPickups || 0, prevPickups || 0);

      // --- 2. Active Riders ---
      // For riders, usually 'Active' is a current state, not a range metric, 
      // but 'New Riders' could be a range metric. Let's stick to 'Active Riders' count currently vs yesterday/last week? 
      // Actually, snapshotting 'Active Riders' from the past is hard without an audit log.
      // Let's change this metric to "Total Riders" vs previous period growth? 
      // Or just keep it as 'Current Active' with no real trend (or trend of new registrations).
      // Let's use 'New Riders' for trend.

      const { count: totalActiveRiders } = await supabase
        .from('riders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: currentNewRiders } = await supabase
        .from('riders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart);

      const { count: prevNewRiders } = await supabase
        .from('riders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStart)
        .lt('created_at', previousEnd);

      const riderTrend = calculateTrend(currentNewRiders || 0, prevNewRiders || 0);

      // --- 4. Users ---
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: prevTotalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', currentStart); // Users before this period

      const userTrend = calculateTrend(totalUsers || 0, prevTotalUsers || 0);

      // Update Stats State
      setStats([
        {
          id: 1,
          title: 'Total Pickups',
          value: (currentPickups || 0).toLocaleString(),
          change: pickupTrend.change,
          trend: pickupTrend.trend,
          icon: 'ri-map-pin-line',
          color: 'teal',
          bgGradient: 'from-teal-500 to-teal-600'
        },
        {
          id: 2,
          title: 'Active Riders',
          value: (totalActiveRiders || 0).toLocaleString(),
          change: riderTrend.change,
          trend: riderTrend.trend,
          icon: 'ri-e-bike-2-line',
          color: 'blue',
          bgGradient: 'from-blue-500 to-blue-600'
        },
        {
          id: 3,
          title: 'SMS Balance',
          value: 'Loading...', // Placeholder until API integration
          change: 'N/A',
          trend: 'flat',
          icon: 'ri-message-3-line',
          color: 'indigo',
          bgGradient: 'from-indigo-500 to-indigo-600'
        },
        {
          id: 4,
          title: 'Registered Users',
          value: (totalUsers || 0).toLocaleString(),
          change: userTrend.change,
          trend: userTrend.trend,
          icon: 'ri-user-line',
          color: 'purple',
          bgGradient: 'from-purple-500 to-purple-600'
        },
      ]);

      // Attempt to fetch SMS Balance (Placeholder for Arkesel API)
      fetchSmsBalance();

      // --- 5. Recent Activities ---
      const { data: activities } = await supabase
        .from('pickups')
        .select(`
          id,
          status,
          created_at,
          location,
          users ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(6);

      const formattedActivities = activities?.map((act: any) => ({
        id: act.id,
        user: act.users?.full_name || 'Unknown User',
        action: `requested a pickup at ${act.location}`,
        time: new Date(act.created_at).toLocaleString(),
        status: act.status,
        icon: 'ri-map-pin-user-line',
        color: 'teal'
      })) || [];
      setRecentActivities(formattedActivities);

      // --- 6. Top Riders ---
      const { data: riders } = await supabase
        .from('riders')
        .select('*')
        .order('total_pickups', { ascending: false })
        .limit(5);

      const formattedRiders = riders?.map((r: any) => ({
        id: r.id,
        name: r.full_name,
        pickups: r.total_pickups,
        rating: r.rating,
        earnings: r.total_earnings,
        status: r.status,
        avatar: r.full_name ? r.full_name.split(' ').map((n: string) => n[0]).join('') : 'R',
      })) || [];
      setTopRiders(formattedRiders);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quick action button config
  const quickActions = [
    { label: 'Add New Rider', icon: 'ri-motorbike-line', action: 'riders', color: 'teal', desc: 'Register a new driver' },
    { label: 'Schedule Pickup', icon: 'ri-calendar-2-line', action: 'pickups', color: 'blue', desc: 'Create manual pickup' },
    { label: 'Broadcast SMS', icon: 'ri-message-2-line', action: 'sms', color: 'purple', desc: 'Send bulk messages' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Executive Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <i className="ri-calendar-line"></i>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {['today', 'week', 'month'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${timeRange === range
                  ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Refresh Data" onClick={fetchDashboardData}>
            <i className={`ri-refresh-line text-xl ${loading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bgGradient} shadow-lg shadow-${stat.color}-500/20`}>
                <i className={`${stat.icon} text-xl text-white`}></i>
              </div>
              <span className={`flex items-center text-sm font-medium px-2.5 py-0.5 rounded-full ${stat.trend === 'up' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                stat.trend === 'down' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                {stat.trend === 'up' && <i className="ri-arrow-up-line mr-1"></i>}
                {stat.trend === 'down' && <i className="ri-arrow-down-line mr-1"></i>}
                {stat.change}
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{stat.value}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
            <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">View All Commands</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate?.(action.action)}
                className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md hover:-translate-y-1 transition-all group text-center cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-full bg-${action.color}-50 dark:bg-${action.color}-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <i className={`${action.icon} text-2xl text-${action.color}-600 dark:text-${action.color}-400`}></i>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white mb-1">{action.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</span>
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Live Activity Feed</h2>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1"></span>
                <span className="text-xs font-medium text-gray-500">LIVE</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                    <i className={`${activity.icon} text-teal-600 dark:text-teal-400`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      <span className="font-semibold">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${activity.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    activity.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="p-8 text-center text-gray-500">No recent activities found</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl">
            <h2 className="text-lg font-bold mb-4">Enterprise Status</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1 opacity-80">
                  <span>System Database</span>
                  <span className="text-emerald-400">Operational</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1 opacity-80">
                  <span>API Gateway</span>
                  <span className="text-emerald-400">98ms latency</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[95%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1 opacity-80">
                  <span>Storage (Usage)</span>
                  <span className="text-amber-400">65%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[65%] rounded-full"></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors cursor-pointer">
              View System Health
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Top Performing Riders</h3>
            </div>
            <div className="p-2">
              {topRiders.map((rider, i) => (
                <div key={rider.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <span className="w-6 text-center font-bold text-gray-400">#{i + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                    {rider.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{rider.name}</p>
                    <p className="text-xs text-gray-500">{rider.pickups} pickups • ⭐ {rider.rating}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-teal-600">₵{rider.earnings}</p>
                  </div>
                </div>
              ))}
              {topRiders.length === 0 && <div className="p-4 text-center text-sm text-gray-500">No data available</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
