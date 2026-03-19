import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ExportButton from './ExportButton';

// Safe Marker Icon Logic
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
  user_phone: string;
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
  const [mapError, setMapError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
     address: '',
     waste_type: '',
     waste_size: '',
     status: ''
  });

  const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const role = (userInfo.role || 'Super Admin').toLowerCase().replace(/\s+/g, '_');
  const canDispatch = role === 'super_admin' || role === 'manager' || role === 'dispatcher' || role === 'admin';

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('public:orders_registry_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchPickups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchPickups(false), fetchActiveRiders()]);
    setLoading(false);
  };

  const fetchPickups = async (updateLoading = true) => {
    if (updateLoading) setLoading(true);
    try {
      // Fetch from 'orders' table instead of 'pickups'
      const { data, error } = await supabase
        .from('orders')
        .select(`*, users(full_name, phone_number), riders(full_name)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Initial Orders Query Error:', error);
        // Fallback to basic query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        
        setPickups((fallbackData || []).map((p: any) => ({
          ...p,
          user_name: 'Anonymous User',
          user_phone: 'N/A',
          rider_name: null,
          waste_type: p.service_type || 'General Waste',
          waste_size: p.waste_size || 'N/A',
          location: validateLocation(p.location)
        })));
      } else if (data) {
        setPickups(data.map((p: any) => ({
          ...p,
          user_name: p.users?.full_name || 'Anonymous User',
          user_phone: p.users?.phone_number || 'N/A',
          rider_name: p.riders?.full_name || null,
          waste_type: p.service_type || p.waste_type || 'General Waste',
          waste_size: p.waste_size || 'Standard',
          location: validateLocation(p.location)
        })));
      }
    } catch (e) {
      console.error('Critical Fetch Error:', e);
    } finally {
      if (updateLoading) setLoading(false);
    }
  };

  const validateLocation = (loc: any) => {
    const defaultCenter = { lat: 5.6037, lng: -0.1870 };
    if (!loc || typeof loc !== 'object') return defaultCenter;
    if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return defaultCenter;
    return loc;
  };

  const fetchActiveRiders = async () => {
    try {
      const { data } = await supabase.from('riders').select('id, full_name').eq('status', 'active');
      setRiders(data || []);
    } catch (e) {
      console.error('Riders fetch failed', e);
    }
  };

  const updatePickupStatus = async (pickupId: string, newStatus: string) => {
    if (!canDispatch) {
      alert("Permission Denied: Administrative Clearance required.");
      return;
    }

    const confirmMsg = newStatus === 'cancelled' 
      ? "Warning: This action will terminate the request. Continue?" 
      : "Confirm manual transition to 'Completed' status?";
    
    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', pickupId);

      if (error) throw error;
      
      await logActivity('Update Pickup Status', 'pickups', pickupId, { 
        new_status: newStatus,
        message: `Manual administrative protocol: Moved job #${pickupId.substring(0,8)} to ${newStatus}`
      });

      alert(`Job status successfully updated to ${newStatus}.`);
      setSelectedPickup(null);
      fetchPickups();
    } catch (error) {
       alert('Protocol Error: System database refused the update.');
    }
  };
  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPickup || !canDispatch) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          address: editFormData.address,
          service_type: editFormData.waste_type, // Map waste_type to service_type
          waste_size: editFormData.waste_size,
          status: editFormData.status
        })
        .eq('id', selectedPickup.id);

      if (error) throw error;
      
      await logActivity('Edit Order Details', 'orders', selectedPickup.id, { 
        changes: editFormData,
        message: `Administrative protocol override: Adjusted logistics for job #${selectedPickup.id.substring(0,8)}`
      });

      alert('Order registry entry synchronized successfully.');
      setShowEditModal(false);
      setSelectedPickup(null);
      fetchPickups();
    } catch (error) {
       alert('Registry update failed. Database constraint violation.');
    }
  };

  const openEditModal = (p: PickupRequest) => {
     setEditFormData({
        address: p.address,
        waste_type: p.waste_type,
        waste_size: p.waste_size,
        status: p.status
     });
     setShowEditModal(true);
  };

  const handleAssignRider = async (pickupId: string, riderId: string) => {
    if (!canDispatch) {
      alert("Permission Denied: You don't have access to assign riders.");
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ rider_id: riderId, status: 'scheduled' })
        .eq('id', pickupId);

      if (error) throw error;
      
      await logActivity('Assign Rider', 'pickups', pickupId, { 
        rider_id: riderId,
        message: `Assigned job #${pickupId.substring(0,8)} to rider`
      });

      alert('Rider has been assigned successfully.');
      setShowAssignModal(false);
      setSelectedPickup(null);
      fetchPickups();
    } catch (error) {
       alert('Dispatch error. Please check system logs.');
    }
  };

  const filteredPickups = pickups.filter(p => {
    const matchesSearch = (p.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'scheduled': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'in_progress': return 'bg-violet-50 text-violet-600 border-violet-100';
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const createPickupIcon = (status: string) => {
    let color = '#10b981'; // Default Emerald
    if (status === 'scheduled') color = '#22c55e';
    if (status === 'in_progress') color = '#059669';
    if (status === 'completed') color = '#064e3b';
    
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
      className: 'custom-marker',
      iconSize: [14, 14],
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Orders Registry</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Full operational log of all service requests and deployments</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={filteredPickups}
            fileName="Pickup_List"
            title="Reports"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Request List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col min-h-[500px] md:min-h-[700px]">
           <div className="p-4 md:p-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col xl:flex-row gap-4 xl:items-center">
              <div className="relative flex-1 w-full">
                <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  type="text"
                  placeholder="Search by name or request ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>
              <div className="flex gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto scrollbar-hide w-full xl:w-auto">
                {['all', 'requested', 'scheduled', 'in_progress', 'completed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-1 xl:flex-none px-4 py-2 text-[10px] font-bold uppercase rounded-xl transition-all whitespace-nowrap ${
                      statusFilter === s ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
           </div>
           
           {loading ? (
             <div className="flex-1 flex flex-col justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Loading Requests...</p>
             </div>
           ) : (
             <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50 max-h-[600px] xl:max-h-none">
                {filteredPickups.map((p) => (
                  <div 
                    key={p.id} 
                    className={`p-4 md:p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all cursor-pointer group ${selectedPickup?.id === p.id ? 'bg-emerald-50/30' : ''}`}
                    onClick={() => setSelectedPickup(p)}
                  >
                    <div className="flex justify-between items-start mb-4">
                       <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{p.id.slice(0,8)}</span>
                             <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusStyle(p.status)}`}>
                                {p.status}
                             </span>
                          </div>
                           <div className="flex items-center gap-3">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">{p.user_name}</h3>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold tracking-tight">{p.user_phone}</span>
                           </div>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end">
                           <p className="text-[11px] font-bold text-emerald-600 uppercase mb-1.5">{p.waste_type}</p>
                           <div className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black text-emerald-600 uppercase tracking-widest">{p.waste_size}</div>
                        </div>
                     </div>
                    
                    <div className="flex items-center justify-between gap-4">
                       <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                             <i className="ri-map-pin-line text-emerald-500 flex-shrink-0"></i>
                             <span className="truncate max-w-[250px]">{p.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                             <i className="ri-steering-line flex-shrink-0"></i>
                             <span className="truncate">{p.rider_name || 'Awaiting Rider'}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
                {filteredPickups.length === 0 && (
                  <div className="py-24 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                     No requests found in this category
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Right Column: Detail & Map */}
        <div className="flex flex-col gap-6 md:gap-8 h-full">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden h-[300px] md:h-[350px] z-0 flex-shrink-0">
             {!mapError ? (
               <MapContainer center={[5.6037, -0.1870]} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {pickups.map(p => (
                    <Marker key={p.id} position={[p.location.lat, p.location.lng]} icon={createPickupIcon(p.status)}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold text-xs">{p.user_name}</p>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase">{p.status}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
               </MapContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
                  <i className="ri-map-pin-user-line text-3xl text-slate-300 mb-2"></i>
                  <p className="text-xs font-bold text-slate-400 uppercase">Map services temporarily unavailable</p>
               </div>
             )}
           </div>

           {selectedPickup ? (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800/50 p-6 md:p-8 shadow-sm flex flex-col gap-6 animate-scale-up">
                 <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Job Narrative</h2>
                    <div className="flex gap-2">
                       {canDispatch && (
                          <button 
                            onClick={() => openEditModal(selectedPickup)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                            title="Edit Dossier"
                          >
                             <i className="ri-edit-line"></i>
                          </button>
                       )}
                       <span className="text-[10px] font-bold text-emerald-500 uppercase">#{selectedPickup.id.slice(0,8)}</span>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Collection Point</p>
                       <p className="text-[13px] md:text-sm font-bold text-slate-800 dark:text-white leading-relaxed">{selectedPickup.address}</p>
                    </div>

                     <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 p-5 bg-slate-50 dark:bg-black rounded-3xl border border-slate-100 dark:border-white/5">
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Waste Category</p>
                           <p className="text-xs md:text-sm font-bold text-emerald-600">{selectedPickup.waste_type}</p>
                        </div>
                        <div className="flex-1 p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Load Volume</p>
                           <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">{selectedPickup.waste_size}</p>
                        </div>
                     </div>

                     <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Customer Direct Contact</p>
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                 <i className="ri-phone-line text-lg"></i>
                              </div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{selectedPickup.user_phone || 'N/A'}</p>
                           </div>
                        </div>
                     </div>

                     <div className="pt-4 space-y-3">
                        {selectedPickup.rider_id ? (
                           <div className="flex flex-col gap-3">
                              <div className="p-5 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between group">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-lg font-bold">
                                       {selectedPickup.rider_name?.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                       <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Deployed Personnel</p>
                                       <p className="text-[13px] md:text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">{selectedPickup.rider_name}</p>
                                    </div>
                                 </div>
                                 {canDispatch && selectedPickup.status !== 'completed' && (
                                    <button 
                                      onClick={() => setShowAssignModal(true)}
                                      className="p-2.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-white/5 text-emerald-600 transition-colors"
                                      title="Change Rider"
                                    >
                                       <i className="ri-repeat-line text-lg"></i>
                                    </button>
                                 )}
                              </div>
                              
                              {canDispatch && selectedPickup.status !== 'completed' && selectedPickup.status !== 'cancelled' && (
                                 <div className="grid grid-cols-2 gap-3">
                                    <button 
                                      onClick={() => updatePickupStatus(selectedPickup.id, 'completed')}
                                      className="py-4 bg-emerald-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
                                    >
                                       Complete
                                    </button>
                                    <button 
                                      onClick={() => updatePickupStatus(selectedPickup.id, 'cancelled')}
                                      className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 transition-all"
                                    >
                                       Abort
                                    </button>
                                 </div>
                              )}
                           </div>
                        ) : (
                           canDispatch && (
                              <div className="flex flex-col gap-3">
                                 <button 
                                   onClick={() => setShowAssignModal(true)}
                                   className="w-full py-5 bg-indigo-600 text-white rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.15em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"
                                 >
                                    Initiate Deployment
                                 </button>
                                 <button 
                                   onClick={() => updatePickupStatus(selectedPickup.id, 'cancelled')}
                                   className="w-full py-4 text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase tracking-widest transition-colors"
                                 >
                                    Cancel Service Request
                                 </button>
                              </div>
                           )
                        )}
                     </div>
                 </div>
              </div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-white/[0.01] rounded-[2.5rem] md:rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800/50">
                 <i className="ri-cursor-line text-3xl text-slate-300 mb-3"></i>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select a listing to view dossier</p>
              </div>
           )}
        </div>
      </div>

      {showAssignModal && selectedPickup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowAssignModal(false)}></div>
           <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50">
                 <h2 className="text-xl font-bold text-slate-900">Assign Rider</h2>
                 <p className="text-xs font-medium text-slate-500 mt-1">Deploy an active rider to this location</p>
              </div>
              <div className="p-4 max-h-[350px] overflow-y-auto space-y-2">
                 {riders.map(r => (
                    <button 
                      key={r.id}
                      onClick={() => handleAssignRider(selectedPickup.id, r.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-all text-left group"
                    >
                       <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-violet-500 group-hover:text-white transition-all">
                          {r.full_name.charAt(0)}
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{r.full_name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Ready for Service</p>
                       </div>
                       <i className="ri-arrow-right-line text-slate-300 group-hover:text-violet-500"></i>
                    </button>
                 ))}
                 {riders.length === 0 && (
                    <div className="py-16 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                       No active riders available
                    </div>
                 )}
              </div>
              <div className="p-6">
                 <button 
                   onClick={() => setShowAssignModal(false)}
                   className="w-full py-4 text-xs font-bold text-slate-400 uppercase rounded-2xl hover:bg-slate-50 transition-all"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      {showEditModal && selectedPickup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowEditModal(false)}></div>
           <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/10">
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Modify Registry Entry</h2>
                 <p className="text-xs font-medium text-slate-500 mt-1">Adjust logistical data for administrative record</p>
              </div>
              <form onSubmit={handleEditOrder} className="p-10 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Service Address</label>
                       <textarea 
                         required
                         value={editFormData.address}
                         onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                         className="w-full px-5 py-4 bg-slate-50 dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                         rows={3}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Category</label>
                          <input 
                            type="text"
                            required
                            value={editFormData.waste_type}
                            onChange={e => setEditFormData({...editFormData, waste_type: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Volume</label>
                          <select 
                            value={editFormData.waste_size}
                            onChange={e => setEditFormData({...editFormData, waste_size: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                             <option value="Standard">Standard</option>
                             <option value="Large">Large</option>
                             <option value="Bulk">Bulk / Industrial</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Current Protocol (Status)</label>
                       <select 
                         value={editFormData.status}
                         onChange={e => setEditFormData({...editFormData, status: e.target.value as any})}
                         className="w-full px-5 py-4 bg-slate-50 dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                       >
                          <option value="requested">Requested</option>
                          <option value="scheduled">Scheduled (Rider Assigned)</option>
                          <option value="in_progress">In Progress (Active)</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                       </select>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-3xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all">
                       Commit Changes
                    </button>
                    <button type="button" onClick={() => setShowEditModal(false)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl text-xs font-bold uppercase transition-all">
                       Cancel
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
