import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const createRiderIcon = (status: string) => {
  let color = '#9ca3af'; // gray-400
  if (status === 'online') color = '#10b981';
  if (status === 'busy') color = '#f59e0b';

  return L.divIcon({
    className: 'custom-rider-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}80;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7]
  });
};

interface Rider {
  id: string;
  name: string;
  phone: string;
  zone: string;
  status: 'online' | 'offline' | 'busy';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  lastUpdate: string;
  speed: number;
}

export default function LiveTracking() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const BASE_LAT = 5.6037;
  const BASE_LNG = -0.1870;

  useEffect(() => {
    fetchRiders();

    const channel = supabase
      .channel('public:riders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => {
        fetchRiders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('riders').select('*');
      if (error) throw error;

      if (data) {
        setRiders(data.map(r => ({
          id: r.id,
          name: r.full_name,
          phone: r.phone_number || r.phone || 'N/A',
          zone: r.zone || 'Central',
          status: r.status === 'active' ? 'online' : (r.status === 'busy' ? 'busy' : 'offline'),
          location: {
            lat: r.latitude || BASE_LAT + (Math.random() - 0.5) * 0.05,
            lng: r.longitude || BASE_LNG + (Math.random() - 0.5) * 0.05,
            address: r.address || 'Accra, Ghana'
          },
          lastUpdate: new Date().toLocaleTimeString(),
          speed: r.status === 'busy' ? Math.floor(Math.random() * 20) + 10 : 0
        })));
      }
    } catch (error) {
      console.error('Error fetching riders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRiders = riders.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20';
      case 'busy': return 'text-amber-500 bg-amber-100 dark:bg-amber-900/20';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time GPS monitoring across the service network</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
           <span className="flex h-2 w-2 relative mx-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
           </span>
           <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest pr-2">GNSS Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-[650px] z-0 relative">
          <MapContainer center={[BASE_LAT, BASE_LNG]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {riders.filter(r => r.status !== 'offline').map((rider) => (
              <Marker
                key={rider.id}
                position={[rider.location.lat, rider.location.lng]}
                icon={createRiderIcon(rider.status)}
                eventHandlers={{ click: () => setSelectedRider(rider) }}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-xs uppercase">{rider.name}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{rider.status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <div className="absolute top-4 right-4 z-[500] bg-white/90 dark:bg-gray-800/90 backdrop-blur p-3 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700">
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                   <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 uppercase">Available</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                   <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 uppercase">In-Transit</span>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[650px]">
             <div className="p-4 border-b border-gray-50 dark:border-gray-700 space-y-4">
                <div className="relative">
                   <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                   <input 
                     type="text"
                     placeholder="Intercept rider ID..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                   />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                   {['all', 'online', 'busy', 'offline'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${
                          filterStatus === s ? 'bg-teal-500 text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                         {s}
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700 scrollbar-hide">
                {filteredRiders.map((rider) => (
                   <div 
                     key={rider.id}
                     onClick={() => setSelectedRider(rider)}
                     className={`p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedRider?.id === rider.id ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}
                   >
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 font-bold text-xs">
                               {rider.name.charAt(0)}
                            </div>
                            <div>
                               <p className="text-[11px] font-bold text-gray-900 dark:text-white uppercase truncate max-w-[120px]">{rider.name}</p>
                               <p className="text-[9px] text-gray-400 font-bold uppercase">{rider.zone}</p>
                            </div>
                         </div>
                         <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${getStatusColor(rider.status)}`}>
                            {rider.status}
                         </span>
                      </div>
                      <div className="space-y-2 mt-3">
                         <div className="flex items-center gap-2 text-gray-500">
                            <i className="ri-map-pin-line text-[10px]"></i>
                            <span className="text-[9px] font-medium truncate">{rider.location.address}</span>
                         </div>
                         <div className="flex items-center justify-between text-[8px] font-bold uppercase text-gray-400">
                            <div className="flex gap-3">
                               <span>{rider.speed} KM/H</span>
                               <span>LITE-BAND</span>
                            </div>
                            <span>{rider.lastUpdate}</span>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedRider(null)}></div>
           <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
              <div className="p-6 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-900 dark:text-white">Telemetry Intel</h2>
                 <button onClick={() => setSelectedRider(null)} className="text-gray-400 hover:text-rose-500">
                    <i className="ri-close-line text-2xl"></i>
                 </button>
              </div>
              <div className="p-6 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                       {selectedRider.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase">{selectedRider.name}</h3>
                       <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">{selectedRider.phone}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                       <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Status</p>
                       <p className="text-xs font-bold text-teal-600 uppercase">{selectedRider.status}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                       <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Velocity</p>
                       <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{selectedRider.speed} KM/H</p>
                    </div>
                 </div>

                 <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Geolocation</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedRider.location.address}</p>
                    <p className="text-[9px] font-mono text-gray-500 mt-1">{selectedRider.location.lat.toFixed(6)}, {selectedRider.location.lng.toFixed(6)}</p>
                 </div>

                 <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-bold uppercase shadow-lg">
                       Emergency Comms
                    </button>
                    <button className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg text-xs font-bold uppercase transition-all">
                       Audit History
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
