import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Notification {
  id: string;
  type: 'pickup' | 'rider' | 'payment' | 'system' | 'alert';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();

    // Setup Realtime Subscription
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const markAsRead = async (id: string) => {
    try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
        console.error('Failed to update status:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
        await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
        console.error('Failed to sync status:', err);
    }
  };

  const clearAll = async () => {
    try {
        await supabase.from('notifications').delete().neq('id', '0'); // Purge all
        setNotifications([]);
    } catch (err) {
        console.error('Failed to purge:', err);
    }
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
              Notifications
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
              All Notifications ({notifications.length})
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
                {filter === 'unread' ? 'Unread notifications clear' : 'No active system notifications identified'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 px-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-5 rounded-[2.5rem] border transition-all cursor-pointer group ${
                    !notification.is_read 
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
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {formatTime(notification.created_at)}
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
              Purge Notification History
            </button>
          </div>
        )}
      </div>
    </>
  );
}
