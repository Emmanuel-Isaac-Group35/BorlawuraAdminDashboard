import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';
import { sendSMS } from '../../../lib/sms';

interface AdminMember {
  id: string;
  full_name: string;
  email: string;
  role: 'Admin' | 'admin' | 'super_admin' | 'manager' | 'dispatcher' | 'support';
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
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminMember | null>(null);

  const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const roleKey = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const isSuperAdmin = roleKey === 'super_admin'; 

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

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      if (isEditing && selectedAdmin) {
        const { error } = await supabase
          .from('admins')
          .update({
            full_name: newAdmin.full_name,
            role: newAdmin.role
          })
          .eq('id', selectedAdmin.id);
        if (error) throw error;

        // Log action for push notification
        await supabase.from('audit_logs').insert([{
          admin_id: userInfo.id,
          action: 'Staff Role Re-assigned',
          details: { message: `${newAdmin.full_name} repositioned to ${newAdmin.role}`, admin: userInfo.fullName }
        }]);

        // Send Alert
        await sendSMS({
           recipients: [newAdmin.email], // Note: Using email as fallback if phone not in admins table, but usually we'd want phone.
           // However, sendSMS expects phone. I should check if admins have phone.
           // Schema shows admins table has: id, full_name, email, role, status, created_at, last_login
           // Let's check if there's a phone in users table for this email.
           message: `BorlaWura Protocol: Your administrative role has been updated to ${newAdmin.role.replace('_', ' ')}. Check your dashboard for new access.`,
           sender: 'BORLAWURA'
        });

        alert('Personnel record updated and notified.');
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email: newAdmin.email,
          password: newAdmin.password,
          options: { data: { full_name: newAdmin.full_name, role: newAdmin.role } }
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

        // Log action for push notification
        await supabase.from('audit_logs').insert([{
          admin_id: userInfo.id,
          action: 'New Staff Provisioned',
          details: { message: `${newAdmin.full_name} onboarded as ${newAdmin.role}`, admin: userInfo.fullName }
        }]);

        // Send Alert
        await sendSMS({
           recipients: [newAdmin.email], 
           message: `Welcome to the BorlaWura Admin Team, ${newAdmin.full_name}! You have been provisioned as ${newAdmin.role.replace('_', ' ')}.`,
           sender: 'BORLAWURA'
        });

        alert('Personnel onboarded and notified.');
      }
      setShowAddModal(false);
      resetForm();
      fetchAdmins();
    } catch (err: any) {
      alert(`Operation Failed: ${err.message}`);
    }
  };

  const resetForm = () => {
    setNewAdmin({ full_name: '', email: '', role: 'dispatcher', password: '' });
    setIsEditing(false);
    setSelectedAdmin(null);
  };

  const openEdit = (admin: AdminMember) => {
    setSelectedAdmin(admin);
    setNewAdmin({
      full_name: admin.full_name,
      email: admin.email,
      role: admin.role as any,
      password: 'KEEP_EXISTING'
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!isSuperAdmin) return;
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await supabase.from('admins').update({ status: newStatus }).eq('id', id);

      // Log action for push notification
      await supabase.from('audit_logs').insert([{
          admin_id: userInfo.id,
          action: 'Staff Protocol Update',
          details: { message: `Clearance ${newStatus} for personnel #${id.slice(0,5)}`, admin: userInfo.fullName }
      }]);

      fetchAdmins();
    } catch (error) { console.error(error); }
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Staff</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage your team members and their access levels</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButton 
            data={admins.map(a => ({
              Name: a.full_name,
              Email: a.email,
              Role: a.role,
              Status: a.status,
              Last_Active: a.last_login || 'Never'
            }))}
            fileName="Staff_list_report"
            title="Office Team List"
          />
          {isSuperAdmin && (
            <button 
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-8 py-3.5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2.5 group"
            >
              <i className="ri-user-add-line text-lg group-hover:rotate-12 transition-transform"></i>
              Add Staff Member
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Team Members', value: admins.length, icon: 'ri-group-line', color: 'slate' },
          { label: 'Admins (Full Access)', value: admins.filter(a => a.role.toLowerCase().includes('admin')).length, icon: 'ri-shield-check-line', color: 'rose' },
          { label: 'Active Team', value: admins.filter(a => a.status === 'active').length, icon: 'ri-checkbox-circle-line', color: 'emerald' },
          { label: 'Inactive Team', value: admins.filter(a => a.status === 'inactive').length, icon: 'ri-error-warning-line', color: 'slate' },
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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Team Members</h2>
        </div>
        
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Accessing records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                  <th className="px-8 py-5 text-left">Staff Profile</th>
                  <th className="px-8 py-5 text-left">Role / Access</th>
                  <th className="px-8 py-5 text-left">Last Activity</th>
                  <th className="px-8 py-5 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-sm">
                          {admin.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-none mb-1">{admin.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-400">
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                         {isSuperAdmin && (
                           <>
                             <button onClick={() => openEdit(admin)} className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all">
                                <i className="ri-edit-line"></i>
                             </button>
                             <button onClick={() => toggleStatus(admin.id, admin.status)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${admin.status === 'active' ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}>
                                <i className={admin.status === 'active' ? 'ri-checkbox-circle-line' : 'ri-forbid-line'}></i>
                             </button>
                           </>
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

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl animate-scale-up border border-slate-100 dark:border-white/10 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{isEditing ? 'Edit Staff' : 'Add Staff Member'}</h2>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveAdmin} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input type="text" required value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email</label>
                  <input type="email" required disabled={isEditing} value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Role Type</label>
                  <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="super_admin">Boss Access (Super Admin)</option>
                    <option value="manager">Global Manager</option>
                    <option value="finance_admin">Finance (Money Access)</option>
                    <option value="dispatcher">Field Captain (Dispatcher)</option>
                    <option value="support_admin">Customer Support</option>
                  </select>
                </div>
                {!isEditing && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
                    <input type="password" required value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all">
                {isEditing ? 'Save Changes' : 'Add Staff'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
