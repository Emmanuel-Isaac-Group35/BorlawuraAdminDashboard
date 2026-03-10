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

  const currentRole = localStorage.getItem('simulatedRole') || 'Admin';
  const canManage = currentRole === 'super_admin' || currentRole === 'manager' || currentRole === 'Admin';

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
      alert('Access Denied.');
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

      alert('Rider registered successfully.');
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
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rider Fleet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and monitor delivery personnel</p>
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
            fileName="Rider_Fleet_Report"
            title="Rider Performance Report"
          />
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-teal-600 transition-all flex items-center gap-2"
            >
              <i className="ri-user-add-line"></i>
              Register Rider
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Riders', value: riders.length, icon: 'ri-steering-2-line', color: 'teal' },
          { label: 'Active', value: riders.filter(r => r.status === 'active').length, icon: 'ri-radar-line', color: 'emerald' },
          { label: 'Suspended', value: riders.filter(r => r.status === 'suspended').length, icon: 'ri-error-warning-line', color: 'rose' },
          { label: 'Avg Rating', value: riders.length ? (riders.reduce((acc, r) => acc + r.rating, 0) / riders.length).toFixed(1) : '5.0', icon: 'ri-star-line', color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500`}>
              <i className={`${stat.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text"
              placeholder="Search riders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'suspended'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                  statusFilter === status 
                  ? 'bg-teal-500 text-white' 
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Rider Identity</th>
                  <th className="px-6 py-4">Vehicle Details</th>
                  <th className="px-6 py-4">Performance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredRiders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {rider.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{rider.full_name}</p>
                          <p className="text-[10px] text-gray-500">{rider.phone_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{rider.vehicle_type}</p>
                      <p className="text-[10px] text-teal-600 font-bold tracking-widest">{rider.vehicle_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                         <div className="text-center">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">{rider.total_pickups}</p>
                            <p className="text-[9px] text-gray-400 uppercase font-black">Trips</p>
                         </div>
                         <div className="flex items-center gap-1 text-amber-500">
                            <i className="ri-star-fill text-[10px]"></i>
                            <span className="text-xs font-bold">{rider.rating}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                        rider.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/20'
                      }`}>
                        {rider.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedRider(rider)}
                        className="p-2 text-gray-400 hover:text-teal-500 transition-colors"
                      >
                        <i className="ri-eye-line text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Register New Rider</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" required
                    value={newRider.full_name}
                    onChange={e => setNewRider({...newRider, full_name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Samuel Adu"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                  <input 
                    type="tel" required
                    value={newRider.phone_number}
                    onChange={e => setNewRider({...newRider, phone_number: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="+233..."
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email (Optional)</label>
                  <input 
                    type="email"
                    value={newRider.email}
                    onChange={e => setNewRider({...newRider, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="rider@borlawura.gh"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicle Type</label>
                  <select 
                    value={newRider.vehicle_type}
                    onChange={e => setNewRider({...newRider, vehicle_type: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option>Motorbike</option>
                    <option>Tricycle (Aboboyaa)</option>
                    <option>Mini-Truck</option>
                    <option>Heavy Truck</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicle Number</label>
                  <input 
                    type="text" required
                    value={newRider.vehicle_number}
                    onChange={e => setNewRider({...newRider, vehicle_number: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="GW-829"
                  />
                </div>
              </div>
              
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-xs font-bold uppercase rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-teal-600">
                  Register Rider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedRider(null)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rider Dossier</h2>
              <button onClick={() => setSelectedRider(null)} className="text-gray-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-xl bg-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {selectedRider.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase">{selectedRider.full_name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-amber-500">
                     <i className="ri-star-fill"></i>
                     <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{selectedRider.rating} / 5.0</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vehicle</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedRider.vehicle_type}</p>
                  <p className="text-[10px] text-teal-600 font-bold">{selectedRider.vehicle_number}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedRider.phone_number}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">History</p>
                   <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedRider.total_pickups} Total Trips</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Record</p>
                   <p className="text-sm font-bold text-emerald-600">₵{(selectedRider.total_earnings || 0).toLocaleString()} Generated</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setSelectedRider(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white text-xs font-bold uppercase rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
