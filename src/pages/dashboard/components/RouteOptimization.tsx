import { useState } from 'react';

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
  estimatedDuration: string;
  fuelSaved: string;
  stops: RouteStop[];
  status: 'active' | 'completed' | 'planned';
}

export default function RouteOptimization() {
  const [selectedRoute, setSelectedRoute] = useState<OptimizedRoute | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const routes: OptimizedRoute[] = [
    {
      id: 'RT-001',
      riderId: 'R-2847',
      riderName: 'Kofi Adu',
      zone: 'Accra Central',
      totalStops: 12,
      completedStops: 8,
      totalDistance: '18.5 km',
      estimatedDuration: '2h 15m',
      fuelSaved: '15%',
      status: 'active',
      stops: [
        { id: 'S1', address: 'Ring Road Central, Accra', pickupId: 'PU-2847', priority: 'high', estimatedTime: '10:00 AM', wasteType: 'Mixed', status: 'completed' },
        { id: 'S2', address: 'Kwame Nkrumah Avenue', pickupId: 'PU-2848', priority: 'high', estimatedTime: '10:15 AM', wasteType: 'Organic', status: 'completed' },
        { id: 'S3', address: 'Castle Road', pickupId: 'PU-2849', priority: 'medium', estimatedTime: '10:30 AM', wasteType: 'Recyclable', status: 'pending' },
      ]
    },
    {
      id: 'RT-002',
      riderId: 'R-1523',
      riderName: 'Yaw Boateng',
      zone: 'Osu',
      totalStops: 15,
      completedStops: 15,
      totalDistance: '22.3 km',
      estimatedDuration: '2h 45m',
      fuelSaved: '18%',
      status: 'completed',
      stops: []
    },
    {
      id: 'RT-003',
      riderId: 'R-3421',
      riderName: 'Akua Mensah',
      zone: 'Tema',
      totalStops: 10,
      completedStops: 0,
      totalDistance: '16.2 km',
      estimatedDuration: '1h 50m',
      fuelSaved: '12%',
      status: 'planned',
      stops: []
    }
  ];

  const handleOptimizeRoutes = () => {
    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      toast.innerHTML = `
        <i class="ri-check-line text-lg"></i>
        <span class="font-medium">Routes optimized successfully! Saved 45 minutes and 15% fuel</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'completed':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'planned':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Route Optimization</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered route planning to maximize efficiency</p>
        </div>
        <button
          onClick={handleOptimizeRoutes}
          disabled={optimizing}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
        >
          {optimizing ? (
            <>
              <i className="ri-loader-4-line animate-spin"></i>
              Optimizing...
            </>
          ) : (
            <>
              <i className="ri-route-line"></i>
              Optimize All Routes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Active Routes</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <i className="ri-route-line text-emerald-600 dark:text-emerald-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {routes.filter(r => r.status === 'active').length}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">In progress</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Distance</span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <i className="ri-map-pin-distance-line text-blue-600 dark:text-blue-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">57 km</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Today's coverage</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Fuel Saved</span>
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <i className="ri-gas-station-line text-teal-600 dark:text-teal-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">15%</p>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">₵245 saved today</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Time Saved</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="ri-time-line text-amber-600 dark:text-amber-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">45 min</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">vs. manual routing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {routes.map((route) => (
            <div
              key={route.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <i className="ri-e-bike-2-line text-teal-600 dark:text-teal-400 text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{route.riderName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{route.riderId} • {route.zone}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>
                    {route.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stops</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {route.completedStops}/{route.totalStops}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Distance</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{route.totalDistance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{route.estimatedDuration}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fuel Saved</p>
                    <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">{route.fuelSaved}</p>
                  </div>
                </div>

                {route.status === 'active' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>{Math.round((route.completedStops / route.totalStops) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 transition-all duration-300"
                        style={{ width: `${(route.completedStops / route.totalStops) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRoute(route)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-eye-line mr-2"></i>
                    View Details
                  </button>
                  <button className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer">
                    <i className="ri-map-2-line mr-2"></i>
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Optimization Insights</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="ri-check-line text-emerald-600 dark:text-emerald-400"></i>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Efficient Routing</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Current routes are 15% more efficient than yesterday
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="ri-alert-line text-amber-600 dark:text-amber-400"></i>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Traffic Alert</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Heavy traffic on Ring Road. Consider alternative route
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="ri-lightbulb-line text-blue-600 dark:text-blue-400"></i>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Suggestion</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Combine 3 nearby pickups in Osu to save 20 minutes
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Weekly Performance</h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Routes Completed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">47/50</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: '94%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Efficiency Score</span>
                  <span className="font-semibold text-gray-900 dark:text-white">88%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '88%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedRoute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Route Details - {selectedRoute.id}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedRoute.riderName} • {selectedRoute.zone}</p>
                </div>
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-400"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Stops</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRoute.totalStops}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{selectedRoute.completedStops}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Distance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRoute.totalDistance}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Est. Duration</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRoute.estimatedDuration}</p>
                </div>
              </div>

              {selectedRoute.stops.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Route Stops</h4>
                  <div className="space-y-3">
                    {selectedRoute.stops.map((stop, index) => (
                      <div
                        key={stop.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            stop.status === 'completed' ? 'bg-emerald-500' :
                            stop.status === 'pending' ? 'bg-blue-500' : 'bg-gray-400'
                          } text-white font-semibold text-sm`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{stop.address}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{stop.pickupId}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(stop.priority)}`}>
                                {stop.priority}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                              <span><i className="ri-time-line mr-1"></i>{stop.estimatedTime}</span>
                              <span><i className="ri-delete-bin-line mr-1"></i>{stop.wasteType}</span>
                              <span className={`font-medium ${
                                stop.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                                stop.status === 'pending' ? 'text-blue-600 dark:text-blue-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {stop.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
