import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';

interface CMSManagementProps {
  adminInfo?: any;
}

export default function CMSManagement({ adminInfo }: CMSManagementProps) {
  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const [activeApp, setActiveApp] = useState<'user' | 'rider'>('user');
  const [activeTab, setActiveTab] = useState<'interface' | 'banners' | 'popup' | 'theme'>('interface');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [appConfig, setAppConfig] = useState<any>({
    user: {
      headerTitle: 'Borla Wura',
      headerTagline: 'Clean. Green. Simple.',
      maintenanceMode: false,
      support: {
        phone: '+233 30 000 0000',
        email: 'support@borlawura.com',
        whatsapp: '+233 24 000 0000',
      },
      announcement: {
        enabled: false,
        title: '',
        message: '',
        image: ''
      },
      banners: [],
      theme: {
        primaryColor: '#10b981',
        darkMode: false
      }
    },
    rider: {
      headerTitle: 'BorlaWura Fleet',
      headerTagline: 'Operational Command',
      maintenanceMode: false,
      support: {
        phone: '+233 30 000 0001',
        email: 'fleet@borlawura.com',
      },
      announcement: {
        enabled: false,
        title: '',
        message: '',
        image: ''
      },
      banners: [],
      theme: {
        primaryColor: '#8b5cf6',
        darkMode: true
      }
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, path: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(path);
    try {
      // Proactive Session Refresh: Ensures the auth token is fresh for Storage operations
      const { data: { session }, error: sessError } = await supabase.auth.refreshSession();
      
      if (sessError || !session) {
         console.warn('Silent refresh failed, checking current session...');
         const { data: { session: existing } } = await supabase.auth.getSession();
         if (!existing) {
            throw new Error("Your administrative session has expired. Please log out and log back in to resume uploads.");
         }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `cms-${Date.now()}.${fileExt}`;
      const filePath = `cms/${fileName}`;

      // Perform upload with fresh context
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) {
         if (uploadError.message.includes('expired')) {
            throw new Error("Security Token Refresh Required. Please reload the page and try once more.");
         }
         throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      updateField(path, publicUrl);
      
    } catch (error: any) {
      console.error('CMS Upload Critical Error:', error);
      alert(`Upload Blocked: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    fetchCMSConfig();
  }, []);

  const fetchCMSConfig = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('system_settings').select('*').eq('id', 'cms_config_v3').single();
      if (data?.settings) {
         // Deep Merge Safety: Prevents crashes if legacy DB records lack new keys (Support/Maintenance)
         const merged = { ...appConfig };
         if (data.settings.user) {
            merged.user = { 
               ...appConfig.user, 
               ...data.settings.user,
               support: { ...appConfig.user.support, ...(data.settings.user.support || {}) }
            };
         }
         if (data.settings.rider) {
            merged.rider = { 
               ...appConfig.rider, 
               ...data.settings.rider,
               support: { ...appConfig.rider.support, ...(data.settings.rider.support || {}) }
            };
         }
         setAppConfig(merged);
      }
    } catch (e) {
      console.warn('Using default CMS schema - database sync pending.');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      
      const { error: pError } = await supabase.from('system_settings').upsert([{ 
        id: 'cms_config_v3', 
        settings: appConfig, 
        updated_at: timestamp 
      }]);
      if (pError) throw pError;

      const { data: globalRow } = await supabase.from('system_settings').select('*').eq('id', 'global_config').maybeSingle();
      const legacyPayload = {
        ...(globalRow?.settings || {}),
        maintenance_mode: appConfig.user.maintenanceMode,
        mobileApp: {
          headerTitle: appConfig.user.headerTitle,
          headerTagline: appConfig.user.headerTagline,
          popupActive: appConfig.user.announcement.enabled,
          popupTitle: appConfig.user.announcement.title,
          popupMessage: appConfig.user.announcement.message,
          popupImage: appConfig.user.announcement.image,
          newsItems: appConfig.user.banners.map((b: any) => ({
             id: b.id,
             title: b.title,
             content: b.subtitle,
             image: b.image,
             category: b.category,
             action_type: b.action_type,
             action_value: b.action_value
          }))
        }
      };

      const { error: lError } = await supabase.from('system_settings').upsert([{ 
        id: 'global_config', 
        settings: legacyPayload, 
        updated_at: timestamp 
      }]);
      if (lError) throw lError;

      await logActivity('CMS Global Sync', 'SYSTEM', 'cms_config_v3', { app: activeApp, push: 'v3+global' }, userInfo);
      await fetchCMSConfig();
      alert('Success: CMS Suite synchronized across all mobile and dashboard protocols.');
    } catch (e: any) {
      alert('Deployment Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    setAppConfig((prev: any) => {
      const next = { ...prev };
      let curr = next;
      for (let i = 0; i < keys.length - 1; i++) {
        curr[keys[i]] = { ...curr[keys[i]] };
        curr = curr[keys[i]];
      }
      curr[keys[keys.length - 1]] = value;
      return next;
    });
  };

  if (loading) return (
     <div className="h-[70vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
     </div>
  );

  const currentApp = appConfig[activeApp];

  return (
    <div className="min-h-screen bg-transparent font-['Montserrat'] animate-fade-in flex flex-col gap-8 pb-20">
      
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-10 py-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5">
         <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
               <i className="ri-window-line text-2xl"></i>
            </div>
            <div>
               <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">App Studio</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage mobile app experience</p>
            </div>
         </div>
         <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveApp('user')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeApp === 'user' ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-md' : 'text-slate-500'}`}
            >
               Consumer
            </button>
            <button 
              onClick={() => setActiveApp('rider')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeApp === 'rider' ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-md' : 'text-slate-500'}`}
            >
               Fleet
            </button>
         </div>
         <button 
           onClick={saveConfig}
           disabled={saving}
           className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
         >
            {saving ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <i className="ri-save-3-line"></i>}
            Sync Cloud
         </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 h-full items-start">
         <div className="xl:col-span-12 2xl:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-3 space-y-3">
               {[
                 { id: 'interface', label: 'App Identity', icon: 'ri-layout-top-line' },
                 { id: 'banners', label: 'Banners & Ads', icon: 'ri-slideshow-3-line' },
                 { id: 'popup', label: 'Launch Megaphone', icon: 'ri-megaphone-line' },
                 { id: 'theme', label: 'Visual DNA', icon: 'ri-palette-line' },
               ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl transition-all border ${activeTab === tab.id ? 'bg-white dark:bg-slate-900 border-violet-500/30 text-violet-600 shadow-xl shadow-violet-500/5' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                  >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activeTab === tab.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' : 'bg-slate-100 dark:bg-white/5'}`}>
                        <i className={tab.icon}></i>
                     </div>
                     <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                     {activeTab === tab.id && <i className="ri-arrow-right-s-line ml-auto text-xl"></i>}
                  </button>
               ))}
            </div>

            <div className="md:col-span-9 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm p-12 min-h-[600px]">
               {activeTab === 'interface' && (
                  <div className="space-y-12 animate-fade-in">
                     <div className="space-y-3">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                           <i className="ri-layout-top-line mr-3 text-violet-500"></i>
                           App Header Config
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage top-level greeting and slogans</p>
                     </div>
                     <div className="grid grid-cols-1 gap-10">
                        <div className="space-y-4">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Title</label>
                           <input 
                             type="text" 
                             value={currentApp.headerTitle} 
                             onChange={e => updateField(`${activeApp}.headerTitle`, e.target.value)}
                             className="w-full px-8 py-5 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-3xl text-sm font-black focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Header Tagline</label>
                           <input 
                             type="text" 
                             value={currentApp.headerTagline} 
                             onChange={e => updateField(`${activeApp}.headerTagline`, e.target.value)}
                             className="w-full px-8 py-5 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-3xl text-sm font-bold text-slate-500 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Maintenance Protocol</label>
                            <button 
                              onClick={() => updateField(`${activeApp}.maintenanceMode`, !currentApp.maintenanceMode)}
                              className={`w-full py-5 rounded-3xl border-2 flex items-center justify-center gap-4 transition-all ${currentApp.maintenanceMode ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}
                            >
                               <i className={currentApp.maintenanceMode ? 'ri-error-warning-fill' : 'ri-checkbox-circle-fill'}></i>
                               <span className="text-[10px] font-bold uppercase tracking-widest">{currentApp.maintenanceMode ? 'Maintenance Mode Active (App Locked)' : 'System Live & Operational'}</span>
                            </button>
                         </div>
                     </div>
                  </div>
               )}

               {activeTab === 'banners' && (
                  <div className="space-y-10 animate-fade-in">
                     <div className="flex items-center justify-between">
                        <div className="space-y-2">
                           <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                              <i className="ri-slideshow-3-line mr-3 text-violet-500"></i>
                              Carousel Banners
                           </h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active promotion images</p>
                        </div>
                        <button 
                          onClick={() => {
                            const newBanner = { id: Date.now(), image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b', title: 'New Official Banner', subtitle: 'Action Required', link: '/' };
                            updateField(`${activeApp}.banners`, [...currentApp.banners, newBanner]);
                          }}
                          className="px-6 py-3 bg-violet-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                        >
                           <i className="ri-add-circle-line text-lg"></i>
                           New Asset
                        </button>
                     </div>
                     <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                        {currentApp.banners.map((banner: any, idx: number) => (
                           <div key={banner.id} className="relative p-8 bg-slate-50 dark:bg-black rounded-[2.5rem] border border-slate-100 dark:border-white/5 group">
                              <div className="flex flex-col lg:flex-row gap-8">
                                 <div className="w-full lg:w-48 h-32 rounded-2xl overflow-hidden shadow-lg shrink-0">
                                    <img src={banner.image} className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input 
                                      value={banner.title} 
                                      onChange={e => {
                                         const next = [...currentApp.banners];
                                         next[idx].title = e.target.value;
                                         updateField(`${activeApp}.banners`, next);
                                      }}
                                      className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-[11px] font-black uppercase outline-none" 
                                      placeholder="Title"
                                    />
                                    <input 
                                      value={banner.subtitle} 
                                      onChange={e => {
                                         const next = [...currentApp.banners];
                                         next[idx].subtitle = e.target.value;
                                         updateField(`${activeApp}.banners`, next);
                                      }}
                                      className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-[11px] font-bold text-slate-400 outline-none" 
                                      placeholder="Subtitle"
                                    />
                                    <div className="space-y-4 md:col-span-2">
                                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Image URL / Asset</label>
                                       <div className="flex gap-2">
                                          <input 
                                             value={banner.image} 
                                             onChange={e => {
                                                const next = [...currentApp.banners];
                                                next[idx].image = e.target.value;
                                                updateField(`${activeApp}.banners`, next);
                                             }}
                                             className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-mono outline-none border border-transparent focus:border-violet-500/30" 
                                             placeholder="Image URL"
                                          />
                                          <label className="px-4 py-3 bg-violet-600/10 text-violet-600 rounded-xl cursor-pointer hover:bg-violet-600 hover:text-white transition-all flex items-center justify-center shrink-0 min-w-[48px]">
                                             <i className={uploading === `${activeApp}.banners.${idx}.image` ? 'ri-loader-4-line animate-spin' : 'ri-upload-cloud-2-line'}></i>
                                             <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={e => handleFileUpload(e, `${activeApp}.banners.${idx}.image`)} 
                                             />
                                          </label>
                                       </div>
                                    </div>
                                    <input 
                                       value={banner.category || ''} 
                                       onChange={e => {
                                          const next = [...currentApp.banners];
                                          next[idx].category = e.target.value;
                                          updateField(`${activeApp}.banners`, next);
                                       }}
                                       className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase outline-none" 
                                       placeholder="Category (e.g. Promo)"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                       <input 
                                          value={banner.action_type || 'route'} 
                                          onChange={e => {
                                             const next = [...currentApp.banners];
                                             next[idx].action_type = e.target.value;
                                             updateField(`${activeApp}.banners`, next);
                                          }}
                                          className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold outline-none" 
                                          placeholder="Action Type"
                                       />
                                       <input 
                                          value={banner.action_value || '/'} 
                                          onChange={e => {
                                             const next = [...currentApp.banners];
                                             next[idx].action_value = e.target.value;
                                             updateField(`${activeApp}.banners`, next);
                                          }}
                                          className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold outline-none" 
                                          placeholder="Action Value"
                                       />
                                    </div>
                                 </div>
                                 <button 
                                   onClick={() => updateField(`${activeApp}.banners`, currentApp.banners.filter((_: any, i: number) => i !== idx))}
                                   className="p-4 text-slate-300 hover:text-rose-500 transition-colors"
                                 >
                                    <i className="ri-delete-bin-line text-xl"></i>
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeTab === 'popup' && (
                  <div className="space-y-12 animate-fade-in">
                     <div className="flex items-center justify-between">
                        <div className="space-y-2">
                           <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                              <i className="ri-megaphone-line mr-3 text-violet-500"></i>
                              Launch Megaphone
                           </h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active promotion on app start</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input 
                             type="checkbox" 
                             checked={currentApp.announcement.enabled} 
                             onChange={e => updateField(`${activeApp}.announcement.enabled`, e.target.checked)}
                             className="sr-only peer" 
                           />
                           <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600"></div>
                        </label>
                     </div>
                     <div className={`space-y-8 h-full transition-all duration-500 ${currentApp.announcement.enabled ? 'opacity-100' : 'opacity-30 grayscale pointer-events-none'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-4">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                 <i className="ri-text-snippet mr-2"></i>
                                 Modal Title
                              </label>
                              <input 
                                type="text" 
                                value={currentApp.announcement.title} 
                                onChange={e => updateField(`${activeApp}.announcement.title`, e.target.value)}
                                className="w-full px-8 py-5 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-3xl text-sm font-black focus:ring-2 focus:ring-violet-500 transition-all outline-none"
                              />
                           </div>
                           <div className="space-y-4">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                 <i className="ri-image-circle-line mr-2"></i>
                                 Banner Image / Asset
                              </label>
                              <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={currentApp.announcement.image} 
                                    onChange={e => updateField(`${activeApp}.announcement.image`, e.target.value)}
                                    className="flex-1 px-8 py-5 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-3xl text-[10px] font-mono text-emerald-500 transition-all outline-none focus:ring-2 focus:ring-violet-500"
                                 />
                                 <label className="px-6 py-5 bg-emerald-500/10 text-emerald-500 rounded-3xl cursor-pointer hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shrink-0 min-w-[64px]">
                                    <i className={uploading === `${activeApp}.announcement.image` ? 'ri-loader-4-line animate-spin text-xl' : 'ri-upload-cloud-2-line text-xl'}></i>
                                    <input 
                                       type="file" 
                                       className="hidden" 
                                       accept="image/*" 
                                       onChange={e => handleFileUpload(e, `${activeApp}.announcement.image`)} 
                                    />
                                 </label>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Modal Message</label>
                           <textarea 
                             rows={4} 
                             value={currentApp.announcement.message} 
                             onChange={e => updateField(`${activeApp}.announcement.message`, e.target.value)}
                             className="w-full px-8 py-6 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500 resize-none transition-all"
                           />
                        </div>
                     </div>
                  </div>
                )}

               {activeTab === 'theme' && (
                  <div className="space-y-12 animate-fade-in">
                     <div className="space-y-3">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                           <i className="ri-palette-line mr-3 text-violet-500"></i>
                           Brand DNA
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global branding and style protocols</p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                              <i className="ri-palette-fill mr-2"></i>
                              Primary Theme Color
                           </label>
                           <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-black rounded-3xl border border-slate-100 dark:border-white/5">
                              <input 
                                type="color" 
                                value={currentApp.theme.primaryColor} 
                                onChange={e => updateField(`${activeApp}.theme.primaryColor`, e.target.value)}
                                className="w-16 h-16 rounded-xl bg-transparent border-none cursor-pointer"
                              />
                              <span className="text-sm font-black uppercase text-slate-900 dark:text-white font-mono">{currentApp.theme.primaryColor}</span>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Dark Mode Engine</label>
                           <button 
                             onClick={() => updateField(`${activeApp}.theme.darkMode`, !currentApp.theme.darkMode)}
                             className={`w-full h-24 rounded-[2rem] border-2 flex items-center justify-center gap-4 transition-all ${currentApp.theme.darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}
                           >
                              <i className={currentApp.theme.darkMode ? 'ri-moon-fill text-2xl text-indigo-400' : 'ri-sun-fill text-2xl text-amber-500'}></i>
                              <span className="text-xs font-black uppercase tracking-widest">{currentApp.theme.darkMode ? 'Dark Engine Active' : 'Light Engine Active'}</span>
                           </button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         <div className="2xl:col-span-4 hidden 2xl:block relative">
            <div className="sticky top-10 flex flex-col items-center gap-8">
               <div className="w-[340px] h-[700px] bg-slate-900 rounded-[4rem] border-[12px] border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden relative">
                  <div className={`absolute inset-0 rounded-[3rem] overflow-hidden flex flex-col ${currentApp.theme.darkMode ? 'bg-[#0f0f12] text-white' : 'bg-white text-slate-900'}`}>
                     <div className="h-10 flex items-end justify-between px-10 text-[10px] font-bold opacity-40">
                        <span>9:41</span>
                        <div className="flex gap-2">
                           <i className="ri-signal-tower-fill"></i>
                           <i className="ri-wifi-line"></i>
                           <i className="ri-battery-2-line"></i>
                        </div>
                     </div>
                     <div className="px-8 mt-6">
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-xl font-black tracking-tighter uppercase leading-none">{currentApp.headerTitle}</h4>
                              <p className="text-[9px] font-bold opacity-40 mt-1 uppercase tracking-widest">{currentApp.headerTagline}</p>
                           </div>
                           <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                              <i className="ri-user-smile-line text-sm opacity-50"></i>
                           </div>
                        </div>
                     </div>
                     <div className="flex-1 px-6 mt-8 space-y-6 overflow-hidden">
                        <div className="relative h-44 rounded-[2rem] overflow-hidden shadow-xl">
                           {currentApp.banners.length > 0 ? (
                              <>
                                 <img src={currentApp.banners[0]?.image} className="w-full h-full object-cover" />
                                 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-6">
                                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">{currentApp.banners[0]?.subtitle}</p>
                                    <h5 className="text-sm font-black text-white tracking-tight uppercase">{currentApp.banners[0]?.title}</h5>
                                    <div className="flex gap-1 mt-3">
                                       <div className="w-8 h-1 rounded-full" style={{ backgroundColor: currentApp.theme.primaryColor }}></div>
                                       <div className="w-1.5 h-1 rounded-full bg-white/20"></div>
                                       <div className="w-1.5 h-1 rounded-full bg-white/20"></div>
                                    </div>
                                 </div>
                              </>
                           ) : (
                              <div className="w-full h-full bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                                 <i className="ri-image-2-line text-2xl opacity-10"></i>
                              </div>
                           )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 opacity-50">
                           {[1,2,3,4].map(i => (
                              <div key={i} className="h-24 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-transparent"></div>
                           ))}
                        </div>
                     </div>
                     <div className="h-20 border-t border-slate-100 dark:border-white/5 px-10 flex items-center justify-between opacity-50">
                        <i className="ri-home-fill text-xl" style={{ color: currentApp.theme.primaryColor }}></i>
                        <i className="ri-history-line text-xl"></i>
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white -mt-10 border-4 border-white dark:border-[#0f0f12]">
                           <i className="ri-add-line"></i>
                        </div>
                        <i className="ri-money-dollar-circle-line text-xl"></i>
                        <i className="ri-user-line text-xl"></i>
                     </div>
                     {currentApp.announcement.enabled && (
                        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in">
                           <div className="w-full bg-white dark:bg-[#1a1a1f] rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden animate-scale-up">
                              {currentApp.announcement.image && (
                                 <div className="w-full h-32 overflow-hidden">
                                    <img src={currentApp.announcement.image} className="w-full h-full object-cover" />
                                 </div>
                              )}
                              <div className="p-8 text-center bg-white dark:bg-[#1a1a1f]">
                                 <h6 className="text-sm font-black uppercase tracking-tight">{currentApp.announcement.title}</h6>
                                 <p className="text-[10px] font-medium opacity-50 mt-2 leading-relaxed">{currentApp.announcement.message}</p>
                                 <button className="w-full py-4 mt-6 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20" style={{ backgroundColor: currentApp.theme.primaryColor }}>
                                    Confirm
                                 </button>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-3xl z-[60]"></div>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Live Simulation V6</span>
                  <div className="flex gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                     <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                     <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
