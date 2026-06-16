import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';
import { DesignButton } from './DesignCore';
import ExportButton from './ExportButton';
import { sendSMS } from '../../../lib/sms';

// ─────────────────────────────────────────────
// ROLE DEFINITIONS (single source of truth)
// ─────────────────────────────────────────────
const ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    description: 'Full system access. Can manage staff, settings, and all operations.',
    icon: 'ri-shield-star-line',
    color: 'rose',
    gradient: 'from-rose-500 to-pink-600',
    permissions: {
      'Dashboard': true, 'Orders': true, 'Users': true, 'Riders': true,
      'Live Map': true, 'SMS': true, 'Support Desk': true, 'Reports': true,
      'CMS': true, 'Audit Log': true, 'Settings': true, 'Admins': true,
    }
  },
  {
    key: 'manager',
    label: 'Manager',
    description: 'Oversees daily operations — pickups, riders, users and communications.',
    icon: 'ri-user-star-line',
    color: 'indigo',
    gradient: 'from-indigo-500 to-violet-600',
    permissions: {
      'Dashboard': true, 'Orders': true, 'Users': true, 'Riders': true,
      'Live Map': true, 'SMS': true, 'Support Desk': true, 'Reports': true,
      'CMS': true, 'Audit Log': false, 'Settings': false, 'Admins': false,
    }
  },
  {
    key: 'dispatcher',
    label: 'Dispatcher',
    description: 'Handles field operations — assigns riders and monitors pickups in real time.',
    icon: 'ri-map-pin-user-line',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    permissions: {
      'Dashboard': true, 'Orders': true, 'Users': false, 'Riders': true,
      'Live Map': true, 'SMS': false, 'Support Desk': false, 'Reports': false,
      'CMS': false, 'Audit Log': false, 'Settings': false, 'Admins': false,
    }
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Handles customer feedback, complaints and sends SMS notifications.',
    icon: 'ri-customer-service-2-line',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    permissions: {
      'Dashboard': true, 'Orders': false, 'Users': true, 'Riders': false,
      'Live Map': false, 'SMS': true, 'Support Desk': true, 'Reports': false,
      'CMS': false, 'Audit Log': false, 'Settings': false, 'Admins': false,
    }
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Read-only access to reports, payments and user account data.',
    icon: 'ri-line-chart-line',
    color: 'cyan',
    gradient: 'from-cyan-500 to-sky-600',
    permissions: {
      'Dashboard': true, 'Orders': false, 'Users': true, 'Riders': false,
      'Live Map': false, 'SMS': false, 'Support Desk': false, 'Reports': true,
      'CMS': false, 'Audit Log': false, 'Settings': false, 'Admins': false,
    }
  },
];

interface AdminMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
  last_login: string | null;
  avatar_url?: string;
  phone_number?: string;
}

interface AdminManagementProps {
  adminInfo?: any;
}

type TabView = 'admins' | 'roles';

export default function AdminManagement({ adminInfo }: AdminManagementProps) {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('admins');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminMember | null>(null);
  const [viewingAdmin, setViewingAdmin] = useState<AdminMember | null>(null);
  const [adminActivities, setAdminActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [selectedRoleCard, setSelectedRoleCard] = useState<string | null>(null);

  const [newAdmin, setNewAdmin] = useState({
    full_name: '', email: '', phone_number: '',
    role: 'dispatcher', password: '', avatar_url: ''
  });

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const roleKey = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const canManage = roleKey === 'admin';

  useEffect(() => {
    fetchAdmins();
    const channel = supabase
      .channel('public:admins_team')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, fetchAdmins)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (viewingAdmin) fetchAdminActivities(viewingAdmin.id);
    else setAdminActivities([]);
  }, [viewingAdmin]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const normalized = (data || []).map(a => ({
        ...a,
        role: String(a.role).toLowerCase().includes('super') ? 'admin' : a.role
      }));
      setAdmins(normalized);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAdminActivities = async (id: string) => {
    setLoadingActivities(true);
    try {
      const { data } = await supabase
        .from('audit_logs').select('*').eq('admin_id', id)
        .order('created_at', { ascending: false }).limit(10);
      setAdminActivities(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingActivities(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      if (isEditing && selectedAdmin) {
        const payload = { full_name: newAdmin.full_name, phone_number: newAdmin.phone_number, role: newAdmin.role, avatar_url: newAdmin.avatar_url };
        await supabase.from('admins').update(payload).eq('id', selectedAdmin.id);
        await supabase.from('users').update(payload).eq('email', newAdmin.email);
        await logActivity('Staff Role Updated', 'admins', selectedAdmin.id, { staff: newAdmin.full_name, role: newAdmin.role, message: `${newAdmin.full_name} updated to ${newAdmin.role}` });
        if (newAdmin.phone_number) {
          await sendSMS({ recipients: [newAdmin.phone_number], message: `BorlaWura: Your role has been updated to ${newAdmin.role.replace('_', ' ')}.`, sender: 'BORLAWURA' });
        }
        alert('Staff profile updated successfully.');
      } else {
        const { error: authErr } = await supabase.auth.signUp({
          email: newAdmin.email, password: newAdmin.password,
          options: { data: { full_name: newAdmin.full_name, role: newAdmin.role, phone_number: newAdmin.phone_number } }
        });
        if (authErr) throw authErr;
        const { error: profileErr } = await supabase.from('admins').insert([{
          full_name: newAdmin.full_name, email: newAdmin.email,
          phone_number: newAdmin.phone_number, role: newAdmin.role, status: 'active', avatar_url: newAdmin.avatar_url
        }]);
        if (profileErr) throw profileErr;
        await logActivity('New Staff Onboarded', 'admins', 'new', { staff: newAdmin.full_name, role: newAdmin.role, message: `${newAdmin.full_name} onboarded as ${newAdmin.role}` });
        if (newAdmin.phone_number) {
          await sendSMS({ recipients: [newAdmin.phone_number], message: `Welcome to BorlaWura Admin, ${newAdmin.full_name}! Your role: ${newAdmin.role.replace('_', ' ')}.`, sender: 'BORLAWURA' });
        }
        alert('Staff member added and notified.');
      }
      setShowAddModal(false);
      resetForm();
      fetchAdmins();
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const resetForm = () => {
    setNewAdmin({ full_name: '', email: '', phone_number: '', role: 'dispatcher', password: '', avatar_url: '' });
    setIsEditing(false);
    setSelectedAdmin(null);
  };

  const openEdit = (admin: AdminMember) => {
    setSelectedAdmin(admin);
    setNewAdmin({ full_name: admin.full_name, email: admin.email, phone_number: admin.phone_number || '', role: admin.role, password: 'KEEP_EXISTING', avatar_url: admin.avatar_url || '' });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const toggleStatus = async (id: string, status: string) => {
    if (!canManage) return;
    const newStatus = (status || '').toLowerCase() === 'active' ? 'inactive' : 'active';
    await supabase.from('admins').update({ status: newStatus }).eq('id', id);
    await logActivity('Staff Status Changed', 'admins', id, { status: newStatus, message: `Status set to ${newStatus}` });
    fetchAdmins();
  };

  const handleDelete = async (id: string, email: string) => {
    if (!canManage) return;
    if (userInfo.id === id) { alert('You cannot delete your own account.'); return; }
    if (!window.confirm(`Remove ${email} permanently from the team?`)) return;
    await supabase.from('admins').delete().eq('id', id);
    await logActivity('Staff Removed', 'admins', id, { staff_email: email, message: `${email} removed from team` });
    fetchAdmins();
  };

  // ─── Styling helpers ───────────────────────────────────
  const getRoleConfig = (roleKey: string) =>
    ROLES.find(r => r.key === roleKey) || ROLES[3];

  const getRoleBadge = (role: string) => {
    const cfg = getRoleConfig(role);
    const map: Record<string, string> = {
      rose: 'bg-rose-50 text-rose-600 border-rose-100/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      amber: 'bg-amber-50 text-amber-600 border-amber-100/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100/50 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
    };
    return map[cfg.color] || map.emerald;
  };

  const gradientMap: Record<string, string> = {
    rose: 'from-rose-500 to-pink-600', indigo: 'from-indigo-500 to-violet-600',
    emerald: 'from-emerald-500 to-teal-600', amber: 'from-amber-500 to-orange-500',
    cyan: 'from-cyan-500 to-sky-600'
  };

  const selectedRoleData = ROLES.find(r => r.key === selectedRoleCard);
  const PERM_KEYS = Object.keys(ROLES[0].permissions);

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Admins</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage all admin accounts and define their access permissions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButton
            data={admins.map(a => ({ Name: a.full_name, Email: a.email, Role: a.role, Status: a.status, Last_Active: a.last_login || 'Never' }))}
            fileName="Team_Report"
            title="Team List"
          />
          {canManage && (
            <DesignButton onClick={() => { resetForm(); setShowAddModal(true); }} icon="ri-user-add-line" className="text-[10px]">
              Add Admin
            </DesignButton>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {ROLES.map(role => {
          const count = admins.filter(a => a.role === role.key).length;
          const gradient = gradientMap[role.color];
          return (
            <div
              key={role.key}
              onClick={() => { setActiveTab('roles'); setSelectedRoleCard(role.key); }}
              className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.03] transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <i className={role.icon}></i>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{count}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{role.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
        {(['admins', 'roles'] as TabView[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {tab === 'admins' ? 'All Admins' : 'Role Permissions'}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: ADMINS ══════════ */}
      {activeTab === 'admins' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden min-h-[400px]">
          <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">All Admins</h2>
            <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest">{admins.length} total</span>
          </div>

          {loading ? (
            <div className="p-24 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Loading admins...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="py-32 text-center">
              <i className="ri-team-line text-5xl text-slate-200 dark:text-slate-700 mb-4 block"></i>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No admins yet</p>
              {canManage && <button onClick={() => { resetForm(); setShowAddModal(true); }} className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all">Add First Admin</button>}
            </div>
          ) : (
            <div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                      <th className="px-8 py-5">Member</th>
                      <th className="px-8 py-5">Role</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Last Login</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {admins.map(admin => {
                      const cfg = getRoleConfig(admin.role);
                      return (
                        <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setViewingAdmin(admin)}>
                              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradientMap[cfg.color]} flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden`}>
                                {admin.avatar_url ? <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" /> : admin.full_name?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">{admin.full_name}</p>
                                <p className="text-[10px] text-slate-500 font-medium truncate max-w-[220px]">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${getRoleBadge(admin.role)}`}>
                              <i className={`${cfg.icon} mr-1.5`}></i>{cfg.label}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest ${admin.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{admin.last_login ? new Date(admin.last_login).toLocaleDateString() : '—'}</p>
                            {admin.last_login && <p className="text-[10px] text-slate-400">{new Date(admin.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setViewingAdmin(admin)} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="View profile">
                                <i className="ri-eye-line"></i>
                              </button>
                              {canManage && (
                                <>
                                  <button onClick={() => openEdit(admin)} className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                                    <i className="ri-edit-line"></i>
                                  </button>
                                  <button onClick={() => toggleStatus(admin.id, admin.status)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${admin.status === 'active' ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-500/10' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10'}`}>
                                    <i className={admin.status === 'active' ? 'ri-pause-circle-line' : 'ri-play-circle-line'}></i>
                                  </button>
                                  <button onClick={() => handleDelete(admin.id, admin.email)} className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                    <i className="ri-delete-bin-line"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-4 space-y-4">
                {admins.map(admin => {
                  const cfg = getRoleConfig(admin.role);
                  return (
                    <div key={admin.id} className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-3xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3" onClick={() => setViewingAdmin(admin)}>
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradientMap[cfg.color]} flex items-center justify-center text-white font-bold text-sm overflow-hidden`}>
                            {admin.avatar_url ? <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" /> : admin.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 dark:text-white">{admin.full_name}</p>
                            <p className="text-[10px] text-slate-500">{admin.email}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase border ${getRoleBadge(admin.role)}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase ${admin.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{admin.status}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setViewingAdmin(admin)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 flex items-center justify-center"><i className="ri-eye-line"></i></button>
                          {canManage && (
                            <>
                              <button onClick={() => openEdit(admin)} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center"><i className="ri-edit-line"></i></button>
                              <button onClick={() => handleDelete(admin.id, admin.email)} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><i className="ri-delete-bin-line"></i></button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: ROLE PERMISSIONS ══════════ */}
      {activeTab === 'roles' && (
        <div className="space-y-8">
          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ROLES.map(role => (
              <button
                key={role.key}
                onClick={() => setSelectedRoleCard(selectedRoleCard === role.key ? null : role.key)}
                className={`p-6 rounded-[2rem] border text-left transition-all group ${selectedRoleCard === role.key ? `border-transparent ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 ring-${role.color}-400 bg-white dark:bg-slate-900 shadow-xl` : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md'}`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientMap[role.color]} flex items-center justify-center text-white text-xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={role.icon}></i>
                </div>
                <p className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">{role.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{role.description}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{admins.filter(a => a.role === role.key).length} member{admins.filter(a => a.role === role.key).length !== 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Permission Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                {selectedRoleData ? `${selectedRoleData.label} — Permission Matrix` : 'Full Permission Matrix'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {selectedRoleData ? selectedRoleData.description : 'Click a role card above to highlight it'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-50 dark:border-white/5">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[160px]">Section</th>
                    {ROLES.map(role => (
                      <th key={role.key} className={`px-5 py-5 text-center min-w-[110px] transition-all ${selectedRoleCard === role.key ? 'bg-slate-100/80 dark:bg-white/5' : ''}`}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradientMap[role.color]} flex items-center justify-center text-white text-sm shadow-md`}>
                            <i className={role.icon}></i>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedRoleCard === role.key ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{role.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {PERM_KEYS.map(perm => (
                    <tr key={perm} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-all">
                      <td className="px-8 py-4">
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{perm}</p>
                      </td>
                      {ROLES.map(role => {
                        const has = (role.permissions as any)[perm];
                        return (
                          <td key={role.key} className={`px-5 py-4 text-center transition-all ${selectedRoleCard === role.key ? 'bg-slate-100/50 dark:bg-white/[0.03]' : ''}`}>
                            {has ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                <i className="ri-check-line text-sm font-bold"></i>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600">
                                <i className="ri-close-line text-sm"></i>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ADD / EDIT MODAL ══════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl animate-scale-up border border-slate-100 dark:border-white/10 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Admin' : 'Add Admin'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Set role and contact details</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input type="text" required value={newAdmin.full_name} onChange={e => setNewAdmin({ ...newAdmin, full_name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email</label>
                  <input type="email" required disabled={isEditing} value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all" placeholder="staff@borlawura.gh" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                  <input type="tel" required value={newAdmin.phone_number} onChange={e => setNewAdmin({ ...newAdmin, phone_number: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="+233..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Role</label>
                  <select value={newAdmin.role} onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                    {ROLES.map(r => (
                      <option key={r.key} value={r.key}>{r.label} — {r.description.split('.')[0]}</option>
                    ))}
                  </select>
                </div>
                {!isEditing && (
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
                    <input type="password" required value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="••••••••" />
                  </div>
                )}
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Profile Photo URL (Optional)</label>
                  <input type="url" value={newAdmin.avatar_url} onChange={e => setNewAdmin({ ...newAdmin, avatar_url: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="https://example.com/photo.jpg" />
                </div>
              </div>

              {/* Selected role preview */}
              {newAdmin.role && (
                <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientMap[getRoleConfig(newAdmin.role).color]} flex items-center justify-center text-white shadow-md`}>
                    <i className={getRoleConfig(newAdmin.role).icon}></i>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">{getRoleConfig(newAdmin.role).label}</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{getRoleConfig(newAdmin.role).description}</p>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95">
                {isEditing ? 'Save Changes' : 'Add Admin'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ VIEW ADMIN PROFILE MODAL ══════════ */}
      {viewingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setViewingAdmin(null)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-slate-50/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Profile</h2>
              <button onClick={() => setViewingAdmin(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-8 space-y-8">
              {/* Profile header */}
              <div className="flex items-center gap-5">
                <div className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${gradientMap[getRoleConfig(viewingAdmin.role).color]} flex items-center justify-center text-white text-3xl font-bold shadow-2xl overflow-hidden`}>
                  {viewingAdmin.avatar_url ? <img src={viewingAdmin.avatar_url} alt="" className="w-full h-full object-cover" /> : viewingAdmin.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewingAdmin.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getRoleBadge(viewingAdmin.role)}`}>
                      <i className={`${getRoleConfig(viewingAdmin.role).icon} mr-1`}></i>{getRoleConfig(viewingAdmin.role).label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest text-white ${viewingAdmin.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {viewingAdmin.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Email', value: viewingAdmin.email },
                  { label: 'Phone', value: viewingAdmin.phone_number || 'N/A' },
                  { label: 'Member Since', value: new Date(viewingAdmin.created_at).toLocaleDateString() },
                  { label: 'Last Login', value: viewingAdmin.last_login ? new Date(viewingAdmin.last_login).toLocaleString() : 'Never' }
                ].map(info => (
                  <div key={info.label} className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{info.label}</p>
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{info.value}</p>
                  </div>
                ))}
              </div>

              {/* Role permissions preview */}
              <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Access Permissions</p>
                <div className="grid grid-cols-2 gap-2">
                  {PERM_KEYS.map(perm => {
                    const has = (getRoleConfig(viewingAdmin.role).permissions as any)[perm];
                    return (
                      <div key={perm} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide ${has ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600 opacity-60'}`}>
                        <i className={has ? 'ri-check-line' : 'ri-close-line'}></i>
                        {perm}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent activity */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h4>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">{adminActivities.length} actions</span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {loadingActivities ? (
                    <div className="py-6 text-center"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                  ) : adminActivities.length > 0 ? adminActivities.map(act => (
                    <div key={act.id} className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                        <i className="ri-terminal-window-line text-xs"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-white">{act.action}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date(act.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-6 text-center text-slate-400">
                      <i className="ri-article-line text-xl block mb-2 opacity-50"></i>
                      <p className="text-[10px] font-bold uppercase tracking-wider">No activity recorded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
