import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface AdminMember {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'dispatcher' | 'support';
  status: 'active' | 'inactive';
  created_at: string;
  last_login: string | null;
}

export default function AdminPersonnel() {
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
  const role = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const canModify = role === 'super_admin' || role === 'admin' || userInfo.role === 'Admin';

  useEffect(() => {
    fetchAdmins();
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
    if (!canModify) {
      alert("Permission Denied: You don't have access to add staff.");
      return;
    }
    try {
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

      const { error: profileError } = await supabase
        .from('admins')
        .insert([{
          full_name: newAdmin.full_name,
          email: newAdmin.email,
          role: newAdmin.role,
          status: 'active'
        }]);

      if (profileError) throw profileError;

      alert('Staff member added successfully.');
      setShowAddModal(false);
      fetchAdmins();
      setNewAdmin({ full_name: '', email: '', role: 'dispatcher', password: '' });
    } catch (error) {
      console.error('Error adding admin:', error);
      alert('Could not add staff member.');
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!canModify) {
      alert("Permission Denied: You don't have access to do this.");
      return;
    }
     try {
        const { error } = await supabase
           .from('admins')
           .update({ status: currentStatus === 'active' ? 'inactive' : 'active' })
           .eq('id', id);
        if (error) throw error;
        fetchAdmins();
     } catch (error) {
        console.error('Error toggling status:', error);
     }
  };

  const getRoleBadge = (role: string) => {
     switch (role) {
        case 'super_admin': return 'bg-rose-500/10 text-rose-600 border-rose-500/10';
        case 'manager': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10';
        case 'dispatcher': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10';
        default: return 'bg-slate-500/10 text-slate-600 border-slate-500/10';
     }
  };

  return (
    <div className="space-y-10 animate-fade-in py-2 font-['Montserrat']">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Staff Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Add and manage your team and what they can do</p>
        </div>
        {canModify && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <i className="ri-user-add-line"></i>
            Add New Staff
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
            { label: 'Total Personnel', value: admins.length, icon: 'ri-group-line', color: 'indigo' },
            { label: 'Super Admins', value: admins.filter(a => a.role?.toLowerCase().includes('super')).length, icon: 'ri-shield-star-line', color: 'rose' },
            { label: 'Active Users', value: admins.filter(a => a.status === 'active').length, icon: 'ri-checkbox-circle-line', color: 'emerald' },
            { label: 'Field Staff', value: admins.filter(a => a.role?.toLowerCase().includes('dispatcher')).length, icon: 'ri-user-follow-line', color: 'amber' },
         ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800/50 shadow-sm transition-all hover:scale-[1.02]">
               <div className="flex justify-between items-start mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600`}>
                     <i className={`${stat.icon} text-xl`}></i>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global</span>
               </div>
               <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1 tracking-tighter">{stat.value}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
         ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Staff List</h2>
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/10">Active Staff</span>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-50 dark:border-slate-800/50">
                     <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity</th>
                     <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Level</th>
                     <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Activity</th>
                     <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {admins.map((admin) => (
                     <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-slate-100 dark:border-slate-700">
                                 {admin.full_name?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                 <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{admin.full_name}</p>
                                 <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">{admin.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`px-4 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest ${getRoleBadge(admin.role)}`}>
                              {admin.role.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           {admin.last_login ? (
                              <div className="flex flex-col">
                                 <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(admin.last_login).toLocaleDateString()}</p>
                                 <p className="text-[10px] font-medium text-slate-500 uppercase">{new Date(admin.last_login).toLocaleTimeString()}</p>
                              </div>
                           ) : (
                              <p className="text-[10px] font-medium text-slate-400 italic">No access record</p>
                           )}
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button 
                             onClick={() => toggleStatus(admin.id, admin.status)}
                             className={`px-5 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                               admin.status === 'active' 
                               ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                               : 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                            }`}>
                              {admin.status}
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-2xl overflow-hidden animate-scale-up">
               <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Personnel Registration</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Register New Staff Member</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all">
                     <i className="ri-close-line text-2xl"></i>
                  </button>
               </div>
               
               <form onSubmit={handleAddAdmin} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                           type="text"
                           required
                           value={newAdmin.full_name}
                           onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})}
                           className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                           placeholder="John Doe"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                           type="email"
                           required
                           value={newAdmin.email}
                           onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                           className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                           placeholder="staff@borlawura.com"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access Tier</label>
                        <select 
                           value={newAdmin.role}
                           onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})}
                           className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                        >
                           <option value="dispatcher">Dispatcher</option>
                           <option value="manager">Manager</option>
                           <option value="support">Support</option>
                           <option value="super_admin">Super Admin</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access PIN</label>
                        <input 
                           type="password"
                           required
                           value={newAdmin.password}
                           onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                           className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                           placeholder="••••••••"
                        />
                     </div>
                  </div>
                  
                  <div className="pt-4 flex gap-4">
                     <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-all">
                        Cancel
                     </button>
                     <button type="submit" className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-95">
                        Register Staff
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
