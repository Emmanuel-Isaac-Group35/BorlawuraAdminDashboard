import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';

interface Rider {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  vehicle_type: string;
  vehicle_number: string;
  status: 'active' | 'suspended';
  rating: number;
  total_pickups: number;
  total_earnings: number;
  created_at: string;
}

export default function RiderManagement() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [newRider, setNewRider] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    vehicle_type: 'Motorbike',
    vehicle_number: ''
  });

  const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const role = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const canManage = role === 'super_admin' || role === 'operations_admin' || role === 'admin' || userInfo.role === 'Admin';

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
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiders(data || []);
    } catch (error) {
      console.error('Error fetching riders:', error);
    } finally {
      setLoading(false);
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

      alert('Personnel registered successfully.');
      setShowAddModal(false);
      setNewRider({
        full_name: '',
        phone_number: '',
        email: '',
        vehicle_type: 'Motorbike',
        vehicle_number: ''
      });
      fetchRiders();
    } catch (err: any) {
      console.error('Error registering rider:', err);
      alert(`Registration Failed: ${err.message}`);
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Fleet Operations</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage and monitor field personnel and vehicle assets</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={filteredRiders.map(r => ({
              Name: r.full_name,
              Phone: r.phone_number,
              Vehicle: r.vehicle_type,
              Number: r.vehicle_number,
              Status: r.status,
              Rating: r.rating,
              Pickups: r.total_pickups
            }))}
            fileName="Fleet_Asset_Report"
            title="Operational Fleet Report"
          />
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all flex items-center gap-2"
            >
              <i className="ri-user-add-line"></i>
              Register Personnel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Fleet', value: riders.length, icon: 'ri-e-bike-2-line', color: 'indigo' },
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
        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/10">
          <div className="relative flex-1 max-w-md w-full group">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500"></i>
            <input 
              type="text"
              placeholder="Filter by name or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
            />
          </div>
          <div className="flex gap-2 p-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
            {['all', 'active', 'suspended'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${
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

        {loading ? (
          <div className="p-24 flex justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">
                  <th className="px-8 py-5 text-left">Rider Identity</th>
                  <th className="px-8 py-5 text-left">Asset Details</th>
                  <th className="px-8 py-5 text-left">Operational Data</th>
                  <th className="px-8 py-5 text-left">Service Status</th>
                  <th className="px-8 py-5 text-right">Registry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filteredRiders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-emerald-500/10">
                          {rider.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{rider.full_name}</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-1">{rider.phone_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{rider.vehicle_type}</p>
                      <p className="text-[10px] text-emerald-600 font-bold tracking-[0.15em] mt-1">{rider.vehicle_number}</p>
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
                       <button 
                         onClick={() => setSelectedRider(rider)}
                         className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                       >
                         <i className="ri-folder-user-line text-lg"></i>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-emerald-500/20">
                  {selectedRider.full_name?.charAt(0)}
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
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl text-xs font-bold uppercase tracking-widest transition-all hover:shadow-2xl active:scale-[0.98]"
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Personnel Onboarding</h2>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-8 space-y-6">
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
              </div>
              
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-xs font-bold uppercase text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
                  Abort
                </button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-bold shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95">
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
