import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';
import ExportButton from './ExportButton';
import { sendSMS } from '../../../lib/sms';

interface Rider {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  vehicle_type: string;
  vehicle_number: string;
  status: 'active' | 'suspended';
  registration_status?: 'pending' | 'approved' | 'rejected' | null;
  rating: number;
  total_pickups: number;
  total_earnings: number;
  zone: string;
  address: string;
  created_at: string;
  avatar_url?: string;
}

interface RiderManagementProps {
  adminInfo?: any;
}

export default function RiderManagement({ adminInfo }: RiderManagementProps) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newRider, setNewRider] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    vehicle_type: 'Motorbike',
    vehicle_number: '',
    zone: '',
    address: '',
    avatar_url: ''
  });

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const role = (userInfo.role || 'Super Admin').toLowerCase().replace(/\s+/g, '_');
  const canManage = role === 'super_admin' || role === 'manager' || role === 'dispatcher';

  useEffect(() => {
    fetchRiders(true);
    
    const channel = supabase
      .channel('public:riders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'riders' 
      }, (payload) => {
        handleRealtimeUpdate(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRealtimeUpdate = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      setRiders(prev => [payload.new as Rider, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setRiders(prev => prev.map(rider => 
        rider.id === payload.new.id ? { ...rider, ...payload.new } : rider
      ));
    } else if (payload.eventType === 'DELETE') {
      setRiders(prev => prev.filter(rider => rider.id !== payload.old.id));
    }
  };

  const fetchRiders = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiders(data || []);
    } catch (error) {
      console.error('Error fetching riders:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      alert('Access Denied: Operational clearance required.');
      return;
    }

    try {
      const { error } = await supabase
        .from('riders')
        .insert([{
          ...newRider,
          status: 'active',
          rating: 5.0,
          total_pickups: 0,
          total_earnings: 0
        }]);

      if (error) throw error;

      await logActivity('New Rider Registered', 'riders', 'new', { 
        admin: userInfo.fullName,
        target_user_name: newRider.full_name,
        message: `${newRider.full_name} onboarded to the fleet.`
      });

      // Send Alert
      await sendSMS({
        recipients: [newRider.phone_number],
        message: `Welcome to the Fleet, ${newRider.full_name}! You are registered as a rider on BorlaWura. Your vehicle: ${newRider.vehicle_number}.`,
        sender: 'BORLAWURA'
      });

      alert('Personnel registered and notified via SMS.');
      setShowAddModal(false);
      resetForm();
      fetchRiders();
    } catch (err: any) {
      console.error('Error registering rider:', err);
      alert(`Registration Failed: ${err.message}`);
    }
  };

  const handleUpdateRider = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!selectedRider || !canManage) return;

     try {
       const { error } = await supabase
         .from('riders')
         .update(newRider)
         .eq('id', selectedRider.id);

       if (error) throw error;

      await logActivity('Rider Profile Updated', 'riders', selectedRider.id, { 
        riderId: selectedRider.id, 
        admin_name: userInfo.fullName,
        target_user_name: newRider.full_name,
        message: `Logistical data adjusted for ${newRider.full_name}.`
      });

       // Send Alert
       await sendSMS({
         recipients: [newRider.phone_number],
         message: `Hello ${newRider.full_name}, your BorlaWura rider profile has been updated. Please check the rider app for latest details.`,
         sender: 'BORLAWURA'
       });

       alert('Rider profile synchronized across fleet database.');
       setShowAddModal(false);
       resetForm();
       fetchRiders();
     } catch (err: any) {
       alert(`Sync Failed: ${err.message}`);
     }
  };

  const openEditModal = (rider: Rider) => {
     setSelectedRider(rider);
     setNewRider({
        full_name: rider.full_name,
        phone_number: rider.phone_number,
        email: rider.email || '',
        vehicle_type: rider.vehicle_type,
        vehicle_number: rider.vehicle_number,
        zone: rider.zone || '',
        address: rider.address || '',
        avatar_url: rider.avatar_url || ''
     });
     setIsEditing(true);
     setShowAddModal(true);
  };

  const handleDeleteRider = async (id: string) => {
    if (!canManage) {
      alert('Access Denied: Administrative authorization required for decommission.');
      return;
    }
    if (!window.confirm('CRITICAL ACTION: Are you sure you want to erase this rider from the fleet dossier forever? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('riders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Personnel record decommissioned and deleted.');
      fetchRiders();
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!canManage) {
      alert('Access Denied: Operational clearance required.');
      return;
    }

    try {
      const status = (currentStatus || '').toLowerCase().trim();
      const newStatus = status === 'active' ? 'suspended' : 'active';
      const newRegStatus = newStatus === 'active' ? 'approved' : (selectedRider?.registration_status || 'approved');
      
      // 1. Update Rider table
      const { error } = await supabase
        .from('riders')
        .update({ 
          status: newStatus,
          registration_status: newRegStatus
        })
        .eq('id', id);

      if (error) throw error;

      // 2. Mirror status to user table
      await supabase
        .from('users')
        .update({ 
          status: newStatus,
          registration_status: newRegStatus
        })
        .eq('id', id);

      
      const actionLabel = newStatus === 'suspended' ? 'Suspended' : 'Activated';
      await logActivity(`${actionLabel} Rider`, 'riders', id, { 
        status: newStatus,
        message: `${actionLabel} rider #${id.substring(0,8)}`
      });

      alert(`Personnel ${actionLabel} successfully.`);
      fetchRiders();

      // Update local state if modal is open
      if (selectedRider && selectedRider.id === id) {
        setSelectedRider({ ...selectedRider, status: newStatus as any });
      }
    } catch (err: any) {
      alert(`Status Update Failed: ${err.message}`);
    }
  };

  const resetForm = () => {
    setNewRider({
      full_name: '',
      phone_number: '',
      email: '',
      vehicle_type: 'Motorbike',
      vehicle_number: '',
      zone: '',
      address: '',
      avatar_url: ''
    });
    setIsEditing(false);
    setSelectedRider(null);
  };

  const filteredRiders = riders.filter(rider => {
    const nameMatch = rider.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const phoneMatch = rider.phone_number?.includes(searchQuery) || false;
    const matchesSearch = nameMatch || phoneMatch;
    const matchesStatus = statusFilter === 'all' || rider.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Riders</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage all your field riders here</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButton 
            data={filteredRiders.map(r => ({
              Name: r.full_name,
              Phone: r.phone_number,
              Vehicle: r.vehicle_type,
              Number: r.vehicle_number,
              Zone: r.zone,
              Address: r.address,
              Status: r.status,
              Rating: r.rating,
              Pickups: r.total_pickups
            }))}
            fileName="Riders_List_Report"
            title="Rider List"
          />
          {canManage && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-8 py-3.5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2.5 group"
            >
              <i className="ri-user-add-line text-lg group-hover:rotate-12 transition-transform"></i>
              Add New Rider
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Fleet', value: riders.length, icon: 'ri-e-bike-2-line', color: 'emerald' },
          { label: 'Active Service', value: riders.filter(r => r.status === 'active').length, icon: 'ri-radar-line', color: 'emerald' },
          { label: 'Suspended', value: riders.filter(r => r.status === 'suspended').length, icon: 'ri-error-warning-line', color: 'rose' },
          { label: 'Fleet Rating', value: riders.length ? (riders.reduce((acc, r) => acc + r.rating, 0) / riders.length).toFixed(1) : '5.0', icon: 'ri-star-smile-line', color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 shadow-sm flex items-center gap-5 transition-all hover:scale-[1.02]">
            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600`}>
              <i className={`${stat.icon} text-2xl`}></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50/10">
          <div className="relative flex-1 max-w-md w-full group">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500"></i>
            <input 
              type="text"
              placeholder="Filter by name or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium shadow-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 p-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl w-full lg:w-auto">
            <div className="flex items-center gap-1 w-full sm:w-auto">
              {['all', 'active', 'suspended'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 sm:flex-none px-5 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${
                    statusFilter === status 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 mt-5 font-bold uppercase tracking-[0.2em]">Syncing Fleet...</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">
                    <th className="px-8 py-5 text-left">Rider Info</th>
                    <th className="px-8 py-5 text-left">Location (Area)</th>
                    <th className="px-8 py-5 text-left">Work Record</th>
                    <th className="px-8 py-5 text-left">Status</th>
                    <th className="px-8 py-5 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredRiders.map((rider) => (
                    <tr key={rider.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-emerald-500/10 overflow-hidden">
                            {rider.avatar_url ? (
                               <img src={rider.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : rider.full_name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{rider.full_name}</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-1">{rider.phone_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{rider.vehicle_type}</p>
                        <p className="text-[10px] text-emerald-600 font-bold tracking-[0.15em] mt-1">{rider.vehicle_number}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1.5">{rider.zone || 'No Zone'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-6">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-slate-900 dark:text-white">{rider.total_pickups}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Pickups</span>
                           </div>
                           <div className="flex flex-col">
                              <div className="flex items-center gap-1 text-amber-500">
                                 <i className="ri-star-fill text-[9px]"></i>
                                 <span className="text-[13px] font-bold">{rider.rating}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Rating</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                          rider.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20' 
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100/50 dark:border-rose-500/20'
                        }`}>
                          {rider.status}
                        </span>
                      </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex justify-end gap-2">
                               <button 
                                 onClick={() => setSelectedRider(rider)}
                                 className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-all border border-transparent"
                                 title="Visual Statistics"
                               >
                                 <i className="ri-folder-user-line text-lg"></i>
                               </button>
                               <button 
                                  onClick={() => toggleStatus(rider.id, rider.status)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${rider.status === 'active' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white' : 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white'}`}
                                  title={rider.status === 'active' ? 'Suspend Rider' : 'Activate Rider'}
                               >
                                  <i className={rider.status === 'active' ? 'ri-checkbox-circle-line text-lg' : 'ri-shield-flash-line text-lg'}></i>
                               </button>
                               {canManage && (
                                 <button 
                                   onClick={() => openEditModal(rider)}
                                   className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                   title="Modify Profile"
                                 >
                                   <i className="ri-edit-line text-lg"></i>
                                 </button>
                               )}
                               {canManage && (
                                 <button 
                                   onClick={() => handleDeleteRider(rider.id)}
                                   className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                   title="Decommission Rider"
                                 >
                                   <i className="ri-delete-bin-line text-lg"></i>
                                 </button>
                               )}
                             </div>
                          </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {filteredRiders.map((rider) => (
                <div key={rider.id} className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                        {rider.avatar_url ? (
                           <img src={rider.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : rider.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{rider.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{rider.phone_number}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider ${
                      rider.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/20' 
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100/20'
                    }`}>
                      {rider.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Vehicle & Area</p>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{rider.vehicle_type} - {rider.zone || 'No Zone'}</p>
                      <p className="text-[9px] text-emerald-600 font-bold">{rider.vehicle_number}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Performance</p>
                      <div className="flex items-center justify-between">
                         <span className="text-[11px] font-bold text-slate-800 dark:text-white">{rider.total_pickups} <span className="text-[9px] text-slate-400">PKS</span></span>
                         <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5"><i className="ri-star-fill text-[8px]"></i>{rider.rating}</span>
                      </div>
                    </div>
                  </div>

                   <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-white/5 gap-2">
                     <button 
                       onClick={() => setSelectedRider(rider)}
                       className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400"
                       title="View Details"
                     >
                       <i className="ri-folder-user-line text-lg"></i>
                     </button>
                     <button 
                        onClick={() => toggleStatus(rider.id, rider.status)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl shadow-sm ${rider.status === 'active' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-rose-100/50 text-rose-500'}`}
                        title="Toggle Status"
                     >
                        <i className={rider.status === 'active' ? 'ri-checkbox-circle-line' : 'ri-shield-flash-line'}></i>
                     </button>
                     {canManage && (
                       <button 
                         onClick={() => openEditModal(rider)}
                         className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
                         title="Edit Rider"
                       >
                         <i className="ri-edit-line text-lg"></i>
                       </button>
                     )}
                     {canManage && (
                        <button 
                          onClick={() => handleDeleteRider(rider.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500"
                          title="Delete Rider"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                     )}
                   </div>
                </div>
              ))}
              {filteredRiders.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-none">
                  Fleet personnel not found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedRider(null)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Rider Dossier</h2>
              <button onClick={() => setSelectedRider(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-10">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-emerald-500/20 overflow-hidden">
                  {selectedRider.avatar_url ? (
                     <img src={selectedRider.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : selectedRider.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedRider.full_name}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${selectedRider.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {selectedRider.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-amber-500">
                       <i className="ri-star-fill text-sm"></i>
                       <span className="text-sm font-bold">{selectedRider.rating} / 5.0 Rating</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Asset Assigned</p>
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white">{selectedRider.vehicle_type}</p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{selectedRider.vehicle_number}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contact Link</p>
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white">{selectedRider.phone_number}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{selectedRider.email || 'No email registered'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-slate-100 dark:border-slate-800/60">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operational Life</p>
                   <p className="text-[13px] font-bold text-slate-900 dark:text-white">{selectedRider.total_pickups} Completed Orders</p>
                   <p className="text-[11px] text-slate-500 font-medium mt-0.5">Since {new Date(selectedRider.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20">
                   <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Revenue Potential</p>
                   <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">₵{(selectedRider.total_earnings || 0).toLocaleString()}</p>
                   <p className="text-[9px] font-bold text-emerald-600/60 uppercase mt-0.5">Gross Generated</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedRider(null)} 
                className="w-full py-4 bg-emerald-600 text-white rounded-3xl text-xs font-bold uppercase tracking-widest transition-all hover:shadow-2xl active:scale-[0.98] shadow-emerald-600/20"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rider Modal Refined */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{isEditing ? 'Modify Personnel' : 'Personnel Onboarding'}</h2>
              <button 
                onClick={() => { setShowAddModal(false); resetForm(); }} 
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={isEditing ? handleUpdateRider : handleRegister} className="p-8 space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                    {newRider.avatar_url ? (
                      <img src={newRider.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <i className="ri-user-line text-3xl text-slate-300"></i>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:bg-emerald-700 transition-all border-4 border-white dark:border-slate-950">
                    <i className="ri-camera-line"></i>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${Math.random()}.${fileExt}`;
                          const filePath = `avatars/${fileName}`;

                          const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(filePath, file);

                          if (uploadError) throw uploadError;

                          const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(filePath);

                          setNewRider({ ...newRider, avatar_url: publicUrl });
                        } catch (err: any) {
                          alert('Error uploading image: ' + err.message);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Rider Photo</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Identity</label>
                  <input 
                    type="text" required
                    value={newRider.full_name}
                    onChange={e => setNewRider({...newRider, full_name: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Samuel Adu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact String</label>
                  <input 
                    type="tel" required
                    value={newRider.phone_number}
                    onChange={e => setNewRider({...newRider, phone_number: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="+233..."
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Connection</label>
                  <input 
                    type="email"
                    value={newRider.email}
                    onChange={e => setNewRider({...newRider, email: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="rider@borlawura.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vehicle Class</label>
                  <select 
                    value={newRider.vehicle_type}
                    onChange={e => setNewRider({...newRider, vehicle_type: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option>Motorbike</option>
                    <option>Tricycle (Aboboyaa)</option>
                    <option>Mini-Truck</option>
                    <option>Heavy Truck</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Serial (ID)</label>
                  <input 
                    type="text" required
                    value={newRider.vehicle_number}
                    onChange={e => setNewRider({...newRider, vehicle_number: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="GW-829-23"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Operating Zone</label>
                   <input 
                    type="text"
                    value={newRider.zone}
                    onChange={e => setNewRider({...newRider, zone: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Accra Central"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                   <input 
                    type="text"
                    value={newRider.address}
                    onChange={e => setNewRider({...newRider, address: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="House No 12..."
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 py-4 text-xs font-bold uppercase text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
                  Abort
                </button>
                 <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 leading-none">
                   {isEditing ? 'Confirm Update' : 'Initialize Rider'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
