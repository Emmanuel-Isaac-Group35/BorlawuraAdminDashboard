import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom Icon for Pickup
const createPickupIcon = (status: string) => {
  let color = '#9ca3af'; // gray
  if (status === 'pending') color = '#fbbf24'; // amber
  if (status === 'scheduled') color = '#3b82f6'; // blue
  if (status === 'in-progress') color = '#f59e0b'; // orange
  if (status === 'completed') color = '#10b981'; // green

  return L.divIcon({
    className: 'custom-pickup-icon',
    html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;"><i class="ri-delete-bin-line" style="font-size: 10px; color: white;"></i></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

interface Pickup {
  id: string;
  household: string;
  rider: string;
  location: string;
  wasteType: string;
  status: string;
  time: string;
  lat: number;
  lng: number;
}

export default function PickupOperations() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign Rider Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
  const [availableRiders, setAvailableRiders] = useState<any[]>([]);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Stats
  const requestedCount = pickups.filter(p => p.status === 'pending').length;
  const acceptedCount = pickups.filter(p => p.status === 'scheduled').length;
  const inProgressCount = pickups.filter(p => p.status === 'in-progress').length;
  const completedCount = pickups.filter(p => p.status === 'completed').length;
  // Use a derived stat for "Dumped" or similar since we don't have it in schema
  const dumpedCount = 0;

  const BASE_LAT = 5.6037;
  const BASE_LNG = -0.1870;

  useEffect(() => {
    fetchPickups();
  }, []);

  const fetchPickups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pickups')
      .select(`
        *,
        users (full_name),
        riders (full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pickups:', error);
    } else if (data) {
      const mappedPickups = data.map((p: any) => ({
        id: p.id,
        household: p.users?.full_name || 'Unknown',
        rider: p.riders?.full_name || 'Unassigned',
        location: p.location || 'Accra',
        wasteType: p.details || 'General', // Fallback
        status: p.status,
        time: new Date(p.pickup_time || p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        // Random Location Mock
        lat: BASE_LAT + (Math.random() - 0.5) * 0.1,
        lng: BASE_LNG + (Math.random() - 0.5) * 0.1,
      }));
      setPickups(mappedPickups);
    }
    setLoading(false);
  };

  const fetchAvailableRiders = async () => {
    const { data, error } = await supabase
      .from('riders')
      .select('id, full_name, zone, status, phone')
      .neq('status', 'suspended')
      .order('full_name');

    if (error) console.error('Error fetching riders:', error);
    else setAvailableRiders(data || []);
  };

  const handleOpenAssignModal = (pickupId: string) => {
    setSelectedPickupId(pickupId);
    setShowAssignModal(true);
    fetchAvailableRiders();
  };

  const handleAssignRider = async (riderId: string) => {
    if (!selectedPickupId) return;
    setIsAssigning(true);

    const { error } = await supabase
      .from('pickups')
      .update({
        rider_id: riderId,
        status: 'scheduled',
      })
      .eq('id', selectedPickupId);

    if (error) {
      console.error('Error assigning rider:', error);
      alert('Failed to assign rider');
    } else {
      // Refresh pickups
      fetchPickups();
      setShowAssignModal(false);
      setSelectedPickupId(null);
    }
    setIsAssigning(false);
  };

  const filteredPickups = pickups.filter(p => {
    const matchesStatus = filterStatus === 'All Status' || p.status === filterStatus; // Strict match because I use value="" in select
    const matchesSearch = p.household.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'in-progress':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pickup Operations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time pickup request tracking and management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Requested</span>
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <i className="ri-time-line text-gray-600 dark:text-gray-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{requestedCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled</span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-blue-600 dark:text-blue-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{acceptedCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">In Progress</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="ri-truck-line text-amber-600 dark:text-amber-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{inProgressCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Dumped (N/A)</span>
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <i className="ri-check-double-line text-teal-600 dark:text-teal-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{dumpedCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <i className="ri-check-line text-emerald-600 dark:text-emerald-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Pickup Map</h3>
          </div>
          <div className="p-6">
            <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden z-0">
              <MapContainer center={[BASE_LAT, BASE_LNG]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {pickups.filter(p => p.status !== 'completed' && p.status !== 'cancelled').map((pickup) => (
                  <Marker
                    key={pickup.id}
                    position={[pickup.lat, pickup.lng]}
                    icon={createPickupIcon(pickup.status)}
                  >
                    <Popup>
                      <div className="font-semibold text-gray-900">{pickup.household}</div>
                      <div className="text-xs text-gray-600">{pickup.location}</div>
                      <div className="text-xs text-gray-600">{pickup.wasteType}</div>
                      <div className={`text-xs mt-1 font-medium`}>
                        {pickup.status.toUpperCase()}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Requests</h3>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {pickups.slice(0, 6).map((pickup) => (
              <div key={pickup.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[100px]" title={pickup.id}>{pickup.id.split('-')[0]}...</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pickup.status)}`}>
                    {pickup.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{pickup.household}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <i className="ri-map-pin-line"></i>
                  <span>{pickup.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <i className="ri-time-line"></i>
                  <span>{pickup.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Pickup Requests</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-search-line text-gray-400 text-sm"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option>All Status</option>
                <option value="pending">Requested</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Household</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Rider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Waste Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPickups.map((pickup) => (
                <tr key={pickup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white" title={pickup.id}>{pickup.id.split('-')[0]}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{pickup.household}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{pickup.rider}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{pickup.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{pickup.wasteType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pickup.status)}`}>
                      {pickup.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{pickup.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                        <i className="ri-eye-line text-gray-600 dark:text-gray-400"></i>
                      </button>
                      <button
                        onClick={() => handleOpenAssignModal(pickup.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Assign Rider"
                      >
                        <i className="ri-user-add-line text-gray-600 dark:text-gray-400"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Rider Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign Rider</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="Search by name or zone..."
                value={assignSearchQuery}
                onChange={(e) => setAssignSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px]">
              {availableRiders
                .filter(r =>
                  r.full_name.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
                  r.zone?.toLowerCase().includes(assignSearchQuery.toLowerCase())
                )
                .map((rider) => (
                  <div
                    key={rider.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
                    onClick={() => !isAssigning && handleAssignRider(rider.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${rider.status === 'active' || rider.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{rider.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{rider.zone || 'No Zone'} • {rider.phone}</p>
                      </div>
                    </div>
                    <button
                      disabled={isAssigning}
                      className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-medium rounded hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                    >
                      {isAssigning ? '...' : 'Assign'}
                    </button>
                  </div>
                ))}
              {availableRiders.length === 0 && (
                <p className="text-center text-gray-500 py-4">No riders available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
