import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ExportButton from './ExportButton';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface PickupRequest {
  id: string;
  user_name: string;
  user_id: string;
  rider_name: string | null;
  rider_id: string | null;
  status: 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location: { lat: number; lng: number };
  address: string;
  created_at: string;
  waste_type: string;
  waste_size: string;
}

export default function PickupOperations() {
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPickup, setSelectedPickup] = useState<PickupRequest | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const currentRole = localStorage.getItem('simulatedRole') || 'Admin';
  const canDispatch = currentRole === 'super_admin' || currentRole === 'dispatcher' || currentRole === 'Admin';

  useEffect(() => {
    fetchPickups();
    fetchActiveRiders();

    const channel = supabase
      .channel('public:pickups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, () => {
        fetchPickups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPickups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pickups')
        .select(`*, users (full_name), riders (full_name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPickups(data.map((p: any) => ({
          ...p,
          user_name: p.users?.full_name || 'Anonymous',
          rider_name: p.riders?.full_name || null,
          location: p.location || { lat: 5.6037, lng: -0.1870 }
        })));
      }
    } catch (error) {
      console.error('Error fetching pickups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRiders = async () => {
    const { data } = await supabase.from('riders').select('id, full_name').eq('status', 'active');
    setRiders(data || []);
  };

  const handleAssignRider = async (pickupId: string, riderId: string) => {
    if (!canDispatch) {
      alert('Access Denied');
      return;
    }

    try {
      const { error } = await supabase
        .from('pickups')
        .update({ rider_id: riderId, status: 'scheduled' })
        .eq('id', pickupId);

      if (error) throw error;
      
      alert('Rider dispatched successfully');
      setShowAssignModal(false);
      setSelectedPickup(null);
      fetchPickups();
    } catch (error) {
       console.error('Error assigning rider:', error);
       alert('Dispatch failed');
    }
  };

  const filteredPickups = pickups.filter(p => {
    const matchesSearch = p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20';
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20';
      case 'in_progress': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20';
    }
  };

  const createPickupIcon = (status: string) => {
    let color = '#f59e0b'; // amber
    if (status === 'scheduled') color = '#3b82f6';
    if (status === 'in_progress') color = '#a855f7';
    if (status === 'completed') color = '#10b981';
    
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${color}80;"></div>`,
      className: 'custom-icon',
      iconSize: [12, 12],
    });
  };

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pickup Operations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage real-time logistics and dispatch fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={filteredPickups.map(p => ({
              ID: p.id,
              Customer: p.user_name,
              Rider: p.rider_name || 'Unassigned',
              Waste: p.waste_type,
              Size: p.waste_size,
              Status: p.status,
              Date: new Date(p.created_at).toLocaleString()
            }))}
            fileName="Pickup_Orders"
            title="Logistics Operations Report"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
           <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text"
                  placeholder="Search by customer or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
                {['all', 'requested', 'scheduled', 'in_progress', 'completed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${
                      statusFilter === s ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
           </div>
           
           {loading ? (
             <div className="flex-1 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
           ) : (
             <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                {filteredPickups.map((p) => (
                  <div 
                    key={p.id} 
                    className={`p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${selectedPickup?.id === p.id ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}
                    onClick={() => setSelectedPickup(p)}
                  >
                    <div className="flex justify-between items-start mb-3">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-[9px] font-bold text-gray-400 uppercase">#{p.id.slice(0,8)}</span>
                             <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getStatusStyle(p.status)}`}>
                                {p.status}
                             </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase">{p.user_name}</h3>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{p.waste_type}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{p.waste_size}</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                       <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-gray-500 min-w-0">
                             <i className="ri-map-pin-line text-[10px]"></i>
                             <span className="text-[10px] truncate max-w-[200px]">{p.address}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                             <i className="ri-steering-2-line text-[10px]"></i>
                             <span className="text-[10px] font-bold">{p.rider_name || 'PENDING DISPATCH'}</span>
                          </div>
                       </div>
                       {!p.rider_id && p.status === 'requested' && canDispatch && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedPickup(p); setShowAssignModal(true); }}
                            className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] font-bold uppercase rounded-lg hover:scale-105 transition-all shadow-md"
                          >
                             Dispatch
                          </button>
                       )}
                    </div>
                  </div>
                ))}
                {filteredPickups.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 text-gray-400 text-xs font-bold uppercase tracking-widest">
                     No requests found
                  </div>
                )}
             </div>
           )}
        </div>

        <div className="space-y-6 flex flex-col">
           <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-[300px] z-0">
             <MapContainer center={[5.6037, -0.1870]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {pickups.map(p => (
                  <Marker key={p.id} position={[p.location.lat, p.location.lng]} icon={createPickupIcon(p.status)}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-[10px] uppercase mb-0.5">{p.user_name}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase">{p.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
             </MapContainer>
           </div>

           {selectedPickup && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm animate-fade-in space-y-6">
                 <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Mission Intel</h2>
                 <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                       <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Objective</p>
                       <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedPickup.waste_type} Collection</p>
                       <p className="text-[10px] text-gray-500 mt-1">{selectedPickup.address}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/10">
                          <p className="text-[9px] font-bold text-teal-600 uppercase mb-1">Volume</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedPickup.waste_size}</p>
                       </div>
                       <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                          <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">Status</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{selectedPickup.status.replace('_', ' ')}</p>
                       </div>
                    </div>

                    <div className="space-y-3 pt-2">
                       <p className="text-[9px] font-bold text-gray-400 uppercase px-1">Field Personnel</p>
                       {selectedPickup.rider_id ? (
                          <div className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                             <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                                {selectedPickup.rider_name?.charAt(0)}
                             </div>
                             <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedPickup.rider_name}</p>
                                <p className="text-[9px] text-gray-500 uppercase">Active Dispatch</p>
                             </div>
                          </div>
                       ) : (
                          canDispatch && (
                            <button 
                              onClick={() => setShowAssignModal(true)}
                              className="w-full py-3 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-teal-600 transition-all"
                            >
                                Dispatch Rider
                            </button>
                          )
                       )}
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {showAssignModal && selectedPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}></div>
           <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
              <div className="p-6 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                 <h2 className="text-lg font-bold text-gray-900 dark:text-white">Select Rider</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Available active fleet</p>
              </div>
              <div className="p-4 max-h-[300px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                 {riders.map(r => (
                    <button 
                      key={r.id}
                      onClick={() => handleAssignRider(selectedPickup.id, r.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors text-left"
                    >
                       <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 text-xs font-bold">
                          {r.full_name.charAt(0)}
                       </div>
                       <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{r.full_name}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Verified Rider</p>
                       </div>
                       <i className="ri-arrow-right-s-line text-gray-300"></i>
                    </button>
                 ))}
                 {riders.length === 0 && (
                    <div className="py-10 text-center text-[10px] text-gray-400 font-bold uppercase">
                       No riders available
                    </div>
                 )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                 <button 
                   onClick={() => setShowAssignModal(false)}
                   className="w-full py-3 text-[10px] font-bold text-gray-500 uppercase rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
