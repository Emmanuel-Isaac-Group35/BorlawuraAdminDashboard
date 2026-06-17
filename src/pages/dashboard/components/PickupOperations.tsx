import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';
import { sendSMS } from '../../../lib/sms';
import ExportButton from './ExportButton';
import { DesignInput, DesignButton, StatusBadge, PremiumCard } from './DesignCore';

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

interface PickupOperationsProps {
  adminInfo?: any;
}

export default function PickupOperations({ adminInfo }: PickupOperationsProps) {
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPickup, setSelectedPickup] = useState<PickupRequest | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
     address: '',
     waste_type: '',
     waste_size: '',
     status: ''
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const role = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const canDispatch = role === 'admin' || role === 'manager' || role === 'dispatcher';

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
      // 1. Fetch orders with explicit mapping to avoid schema cache failures
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:user_id(full_name, phone_number),
          rider:rider_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Primary fetch failed, attempting flattened recovery:', error);
        // Fallback: Fetch without joins if relationships are broken
        const { data: fallbackData, error: lError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (lError) throw lError;
        if (fallbackData) {
          setPickups(fallbackData.map((p: any) => ({
            ...p,
            user_name: p.customer_name || 'Legacy Customer',
            user_phone: p.notes?.match(/Phone: (\d+)/)?.[1] || 'N/A',
            rider_name: 'Unassigned',
            location: validateLocation({ lat: p.pickup_latitude, lng: p.pickup_longitude })
          })));
        }
        return;
      }
      
      if (data) {
        setPickups(data.map((p: any) => ({
          ...p,
          user_name: p.user?.full_name || p.customer_name || 'Anonymous User',
          user_phone: p.user?.phone_number || 'N/A',
          rider_name: p.rider?.full_name || null,
          waste_type: p.waste_type || 'General Waste',
          waste_size: p.waste_size || 'Standard',
          location: validateLocation({ lat: p.pickup_latitude, lng: p.pickup_longitude })
        })));
      }
    } catch (e: any) {
      console.error('Critical Fetch Error:', e);
      alert('Order Registry Sync Failure: ' + e.message);
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
      
      alert(`Job status successfully updated to ${newStatus}.`);
      setShowDetailsModal(false);
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
          waste_type: editFormData.waste_type, 
          waste_size: editFormData.waste_size,
          status: editFormData.status
        })
        .eq('id', selectedPickup.id);

      if (error) throw error;
      
      alert('Order registry entry synchronized successfully.');
      setShowEditModal(false);
      setSelectedPickup(null);
      fetchPickups();
    } catch (error) {
       alert('Registry update failed.');
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
    if (!canDispatch) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ rider_id: riderId, status: 'scheduled' })
        .eq('id', pickupId);

      if (error) throw error;
      
      alert('Rider has been assigned successfully.');
      setShowAssignModal(false);
      setShowDetailsModal(false);
      setSelectedPickup(null);
      fetchPickups();
    } catch (error) {
       alert('Dispatch error.');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400';
      case 'scheduled': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400';
      case 'in_progress': return 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400';
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'cancelled': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400';
      default: return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400';
    }
  };



  const getStatusBadgeType = (status: string) => {
    if (status === 'requested') return 'warning';
    if (status === 'completed') return 'success';
    return 'info';
  };

  const filteredPickups = pickups.filter(p => {
    const matchesSearch = (p.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary counts for stat cards
  const statCounts = {
    total: pickups.length,
    requested: pickups.filter(p => p.status === 'requested').length,
    in_progress: pickups.filter(p => p.status === 'in_progress').length,
    completed: pickups.filter(p => p.status === 'completed').length,
    cancelled: pickups.filter(p => p.status === 'cancelled').length,
  };

  return (
    <div className="space-y-5 md:space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Orders Registry</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Full operational log of all service requests and deployments</p>
        </div>
        <ExportButton data={filteredPickups} fileName="Pickup_List" title="Reports" />
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Total Orders', value: statCounts.total, icon: 'ri-file-list-3-line', color: 'from-slate-500 to-slate-700', bg: 'bg-slate-50 dark:bg-slate-800/50' },
          { label: 'Requested', value: statCounts.requested, icon: 'ri-time-line', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'In Progress', value: statCounts.in_progress, icon: 'ri-loader-4-line', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Completed', value: statCounts.completed, icon: 'ri-checkbox-circle-line', color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Cancelled', value: statCounts.cancelled, icon: 'ri-close-circle-line', color: 'from-rose-500 to-red-600', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800/50 p-3 sm:p-5 flex flex-col gap-2 transition-transform hover:scale-[1.02]`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                <i className={`${stat.icon} text-white text-sm sm:text-base`}></i>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">{stat.value}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Selected Order Banner */}
      {selectedPickup && (
        <div className="bg-emerald-600/5 border border-emerald-500/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0">
              {selectedPickup.user_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Selection</p>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase truncate">{selectedPickup.user_name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DesignButton 
              onClick={() => setShowDetailsModal(true)}
              variant="secondary"
              className="flex-1 sm:flex-none px-5 py-3 text-[10px] sm:text-[11px]"
            >
              Manage Job Dossier
            </DesignButton>
            <button
              onClick={() => setSelectedPickup(null)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-all flex-shrink-0"
              title="Deselect"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* Orders List - Full Width */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
          <div className="flex-1 max-w-md">
            <DesignInput 
              label="Search Operations"
              placeholder="Name or Request ID..."
              icon="ri-search-line"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1 sm:gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-2xl overflow-x-auto scrollbar-hide w-full md:w-auto">
            {['all', 'requested', 'scheduled', 'in_progress', 'completed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 md:flex-none px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-bold uppercase rounded-lg sm:rounded-xl transition-all whitespace-nowrap ${
                  statusFilter === s ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        
        {/* Results Count */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-slate-50 dark:border-slate-800/50">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {filteredPickups.length} {filteredPickups.length === 1 ? 'order' : 'orders'} found
          </p>
        </div>

        {/* Orders Content */}
        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-16 sm:py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Loading Requests...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50 max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh]">
            {filteredPickups.map((p) => (
              <div 
                key={p.id} 
                className={`p-3 sm:p-4 md:p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all cursor-pointer group ${
                  selectedPickup?.id === p.id ? 'bg-emerald-50/30 dark:bg-emerald-500/5 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'
                }`}
                onClick={() => setSelectedPickup(p)}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{p.id.slice(0,8)}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusStyle(p.status)}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.user_name}</h3>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold tracking-tight">{p.user_phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedPickup(p); setShowDetailsModal(true); }}
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 shadow-sm transition-all"
                      title="View Detailed Dossier"
                    >
                      <i className="ri-external-link-line text-base sm:text-lg"></i>
                    </button>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase mb-1">{p.waste_type}</p>
                      <div className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-widest">{p.waste_size}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] min-w-0">
                    <i className="ri-map-pin-line text-emerald-500 flex-shrink-0"></i>
                    <span className="truncate flex-1 font-medium">{p.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] flex-shrink-0">
                    <i className="ri-time-line flex-shrink-0"></i>
                    <span className="font-medium">{new Date(p.created_at).toLocaleDateString()} · {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {p.rider_name && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold">
                        <i className="ri-motorbike-line"></i> {p.rider_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredPickups.length === 0 && (
              <div className="py-16 sm:py-24 text-center">
                <i className="ri-inbox-2-line text-4xl text-slate-200 dark:text-slate-700 mb-4 block"></i>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">No requests found</p>
                <p className="text-slate-300 dark:text-slate-600 text-[10px] mt-1">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedPickup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowAssignModal(false)}></div>
           <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                 <h2 className="text-xl font-bold text-slate-900">Assign Rider</h2>
                 <p className="text-xs text-slate-500 mt-1">Deploy an active rider to this location</p>
              </div>
              <div className="p-4 max-h-[350px] overflow-y-auto space-y-2">
                 {riders.map(r => (
                    <button key={r.id} onClick={() => handleAssignRider(selectedPickup.id, r.id)} className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-violet-50 transition-all text-left group">
                       <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-violet-500 group-hover:text-white transition-all">{r.full_name.charAt(0)}</div>
                       <div className="flex-1"><p className="text-sm font-bold text-slate-900">{r.full_name}</p></div>
                       <i className="ri-arrow-right-line text-slate-300"></i>
                    </button>
                 ))}
                 {riders.length === 0 && <div className="py-16 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">No active riders available</div>}
              </div>
              <div className="p-6"><button onClick={() => setShowAssignModal(false)} className="w-full py-4 text-xs font-bold text-slate-400 uppercase rounded-2xl hover:bg-slate-50 transition-all">Cancel</button></div>
           </div>
        </div>
      )}

      {/* High-Fidelity Job Dossier Modal */}
      {showDetailsModal && selectedPickup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowDetailsModal(false)}></div>
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950 z-10">
                 <div>
                   <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Job Dossier</h2>
                   <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-1">Order #{selectedPickup.id.slice(0,8)}</p>
                 </div>
                 <button onClick={() => setShowDetailsModal(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-100 dark:border-white/5 transition-all text-slate-400 hover:text-rose-500">
                   <i className="ri-close-line text-2xl"></i>
                 </button>
              </div>

              <div className="p-6 md:p-10 space-y-6 md:space-y-10">
                 {/* Identity card */}
                 <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 rounded-[2rem] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl font-bold">{selectedPickup.user_name.charAt(0)}</div>
                       <div>
                          <p className="text-[16px] font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{selectedPickup.user_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{selectedPickup.user_phone}</p>
                       </div>
                    </div>
                    <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border ${getStatusBadgeType(selectedPickup.status) === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                       {selectedPickup.status}
                    </span>
                 </div>

                 {/* Waste Details */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="p-4 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-white/5">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-3">Waste Stream</p>
                       <p className="text-sm font-black text-slate-800 dark:text-white uppercase underline decoration-emerald-500 decoration-2 underline-offset-4">{selectedPickup.waste_type}</p>
                    </div>
                    <div className="p-4 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-white/5">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-3">Volume Metrics</p>
                       <p className="text-sm font-black text-slate-800 dark:text-white uppercase underline decoration-amber-500 decoration-2 underline-offset-4">{selectedPickup.waste_size}</p>
                    </div>
                 </div>

                 {/* Geographical Intelligence */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Collection Coordinates</p>
                    <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-slate-900 dark:bg-black border border-slate-800 shadow-2xl flex gap-4">
                       <i className="ri-map-pin-2-fill text-2xl text-emerald-500 mt-1"></i>
                       <p className="text-sm md:text-base font-medium text-slate-300 leading-relaxed italic pr-4">"{selectedPickup.address}"</p>
                    </div>
                 </div>

                 {/* Action protocols */}
                 <div className="space-y-4 pt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Transition Protocols</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <button onClick={() => setShowAssignModal(true)} className="flex items-center justify-between p-6 bg-indigo-600 text-white rounded-[2rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 group">
                          <span className="text-[11px] font-black uppercase tracking-widest">Assign Rider</span>
                          <i className="ri-steering-2-line text-xl group-hover:rotate-12 transition-transform"></i>
                       </button>
                       <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => updatePickupStatus(selectedPickup.id, 'completed')} className="py-6 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg">Finalize Job</button>
                          <button onClick={() => updatePickupStatus(selectedPickup.id, 'cancelled')} className="py-6 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:text-rose-500 transition-all">Abort Request</button>
                       </div>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-50 dark:border-white/5 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Manifest Logged: {new Date(selectedPickup.created_at).toLocaleString()}</p>
                 </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
