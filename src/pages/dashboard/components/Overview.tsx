import { useState } from 'react';

interface OverviewProps {
  onNavigate?: (section: string) => void;
}

export default function Overview({ onNavigate }: OverviewProps) {
  const [timeRange, setTimeRange] = useState('today');

  const stats = [
    {
      id: 1,
      title: 'Total Pickups',
      value: '1,247',
      change: '+12.5%',
      trend: 'up',
      icon: 'ri-map-pin-line',
      color: 'teal',
      bgGradient: 'from-teal-500 to-teal-600'
    },
    {
      id: 2,
      title: 'Active Riders',
      value: '156',
      change: '+8.2%',
      trend: 'up',
      icon: 'ri-e-bike-2-line',
      color: 'blue',
      bgGradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 3,
      title: 'Revenue Today',
      value: '₵12,450',
      change: '+15.3%',
      trend: 'up',
      icon: 'ri-money-dollar-circle-line',
      color: 'emerald',
      bgGradient: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 4,
      title: 'Registered Users',
      value: '8,932',
      change: '+23.1%',
      trend: 'up',
      icon: 'ri-user-line',
      color: 'purple',
      bgGradient: 'from-purple-500 to-purple-600'
    },
  ];

  const recentActivities = [
    { id: 1, type: 'pickup', user: 'Kwame Mensah', action: 'requested pickup', time: '2 mins ago', icon: 'ri-map-pin-add-line', color: 'teal' },
    { id: 2, type: 'payment', user: 'Ama Serwaa', action: 'completed payment of ₵45', time: '5 mins ago', icon: 'ri-money-dollar-circle-line', color: 'emerald' },
    { id: 3, type: 'rider', user: 'Kofi Adu', action: 'completed pickup PU-2847', time: '8 mins ago', icon: 'ri-checkbox-circle-line', color: 'blue' },
    { id: 4, type: 'user', user: 'Yaa Asantewaa', action: 'registered new account', time: '12 mins ago', icon: 'ri-user-add-line', color: 'purple' },
    { id: 5, type: 'pickup', user: 'Kwesi Boateng', action: 'scheduled pickup for tomorrow', time: '15 mins ago', icon: 'ri-calendar-line', color: 'amber' },
  ];

  const topRiders = [
    { id: 1, name: 'Kofi Adu', pickups: 45, rating: 4.9, earnings: '₵2,340', avatar: 'KA', status: 'online' },
    { id: 2, name: 'Kwame Mensah', pickups: 42, rating: 4.8, earnings: '₵2,180', avatar: 'KM', status: 'online' },
    { id: 3, name: 'Yaw Boateng', pickups: 38, rating: 4.7, earnings: '₵1,980', avatar: 'YB', status: 'busy' },
    { id: 4, name: 'Ama Serwaa', pickups: 35, rating: 4.9, earnings: '₵1,820', avatar: 'AS', status: 'online' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          {['today', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                timeRange === range
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid with Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden group hover:shadow-lg transition-all duration-300"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</h3>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
                  </div>
                </div>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.bgGradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`${stat.icon} text-2xl text-white`}></i>
                </div>
              </div>
            </div>
            <div className={`h-1 bg-gradient-to-r ${stat.bgGradient}`}></div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => onNavigate?.('riders')}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="ri-user-add-line text-2xl text-teal-600 dark:text-teal-400"></i>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Add Rider</h4>
        </button>

        <button 
          onClick={() => onNavigate?.('pickups')}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="ri-calendar-check-line text-2xl text-blue-600 dark:text-blue-400"></i>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Schedule Pickup</h4>
        </button>

        <button 
          onClick={() => onNavigate?.('sms')}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="ri-message-3-line text-2xl text-purple-600 dark:text-purple-400"></i>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Send SMS</h4>
        </button>

        <button 
          onClick={() => onNavigate?.('analytics')}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="ri-bar-chart-box-line text-2xl text-emerald-600 dark:text-emerald-400"></i>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">View Reports</h4>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activities</h2>
              <button className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium cursor-pointer whitespace-nowrap">
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-full bg-${activity.color}-100 dark:bg-${activity.color}-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <i className={`${activity.icon} text-${activity.color}-600 dark:text-${activity.color}-400`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-semibold">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Riders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Riders</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This week's best performers</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topRiders.map((rider, index) => (
                <div
                  key={rider.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform">
                        {rider.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        rider.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{rider.name}</p>
                        {index === 0 && (
                          <i className="ri-trophy-fill text-amber-500 text-sm"></i>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{rider.pickups} pickups</span>
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <i className="ri-star-fill"></i>
                          {rider.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{rider.earnings}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
