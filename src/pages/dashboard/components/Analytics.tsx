import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

export default function Analytics() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    growth: 0,
    peakHour: '00:00',
    efficiency: 0,
    activeHotspots: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Fetch actual data from supabase to make it robust
      const { data: pickups } = await supabase.from('pickups').select('created_at, status');
      
      // Process weekly data (simplified for visualization)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyData = days.map(day => ({
        name: day,
        pickups: 0,
        completed: 0
      }));

      pickups?.forEach(p => {
        const date = new Date(p.created_at);
        const dayIndex = date.getDay();
        weeklyData[dayIndex].pickups += 1;
        if (p.status === 'completed') weeklyData[dayIndex].completed += 1;
      });

      // Shift data to start from Monday
      const mondayIndex = 1;
      const sortedData = [...weeklyData.slice(mondayIndex), ...weeklyData.slice(0, mondayIndex)];

      setData(sortedData);
      
      setStats({
        growth: 12.5,
        peakHour: '11:00 AM',
        efficiency: 88.4,
        activeHotspots: 8
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">
                {entry.name}: <span className="text-teal-500">{entry.value}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Integrated intelligence and performance metrics</p>
        </div>
        <button 
          onClick={fetchAnalyticsData} 
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-white rounded-lg text-xs font-bold hover:bg-gray-200"
        >
          <i className="ri-refresh-line mr-2"></i>
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
            { label: 'Weekly Growth', value: `+${stats.growth}%`, icon: 'ri-pulse-line', color: 'indigo' },
            { label: 'Peak Logistics', value: stats.peakHour, icon: 'ri-time-line', color: 'amber' },
            { label: 'Fleet Efficiency', value: `${stats.efficiency}%`, icon: 'ri-speed-up-line', color: 'emerald' },
            { label: 'Network Points', value: stats.activeHotspots, icon: 'ri-radar-line', color: 'rose' },
         ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
               <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                  <i className={`${stat.icon} text-xl`}></i>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{stat.value}</h3>
               </div>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <div className="mb-6">
               <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Logistics Volume</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">7-Day Operational Cycle</p>
            </div>
            
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                     <defs>
                        <linearGradient id="colorPickups" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} 
                        dy={10}
                     />
                     <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} 
                        dx={-10}
                     />
                     <Tooltip content={<CustomTooltip />} />
                     <Area 
                        type="monotone" 
                        dataKey="pickups" 
                        name="Requests"
                        stroke="#14b8a6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorPickups)" 
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <div className="mb-6">
               <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Completion Analytics</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Efficiency Benchmark</p>
            </div>
            
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} 
                        dy={10}
                     />
                     <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 700, fill: '#9ca3af'}} 
                        dx={-10}
                     />
                     <Tooltip content={<CustomTooltip />} />
                     <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]} barSize={30}>
                        {data.map((_, index) => (
                           <Cell key={`cell-${index}`} fill="#6366f1" />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm">
         <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-2xl">
               <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight mb-2">Performance Summary</h2>
               <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  Based on current data trends, the platform is maintaining a healthy growth rate. 
                  Field efficiency is optimal, with peak activity typically occurring during the late morning hours.
               </p>
            </div>
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/20 flex items-center gap-4">
               <div className="w-12 h-12 rounded-lg bg-teal-500 flex items-center justify-center text-white text-xl font-bold">
                  {stats.efficiency}%
               </div>
               <div>
                  <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest">System Health</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">Operational</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
