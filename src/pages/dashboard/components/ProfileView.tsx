import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ProfileView() {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({
    fullName: '',
    role: '',
    email: '',
    phone: '',
    joined: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const savedProfileStr = localStorage.getItem('user_profile');
      const savedProfile = savedProfileStr ? JSON.parse(savedProfileStr) : null;

      if (user) {
        // Fetch matching admin record for more details if needed
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        setUserInfo({
          fullName: savedProfile?.fullName || adminData?.full_name || 'Admin User',
          role: savedProfile?.role || adminData?.role || 'Admin',
          email: user.email || '',
          phone: adminData?.phone_number || 'Not Set',
          joined: adminData?.created_at || user.created_at || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return alert('Passwords do not match');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      alert('Security protocol updated: Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setIsEditing(false);
    } catch (error: any) {
      alert(`Update Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-['Montserrat'] animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Your Profile</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Manage your account information and security</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20 shadow-sm`}>
              Clearance Level: {userInfo.role.replace('_', ' ')}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column - Avatar and Basics */}
        <div className="md:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm p-10 flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-5xl font-bold shadow-2xl shadow-emerald-500/30 mb-8 relative group overflow-hidden">
                 <span className="relative z-10">{userInfo.fullName.charAt(0)}</span>
                 <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <i className="ri-camera-line text-2xl"></i>
                 </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">{userInfo.fullName}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">{userInfo.role.replace('_', ' ')}</p>
              
              <div className="w-full space-y-4 pt-8 border-t border-slate-50 dark:border-white/5">
                 <div className="flex flex-col items-center gap-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate w-full">{userInfo.email}</p>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{userInfo.phone}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column - Detailed Settings */}
        <div className="md:col-span-2 space-y-6">
           {/* General Settings */}
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Account Overview</h3>
                 <i className="ri-user-3-line text-slate-300 text-xl"></i>
              </div>
              <div className="p-10 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Identity</p>
                       <div className="px-6 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-bold text-slate-900 dark:text-white">
                          {userInfo.fullName}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Staff Role</p>
                       <div className="px-6 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-bold text-slate-900 dark:text-white uppercase">
                          {userInfo.role.replace('_', ' ')}
                       </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Member Since</p>
                       <div className="px-6 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-bold text-slate-500 dark:text-slate-400">
                          {new Date(userInfo.joined).toLocaleDateString(undefined, { dateStyle: 'long' })}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Security Settings */}
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Sign-In & Security</h3>
                 <i className="ri-shield-keyhole-line text-slate-300 text-xl"></i>
              </div>
              <div className="p-10">
                 {!isEditing ? (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-slate-50 dark:bg-black/20 rounded-[2rem] border border-slate-100 dark:border-white/5">
                       <div>
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">Key Authorization</p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Update your access key to maintain system integrity</p>
                       </div>
                       <button 
                         onClick={() => setIsEditing(true)}
                         className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                       >
                          Update Key
                       </button>
                    </div>
                 ) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-6 animate-scale-up">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Key (Password)</label>
                             <input 
                               type="password" required value={newPassword}
                               onChange={e => setNewPassword(e.target.value)}
                               placeholder="Min 6 characters"
                               className="w-full px-6 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Key</label>
                             <input 
                               type="password" required value={confirmPassword}
                               onChange={e => setConfirmPassword(e.target.value)}
                               placeholder="Match the key above"
                               className="w-full px-6 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                             />
                          </div>
                       </div>
                       <div className="flex gap-4 pt-4">
                          <button 
                            type="submit" disabled={loading}
                            className="flex-1 py-4 bg-emerald-600 text-white rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                          >
                             {loading ? 'Processing...' : 'Sync New Security Key'}
                          </button>
                          <button 
                            type="button" onClick={() => setIsEditing(false)}
                            className="px-10 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[2rem] text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                             Cancel
                          </button>
                       </div>
                    </form>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
