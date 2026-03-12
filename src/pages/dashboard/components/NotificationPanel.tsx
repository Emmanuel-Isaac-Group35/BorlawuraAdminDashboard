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
    title: 'Anomalous Discharge Detected',
    message: 'Rider #R-2847 identified outside designated geozone in Accra Central sector',
    time: '5 minutes ago',
    read: false,
    priority: 'high'
  },
  {
    id: '2',
    type: 'pickup',
    title: 'Surge Capacity Alert',
    message: '23 pending service requests in Kumasi zone exceed standard throughput thresholds',
    time: '12 minutes ago',
    read: false,
    priority: 'high'
  },
  {
    id: '3',
    type: 'rider',
    title: 'Personnel Credential Review',
    message: 'Kwame Mensah submitted institutional records for operational clearance',
    time: '1 hour ago',
    read: false,
    priority: 'medium'
  },
  {
    id: '4',
    type: 'payment',
    title: 'Liquidity Disbursement',
    message: 'Institutional payout of ₵12,450 synchronized to 45 field personnel',
    time: '2 hours ago',
    read: true,
    priority: 'low'
  },
  {
    id: '5',
    type: 'system',
    title: 'Integrity Scan Complete',
    message: 'Core system synchronization and maintenance executed at 02:00 GMT',
    time: '5 hours ago',
    read: true,
    priority: 'low'
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
      case 'pickup': return 'ri-map-pin-2-line';
      case 'rider': return 'ri-e-bike-2-line';
      case 'payment': return 'ri-bank-card-line';
      case 'system': return 'ri-settings-4-line';
      case 'alert': return 'ri-shield-flash-line';
      default: return 'ri-notification-3-line';
    }
  };

  const getIconStyle = (type: string, priority: string) => {
    if (priority === 'high') return 'text-rose-500 bg-rose-500/10';
    switch (type) {
      case 'pickup': return 'text-indigo-500 bg-indigo-500/10';
      case 'rider': return 'text-emerald-500 bg-emerald-500/10';
      case 'payment': return 'text-amber-500 bg-amber-500/10';
      case 'system': return 'text-slate-500 bg-slate-500/10';
      case 'alert': return 'text-indigo-600 bg-indigo-600/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100]" 
        onClick={onClose}
      ></div>
      
      <div className="absolute right-0 top-full mt-4 w-[28rem] bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/10 z-[110] max-h-[40rem] flex flex-col overflow-hidden animate-scale-up origin-top-right">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              System Signals
              {unreadCount > 0 && (
                <span className="ml-3 px-2.5 py-0.5 text-[9px] font-bold bg-indigo-600 text-white rounded-lg uppercase tracking-tight align-middle">
                  {unreadCount} New
                </span>
              )}
            </h3>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 transition-all"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2 text-[10px] font-bold uppercase rounded-xl transition-all tracking-widest ${
                filter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              All Signals ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-5 py-2 text-[10px] font-bold uppercase rounded-xl transition-all tracking-widest ${
                filter === 'unread'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="ml-auto text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline tracking-widest uppercase"
              >
                Sync All
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide py-4 px-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10">
              <div className="w-20 h-20 flex items-center justify-center rounded-[2rem] bg-slate-50 dark:bg-white/5 mb-6">
                <i className="ri-radar-line text-slate-300 dark:text-slate-600 text-4xl animate-pulse"></i>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                {filter === 'unread' ? 'Unread sequence clear' : 'No active system signals identified'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 px-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-5 rounded-[2rem] border transition-all cursor-pointer group ${
                    !notification.read 
                    ? 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-500/20 shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex gap-5">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl flex-shrink-0 transition-transform group-hover:scale-110 ${getIconStyle(notification.type, notification.priority)}`}>
                      <i className={`${getIcon(notification.type)} text-xl`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {notification.time}
                        </span>
                        {notification.priority === 'high' && (
                          <span className="px-2.5 py-1 text-[9px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg uppercase tracking-widest">
                            Critical
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
          <div className="p-6 border-t border-slate-50 dark:border-white/5 bg-slate-50/10 backdrop-blur-md">
            <button
              onClick={clearAll}
              className="w-full py-4 text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-[0.2em] hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
            >
              Purge Signal History
            </button>
          </div>
        )}
      </div>
    </>
  );
}
