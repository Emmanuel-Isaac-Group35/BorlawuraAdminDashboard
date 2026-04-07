import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';
import ExportButton from './ExportButton';
import { sendSMS } from '../../../lib/sms';

interface User {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  location: string;
  role: string;
  status: 'active' | 'suspended';
  created_at: string;
  balance: number;
  subscription_type: string;
  avatar_url?: string;
}

interface UserManagementProps {
  adminInfo?: any;
}

export default function UserManagement({ adminInfo }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    address: '',
    location: 'Accra Central',
    balance: 0,
    role: 'customer',
    subscription_type: 'pay-as-you-go',
    avatar_url: ''
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPickups, setUserPickups] = useState<any[]>([]);
  const [loadingPickups, setLoadingPickups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = JSON.parse(localStorage.getItem('borlawura_settings') || '{}');
  const availableZones = settings.zones || ['Accra Central', 'Osu', 'Tema', 'Madina', 'Legon', 'Spintex'];

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const rawRole = userInfo.role || 'Super Admin';
  const roleKey = rawRole.toLowerCase().replace(/\s+/g, '_');
  const isAdmin = roleKey === 'super_admin' || roleKey === 'admin' || roleKey === 'manager'; 
  const canModify = isAdmin || roleKey === 'support_admin'; 

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

  useEffect(() => {
    if (selectedUser) {
      fetchUserPickups(selectedUser.id);
    } else {
      setUserPickups([]);
    }
  }, [selectedUser]);

  const fetchUserPickups = async (userId: string) => {
    setLoadingPickups(true);
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserPickups(data || []);
    } catch (e) {
      console.error('Error fetching user pickups:', e);
    } finally {
      setLoadingPickups(false);
    }
  };

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return alert("Permission Denied: You don't have access to add users.");

    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          ...formData,
          status: 'active'
        }]);

      if (error) throw error;

      await logActivity('New User Registered', 'users', 'new', { 
        user: formData.email, 
        target_user_name: formData.full_name,
        message: `New protocol initialized for ${formData.full_name}`
      });

      // Send Alert
      await sendSMS({
        recipients: [formData.phone_number],
        message: `Welcome to BorlaWura, ${formData.full_name}! Your account has been initialized. You can now login to manage your waste services.`,
        sender: 'BORLAWURA'
      });

      alert('User has been added and notified via SMS.');
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      alert(`Failed to add user: ${err.message}`);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !canModify) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(formData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      // promotion logic if someone is promoted to an admin role or rider
      const adminRoles = ['super_admin', 'finance_admin', 'manager', 'dispatcher', 'support_admin'];
      if (adminRoles.includes(formData.role)) {
         await supabase.from('admins').upsert([{
            id: selectedUser.id,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            status: 'active',
            avatar_url: formData.avatar_url
         }], { onConflict: 'email' });
      } else if (formData.role === 'rider') {
         await supabase.from('riders').upsert([{
            id: selectedUser.id,
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            email: formData.email,
            status: 'active',
            avatar_url: formData.avatar_url
         }], { onConflict: 'id' });
      }

      await logActivity('Admin: Customer Profile Updated', 'users', selectedUser.id, { 
        user_email: formData.email, 
        target_username: formData.full_name,
        message: `Admin synchronized profile details for ${formData.full_name}${formData.avatar_url ? ' (including image)' : ''}`
      });

      // Send Alert
      await sendSMS({
        recipients: [formData.phone_number],
        message: `Security Update: Your BorlaWura role has been updated to ${formData.role.replace('_', ' ')}. Please re-login to see your new dashboard.`,
        sender: 'BORLAWURA'
      });

      alert('Protocol Update: Permissions synchronized and user notified via SMS.');
      setShowAddModal(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      alert(`Update Failed: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!isAdmin) return alert("Permission Denied: You don't have access to delete users.");
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

    try {
      // Fetch user details before deleting for logging purposes
      const { data: userToDelete, error: fetchError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // PGRST116 means no rows found

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log activity for audit trail
      await logActivity('Delete User', 'users', id, { 
        user_name: userToDelete?.full_name || 'Unknown User', 
        user_email: userToDelete?.email || 'N/A',
        message: `Deleted user ${userToDelete?.full_name || id}`
      });
      
      alert('User has been deleted.');
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone_number: '',
      email: '',
      address: '',
      location: 'Accra Central',
      balance: 0,
      role: 'customer',
      subscription_type: 'pay-as-you-go',
      avatar_url: ''
    });
    setIsEditing(false);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      phone_number: user.phone_number,
      email: user.email,
      address: user.address,
      location: user.location,
      balance: user.balance,
      role: user.role || 'customer',
      subscription_type: user.subscription_type || 'pay-as-you-go',
      avatar_url: user.avatar_url || ''
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    if (!canModify) {
      alert('Access Denied: Administrative privileges required.');
      return;
    }

    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      
      // 1. Update Core Users Table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', id)
        .select('*')
        .single();

      if (userError) throw userError;

      // 2. Cascading Security Protocol: Sync status to other privilege tables
      if (userData) {
        // Sync to Admins if exists
        await supabase
          .from('admins')
          .update({ status: newStatus === 'active' ? 'active' : 'inactive' })
          .eq('email', userData.email);

        // Sync to Riders if exists
        await supabase
          .from('riders')
          .update({ status: newStatus === 'active' ? 'active' : 'suspended' })
          .eq('email', userData.email);
      }
      
      const actionLabel = newStatus === 'active' ? 'Activated' : 'Suspended';
      await logActivity(`${actionLabel} User Access`, 'users', id, { 
        status: newStatus,
        user_name: userData?.full_name || 'Protocol User',
        message: `Security clearance ${newStatus === 'active' ? 'restored' : 'revoked'} for ${userData?.full_name}`
      });

      alert(`Security protocol successfully ${newStatus === 'active' ? 'restored' : 'enforced'} for this account.`);
      fetchUsers();
    } catch (err: any) {
      console.error('Security Update Failed:', err);
      alert(`Critical Error: ${err.message}`);
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
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Customers</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage all registered households and their accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            fileName="Customer_List_Report"
            title="Customer List"
          />
          {isAdmin && (
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <i className="ri-user-add-line"></i>
              Add New User
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Users', value: users.length, color: 'indigo', icon: 'ri-team-line' },
          { label: 'Active Now', value: users.filter(u => u.status === 'active').length, color: 'emerald', icon: 'ri-checkbox-circle-line' },
          { label: 'Stopped', value: users.filter(u => u.status === 'suspended').length, color: 'rose', icon: 'ri-forbid-2-line' },
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
        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50/10">
          <div className="relative flex-1 max-w-md w-full group">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
            <input 
              type="text"
              placeholder="Search by name, phone or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 p-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl w-full lg:w-auto">
            <select 
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 text-[10px] font-bold uppercase rounded-xl bg-transparent text-slate-500 border-none focus:ring-0 cursor-pointer"
            >
              <option value="all">All Areas</option>
              {availableZones.map((zone: string) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
            <div className="hidden sm:block w-[1px] h-8 bg-slate-100 dark:bg-slate-800 self-center mx-1"></div>
            <div className="flex items-center gap-1 w-full sm:w-auto">
              {['all', 'active', 'suspended'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${
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

        {error ? (
          <div className="p-16 text-center">
            <p className="text-rose-500 text-sm font-bold">{error}</p>
            <button onClick={fetchUsers} className="mt-4 px-6 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest leading-none">Retry Connection</button>
          </div>
        ) : loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 mt-5 font-bold uppercase tracking-[0.2em]">Loading Data...</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">
                    <th className="px-8 py-5 text-left">User Profile</th>
                    <th className="px-8 py-5 text-left">Location</th>
                    <th className="px-8 py-5 text-left">Balance</th>
                    <th className="px-8 py-5 text-left">Status</th>
                    <th className="px-8 py-5 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all overflow-hidden">
                            {user.avatar_url ? (
                               <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : user.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-none mb-1">{user.full_name}</p>
                            <div className="flex items-center gap-2">
                               <p className="text-[10px] text-slate-500 font-medium">{user.phone_number}</p>
                               <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${user.role === 'customer' ? 'bg-slate-100 text-slate-500' : 'bg-rose-500 text-white'}`}>
                                  {user.role?.replace('_', ' ') || 'customer'}
                               </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></div>
                           <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{user.location || 'Not Set'}</p>
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
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                            title="View Details"
                          >
                            <i className="ri-profile-line text-lg"></i>
                          </button>
                          {canModify && (
                            <button 
                              onClick={() => openEditModal(user)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                              title="Edit User"
                            >
                              <i className="ri-edit-line text-lg"></i>
                            </button>
                          )}
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                              title="Delete User"
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
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                        {user.avatar_url ? (
                           <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : user.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{user.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{user.phone_number}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider ${
                      user.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/20' 
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100/20'
                    }`}>
                      {user.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Location</p>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{user.location || 'Not Set'}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Balance</p>
                      <p className="text-[11px] font-bold text-emerald-600 truncate">₵{(user.balance || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${user.role === 'customer' ? 'bg-slate-100 text-slate-500' : 'bg-rose-500 text-white'}`}>
                      {user.role?.replace('_', ' ') || 'customer'}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400"
                      >
                        <i className="ri-profile-line"></i>
                      </button>
                      {canModify && (
                        <button 
                          onClick={() => openEditModal(user)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(user); }} className="w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-white/5 transition-all">
                          <i className="ri-edit-line"></i>
                        </button>
                        {isAdmin && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }} 
                             className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-white/5 transition-all"
                           >
                              <i className="ri-delete-bin-line"></i>
                           </button>
                        )}
                     </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-none">
                  No matches found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedUser(null)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-up custom-scrollbar">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Customer Information</h2>
              <button onClick={() => setSelectedUser(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-10">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-emerald-500/20 overflow-hidden">
                  {selectedUser.avatar_url ? (
                     <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : selectedUser.full_name?.charAt(0)}
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

              {/* Enhanced: Recent User Requests Section */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Service History</h4>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">{userPickups.length} Orders</span>
                </div>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {loadingPickups ? (
                    <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : userPickups.length > 0 ? (
                    userPickups.slice(0, 4).map((p) => (
                      <div key={p.id} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white dark:hover:bg-white/[0.05] transition-all">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <i className="ri-truck-line text-sm"></i>
                           </div>
                           <div>
                              <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-tight">{p.waste_type || 'Waste Pickup'}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(p.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${
                          p.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          p.status === 'requested' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No previous requests identified</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4">
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
                {roleKey === 'super_admin' && (
                  <button 
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="w-full py-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/5 rounded-2xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
                  >
                    Permanently Terminate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
       {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isEditing ? 'Edit User Details' : 'Add New User'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser} className="p-10 space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
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

                          setFormData({ ...formData, avatar_url: publicUrl });
                        } catch (err: any) {
                          alert('Error uploading image: ' + err.message);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Profile Photo</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input 
                    type="text"
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                  <input 
                    type="text"
                    value={formData.phone_number}
                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0540000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Location / Area</label>
                  <select 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableZones.map((zone: string) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Home Address</label>
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Residential Address"
                  />
                </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Wallet Funds (₵)</label>
                  <input 
                    type="number"
                    value={formData.balance}
                    onChange={e => setFormData({...formData, balance: Number(e.target.value)})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-600"
                  />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Service Tier</label>
                   <select 
                     value={formData.subscription_type}
                     onChange={e => setFormData({...formData, subscription_type: e.target.value})}
                     className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                   >
                     <option value="pay-as-you-go">Pay-As-You-Go</option>
                     <option value="scheduled">Scheduled Routine</option>
                     <option value="subscription">Premium Subscription</option>
                   </select>
                 </div>
                 {roleKey === 'super_admin' && (
                   <div className="md:col-span-2 pt-4 space-y-2">
                     <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest pl-1">Security / Staff Clearance</label>
                     <div className="relative group">
                        <i className="ri-shield-user-line absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 z-10"></i>
                        <select 
                          value={formData.role} 
                          onChange={e => setFormData({...formData, role: e.target.value})} 
                          className="w-full pl-12 pr-5 py-4 bg-rose-50/10 dark:bg-rose-500/5 border border-rose-500/20 rounded-2xl text-[13px] font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
                        >
                         <option value="customer">Regular User</option>
                         <option value="manager">Make Manager</option>
                         <option value="admin">Make Office Staff</option>
                         <option value="finance_admin">Make Finance Staff</option>
                         <option value="super_admin">Make Super Admin</option>
                         <option value="dispatcher">Make Dispatcher</option>
                         <option value="support_admin">Make Support Staff</option>
                         <option value="rider">Make Field Rider</option>
                       </select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-6 flex gap-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-emerald-600 text-white rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                >
                   {isEditing ? 'Save Changes' : 'Add New User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
