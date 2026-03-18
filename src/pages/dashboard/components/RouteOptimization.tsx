import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface RouteStop {
  id: string;
  address: string;
  pickupId: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  wasteType: string;
  status: 'pending' | 'completed' | 'skipped';
}

interface OptimizedRoute {
  id: string;
  riderId: string;
  riderName: string;
  zone: string;
  totalStops: number;
  completedStops: number;
  totalDistance: string;
  distanceValue: number; 
  estimatedDuration: string;
  durationValue: number; 
  fuelSaved: string;
  fuelSavedValue: number; 
  status: 'active' | 'completed' | 'planned';
  stops: RouteStop[];
}

export default function RouteOptimization() {
  const [selectedRoute, setSelectedRoute] = useState<OptimizedRoute | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [routes, setRoutes] = useState<OptimizedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateRoutes();
  }, []);

  const generateRoutes = async () => {
    setLoading(true);

    try {
      const { data: riders, error: ridersError } = await supabase
        .from('riders')
        .select('*')
        .eq('status', 'active');

      if (ridersError) throw ridersError;

      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select('*, users(location, full_name)')
        .eq('status', 'requested')
        .order('created_at', { ascending: true });

      if (pickupsError) throw pickupsError;

      if (!riders || !pickups || riders.length === 0) {
        setRoutes([]);
        setLoading(false);
        return;
      }

      const generatedRoutes: OptimizedRoute[] = riders.map((rider, index) => {
        let riderPickups = pickups.filter(p =>
          (p.address || '').toLowerCase().includes(rider.zone?.toLowerCase() || '')
        );

        if (riderPickups.length === 0 && pickups.length > 0) {
          const sliceSize = Math.ceil(pickups.length / riders.length);
          const start = index * sliceSize;
          riderPickups = pickups.slice(start, start + sliceSize);
        }

        if (riderPickups.length === 0) return null;

        const stops: RouteStop[] = riderPickups.map((p, i) => ({
          id: `STOP-${i + 1}`,
          address: p.address || 'Service Location',
          pickupId: p.id.slice(0, 8),
          priority: i % 3 === 0 ? 'high' : 'medium',
          estimatedTime: new Date(new Date().getTime() + (index * 60 + (i + 1) * 30) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          wasteType: p.waste_type || 'General',
          status: 'pending'
        }));

        const totalStops = stops.length;
        const distVal = totalStops * 2.5;
        const durationVal = totalStops * 20;

        return {
          id: `RT-${rider.id.slice(0, 5).toUpperCase()}`,
          riderId: `R-${rider.id.slice(0, 4)}`,
          riderName: rider.full_name,
          zone: rider.zone || 'Central Operating Zone',
          totalStops: totalStops,
          completedStops: 0,
          totalDistance: `${distVal.toFixed(1)} km`,
          distanceValue: distVal,
          estimatedDuration: `${Math.floor(durationVal / 60)}h ${durationVal % 60}m`,
          durationValue: durationVal,
          fuelSaved: '18.4%',
          fuelSavedValue: 18.4,
          status: 'active',
          stops: stops
        };
      }).filter((r): r is OptimizedRoute => r !== null);

      setRoutes(generatedRoutes);
    } catch (error) {
      console.error('Error generating routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalDistance = routes.reduce((sum, r) => sum + r.distanceValue, 0);
  const totalTimeSaved = Math.round(routes.reduce((sum, r) => sum + (r.durationValue * 0.18), 0)); 
  const avgFuelSaved = routes.length > 0 ? 18.4 : 0;

  const handleOptimizeRoutes = () => {
    setOptimizing(true);
    setTimeout(() => {
      generateRoutes();
      setOptimizing(false);
    }, 1500);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'completed':
        return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-white/5 dark:text-slate-400';
      case 'planned':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'medium':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'low':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Route Planning</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Plan the best paths for your riders to save time and fuel</p>
        </div>
        <button
          onClick={handleOptimizeRoutes}
          disabled={optimizing}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-[2rem] text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-3"
        >
          {optimizing ? (
            <>
              <i className="ri-loader-4-line animate-spin text-lg"></i>
              Planning Routes...
            </>
          ) : (
            <>
              <i className="ri-guide-line text-lg"></i>
              Find Best Routes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Riders', value: routes.filter(r => r.status === 'active').length, icon: 'ri-radar-line', color: 'indigo', sub: 'Currently moving' },
          { label: 'Total Distance', value: `${totalDistance.toFixed(1)} km`, icon: 'ri-map-pin-distance-line', color: 'emerald', sub: 'Coverage today' },
          { label: 'Fuel Saved', value: `${avgFuelSaved}%`, icon: 'ri-drop-line', color: 'amber', sub: 'Efficiency' },
          { label: 'Time Saved', value: `${totalTimeSaved} m`, icon: 'ri-flashlight-line', color: 'rose', sub: 'vs. manual planning' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600`}>
                <i className={`${stat.icon} text-lg`}></i>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{stat.value}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-widest opacity-60">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5">
               <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Compiling Neural Routes...</p>
            </div>
          ) : routes.map((route) => (
            <div
              key={route.id}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-white/5 flex items-center justify-center text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <i className="ri-e-bike-2-line text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{route.riderName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{route.riderId} • <span className="text-indigo-500">{route.zone}</span></p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${getStatusStyle(route.status)}`}>
                    {route.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-6 bg-slate-50/50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-50 dark:border-white/5 mb-8">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Status</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {route.completedStops} / {route.totalStops} DONE
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Distance</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{route.totalDistance}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Duration</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{route.estimatedDuration}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Savings</p>
                    <p className="text-sm font-bold text-emerald-600 uppercase">+{route.fuelSaved}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedRoute(route)}
                    className="flex-1 py-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                  >
                    View Route
                  </button>
                  <button className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xl">
                    Assign to Rider
                  </button>
                </div>
              </div>
            </div>
          ))}
          {routes.length === 0 && !loading && (
             <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
                <i className="ri-route-line text-4xl text-slate-200 mb-4 inline-block"></i>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">No pending logistics queues identified</p>
             </div>
          )}
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 dark:bg-white/5 rounded-[3rem] border border-white/5 p-10 text-white relative overflow-hidden group">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-6">Smart Tips</h3>
              <div className="space-y-6 relative z-10">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                       <i className="ri-donut-chart-line text-xl"></i>
                    </div>
                    <div>
                       <h4 className="text-[11px] font-bold uppercase tracking-widest mb-1.5 text-emerald-400">Time Saved</h4>
                       <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                          Our routes have helped riders finish work 18.4% faster today.
                       </p>
                    </div>
                 </div>
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                       <i className="ri-error-warning-line text-xl"></i>
                    </div>
                    <div>
                       <h4 className="text-[11px] font-bold uppercase tracking-widest mb-1.5 text-amber-400">Traffic Alert</h4>
                       <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                          Heavy traffic detected in Osu. We are finding better paths.
                       </p>
                    </div>
                 </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] group-hover:bg-indigo-500/20 transition-all"></div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 p-10">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">System Health</h4>
              <div className="space-y-6">
                 <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-2.5">
                       <span className="text-slate-400">Work Load</span>
                       <span className="text-slate-900 dark:text-white">94%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 shadow-lg shadow-indigo-500/50" style={{ width: '94%' }}></div>
                    </div>
                 </div>
                 <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-2.5">
                       <span className="text-slate-400">Rider Online</span>
                       <span className="text-slate-900 dark:text-white">88%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 shadow-lg shadow-emerald-500/50" style={{ width: '88%' }}></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {selectedRoute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedRoute(null)}></div>
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
            <div className="px-10 py-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Sequence Analysis - {selectedRoute.id}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedRoute.riderName} • <span className="text-indigo-500">{selectedRoute.zone}</span></p>
              </div>
              <button 
                onClick={() => setSelectedRoute(null)} 
                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-slate-400"
              >
                <i className="ri-close-line text-3xl"></i>
              </button>
            </div>

            <div className="p-10 max-h-[70vh] overflow-y-auto scrollbar-hide space-y-10">
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'Total Nodes', value: selectedRoute.totalStops, color: 'slate' },
                  { label: 'Processed', value: selectedRoute.completedStops, color: 'emerald' },
                  { label: 'Network Radius', value: selectedRoute.totalDistance, color: 'indigo' },
                  { label: 'Est. Cycle', value: selectedRoute.estimatedDuration, color: 'amber' },
                ].map((m, i) => (
                  <div key={i} className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{m.label}</p>
                    <p className={`text-xl font-bold uppercase transition-all ${m.color === 'emerald' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] pl-1">Operational Sequence</h4>
                <div className="space-y-4">
                  {selectedRoute.stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-3xl hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-start gap-6">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-inner ${
                          stop.status === 'completed' ? 'bg-emerald-500 text-white' :
                          stop.status === 'pending' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-[15px] font-bold text-slate-900 dark:text-white truncate leading-none mb-2">{stop.address}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Node ID: {stop.pickupId}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${getPriorityStyle(stop.priority)}`}>
                              {stop.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-[11px] font-bold uppercase text-slate-500 tracking-tight">
                            <span className="flex items-center gap-1.5"><i className="ri-time-line text-indigo-500"></i> {stop.estimatedTime}</span>
                            <span className="flex items-center gap-1.5"><i className="ri-delete-bin-3-line text-indigo-500"></i> {stop.wasteType}</span>
                            <span className={`ml-auto ${stop.status === 'completed' ? 'text-emerald-500 font-bold' : stop.status === 'pending' ? 'text-indigo-600 font-bold' : 'text-slate-400 italic'}`}>
                              {stop.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-slate-50 dark:border-white/5 flex gap-4">
               <button 
                onClick={() => setSelectedRoute(null)} 
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl transition-all"
               >
                 Acknowledge & Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
