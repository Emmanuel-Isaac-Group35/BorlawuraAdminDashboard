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
    try {
      // First create auth user
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

      // Then save to admins table (profile)
      const { error: profileError } = await supabase
        .from('admins')
        .insert([{
          full_name: newAdmin.full_name,
          email: newAdmin.email,
          role: newAdmin.role,
          status: 'active'
        }]);

      if (profileError) throw profileError;

      alert('Admin Personnel Authorized');
      setShowAddModal(false);
      fetchAdmins();
      setNewAdmin({ full_name: '', email: '', role: 'dispatcher', password: '' });
    } catch (error) {
      console.error('Error adding admin:', error);
      alert('Authorization Failed');
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
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
        case 'super_admin': return 'bg-rose-500/10 text-rose-500 border-rose-500/10';
        case 'manager': return 'bg-blue-500/10 text-blue-500 border-blue-500/10';
        case 'dispatcher': return 'bg-amber-500/10 text-amber-500 border-amber-500/10';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/10';
     }
  };

  return (
    <div className="space-y-10 animate-fade-in py-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none uppercase">
            Command Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Administrative personnel and privilege management
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 cursor-pointer flex items-center gap-3"
        >
          <i className="ri-shield-user-line text-xl"></i>
          Authorize Personnel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
            { label: 'Total Command', value: admins.length, icon: 'ri-group-line', color: 'gray' },
            { label: 'Super Admins', value: admins.filter(a => a.role === 'super_admin').length, icon: 'ri-star-smile-line', color: 'rose' },
            { label: 'Active Duty', value: admins.filter(a => a.status === 'active').length, icon: 'ri-flashlight-line', color: 'emerald' },
            { label: 'Pending Auth', value: 0, icon: 'ri-loader-line', color: 'blue' },
         ].map((stat, i) => (
            <div key={i} className="glass-card rounded-[2rem] p-8 border border-white/20 dark:border-gray-700/30">
               <div className="flex justify-between items-start mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                     <i className={`${stat.icon} text-2xl`}></i>
                  </div>
               </div>
               <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{stat.value}</p>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.label}</p>
            </div>
         ))}
      </div>

      <div className="glass-card rounded-[2.5rem] border border-white/20 dark:border-gray-700/30 shadow-2xl overflow-hidden shadow-black/5">
         <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-md flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Access Control List</h2>
            <div className="flex gap-2">
               <span className="px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/10">Permission Matrix V1.0</span>
            </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                     <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel Identity</th>
                     <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Privilege Level</th>
                     <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Transmission</th>
                     <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {admins.map((admin) => (
                     <tr key={admin.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all group">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-black shadow-inner">
                                 {admin.full_name?.charAt(0)}
                              </div>
                              <div>
                                 <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{admin.full_name}</p>
                                 <p className="text-xs font-bold text-gray-400 mt-0.5">{admin.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${getRoleBadge(admin.role)}`}>
                              {admin.role.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           {admin.last_login ? (
                              <div>
                                 <p className="text-sm font-black text-gray-900 dark:text-white">{new Date(admin.last_login).toLocaleDateString()}</p>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(admin.last_login).toLocaleTimeString()}</p>
                              </div>
                           ) : (
                              <p className="text-[10px] font-bold text-gray-400 uppercase italic">Never Accessed</p>
                           )}
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button 
                             onClick={() => toggleStatus(admin.id, admin.status)}
                             className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              admin.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg' 
                              : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 text-white'
                           } cursor-pointer`}>
                              {admin.status}
                           </button>
                        </td>
                     </tr>
                  ))}
                  {admins.length === 0 && (
                     <tr>
                        <td colSpan={4} className="py-24 text-center">
                           <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
                              <i className="ri-shield-keyhole-line text-3xl text-gray-300"></i>
                           </div>
                           <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No authorized personnel found</p>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
            <div className="relative w-full max-w-xl glass-card rounded-[2.5rem] border border-white/20 dark:border-gray-700/30 shadow-2xl overflow-hidden animate-scale-up">
               <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-md flex items-center justify-between">
                  <div>
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Authorize Personnel</h2>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Deploy New Administrative Operative</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-all cursor-pointer">
                     <i className="ri-close-line text-2xl"></i>
                  </button>
               </div>
               
               <form onSubmit={handleAddAdmin} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Identity</label>
                        <input 
                           type="text"
                           required
                           value={newAdmin.full_name}
                           onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})}
                           className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all shadow-inner"
                           placeholder="Dossier Name"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transmission Email</label>
                        <input 
                           type="email"
                           required
                           value={newAdmin.email}
                           onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                           className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all shadow-inner"
                           placeholder="terminal@borlawura.gh"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Privilege Tier</label>
                        <select 
                           value={newAdmin.role}
                           onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})}
                           className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all shadow-inner"
                        >
                           <option value="dispatcher">Field Dispatcher</option>
                           <option value="manager">System Manager</option>
                           <option value="support">Intelligence Support</option>
                           <option value="super_admin">Prime Admin</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Cipher (PIN)</label>
                        <input 
                           type="password"
                           required
                           value={newAdmin.password}
                           onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                           className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all shadow-inner"
                           placeholder="••••••••"
                        />
                     </div>
                  </div>
                  
                  <div className="pt-4 flex gap-4">
                     <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all cursor-pointer">
                        Abort Authorization
                     </button>
                     <button type="submit" className="flex-2 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 cursor-pointer">
                        Execute Clearance
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
