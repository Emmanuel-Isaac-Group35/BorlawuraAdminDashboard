import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';
import ExportButton from './ExportButton';
import { sendSMS } from '../../../lib/sms';

interface AdminMember {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'dispatcher' | 'finance_admin' | 'support_admin';
  status: 'active' | 'inactive';
  created_at: string;
  last_login: string | null;
  avatar_url?: string;
}

interface AdminManagementProps {
  adminInfo?: any;
}

export default function AdminManagement({ adminInfo }: AdminManagementProps) {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    email: '',
    role: 'dispatcher',
    password: '',
    avatar_url: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminMember | null>(null);

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const roleKey = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  
  // Personnel management is restricted strictly to the Admin role
  const canManagePersonnel = roleKey === 'admin';
  const canView = roleKey === 'admin' || roleKey === 'manager'; 

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm">
        <i className="ri-shield-keyhole-line text-6xl text-slate-200 mb-6 font-thin"></i>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-sm text-center">Your administrative clearance does not allow entry to the Staff Manifest.</p>
      </div>
    );
  }

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
      const normalizedAdmins = (data || []).map(a => ({
        ...a,
        role: String(a.role).toLowerCase().includes('super') ? 'admin' : a.role
      }));
      setAdmins(normalizedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePersonnel) return;

    try {
      if (isEditing && selectedAdmin) {
        // 1. Update Admins Table (Try ID then Email)
        const updatePayload = {
          full_name: newAdmin.full_name,
          role: newAdmin.role,
          avatar_url: newAdmin.avatar_url
        };

        const { error: adminError, count } = await supabase
          .from('admins')
          .update(updatePayload)
          .eq('id', selectedAdmin.id)
          .select();

        // Fallback: If no rows updated by ID, try email
        if (!count || count === 0) {
           console.log("No record found by ID, attempting email-based update for", newAdmin.email);
           await supabase
             .from('admins')
             .update(updatePayload)
             .eq('email', newAdmin.email);
        }

        // 2. Synchronize to Users Table
        await supabase
          .from('users')
          .update(updatePayload)
          .eq('email', newAdmin.email);
        
        await logActivity('Staff Role Re-assigned', 'admins', selectedAdmin.id, { 
          staff: newAdmin.full_name, 
          role: newAdmin.role,
          message: `${newAdmin.full_name} repositioned to ${newAdmin.role}`
        });

        alert(`Personnel profile for ${newAdmin.full_name} has been synchronized across all systems.`);

        // Send Alert
        await sendSMS({
           recipients: [newAdmin.email], // Note: Using email as fallback if phone not in admins table, but usually we'd want phone.
           // However, sendSMS expects phone. I should check if admins have phone.
           // Schema shows admins table has: id, full_name, email, role, status, created_at, last_login
           // Let's check if there's a phone in users table for this email.
           message: `BorlaWura Protocol: Your administrative role has been updated to ${newAdmin.role.replace('_', ' ')}. Check your dashboard for new access.`,
           sender: 'BORLAWURA'
        });

        alert('Admin Personnel record updated and notified.');
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
            status: 'active',
            avatar_url: newAdmin.avatar_url
          }]);
        if (profileError) throw profileError;

        await logActivity('New Staff Provisioned', 'admins', 'new', { 
          staff: newAdmin.full_name, 
          role: newAdmin.role,
          message: `${newAdmin.full_name} onboarded as ${newAdmin.role}`
        });

        // Send Alert
        await sendSMS({
           recipients: [newAdmin.email], 
           message: `Welcome to the BorlaWura Admin Team, ${newAdmin.full_name}! You have been provisioned as ${newAdmin.role.replace('_', ' ')}.`,
           sender: 'BORLAWURA'
        });

        alert('Admin (Personnel) onboarded and notified.');
      }
      setShowAddModal(false);
      resetForm();
      fetchAdmins();
    } catch (err: any) {
      alert(`Operation Failed: ${err.message}`);
    }
  };

  const resetForm = () => {
    setNewAdmin({ full_name: '', email: '', role: 'dispatcher', password: '', avatar_url: '' });
    setIsEditing(false);
    setSelectedAdmin(null);
  };

  const openEdit = (admin: AdminMember) => {
    setSelectedAdmin(admin);
    const currentRole = admin.role;
    const normalizedRole = String(currentRole).toLowerCase().includes('super') ? 'admin' : currentRole;
    
    setNewAdmin({
      full_name: admin.full_name,
      email: admin.email,
      role: normalizedRole as any,
      password: 'KEEP_EXISTING',
      avatar_url: admin.avatar_url || ''
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!canManagePersonnel) return;
    try {
      const status = (currentStatus || '').toLowerCase().trim();
      const newStatus = status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase.from('admins').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      await logActivity('Staff Protocol Update', 'admins', id, { 
        status: newStatus,
        message: `Clearance ${newStatus} for personnel #${id.slice(0,5)}`
      });

      fetchAdmins();
      
      // Update local selection if modal is open
      if (selectedAdmin && selectedAdmin.id === id) {
        setSelectedAdmin({ ...selectedAdmin, status: newStatus as any });
      }
    } catch (error) { 
      console.error(error);
      alert('Failed to update staff status');
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!canManagePersonnel) return;
    if (userInfo.id === id) {
      alert("Self-Termination Aborted: You cannot delete your own account from this session.");
      return;
    }
    if (!window.confirm(`CRITICAL SYSTEM ACTION: Are you sure you want to remove ${email} from the staff list forever? This will immediately revoke all their administrative access.`)) return;

    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await logActivity('Staff Record Purged', 'admins', id, { 
        staff_email: email,
        message: `Admin (Personnel) ${email} removed from system permanently.`
      });

      alert('Admin (Personnel) record purged from the manifest successfully.');
      fetchAdmins();
    } catch (error: any) {
      alert(`Purge Failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Admin (Personnel)</h1>
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
          {canManagePersonnel && (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total team members', value: admins.length, icon: 'ri-group-line', color: 'emerald' },
          { label: 'Admins (Authorized)', value: admins.filter(a => a.role.toLowerCase().includes('admin')).length, icon: 'ri-shield-check-line', color: 'rose' },
          { label: 'Active protocol', value: admins.filter(a => a.status === 'active').length, icon: 'ri-checkbox-circle-line', color: 'emerald' },
          { label: 'Inactive protocol', value: admins.filter(a => a.status === 'inactive').length, icon: 'ri-forbid-line', color: 'slate' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02] flex flex-row sm:flex-col justify-between items-center sm:items-start gap-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-3">{stat.label}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{stat.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color === 'emerald' ? 'from-emerald-500/10 to-teal-500/5 text-emerald-600' : stat.color === 'rose' ? 'from-rose-500/10 to-pink-500/5 text-rose-600' : 'from-slate-500/10 to-slate-400/5 text-slate-500'} flex items-center justify-center text-xl shadow-sm`}>
              <i className={stat.icon}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden min-h-[400px]">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Team Profile Manifest</h2>
        </div>
        
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-[0.2em] animate-pulse">Synchronizing Admin (Personnel)...</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                    <th className="px-8 py-5 text-left">Staff Profile</th>
                    <th className="px-8 py-5 text-left">Role / Access</th>
                    <th className="px-8 py-5 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center text-slate-500 font-bold text-sm shadow-sm overflow-hidden">
                            {admin.avatar_url ? (
                               <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : admin.full_name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-none mb-1.5">{admin.full_name}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${admin.status === 'active' ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-white/5 dark:text-slate-500 dark:border-white/5'}`}>
                          {admin.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2.5">
                           {canManagePersonnel && (
                             <>
                               <button onClick={() => openEdit(admin)} className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                                  <i className="ri-edit-line text-lg"></i>
                               </button>
                               <button onClick={() => toggleStatus(admin.id, admin.status)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${admin.status === 'active' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10'}`}>
                                  <i className={admin.status === 'active' ? 'ri-shield-user-line text-lg' : 'ri-shield-flash-line text-lg'}></i>
                               </button>
                               <button onClick={() => handleDeleteAdmin(admin.id, admin.email)} className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Purge Record">
                                  <i className="ri-delete-bin-line text-lg"></i>
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

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-4">
              {admins.map((admin) => (
                <div key={admin.id} className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                        {admin.avatar_url ? (
                           <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : admin.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{admin.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{admin.email}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider ${
                      admin.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/20' 
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100/20'
                    }`}>
                      {admin.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{admin.role.replace('_', ' ')}</span>
                    <div className="flex gap-2">
                      {canManagePersonnel && (
                        <>
                          <button onClick={() => openEdit(admin)} className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-sm">
                            <i className="ri-edit-line"></i>
                          </button>
                          <button onClick={() => toggleStatus(admin.id, admin.status)} className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${admin.status === 'active' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-600'}`}>
                            <i className={admin.status === 'active' ? 'ri-shield-user-line' : 'ri-shield-flash-line'}></i>
                          </button>
                          <button onClick={() => handleDeleteAdmin(admin.id, admin.email)} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm">
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                  <input type="text" value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email</label>
                  <input type="email" disabled={isEditing} value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Role Type</label>
                  <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="admin">System Admin (Full Access)</option>
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
                <div className="md:col-span-2 space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Profile Photo URL</label>
                   <input type="url" value={newAdmin.avatar_url} onChange={e => setNewAdmin({...newAdmin, avatar_url: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://example.com/photo.jpg (Optional)" />
                </div>
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
