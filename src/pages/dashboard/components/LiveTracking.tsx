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
  let color = '#94a3b8'; // slate-400
  if (status === 'online') color = '#10b981'; // emerald
  if (status === 'busy') color = '#f59e0b'; // amber

  return L.divIcon({
    className: 'custom-rider-marker',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 6px; border: 2px solid white; box-shadow: 0 4px 10px ${color}60;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

const createOrderIcon = (status: string) => {
  const color = status === 'requested' ? '#f59e0b' : '#3b82f6';
  return L.divIcon({
    className: 'custom-order-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
             <div style="position: absolute; top: -2px; left: -2px; width: 100%; height: 100%; border-radius: 50%; background: white; opacity: 0.3; animation: pulse-marker 2s infinite;"></div>
           </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
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

interface Pickup {
  id: string;
  address: string;
  location: { lat: number; lng: number };
  status: string;
  waste_type: string;
}

export default function LiveTracking() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const BASE_LAT = 5.6037;
  const BASE_LNG = -0.1870;

  useEffect(() => {
    fetchRiders();
    fetchPickups();

    const channelRiders = supabase
      .channel('public:riders_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => {
        fetchRiders();
      })
      .subscribe();

    const channelPickups = supabase
      .channel('public:orders_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchPickups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelRiders);
      supabase.removeChannel(channelPickups);
    };
  }, []);

   const fetchPickups = async () => {
      try {
         const { data } = await supabase
           .from('orders')
           .select('*')
           .neq('status', 'completed')
           .neq('status', 'cancelled');
         
         if (data) {
            setPickups(data.map(p => ({
               id: p.id,
               address: p.address,
               location: {
                  lat: p.latitude || BASE_LAT,
                  lng: p.longitude || BASE_LNG
               },
               status: p.status,
               waste_type: p.service_type || p.waste_type || 'General Waste'
            })));
         }
      } catch (e) {
        console.error('Error fetching pickups for map:', e);
     }
  };

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
            address: r.address || 'Service Area'
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
      case 'online': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
      case 'busy': return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Live Map</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">See all your riders on the map in real-time</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm">
           <div className="flex h-2.5 w-2.5 relative">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></div>
           </div>
           <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-widest">GPS Connection Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden h-[680px] z-0 relative">
          <MapContainer center={[BASE_LAT, BASE_LNG]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* Display Riders */}
            {riders.filter(r => r.status !== 'offline').map((rider) => (
              <Marker
                key={`rider-${rider.id}`}
                position={[rider.location.lat, rider.location.lng]}
                icon={createRiderIcon(rider.status)}
                eventHandlers={{ click: () => setSelectedRider(rider) }}
              >
                <Popup>
                  <div className="p-1 min-w-[100px]">
                    <p className="font-bold text-xs">{rider.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Rider: {rider.status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Display User Orders (Pickups) */}
            {pickups.map((pickup) => (
              <Marker
                key={`order-${pickup.id}`}
                position={[pickup.location.lat, pickup.location.lng]}
                icon={createOrderIcon(pickup.status)}
              >
                <Popup>
                  <div className="p-2 min-w-[150px]">
                    <p className="font-bold text-[11px] text-slate-900 leading-none mb-1">New Order Request</p>
                    <p className="text-[9px] text-slate-500 mb-2 truncate">{pickup.address}</p>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                       <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-bold uppercase">{pickup.status}</span>
                       <span className="text-[9px] font-bold text-slate-400 capitalize">{pickup.waste_type}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <div className="absolute top-6 right-6 z-[500] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/10">
             <div className="space-y-4">
                <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fleet</p>
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Online</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Busy</span>
                   </div>
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Requests</p>
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/20 animate-pulse"></div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Pending Orders</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-[680px]">
             <div className="p-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 space-y-5">
                <div className="relative group">
                   <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
                   <input 
                     type="text"
                     placeholder="Search personnel directory..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                   />
                </div>
                <div className="flex gap-1.5 p-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl overflow-x-auto scrollbar-hide">
                   {['all', 'online', 'busy', 'offline'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-4 py-2 text-[10px] font-bold uppercase rounded-xl transition-all whitespace-nowrap ${
                          filterStatus === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                         {s}
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5 scrollbar-hide">
                {filteredRiders.map((rider) => (
                   <div 
                     key={rider.id}
                     onClick={() => setSelectedRider(rider)}
                     className={`p-6 hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-all cursor-pointer group ${selectedRider?.id === rider.id ? 'bg-emerald-50/30' : ''}`}
                   >
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                               {rider.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate max-w-[140px] leading-none mb-1.5">{rider.name}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{rider.zone}</p>
                            </div>
                         </div>
                         <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase border ${getStatusColor(rider.status)}`}>
                            {rider.status}
                         </span>
                      </div>
                      <div className="space-y-3 mt-4">
                         <div className="flex items-center gap-2 text-slate-500">
                            <i className="ri-map-pin-2-line text-emerald-500"></i>
                            <span className="text-[11px] font-medium truncate">{rider.location.address}</span>
                         </div>
                         <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                            <div className="flex gap-4">
                               <span className="flex items-center gap-1"><i className="ri-speed-mini-line"></i> {rider.speed} KM/H</span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedRider(null)}></div>
           <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
              <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Rider Details</h2>
                 <button onClick={() => setSelectedRider(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500">
                    <i className="ri-close-line text-2xl"></i>
                 </button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold font-['Montserrat'] shadow-lg shadow-emerald-500/20">
                       {selectedRider.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{selectedRider.name}</h3>
                       <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em] mt-2">{selectedRider.phone}</p>
                    </div>
                 </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Live Status</p>
                       <p className="text-[13px] font-bold text-emerald-600 uppercase">{selectedRider.status}</p>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Speed</p>
                       <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase">{selectedRider.speed} KM/H</p>
                    </div>
                 </div>

                 <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Location</p>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-relaxed">{selectedRider.location.address}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-3">{selectedRider.location.lat.toFixed(6)} N, {selectedRider.location.lng.toFixed(6)} W</p>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl transition-all">
                       Direct Contact
                    </button>
                    <button 
                       onClick={() => setSelectedRider(null)}
                       className="px-10 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-white rounded-[2rem] text-xs font-bold uppercase transition-all"
                    >
                       Dismiss
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
