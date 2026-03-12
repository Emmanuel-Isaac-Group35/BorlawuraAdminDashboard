import { useState, useEffect } from 'react';

export default function SystemSettings() {
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

  useEffect(() => {
    const savedSettings = localStorage.getItem('borlawura_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.zones) setZones(parsed.zones);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.pricing) setPricing(parsed.pricing);
        if (parsed.notifications) setNotifications(parsed.notifications);
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  const saveSettings = () => {
    const settings = { zones, categories, pricing, notifications };
    localStorage.setItem('borlawura_settings', JSON.stringify(settings));
    alert('System configurations synchronized successfully.');
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">System Configuration</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage global platform parameters and service definitions</p>
        </div>
        <button
          onClick={saveSettings}
          className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl transition-all flex items-center gap-2"
        >
          <i className="ri-save-3-line"></i>
          Deploy Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Service Zones */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
           <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Operational Service Sectors</h2>
           </div>
           <div className="p-8 space-y-3">
              {zones.map((zone, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <i className="ri-map-pin-2-line"></i>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{zone}</span>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <i className="ri-close-circle-line text-lg"></i>
                  </button>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-500 transition-all mt-4">
                + Provision New Sector
              </button>
           </div>
        </div>

        {/* Waste Categories */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
           <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Asset Category Definitions</h2>
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
                  <button className="p-2 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all">
                    <i className="ri-settings-4-line text-lg"></i>
                  </button>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-500 transition-all mt-4">
                 + Define New Classification
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pricing */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
           <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Pricing & Revenue Constants</h2>
           </div>
           <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Standard Collection Fee', key: 'baseFee', symbol: '₵' },
                { label: 'Platform Revenue Split', key: 'commission', symbol: '%' },
                { label: 'Recurring Subscription', key: 'subscription', symbol: '₵' },
                { label: 'Priority Surcharge', key: 'urgentSurcharge', symbol: '₵' },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">{item.label}</label>
                   <div className="relative group">
                      {item.symbol === '₵' && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₵</span>}
                      <input 
                        type="number"
                        value={pricing[item.key as keyof typeof pricing]}
                        onChange={(e) => setPricing({...pricing, [item.key]: Number(e.target.value)})}
                        className={`w-full ${item.symbol === '₵' ? 'pl-10' : 'px-5'} py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
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
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">System Signal Nodes</h2>
           </div>
           <div className="p-8 space-y-6 flex-1">
              {[
                { label: 'SMS Gateway Link', key: 'sms', desc: 'Real-time broadcast node' },
                { label: 'Direct Push Signals', key: 'push', desc: 'Native app transmission' },
                { label: 'Global Audit Alerts', key: 'adminAlerts', desc: 'System integrity signals' },
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
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                   </label>
                </div>
              ))}

              <div className="pt-6 border-t border-slate-50 dark:border-white/5 space-y-3">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1 text-indigo-600">Global Signal ID (Sender Name)</label>
                 <div className="relative group">
                    <i className="ri-shield-user-line absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input 
                      type="text"
                      maxLength={11}
                      value={notifications.senderId}
                      onChange={(e) => setNotifications({...notifications, senderId: e.target.value.toUpperCase()})}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                      placeholder="E.G. BORLAWURA"
                    />
                 </div>
                 <p className="text-[9px] text-slate-400 font-medium px-2 uppercase tracking-tighter">* Maximum 11 characters, no special symbols for GSM compatibility</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
