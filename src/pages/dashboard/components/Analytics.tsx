import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const COLORS = ['#14b8a6', '#10b981', '#f59e0b', '#f43f5e']; // teal, emerald, amber, rose

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPickups: 0,
    completionRate: 0,
    avgResponseTime: 12, // Mocked for now (mins)
    satisfaction: 4.7,   // Mocked (stars)
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [wasteDistribution, setWasteDistribution] = useState<any[]>([]);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);

    // 1. Fetch Pickups for stats and trend
    const { data: pickups, error: pickupsError } = await supabase
      .from('pickups')
      .select('id, status, created_at, location');



    if (pickups) {
      // Basic Stats
      const total = pickups.length;
      const completed = pickups.filter(p => p.status === 'completed').length;
      const rate = total > 0 ? (completed / total) * 100 : 0;

      // Mock Locations (random around Accra)
      const locs = pickups.map((p: any) => ({
        id: p.id,
        lat: 5.6037 + (Math.random() - 0.5) * 0.1,
        lng: -0.1870 + (Math.random() - 0.5) * 0.1,
        status: p.status
      }));
      setPickupLocations(locs);

      // Daily Trend (Last 7 Days)
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      const trend = days.map(dateStr => {
        const count = pickups.filter(p => p.created_at.startsWith(dateStr)).length;
        // Mock revenue distribution curve if no real payments
        return {
          name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
          pickups: count,
          date: dateStr
        };
      });
      setDailyData(trend);

      // Mock Waste Distribution based on "random logic" from ID to mimic data
      // In real app, this comes from DB "waste_type" column
      const types = { General: 0, Recyclable: 0, Organic: 0, Hazardous: 0 };
      pickups.forEach((p, i) => {
        const r = (p.id.charCodeAt(0) + i) % 10;
        if (r < 6) types.General++;
        else if (r < 8) types.Recyclable++;
        else if (r < 9) types.Organic++;
        else types.Hazardous++;
      });

      const distData = [
        { name: 'General Waste', value: types.General },
        { name: 'Recyclable', value: types.Recyclable },
        { name: 'Organic', value: types.Organic },
        { name: 'Hazardous', value: types.Hazardous },
      ];
      setWasteDistribution(distData);



      setStats({
        totalPickups: total,
        completionRate: Math.round(rate * 10) / 10,
        avgResponseTime: 12,
        satisfaction: 4.8,
      });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform performance and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 3 Months</option>
            <option>Last Year</option>
          </select>
          <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer">
            <i className="ri-download-line"></i>
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Pickups</span>
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <i className="ri-delete-bin-line text-teal-600 dark:text-teal-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPickups}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">All time</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="ri-percent-line text-amber-600 dark:text-amber-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completionRate}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">of all requests</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Satisfaction</span>
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <i className="ri-star-line text-rose-600 dark:text-rose-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.satisfaction}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">Avg rating</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Weekly Pickup Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorPickups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="pickups" stroke="#14b8a6" fillOpacity={1} fill="url(#colorPickups)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Waste Type Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wasteDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {wasteDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Pickup Density Heatmap</h3>
        <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden z-0">
          <MapContainer center={[5.6037, -0.1870]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pickupLocations.map((loc) => (
              <CircleMarker
                key={loc.id}
                center={[loc.lat, loc.lng]}
                radius={8}
                pathOptions={{
                  color: loc.status === 'completed' ? '#10b981' : '#f59e0b',
                  fillColor: loc.status === 'completed' ? '#10b981' : '#f59e0b',
                  fillOpacity: 0.5,
                  weight: 0
                }}
              >
                <Popup>Pickup ID: {loc.id}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
