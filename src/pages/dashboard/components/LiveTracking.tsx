import { useState, useEffect } from 'react';

interface Rider {
  id: number;
  name: string;
  phone: string;
  zone: string;
  status: 'online' | 'offline' | 'busy';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  currentPickup?: string;
  lastUpdate: string;
  speed: number;
  battery: number;
}

export default function LiveTracking() {
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock real-time rider data
  const [riders, setRiders] = useState<Rider[]>([
    {
      id: 1,
      name: 'Kofi Adu',
      phone: '+233 24 123 4567',
      zone: 'Accra Central',
      status: 'online',
      location: { lat: 5.6037, lng: -0.1870, address: 'Ring Road Central, Accra' },
      currentPickup: 'PU-2847',
      lastUpdate: 'Just now',
      speed: 25,
      battery: 85
    },
    {
      id: 2,
      name: 'Yaw Boateng',
      phone: '+233 24 234 5678',
      zone: 'Osu',
      status: 'busy',
      location: { lat: 5.5560, lng: -0.1969, address: 'Oxford Street, Osu' },
      currentPickup: 'PU-2846',
      lastUpdate: '2 mins ago',
      speed: 18,
      battery: 72
    },
    {
      id: 3,
      name: 'Akua Mensah',
      phone: '+233 24 345 6789',
      zone: 'Tema',
      status: 'online',
      location: { lat: 5.6698, lng: -0.0166, address: 'Community 1, Tema' },
      lastUpdate: '1 min ago',
      speed: 0,
      battery: 95
    },
    {
      id: 4,
      name: 'Kwabena Asante',
      phone: '+233 24 456 7890',
      zone: 'Madina',
      status: 'busy',
      location: { lat: 5.6892, lng: -0.1676, address: 'Madina Market Road' },
      currentPickup: 'PU-2844',
      lastUpdate: '30 secs ago',
      speed: 22,
      battery: 68
    },
    {
      id: 5,
      name: 'Ama Serwaa',
      phone: '+233 24 567 8901',
      zone: 'Legon',
      status: 'online',
      location: { lat: 5.6508, lng: -0.1870, address: 'University of Ghana Road' },
      lastUpdate: '3 mins ago',
      speed: 0,
      battery: 88
    },
    {
      id: 6,
      name: 'Kwesi Appiah',
      phone: '+233 24 678 9012',
      zone: 'Spintex',
      status: 'offline',
      location: { lat: 5.6389, lng: -0.1270, address: 'Spintex Road' },
      lastUpdate: '45 mins ago',
      speed: 0,
      battery: 45
    }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRiders(prevRiders => 
        prevRiders.map(rider => ({
          ...rider,
          lastUpdate: rider.status === 'offline' ? rider.lastUpdate : 
            Math.random() > 0.5 ? 'Just now' : `${Math.floor(Math.random() * 5) + 1} mins ago`,
          speed: rider.status === 'busy' ? Math.floor(Math.random() * 30) + 10 : 0,
          battery: Math.max(20, rider.battery - Math.random() * 2)
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'busy':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'offline':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return 'ri-checkbox-circle-fill';
      case 'busy':
        return 'ri-time-fill';
      case 'offline':
        return 'ri-close-circle-fill';
      default:
        return 'ri-question-fill';
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-emerald-600 dark:text-emerald-400';
    if (battery > 30) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const filteredRiders = riders.filter(rider => {
    const matchesStatus = filterStatus === 'all' || rider.status === filterStatus;
    const matchesSearch = rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rider.zone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const onlineCount = riders.filter(r => r.status === 'online').length;
  const busyCount = riders.filter(r => r.status === 'busy').length;
  const offlineCount = riders.filter(r => r.status === 'offline').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Rider Tracking</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time location monitoring and status updates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Riders</span>
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <i className="ri-e-bike-2-line text-teal-600 dark:text-teal-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{riders.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Online</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-emerald-600 dark:text-emerald-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{onlineCount}</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Available</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">On Duty</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="ri-truck-line text-amber-600 dark:text-amber-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{busyCount}</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs text-amber-600 dark:text-amber-400">Active pickups</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Offline</span>
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <i className="ri-close-circle-line text-gray-600 dark:text-gray-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{offlineCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Map View</h3>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors whitespace-nowrap cursor-pointer">
                  <i className="ri-refresh-line mr-1"></i>
                  Auto-refresh: ON
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-700 rounded-lg relative overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127118.0!2d-0.1870!3d5.6037!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf9084b2b7a773%3A0xbed14ed8650e2dd3!2sAccra%2C%20Ghana!5e0!3m2!1sen!2s!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '0.5rem' }}
                allowFullScreen
                loading="lazy"
              ></iframe>
              <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">Busy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-gray-700 dark:text-gray-300">Offline</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Riders</h3>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-search-line text-gray-400 text-sm"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search riders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('online')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'online'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setFilterStatus('busy')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'busy'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Busy
                </button>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {filteredRiders.map((rider) => (
              <div
                key={rider.id}
                onClick={() => setSelectedRider(rider)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedRider?.id === rider.id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <i className="ri-user-line text-teal-600 dark:text-teal-400"></i>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center ${
                        rider.status === 'online' ? 'bg-emerald-500' :
                        rider.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                      }`}>
                        <i className={`${getStatusIcon(rider.status)} text-white text-xs`}></i>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{rider.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{rider.zone}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rider.status)}`}>
                    {rider.status}
                  </span>
                </div>
                
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <i className="ri-map-pin-line"></i>
                    <span className="truncate">{rider.location.address}</span>
                  </div>
                  
                  {rider.currentPickup && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <i className="ri-truck-line"></i>
                      <span>Active: {rider.currentPickup}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <i className="ri-speed-line text-gray-500 dark:text-gray-400 text-xs"></i>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{rider.speed} km/h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <i className={`ri-battery-2-charge-line ${getBatteryColor(rider.battery)} text-xs`}></i>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{Math.round(rider.battery)}%</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{rider.lastUpdate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Rider Details</h3>
              <button
                onClick={() => setSelectedRider(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-gray-600 dark:text-gray-400"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <i className="ri-user-line text-teal-600 dark:text-teal-400 text-3xl"></i>
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center ${
                    selectedRider.status === 'online' ? 'bg-emerald-500' :
                    selectedRider.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                  }`}>
                    <i className={`${getStatusIcon(selectedRider.status)} text-white text-sm`}></i>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedRider.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedRider.phone}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRider.status)}`}>
                      {selectedRider.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Last update: {selectedRider.lastUpdate}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Operating Zone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRider.zone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Speed</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRider.speed} km/h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Battery Level</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          selectedRider.battery > 60 ? 'bg-emerald-500' :
                          selectedRider.battery > 30 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedRider.battery}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{Math.round(selectedRider.battery)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Pickup</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedRider.currentPickup || 'None'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Current Location</p>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <i className="ri-map-pin-line text-teal-600 dark:text-teal-400 mt-0.5"></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRider.location.address}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Lat: {selectedRider.location.lat.toFixed(4)}, Lng: {selectedRider.location.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer">
                  <i className="ri-phone-line mr-2"></i>
                  Call Rider
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer">
                  <i className="ri-message-3-line mr-2"></i>
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
