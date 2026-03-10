import { useState, useEffect } from 'react';

export default function SystemSettings() {
  const [zones, setZones] = useState<string[]>(['Accra Central', 'Osu', 'Tema', 'Madina', 'Legon', 'Spintex']);
  const [categories, setCategories] = useState<any[]>([
    { name: 'General Waste', icon: 'ri-delete-bin-line', color: 'teal' },
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
    adminAlerts: true
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
    alert('System configurations updated successfully.');
  };

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure core platform parameters and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-teal-600 transition-all flex items-center gap-2"
        >
          <i className="ri-save-line"></i>
          Commit Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Zones */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden min-h-[400px]">
           <div className="p-5 border-b border-gray-50 dark:border-gray-700">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Service Sectors</h2>
           </div>
           <div className="p-5 space-y-3">
              {zones.map((zone, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600">
                      <i className="ri-map-pin-line"></i>
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">{zone}</span>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <i className="ri-delete-bin-6-line"></i>
                  </button>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:border-teal-500 hover:text-teal-500 transition-all">
                Add New Sector
              </button>
           </div>
        </div>

        {/* Waste Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden min-h-[400px]">
           <div className="p-5 border-b border-gray-50 dark:border-gray-700">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Asset Classifications</h2>
           </div>
           <div className="p-5 space-y-3">
              {categories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-${cat.color}-500/10 flex items-center justify-center text-${cat.color}-500`}>
                      <i className={cat.icon}></i>
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">{cat.name}</span>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-teal-500 opacity-0 group-hover:opacity-100 transition-all">
                    <i className="ri-edit-line"></i>
                  </button>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:border-teal-500 hover:text-teal-500 transition-all">
                 Define New Category
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pricing */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
           <div className="p-5 border-b border-gray-50 dark:border-gray-700">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Pricing Algorithms</h2>
           </div>
           <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Base Collection Fee', key: 'baseFee', symbol: '₵' },
                { label: 'Platform Revenue Share (%)', key: 'commission', symbol: '%' },
                { label: 'Premium Subscription', key: 'subscription', symbol: '₵' },
                { label: 'Strategic Surcharge', key: 'urgentSurcharge', symbol: '₵' },
              ].map((item) => (
                <div key={item.key} className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{item.label}</label>
                   <div className="relative">
                      {item.symbol === '₵' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₵</span>}
                      <input 
                        type="number"
                        value={pricing[item.key as keyof typeof pricing]}
                        onChange={(e) => setPricing({...pricing, [item.key]: Number(e.target.value)})}
                        className={`w-full ${item.symbol === '₵' ? 'pl-8' : 'px-4'} py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-500`}
                      />
                      {item.symbol === '%' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>}
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Global Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
           <div className="p-5 border-b border-gray-50 dark:border-gray-700">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Dispatch Controls</h2>
           </div>
           <div className="p-6 space-y-4">
              {[
                { label: 'SMS Gateway', key: 'sms', desc: 'Real-time broadcast' },
                { label: 'Push Direct', key: 'push', desc: 'Mobile app intrusion' },
                { label: 'Admin Overrides', key: 'adminAlerts', desc: 'System level signals' },
              ].map((notif) => (
                <div key={notif.key} className="flex items-center justify-between group">
                   <div>
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white uppercase">{notif.label}</p>
                      <p className="text-[9px] text-gray-400 font-medium uppercase tracking-tighter">{notif.desc}</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications[notif.key as keyof typeof notifications]} 
                        onChange={(e) => setNotifications({...notifications, [notif.key]: e.target.checked})}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-teal-500"></div>
                   </label>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
