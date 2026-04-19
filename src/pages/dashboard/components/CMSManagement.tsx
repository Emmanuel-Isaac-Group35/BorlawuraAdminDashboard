import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';

interface CMSManagementProps {
  adminInfo?: any;
}

export default function CMSManagement({ adminInfo }: CMSManagementProps) {
  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const [activeApp, setActiveApp] = useState<'user' | 'rider'>('user');
  const [activeTab, setActiveTab] = useState<'interface' | 'banners' | 'popup' | 'support' | 'links' | 'features' | 'theme'>('interface');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [appConfig, setAppConfig] = useState<any>({
    user: {
      headerTitle: 'Borla Wura',
      headerTagline: 'Clean. Green. Simple.',
      maintenanceMode: false,
      support: { phone: '+233 30 000 0000', email: 'support@borlawura.com', whatsapp: '+233 24 000 0000' },
      links: { website: 'https://borlawura.com', facebook: '', instagram: '', twitter: '', privacyPolicy: '', termsOfService: '' },
      features: { walletEnabled: true, referralSystem: true, householdSharing: true, liveTracking: true },
      announcement: { enabled: false, title: '', message: '', image: '' },
      banners: [],
      theme: { primaryColor: '#10b981', darkMode: false }
    },
    rider: {
      headerTitle: 'BorlaWura Fleet',
      headerTagline: 'Operational Command',
      maintenanceMode: false,
      support: { phone: '+233 30 000 0001', email: 'fleet@borlawura.com' },
      links: { website: 'https://borlawura.com', privacyPolicy: '', termsOfService: '' },
      features: { payoutsEnabled: true, routeOptimization: true, performanceBonuses: false },
      announcement: { enabled: false, title: '', message: '', image: '' },
      banners: [],
      theme: { primaryColor: '#8b5cf6', darkMode: true }
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, path: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(path);
    try {
      // Proactive Session Check
      const { data: { session }, error: sessError } = await supabase.auth.getSession();
      
      if (sessError || !session) {
         const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
         if (refreshError || !refreshed) {
            throw new Error("Administrative session expired. Please re-authenticate.");
         }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `cms-${Date.now()}.${fileExt}`;
      const filePath = `cms/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
         cacheControl: '3600',
         upsert: true
      });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      updateField(path, publicUrl);
      
    } catch (error: any) {
      console.error('CMS Upload Error:', error);
      alert(`Critical: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const fetchCMSConfig = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('system_settings').select('*').eq('id', 'cms_config_v3').single();
      if (data?.settings) {
         const merged = { ...appConfig };
         ['user', 'rider'].forEach((app: string) => {
            if (data.settings[app]) {
               merged[app] = { 
                  ...appConfig[app], 
                  ...data.settings[app],
                  support: { ...appConfig[app].support, ...(data.settings[app].support || {}) },
                  links: { ...appConfig[app].links, ...(data.settings[app].links || {}) },
                  features: { ...appConfig[app].features, ...(data.settings[app].features || {}) }
               };
            }
         });
         setAppConfig(merged);
      }
    } catch (e) {
      console.warn('Sync pending...');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const { error: pError } = await supabase.from('system_settings').upsert([{ id: 'cms_config_v3', settings: appConfig, updated_at: timestamp }]);
      if (pError) throw pError;
      
      // Update legacy global_config for mobile app compatibility
      const { data: globalRow } = await supabase.from('system_settings').select('*').eq('id', 'global_config').maybeSingle();
      const legacyPayload = {
         ...(globalRow?.settings || {}),
         maintenance_mode: appConfig.user.maintenanceMode,
         mobileApp: {
           headerTitle: appConfig.user.headerTitle,
           headerTagline: appConfig.user.headerTagline,
           popupActive: appConfig.user.announcement.enabled
         }
      };
      await supabase.from('system_settings').upsert([{ id: 'global_config', settings: legacyPayload, updated_at: timestamp }]);
      
      alert('Success: Configuration Propagated to Cloud.');
      fetchCMSConfig();
    } catch (e: any) {
      alert('Cloud Sync Failed: ' + e.message);
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

  useEffect(() => { fetchCMSConfig(); }, []);

  if (loading) return (
     <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Studio...</span>
     </div>
  );

  const currentApp = appConfig[activeApp];

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-6 lg:p-8 flex flex-col gap-6 font-['Montserrat']">
      
      {/* PROFESSIONAL COMPACT HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 gap-6">
         <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
               <i className="ri-window-line text-2xl"></i>
            </div>
            <div>
               <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">CMS Studio</h1>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Identity & Assets</p>
            </div>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex flex-1 md:flex-none">
               <button onClick={() => setActiveApp('user')} className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeApp === 'user' ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Consumer</button>
               <button onClick={() => setActiveApp('rider')} className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeApp === 'rider' ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Fleet</button>
            </div>
            <button onClick={saveConfig} disabled={saving} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
               {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-cloud-line"></i>} Sync Cloud
            </button>
         </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 h-full items-start">
         
         {/* MAIN CONFIGURATION AREA */}
         <div className="flex-1 w-full space-y-6">
            
            {/* COMPACT NAVIGATION */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm px-4">
               {[
                 { id: 'interface', label: 'Identity', icon: 'ri-layout-top-line' },
                 { id: 'banners', label: 'Ad Central', icon: 'ri-slideshow-3-line' },
                 { id: 'popup', label: 'Megaphone', icon: 'ri-megaphone-line' },
                 { id: 'support', label: 'Support Desk', icon: 'ri-customer-service-line' },
                 { id: 'links', label: 'External Links', icon: 'ri-links-line' },
                 { id: 'features', label: 'Smart Logic', icon: 'ri-robot-line' },
                 { id: 'theme', label: 'Branding', icon: 'ri-palette-line' },
               ].map(tab => (
                 <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)} 
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all shrink-0 group ${activeTab === tab.id ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                 >
                   <i className={`${tab.icon} text-base`}></i>
                   <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
                 </button>
               ))}
            </div>

            {/* TAB CONTENT - Standard Professional Sizing */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm p-6 md:p-8 min-h-[600px] mb-20">
               
               {activeTab === 'interface' && (
                  <div className="space-y-8 animate-fade-in">
                     <div className="border-b border-slate-50 dark:border-white/5 pb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">App Identity</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Branding & Headlines</p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Header</label>
                           <input type="text" value={currentApp.headerTitle} onChange={e => updateField(`${activeApp}.headerTitle`, e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/30 rounded-xl outline-none border border-transparent focus:border-violet-500/30 text-sm font-bold" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Tagline</label>
                           <input type="text" value={currentApp.headerTagline} onChange={e => updateField(`${activeApp}.headerTagline`, e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/30 rounded-xl outline-none border border-transparent focus:border-blue-500/30 text-sm font-bold" />
                        </div>
                     </div>
                     <div className="p-6 bg-slate-50 dark:bg-black/30 rounded-2xl flex items-center justify-between border border-transparent hover:border-violet-500/10 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-violet-600/20"><i className="ri-shield-user-line"></i></div>
                           <div>
                              <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white">Maintenance Protocol</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global access restriction</p>
                           </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input type="checkbox" checked={currentApp.maintenanceMode} onChange={e => updateField(`${activeApp}.maintenanceMode`, e.target.checked)} className="sr-only peer" />
                           <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                        </label>
                     </div>
                  </div>
               )}

               {activeTab === 'banners' && (
                  <div className="space-y-6 animate-fade-in">
                     <div className="flex justify-between items-center border-b border-slate-50 dark:border-white/5 pb-4">
                        <div>
                           <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ad Central</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Promotional Carousel Management</p>
                        </div>
                        <button onClick={() => updateField(`${activeApp}.banners`, [...currentApp.banners, { id: Date.now(), image: '', title: 'New Official Banner', subtitle: 'Global Promo', category: 'OFFER' }])} className="px-4 py-2.5 bg-violet-600 text-white rounded-lg font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-violet-700 transition-all flex items-center gap-2">
                           <i className="ri-add-line"></i> Add Asset
                        </button>
                     </div>
                     <div className="space-y-4">
                        {currentApp.banners.map((banner: any, idx: number) => (
                           <div key={banner.id} className="p-5 bg-slate-50 dark:bg-black/30 rounded-2xl border border-transparent hover:border-violet-500/10 transition-all group">
                              <div className="flex flex-col lg:flex-row gap-6">
                                 <div className="w-full lg:w-56 h-40 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 relative shadow-sm shrink-0">
                                    {banner.image ? <img src={banner.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><i className="ri-image-add-line text-3xl"></i></div>}
                                    <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/70 text-white text-[8px] font-black rounded-lg backdrop-blur-md">SLOT {idx+1}</div>
                                 </div>
                                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><div className="w-1 h-1 bg-violet-500 rounded-full"></div> Primary Heading</label>
                                       <input value={banner.title} onChange={e => { const b = [...currentApp.banners]; b[idx].title = e.target.value; updateField(`${activeApp}.banners`, b); }} className="w-full px-4 py-2.5 bg-white dark:bg-black/40 rounded-xl outline-none text-sm font-bold border border-transparent focus:border-violet-500/20" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><div className="w-1 h-1 bg-blue-500 rounded-full"></div> Global Callout</label>
                                       <input value={banner.subtitle} onChange={e => { const b = [...currentApp.banners]; b[idx].subtitle = e.target.value; updateField(`${activeApp}.banners`, b); }} className="w-full px-4 py-2.5 bg-white dark:bg-black/40 rounded-xl outline-none text-sm font-medium border border-transparent focus:border-blue-500/20" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full"></div> Identifier Tag</label>
                                       <input value={banner.category || ''} onChange={e => { const b = [...currentApp.banners]; b[idx].category = e.target.value; updateField(`${activeApp}.banners`, b); }} className="w-full px-4 py-2.5 bg-white dark:bg-black/40 rounded-xl outline-none text-[10px] font-black uppercase border border-transparent focus:border-emerald-500/20" placeholder="e.g. PROMO" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><div className="w-1 h-1 bg-amber-500 rounded-full"></div> Asset Source (URL)</label>
                                       <div className="flex gap-2">
                                          <input value={banner.image} onChange={e => { const b = [...currentApp.banners]; b[idx].image = e.target.value; updateField(`${activeApp}.banners`, b); }} className="flex-1 px-4 py-2.5 bg-white dark:bg-black/40 rounded-xl outline-none font-mono text-[9px] border border-transparent focus:border-amber-500/20" placeholder="https://..." />
                                          <label className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-sm shrink-0">
                                             <i className={uploading === `${activeApp}.banners.${idx}.image` ? 'ri-loader-4-line animate-spin' : 'ri-upload-2-fill'}></i>
                                             <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, `${activeApp}.banners.${idx}.image`)} />
                                          </label>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-row lg:flex-col justify-end lg:justify-center gap-3">
                                    <button onClick={() => updateField(`${activeApp}.banners`, currentApp.banners.filter((_: any, i: number) => i !== idx))} className="w-10 h-10 lg:w-12 lg:h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                       <i className="ri-delete-bin-line text-lg"></i>
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))}
                        {currentApp.banners.length === 0 && (
                           <div className="py-20 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center opacity-30">
                              <i className="ri-image-line text-4xl mb-2"></i>
                              <p className="text-[10px] font-black uppercase tracking-widest">Global Asset Pool Empty</p>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {activeTab === 'popup' && (
                  <div className="space-y-8 animate-fade-in">
                     <div className="flex justify-between items-center border-b border-slate-50 dark:border-white/5 pb-4">
                        <div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Megaphone</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Modal Protocols</p></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input type="checkbox" checked={currentApp.announcement.enabled} onChange={e => updateField(`${activeApp}.announcement.enabled`, e.target.checked)} className="sr-only peer" />
                           <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                        </label>
                     </div>
                     <div className={`space-y-6 transition-all ${currentApp.announcement.enabled ? 'opacity-100' : 'opacity-30 grayscale pointer-events-none'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modal Title</label><input value={currentApp.announcement.title} onChange={e => updateField(`${activeApp}.announcement.title`, e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/30 rounded-xl outline-none" /></div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Image Asset (URL)</label>
                              <div className="flex gap-2">
                                 <input value={currentApp.announcement.image} onChange={e => updateField(`${activeApp}.announcement.image`, e.target.value)} className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-black/30 rounded-xl outline-none" />
                                 <label className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center cursor-pointer shrink-0">
                                    <i className={uploading === `${activeApp}.announcement.image` ? 'ri-loader-4-line animate-spin' : 'ri-upload-cloud-2-line'}></i>
                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, `${activeApp}.announcement.image`)} />
                                 </label>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Broadcast Message</label><textarea rows={4} value={currentApp.announcement.message} onChange={e => updateField(`${activeApp}.announcement.message`, e.target.value)} className="w-full px-6 py-6 bg-slate-50 dark:bg-black/30 rounded-2xl outline-none resize-none font-medium text-sm" placeholder="Global message content..." /></div>
                     </div>
                  </div>
               )}

               {activeTab === 'support' && (
                  <div className="space-y-8 animate-fade-in">
                     <div className="border-b border-slate-50 dark:border-white/5 pb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Support Desk</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Help Center Protocols</p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Line</label><input value={currentApp.support.phone} onChange={e => updateField(`${activeApp}.support.phone`, e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/30 rounded-xl outline-none font-black text-sm" /></div>
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Support Email</label><input value={currentApp.support.email} onChange={e => updateField(`${activeApp}.support.email`, e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/30 rounded-xl outline-none font-black text-sm" /></div>
                        {activeApp === 'user' && <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp ID</label><input value={currentApp.support.whatsapp} onChange={e => updateField(`${activeApp}.support.whatsapp`, e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-black/30 rounded-xl outline-none font-black text-sm" /></div>}
                     </div>
                  </div>
               )}

               {activeTab === 'links' && (
                  <div className="space-y-8 animate-fade-in">
                     <div className="border-b border-slate-50 dark:border-white/5 pb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">External Links</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ecosystem Information Hub</p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(currentApp.links || {}).map(([key, value]: [string, any]) => (
                           <div key={key} className="p-5 bg-slate-50 dark:bg-black/30 rounded-2xl flex flex-col gap-2 border border-transparent hover:border-violet-500/10 transition-all">
                              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                              <input value={value} onChange={e => updateField(`${activeApp}.links.${key}`, e.target.value)} className="w-full bg-white dark:bg-black/20 p-3 rounded-xl outline-none font-mono text-[9px] text-violet-500" placeholder="https://..." />
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {activeTab === 'features' && (
                  <div className="space-y-8 animate-fade-in">
                     <div className="border-b border-slate-50 dark:border-white/5 pb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Smart Logic</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Functional Module Commander</p>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(currentApp.features || {}).map(([key, value]: [string, any]) => (
                           <label key={key} className={`flex items-center justify-between p-6 rounded-2xl border transition-all cursor-pointer group ${value ? 'bg-violet-600 shadow-lg shadow-violet-600/20 border-violet-500 text-white' : 'bg-slate-50 dark:bg-black/30 border-transparent opacity-60'}`}>
                              <div className="space-y-0.5">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                 <span className={`text-[8px] font-bold uppercase tracking-widest ${value ? 'text-white/60' : 'text-slate-400'}`}>{value ? 'Operational' : 'Disabled'}</span>
                              </div>
                              <input type="checkbox" checked={value} onChange={e => updateField(`${activeApp}.features.${key}`, e.target.checked)} className="hidden" />
                              <div className={`w-10 h-5 rounded-full relative transition-all ${value ? 'bg-white/20' : 'bg-slate-300'}`}>
                                 <div className={`w-3 h-3 bg-white rounded-full absolute top-1 left-1 transition-all ${value ? 'translate-x-5' : ''}`}></div>
                              </div>
                           </label>
                        ))}
                     </div>
                  </div>
               )}

               {activeTab === 'theme' && (
                  <div className="space-y-8 animate-fade-in">
                     <div className="border-b border-slate-50 dark:border-white/5 pb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Branding</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aesthetic Render Engine</p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 dark:bg-black/30 rounded-2xl flex items-center gap-6 border border-transparent hover:border-violet-500/10 transition-all">
                           <div className="relative group">
                              <input type="color" value={currentApp.theme.primaryColor} onChange={e => updateField(`${activeApp}.theme.primaryColor`, e.target.value)} className="w-16 h-16 bg-transparent rounded-full cursor-pointer relative z-10 p-0 border-0" />
                              <div className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-60 transition-all rounded-full" style={{ backgroundColor: currentApp.theme.primaryColor }}></div>
                           </div>
                           <div>
                              <span className="text-lg font-black uppercase font-mono tracking-tighter text-slate-800 dark:text-white leading-none">{currentApp.theme.primaryColor}</span>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Accent Color</p>
                           </div>
                        </div>
                        <div onClick={() => updateField(`${activeApp}.theme.darkMode`, !currentApp.theme.darkMode)} className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all shadow-sm ${currentApp.theme.darkMode ? 'bg-slate-900 border-indigo-500/20 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-md ${currentApp.theme.darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}><i className={currentApp.theme.darkMode ? 'ri-moon-fill' : 'ri-sun-fill'}></i></div>
                           <span className="text-[9px] font-black uppercase tracking-widest">{currentApp.theme.darkMode ? 'Dark Theme Active' : 'Light Theme Active'}</span>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* LIVE PREVIEW - Professional Desktop Dock */}
         <div className="w-[420px] shrink-0 sticky top-6 hidden 2xl:block pb-20">
            <div className="relative w-[320px] h-[650px] bg-slate-900 rounded-[3.5rem] border-[10px] border-slate-900 shadow-2xl overflow-hidden mx-auto transition-transform hover:scale-[1.01] duration-700">
               <div className={`absolute inset-0 flex flex-col ${currentApp.theme.darkMode ? 'bg-[#0f0f12] text-white' : 'bg-white text-slate-900'}`}>
                  {/* Status Bar */}
                  <div className="h-8 flex items-center justify-between px-10 text-[9px] font-bold opacity-30 mt-2">
                     <span>9:41</span>
                     <div className="flex gap-1.5"><i className="ri-signal-tower-fill"></i><i className="ri-wifi-line"></i><i className="ri-battery-fill"></i></div>
                  </div>
                  {/* App Header */}
                  <div className="px-7 mt-5 flex justify-between items-center">
                     <div className="space-y-0.5">
                        <h4 className="text-lg font-black tracking-tighter uppercase leading-none">{currentApp.headerTitle}</h4>
                        <p className="text-[9px] font-bold opacity-30 tracking-widest uppercase">{currentApp.headerTagline}</p>
                     </div>
                     <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 border border-transparent shadow-sm"></div>
                  </div>
                  {/* Main Viewport */}
                  <div className="flex-1 px-6 mt-6 space-y-5 overflow-hidden">
                     <div className="h-40 bg-slate-50 dark:bg-white/5 rounded-3xl overflow-hidden relative shadow-sm">
                        {currentApp.banners[0]?.image ? (
                           <div className="w-full h-full relative">
                              <img src={currentApp.banners[0]?.image} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-5 flex flex-col justify-end">
                                 <span className="text-[7px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">{currentApp.banners[0]?.subtitle}</span>
                                 <h5 className="text-[10px] font-black text-white uppercase tracking-tight leading-none">{currentApp.banners[0]?.title}</h5>
                              </div>
                           </div>
                        ) : (
                           <div className="w-full h-full flex items-center justify-center opacity-10"><i className="ri-image-fill text-3xl"></i></div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-3 opacity-60">
                        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent shadow-sm"></div>)}
                     </div>
                  </div>
                  {/* Announcement Overlay */}
                  {currentApp.announcement.enabled && (
                     <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in z-50">
                        <div className="w-full bg-white dark:bg-[#1a1a1f] rounded-[2.5rem] p-6 text-center shadow-2xl border border-white/5 animate-scale-up">
                           <div className="w-full h-24 rounded-2xl bg-slate-50 dark:bg-black mb-4 overflow-hidden">
                              {currentApp.announcement.image && <img src={currentApp.announcement.image} className="w-full h-full object-cover" />}
                           </div>
                           <h6 className="font-black uppercase text-[10px] tracking-tight">{currentApp.announcement.title}</h6>
                           <p className="text-[8px] mt-1.5 opacity-50 leading-relaxed overflow-hidden max-h-12">{currentApp.announcement.message}</p>
                           <button className="w-full py-3.5 mt-4 rounded-xl text-[8px] font-black uppercase text-white shadow-lg" style={{ backgroundColor: currentApp.theme.primaryColor }}>Acknowledge</button>
                        </div>
                     </div>
                  )}
               </div>
               {/* Device Hardware Top Cutout */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-b-3xl z-[60]"></div>
            </div>
            <div className="flex flex-col items-center gap-1.5 mt-4">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Live Simulation V8</span>
               <div className="w-8 h-0.5 bg-violet-600/30 rounded-full"></div>
            </div>
         </div>
      </div>
    </div>
  );
}
