import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface SystemSettingsProps {
  adminInfo?: any;
}

export default function SystemSettings({ adminInfo }: SystemSettingsProps) {
  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const [zones, setZones] = useState<string[]>(['Accra Central', 'Osu', 'Tema', 'Madina', 'Legon', 'Spintex']);
  const [categories, setCategories] = useState<any[]>([
    { name: 'General Waste', icon: 'ri-delete-bin-line', color: 'slate' },
    { name: 'Recyclable', icon: 'ri-recycle-line', color: 'emerald' },
    { name: 'Organic', icon: 'ri-leaf-line', color: 'amber' },
    { name: 'Hazardous', icon: 'ri-error-warning-line', color: 'rose' },
  ]);
  const [pricing, setPricing] = useState({
    baseFee: 20,
    commission: 10,
    subscription: 120,
    urgentSurcharge: 10
  });
  const [notifications, setNotifications] = useState({
    sms: true,
    push: true,
    email: true,
    adminAlerts: true,
    senderId: 'BORLAWURA'
  });
  const [mobileApp, setMobileApp] = useState({
    headerTitle: 'Borla Wura',
    headerTagline: 'Eco-friendly Pickups',
    popupActive: false,
    popupTitle: 'Welcome back!',
    popupMessage: 'Check out our new recycling initiatives!',
    popupImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80'
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('borlawura_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.zones) setZones(parsed.zones);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.pricing) setPricing(parsed.pricing);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.mobileApp) setMobileApp(parsed.mobileApp);
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  const saveSettings = async () => {
    const roleKey = (userInfo.role || '').toLowerCase().replace(/\s+/g, '_');
    const canManage = roleKey === 'admin' || roleKey === 'manager';
    
    if (!canManage) {
      alert('Access Denied: Administrative authority required to modify core system protocols.');
      return;
    }

    const settings = { zones, categories, pricing, notifications, mobileApp };
    localStorage.setItem('borlawura_settings', JSON.stringify(settings));

    // Also push to Supabase for mobile app to fetch
    try {
      await supabase.from('system_settings').upsert([{ 
        id: 'global_config', 
        settings: settings,
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not sync to cloud, remaining local', e);
    }

    // Log action to database
    try {
      await supabase.from('audit_logs').insert([{
        admin_id: userInfo.id,
        action: 'System Configuration Updated',
        details: { 
          message: `Core business rules refined: Zones, Pricing, and notification protocols adjusted.`, 
          admin: userInfo.fullName 
        }
      }]);
    } catch (e) {
      console.error('Audit log failed', e);
    }

    alert('Settings have been saved and logged to history.');
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Change how the system works and set your prices</p>
        </div>
        <button
          onClick={saveSettings}
          className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl transition-all flex items-center gap-2"
        >
          <i className="ri-save-3-line"></i>
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Service Zones */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
           <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Areas We Work In</h2>
           </div>
           <div className="p-8 space-y-3">
              {zones.map((zone, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <i className="ri-map-pin-2-line"></i>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{zone}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Delete ${zone}?`)) {
                        setZones(zones.filter((_, i) => i !== index));
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <i className="ri-close-circle-line text-lg"></i>
                  </button>
                </div>
              ))}
              <button 
                onClick={() => {
                  const name = window.prompt('Enter new area name:');
                  if (name) setZones([...zones, name]);
                }}
                className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-500 transition-all mt-4"
              >
                + Add New Area
              </button>
           </div>
        </div>

        {/* Waste Categories */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
           <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Types of Waste</h2>
           </div>
           <div className="p-8 space-y-3">
              {categories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-${cat.color}-500/10 flex items-center justify-center text-${cat.color}-500`}>
                      <i className={cat.icon}></i>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{cat.name}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Delete ${cat.name}?`)) {
                        setCategories(categories.filter((_, i) => i !== index));
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <i className="ri-close-circle-line text-lg"></i>
                  </button>
                </div>
              ))}
              <button 
                onClick={() => {
                   const name = window.prompt('Enter waste type name:');
                   if (name) setCategories([...categories, { name, icon: 'ri-delete-bin-line', color: 'slate' }]);
                }}
                className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-500 transition-all mt-4"
              >
                 + Add New Waste Type
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pricing */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
           <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Prices & Fees</h2>
           </div>
           <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'One-time Pickup Fee', key: 'baseFee', symbol: '₵' },
                { label: 'Our Commission (Percent)', key: 'commission', symbol: '%' },
                { label: 'Monthly Subscription Fee', key: 'subscription', symbol: '₵' },
                { label: 'Urgent Pickup Extra Fee', key: 'urgentSurcharge', symbol: '₵' },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">{item.label}</label>
                   <div className="relative group">
                      {item.symbol === '₵' && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₵</span>}
                      <input 
                        type="number"
                        value={pricing[item.key as keyof typeof pricing]}
                        onChange={(e) => setPricing({...pricing, [item.key]: Number(e.target.value)})}
                        className={`w-full ${item.symbol === '₵' ? 'pl-10' : 'px-5'} py-4 bg-slate-50 dark:bg-black border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                      />
                      {item.symbol === '%' && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>}
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Global Notifications */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
           <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Notification Settings</h2>
           </div>
           <div className="p-8 space-y-6 flex-1">
              {[
                { label: 'SMS Notifications', key: 'sms', desc: 'Send messages to users' },
                { label: 'App Push Notifications', key: 'push', desc: 'Direct phone alerts' },
                { label: 'Admin Security Notifications', key: 'adminAlerts', desc: 'System safety notifications' },
              ].map((notif) => (
                <div key={notif.key} className="flex items-center justify-between group p-2 rounded-2xl hover:bg-slate-50/50 transition-colors">
                   <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{notif.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-1">{notif.desc}</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications[notif.key as keyof typeof notifications] as boolean} 
                        onChange={(e) => setNotifications({...notifications, [notif.key]: e.target.checked})}
                      />
                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                   </label>
                </div>
              ))}

              <div className="pt-6 border-t border-slate-50 dark:border-white/5 space-y-3">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1 text-emerald-600">SMS Sender Name</label>
                 <div className="w-full px-5 py-4 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-2xl flex items-center justify-between group">
                    <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">BORLAWURA</span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                       <i className="ri-lock-2-line text-emerald-500 text-[10px]"></i>
                       <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">System Record Locked</span>
                    </div>
                 </div>
                 <p className="text-[9px] text-slate-400 font-medium px-2 uppercase tracking-tighter mt-1 opacity-70">The system identity is fixed to comply with Arkesel Gateway protocols and branding guidelines.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
