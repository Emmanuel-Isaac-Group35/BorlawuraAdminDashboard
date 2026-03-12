import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';

interface User {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  location: string;
  status: 'active' | 'suspended';
  created_at: string;
  balance: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState('all');

  const settings = JSON.parse(localStorage.getItem('borlawura_settings') || '{}');
  const availableZones = settings.zones || ['Accra Central', 'Osu', 'Tema', 'Madina', 'Legon', 'Spintex'];

  const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const role = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const canModify = role === 'super_admin' || role === 'manager' || role === 'admin' || userInfo.role === 'Admin';

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch customer records');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    if (!canModify) {
      alert('Access Denied: Administrative privileges required.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: currentStatus === 'active' ? 'suspended' : 'active' })
        .eq('id', id);

      if (error) throw error;
      
      const action = currentStatus === 'active' ? 'Suspended' : 'Activated';
      alert(`User ${action} successfully.`);
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      alert(`Update Failed: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const nameMatch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const phoneMatch = user.phone_number?.includes(searchQuery) || false;
    const matchesSearch = nameMatch || phoneMatch;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesArea = areaFilter === 'all' || (user as any).location === areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">User Portfolio</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Institutional registry of platform participants and service requestors</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={filteredUsers.map(u => ({
              Name: u.full_name,
              Phone: u.phone_number,
              Email: u.email,
              Address: u.address,
              Status: u.status,
              Balance: u.balance,
              Joined: new Date(u.created_at).toLocaleDateString()
            }))}
            fileName="User_Audit_Report"
            title="Institutional User Registry"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Registered Users', value: users.length, color: 'indigo', icon: 'ri-team-line' },
          { label: 'Active Service', value: users.filter(u => u.status === 'active').length, color: 'emerald', icon: 'ri-checkbox-circle-line' },
          { label: 'Account Suspensions', value: users.filter(u => u.status === 'suspended').length, color: 'rose', icon: 'ri-forbid-2-line' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 shadow-sm flex items-center gap-5 transition-all hover:scale-[1.02]">
            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600`}>
              <i className={`${stat.icon} text-2xl`}></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/10">
          <div className="relative flex-1 max-w-md w-full group">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500"></i>
            <input 
              type="text"
              placeholder="Search by name, phone or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 p-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
            <select 
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-4 py-2 text-[10px] font-bold uppercase rounded-xl bg-transparent text-slate-500 border-none focus:ring-0 cursor-pointer"
            >
              <option value="all">All Operational Sectors</option>
              {availableZones.map((zone: string) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
            <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 self-center mx-1"></div>
            {['all', 'active', 'suspended'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${
                  statusFilter === status 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="p-16 text-center">
            <p className="text-rose-500 text-sm font-bold">{error}</p>
            <button onClick={fetchUsers} className="mt-4 px-6 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Retry Connection</button>
          </div>
        ) : loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 mt-5 font-bold uppercase tracking-[0.2em]">Synchronizing Records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">
                  <th className="px-8 py-5 text-left">Customer Profile</th>
                  <th className="px-8 py-5 text-left">Sector (Area)</th>
                  <th className="px-8 py-5 text-left">Wallet Funds</th>
                  <th className="px-8 py-5 text-left">Account Status</th>
                  <th className="px-8 py-5 text-right">Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-indigo-500/10">
                          {user.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-1">{user.phone_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                         <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{(user as any).location || 'Unassigned'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[13px] font-bold text-emerald-600">₵{(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                        user.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100/50 dark:border-rose-500/20'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedUser(user)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                        >
                          <i className="ri-profile-line text-lg"></i>
                        </button>
                        {canModify && (
                          <button 
                            onClick={() => toggleUserStatus(user.id, user.status)}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${user.status === 'active' ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10'}`}
                          >
                            <i className={user.status === 'active' ? 'ri-user-forbid-line text-lg' : 'ri-user-follow-line text-lg'}></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedUser(null)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Customer Information</h2>
              <button onClick={() => setSelectedUser(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-10">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-indigo-500/20">
                  {selectedUser.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedUser.full_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${selectedUser.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {selectedUser.status}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">ID: {selectedUser.id.slice(0,8)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="p-5 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-slate-100 dark:border-slate-800/60">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Registered Phone</p>
                   <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.phone_number}</p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-slate-100 dark:border-slate-800/60">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Account</p>
                   <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedUser.email}</p>
                </div>
                <div className="col-span-2 p-5 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-slate-100 dark:border-slate-800/60">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Service Address</p>
                   <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">{selectedUser.address || 'No address registered'}</p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-white/[0.01] rounded-3xl border border-slate-100 dark:border-slate-800/60">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Member Since</p>
                   <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100/50 dark:border-emerald-500/20">
                   <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Wallet Funds</p>
                   <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">₵{(selectedUser.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="flex gap-4">
                {canModify && (
                  <button 
                    onClick={() => {
                      toggleUserStatus(selectedUser.id, selectedUser.status);
                      setSelectedUser(null);
                    }}
                    className={`flex-1 py-4 text-xs font-bold uppercase rounded-3xl transition-all shadow-xl ${
                      selectedUser.status === 'active' 
                      ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                    }`}
                  >
                    {selectedUser.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                  </button>
                )}
                <button 
                   onClick={() => setSelectedUser(null)} 
                   className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white text-xs font-bold uppercase rounded-3xl hover:bg-slate-200 transition-all"
                >
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
