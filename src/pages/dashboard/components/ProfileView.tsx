import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ProfileView({ adminInfo }: { adminInfo?: any }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userInfo, setUserInfo] = useState({
    id: '',
    fullName: '',
    role: '',
    email: '',
    phone: '',
    joined: '',
    avatarUrl: ''
  });
  
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    new: '',
    confirm: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        const profileData = {
          id: adminData?.id || user.id,
          fullName: adminData?.full_name || user.user_metadata?.full_name || 'Admin User',
          role: adminData?.role || 'Admin',
          email: user.email || '',
          phone: adminData?.phone_number || '',
          joined: adminData?.created_at || user.created_at || '',
          avatarUrl: adminData?.avatar_url || ''
        };

        setUserInfo(profileData);
        setEditForm({
          fullName: profileData.fullName,
          phone: profileData.phone
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userInfo.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      await supabase.from('admins').update({ avatar_url: publicUrl }).eq('id', userInfo.id);
      
      // Sync to auth meta for persistent mobile session
      await supabase.auth.updateUser({
         data: { avatar_url: publicUrl }
      });
      
      setUserInfo(prev => ({ ...prev, avatarUrl: publicUrl }));
      const stored = JSON.parse(localStorage.getItem('user_profile') || '{}');
      localStorage.setItem('user_profile', JSON.stringify({ ...stored, avatar_url: publicUrl }));

      alert('👍 Profile picture updated successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('admins')
        .update({
          full_name: editForm.fullName,
          phone_number: editForm.phone
        })
        .eq('id', userInfo.id);

      if (error) throw error;

      // Ensure sync with Auth metadata for mobile/app consistency
      await supabase.auth.updateUser({
         data: { full_name: editForm.fullName }
      });

      setUserInfo(prev => ({ ...prev, fullName: editForm.fullName, phone: editForm.phone }));
      
      const stored = JSON.parse(localStorage.getItem('user_profile') || '{}');
      localStorage.setItem('user_profile', JSON.stringify({ ...stored, fullName: editForm.fullName }));

      alert('✅ Profile details saved!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
       return alert('Passwords do not match');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;
      alert('🔐 Password updated!');
      setPasswordForm({ new: '', confirm: '' });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-8 font-['Montserrat'] animate-fade-in pb-20 pt-4">
      
      {/* 1. Header Card - Visual Identity */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm p-8 flex items-center gap-8 group">
         <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-50 dark:border-white/10 shadow-lg">
                {userInfo.avatarUrl ? (
                   <img src={userInfo.avatarUrl} alt="Me" className="w-full h-full object-cover" />
                ) : (
                   <span className="text-3xl font-bold text-slate-400 dark:text-slate-500">{userInfo.fullName.charAt(0)}</span>
                )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-90 ring-4 ring-white dark:ring-slate-900">
               <i className={`ri-pencil-fill text-sm ${uploading ? 'animate-spin' : ''}`}></i>
               <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            </label>
         </div>
         <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{userInfo.fullName}</h1>
            <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-white/5 shadow-sm">
                  {userInfo.role.replace('_', ' ')}
               </span>
               <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <i className="ri-calendar-line"></i>
                  Joined {new Date(userInfo.joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
               </p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
         
         {/* 2. Personal Information Card */}
         <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden animate-slide-up">
            <div className="px-8 py-5 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
               <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <i className="ri-profile-line"></i>
                  Personal Information
               </h3>
            </div>
            <form onSubmit={handleUpdateDetails} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                     <input 
                        type="text" required value={editForm.fullName}
                        onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="John Doe"
                     />
                  </div>
                  <div className="space-y-2 opacity-60">
                     <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Address (Read-only)</label>
                     <div className="w-full px-5 py-3.5 bg-slate-200/30 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed">
                        {userInfo.email}
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contact Phone</label>
                     <input 
                        type="text" required value={editForm.phone}
                        onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="024 000 0000"
                     />
                  </div>
               </div>
               <div className="flex justify-end pt-4">
                  <button 
                     type="submit" disabled={loading}
                     className="px-10 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                     {loading ? 'Saving...' : 'Save Changes'}
                  </button>
               </div>
            </form>
         </div>

         {/* 3. Security & Password Card */}
         <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="px-8 py-5 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
               <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <i className="ri-shield-keyhole-line"></i>
                  Password & Security
               </h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                     <input 
                        type="password" required value={passwordForm.new}
                        onChange={e => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="••••••••"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                     <input 
                        type="password" required value={passwordForm.confirm}
                        onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="••••••••"
                     />
                  </div>
               </div>
               <div className="flex justify-end pt-4">
                  <button 
                     type="submit" disabled={loading}
                     className="px-10 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                     {loading ? 'Processing...' : 'Change Password'}
                  </button>
               </div>
            </form>
         </div>

      </div>
    </div>
  );
}
