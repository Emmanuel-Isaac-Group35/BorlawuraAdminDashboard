import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';

interface AdminMember {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'dispatcher' | 'support';
  status: 'active' | 'inactive';
  created_at: string;
  last_login: string | null;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    email: '',
    role: 'dispatcher',
    password: ''
  });

  const currentRole = localStorage.getItem('simulatedRole') || 'Admin';
  const isSuperAdmin = currentRole === 'super_admin' || currentRole === 'Admin';

  useEffect(() => {
    fetchAdmins();
    
    const channel = supabase
      .channel('public:admins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => {
        fetchAdmins();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert('Only Super Admins can add new personnel.');
      return;
    }

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          data: {
            full_name: newAdmin.full_name,
            role: newAdmin.role
          }
        }
      });

      if (authError) throw authError;

      // 2. Insert into admins table
      const { error: profileError } = await supabase
        .from('admins')
        .insert([{
          full_name: newAdmin.full_name,
          email: newAdmin.email,
          role: newAdmin.role,
          status: 'active'
        }]);

      if (profileError) throw profileError;

      alert('New admin successfully added.');
      setShowAddModal(false);
      setNewAdmin({ full_name: '', email: '', role: 'dispatcher', password: '' });
      fetchAdmins();
    } catch (err: any) {
      console.error('Error adding admin:', err);
      alert(`Failed to add admin: ${err.message}`);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!isSuperAdmin) {
      alert('Permission denied.');
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .update({ status: currentStatus === 'active' ? 'inactive' : 'active' })
        .eq('id', id);
      
      if (error) throw error;
      alert(`Admin status updated to ${currentStatus === 'active' ? 'inactive' : 'active'}`);
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Status update failed.');
    }
  };

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage system personnel and access levels</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={admins.map(a => ({
              Name: a.full_name,
              Email: a.email,
              Role: a.role,
              Status: a.status,
              Last_Login: a.last_login || 'Never'
            }))}
            fileName="Admins_Registry"
            title="Administrative Access Report"
          />
          {isSuperAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-teal-600 transition-all flex items-center gap-2"
            >
              <i className="ri-user-add-line"></i>
              Add Admin
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Staff', value: admins.length, icon: 'ri-team-line', color: 'teal' },
          { label: 'Super Admins', value: admins.filter(a => a.role === 'super_admin').length, icon: 'ri-shield-star-line', color: 'rose' },
          { label: 'Active', value: admins.filter(a => a.status === 'active').length, icon: 'ri-flashlight-line', color: 'emerald' },
          { label: 'Inactive', value: admins.filter(a => a.status === 'inactive').length, icon: 'ri-error-warning-line', color: 'gray' },
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
        <div className="p-6 border-b border-gray-50 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Personnel Directory</h2>
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
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">Access Role</th>
                  <th className="px-6 py-4">Last Active</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold">
                          {admin.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{admin.full_name}</p>
                          <p className="text-[10px] text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${
                        admin.role === 'super_admin' ? 'bg-rose-100 text-rose-700' : 
                        admin.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-gray-500">
                      {admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        disabled={!isSuperAdmin}
                        onClick={() => toggleStatus(admin.id, admin.status)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                          admin.status === 'active' 
                          ? 'bg-emerald-500 text-white shadow-md' 
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                        } ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                      >
                        {admin.status}
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Admin</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" required
                    value={newAdmin.full_name}
                    onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" required
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="admin@borlawura.gh"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access Role</label>
                  <select 
                    value={newAdmin.role}
                    onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="dispatcher">Dispatcher</option>
                    <option value="manager">Manager</option>
                    <option value="support">Support</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                  <input 
                    type="password" required
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-xs font-bold uppercase rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-teal-600">
                  Save Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
