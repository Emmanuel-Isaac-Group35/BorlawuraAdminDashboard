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

  const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const currentRole = userInfo.role || localStorage.getItem('simulatedRole') || 'Admin';
  const isSuperAdmin = currentRole === 'super_admin' || currentRole === 'Admin' || currentRole === 'Super Admin';

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
      alert('Operational clearance required to provision new personnel.');
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
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

      const { error: profileError } = await supabase
        .from('admins')
        .insert([{
          full_name: newAdmin.full_name,
          email: newAdmin.email,
          role: newAdmin.role,
          status: 'active'
        }]);

      if (profileError) throw profileError;

      alert('Personnel successfully onboarded.');
      setShowAddModal(false);
      setNewAdmin({ full_name: '', email: '', role: 'dispatcher', password: '' });
      fetchAdmins();
    } catch (err: any) {
      console.error('Error adding admin:', err);
      alert(`Provisioning Failed: ${err.message}`);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!isSuperAdmin) {
      alert('Access Denied: Clearance required.');
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .update({ status: currentStatus === 'active' ? 'inactive' : 'active' })
        .eq('id', id);
      
      if (error) throw error;
      alert(`Status synchronized to ${currentStatus === 'active' ? 'inactive' : 'active'}`);
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Update protocol failed.');
    }
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Administrative Faculty</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage system personnel permissions and access levels</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={admins.map(a => ({
              Name: a.full_name,
              Email: a.email,
              Role: a.role,
              Status: a.status,
              Last_Active: a.last_login || 'Never'
            }))}
            fileName="Administrative_Faculty_Report"
            title="Institutional Access Audit"
          />
          {isSuperAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <i className="ri-user-add-line"></i>
              Onboard Personnel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Operations Staff', value: admins.length, icon: 'ri-group-line', color: 'slate' },
          { label: 'Executive Clearance', value: admins.filter(a => a.role === 'super_admin').length, icon: 'ri-shield-check-line', color: 'rose' },
          { label: 'Verified Active', value: admins.filter(a => a.status === 'active').length, icon: 'ri-checkbox-circle-line', color: 'emerald' },
          { label: 'Revoked Access', value: admins.filter(a => a.status === 'inactive').length, icon: 'ri-error-warning-line', color: 'slate' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600`}>
                <i className={`${stat.icon} text-lg`}></i>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Faculty Directory</h2>
        </div>
        
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Accessing records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                  <th className="px-8 py-5">Personnel</th>
                  <th className="px-8 py-5">Access Tier</th>
                  <th className="px-8 py-5">Verification Link</th>
                  <th className="px-8 py-5 text-right">Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          {admin.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-none mb-1.5">{admin.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                        admin.role === 'super_admin' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 
                        admin.role === 'manager' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 
                        'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
                      }`}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase">Last Signed</p>
                       <p className="text-[10px] text-slate-500 mt-1 uppercase">{admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        disabled={!isSuperAdmin}
                        onClick={() => toggleStatus(admin.id, admin.status)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          admin.status === 'active' 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        } ${!isSuperAdmin ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Onboard Faculty Member</h2>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleAddAdmin} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input 
                    type="text" required
                    value={newAdmin.full_name}
                    onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Legal Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Electronic Mail</label>
                  <input 
                    type="email" required
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="official@borlawura.gh"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Access Tier</label>
                  <select 
                    value={newAdmin.role}
                    onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="dispatcher">Field Dispatcher</option>
                    <option value="manager">Operations Manager</option>
                    <option value="support">Citizen Support</option>
                    <option value="super_admin">Executive Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Pass-Phrase</label>
                  <input 
                    type="password" required
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div className="pt-6 flex gap-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
