import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';

interface User {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
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

  // Role-based access control (RBAC)
  const currentRole = localStorage.getItem('simulatedRole') || 'Admin';
  const canModify = currentRole === 'super_admin' || currentRole === 'manager' || currentRole === 'Admin';

  useEffect(() => {
    fetchUsers();

    // Set up Real-time subscription
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
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    if (!canModify) {
      alert('You do not have permission to modify user status.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: currentStatus === 'active' ? 'suspended' : 'active' })
        .eq('id', id);

      if (error) throw error;
      
      const action = currentStatus === 'active' ? 'Suspended' : 'Activated';
      alert(`User ${action} Successfully`);
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      alert(`Operation Failed: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const nameMatch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const phoneMatch = user.phone_number?.includes(searchQuery) || false;
    const matchesSearch = nameMatch || phoneMatch;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage registered customers</p>
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
            fileName="Users_Report"
            title="User Database Report"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Users', value: users.length, color: 'teal', icon: 'ri-group-line' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, color: 'emerald', icon: 'ri-checkbox-circle-line' },
          { label: 'Suspended', value: users.filter(u => u.status === 'suspended').length, color: 'rose', icon: 'ri-error-warning-line' },
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
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
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

        {error ? (
          <div className="p-10 text-center">
            <p className="text-rose-500 text-sm font-bold">{error}</p>
            <button onClick={fetchUsers} className="mt-4 text-teal-600 underline text-xs font-bold">Try Again</button>
          </div>
        ) : loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500 mt-4 font-bold uppercase tracking-widest">Loading Users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {user.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{user.full_name}</p>
                          <p className="text-[10px] text-gray-500">{user.phone_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium truncate max-w-[150px]">{user.address || 'Not set'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-teal-600">₵{(user.balance || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedUser(user)}
                          className="p-2 text-gray-400 hover:text-teal-500 transition-colors"
                          title="View Details"
                        >
                          <i className="ri-eye-line text-lg"></i>
                        </button>
                        {canModify && (
                          <button 
                            onClick={() => toggleUserStatus(user.id, user.status)}
                            className={`p-2 transition-colors ${user.status === 'active' ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'}`}
                            title={user.status === 'active' ? 'Suspend User' : 'Activate User'}
                          >
                            <i className={user.status === 'active' ? 'ri-user-forbid-line text-lg' : 'ri-user-follow-line text-lg'}></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Details</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-rose-500 transition-colors">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-xl bg-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {selectedUser.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedUser.full_name}</h3>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-1">{selectedUser.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedUser.phone_number}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedUser.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Address</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedUser.address || 'Address not provided'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Member Since</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Balance</p>
                  <p className="text-sm font-bold text-teal-600">₵{(selectedUser.balance || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {canModify && (
                  <button 
                    onClick={() => {
                      toggleUserStatus(selectedUser.id, selectedUser.status);
                      setSelectedUser(null);
                    }}
                    className={`flex-1 py-3 text-xs font-bold uppercase rounded-lg transition-all ${
                      selectedUser.status === 'active' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {selectedUser.status === 'active' ? 'Suspend User' : 'Activate User'}
                  </button>
                )}
                <button onClick={() => setSelectedUser(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white text-xs font-bold uppercase rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
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
