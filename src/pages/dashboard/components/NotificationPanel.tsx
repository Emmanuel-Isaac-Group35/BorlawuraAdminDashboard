import { useState } from 'react';

interface Notification {
  id: string;
  type: 'pickup' | 'rider' | 'payment' | 'system' | 'alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Illegal Dump Reported',
    message: 'Rider #R-2847 flagged for suspicious dump location in Accra Central',
    time: '5 minutes ago',
    read: false,
    priority: 'high'
  },
  {
    id: '2',
    type: 'pickup',
    title: 'High Volume Requests',
    message: '23 pending pickup requests in Kumasi zone require immediate attention',
    time: '12 minutes ago',
    read: false,
    priority: 'high'
  },
  {
    id: '3',
    type: 'rider',
    title: 'New Rider Application',
    message: 'Kwame Mensah submitted registration documents for approval',
    time: '1 hour ago',
    read: false,
    priority: 'medium'
  },
  {
    id: '4',
    type: 'payment',
    title: 'Payout Approved',
    message: 'Weekly payout of ₵12,450 processed to 45 riders',
    time: '2 hours ago',
    read: true,
    priority: 'low'
  },
  {
    id: '5',
    type: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance completed successfully at 2:00 AM',
    time: '5 hours ago',
    read: true,
    priority: 'low'
  },
  {
    id: '6',
    type: 'pickup',
    title: 'Pickup Completed',
    message: 'Rider #R-1523 completed 15 pickups in Tema zone',
    time: '6 hours ago',
    read: true,
    priority: 'low'
  },
  {
    id: '7',
    type: 'rider',
    title: 'Rider Suspended',
    message: 'Rider #R-3421 suspended due to multiple customer complaints',
    time: '1 day ago',
    read: true,
    priority: 'medium'
  },
  {
    id: '8',
    type: 'payment',
    title: 'Payment Failed',
    message: 'Household #H-8934 payment declined, account flagged',
    time: '1 day ago',
    read: true,
    priority: 'medium'
  }
];

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pickup': return 'ri-map-pin-line';
      case 'rider': return 'ri-e-bike-2-line';
      case 'payment': return 'ri-money-dollar-circle-line';
      case 'system': return 'ri-settings-3-line';
      case 'alert': return 'ri-alert-line';
      default: return 'ri-notification-3-line';
    }
  };

  const getIconColor = (type: string, priority: string) => {
    if (priority === 'high') return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    switch (type) {
      case 'pickup': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'rider': return 'text-teal-500 bg-teal-50 dark:bg-teal-900/20';
      case 'payment': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'system': return 'text-gray-500 bg-gray-50 dark:bg-gray-700';
      case 'alert': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      ></div>
      
      <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-gray-500 dark:text-gray-400 text-lg"></i>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filter === 'all'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filter === 'unread'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Unread ({unreadCount})
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="ml-auto text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                <i className="ri-notification-off-line text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${getIconColor(notification.type, notification.priority)}`}>
                      <i className={`${getIcon(notification.type)} text-lg`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {notification.time}
                        </span>
                        {notification.priority === 'high' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded whitespace-nowrap">
                            High Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={clearAll}
              className="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear All Notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
}
