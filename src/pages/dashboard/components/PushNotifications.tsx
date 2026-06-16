import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/audit';
import ExportButton from './ExportButton';

// ─── Types ────────────────────────────────────────────
interface PushRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  target_audience: 'all_users' | 'all_riders' | 'all' | 'admin';
  sent_by_name: string;
  is_read: boolean;
  created_at: string;
}

interface PushNotificationsProps {
  adminInfo?: any;
}

type AudienceKey = 'all_users' | 'all_riders' | 'all';

const AUDIENCES: { key: AudienceKey; label: string; description: string; icon: string; color: string; gradient: string }[] = [
  {
    key: 'all_users',
    label: 'All Users',
    description: 'Everyone who requests pickups via the app',
    icon: 'ri-group-line',
    color: 'indigo',
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    key: 'all_riders',
    label: 'All Riders',
    description: 'All active field collection riders',
    icon: 'ri-bike-line',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    key: 'all',
    label: 'Everyone',
    description: 'Broadcast to all users and riders at once',
    icon: 'ri-global-line',
    color: 'rose',
    gradient: 'from-rose-500 to-pink-600',
  },
];

const NOTIFICATION_TYPES = [
  { key: 'system', label: 'System Announcement', icon: 'ri-megaphone-line' },
  { key: 'pickup', label: 'Pickup & Service', icon: 'ri-truck-line' },
  { key: 'alert', label: 'Urgent Alert', icon: 'ri-alarm-warning-line' },
  { key: 'payment', label: 'Payment & Billing', icon: 'ri-bank-card-line' },
  { key: 'rider', label: 'Rider Operations', icon: 'ri-e-bike-2-line' },
];

const PRIORITY_OPTIONS = [
  { key: 'low', label: 'Low', color: 'slate' },
  { key: 'medium', label: 'Medium', color: 'amber' },
  { key: 'high', label: 'High / Urgent', color: 'rose' },
];

// Quick message templates
const TEMPLATES: Record<AudienceKey, { title: string; message: string; type: string; priority: string }[]> = {
  all_users: [
    { title: 'Pickup Schedule Update', message: 'Your scheduled pickup has been updated. Open the app to see your new collection time.', type: 'pickup', priority: 'medium' },
    { title: 'Service Maintenance Notice', message: 'BorlaWura will undergo scheduled maintenance tonight from 12 AM – 2 AM. Services will resume normally after.', type: 'system', priority: 'low' },
    { title: 'Payment Reminder', message: 'You have an outstanding balance on your BorlaWura account. Please top up your wallet to continue enjoying pickup services.', type: 'payment', priority: 'medium' },
  ],
  all_riders: [
    { title: 'New Route Assignment', message: 'You have been assigned a new pickup route. Log into the rider app to see your updated schedule.', type: 'rider', priority: 'medium' },
    { title: 'Shift Reminder', message: 'Your morning shift begins in 1 hour. Please ensure your vehicle is fueled and ready for the route.', type: 'rider', priority: 'low' },
    { title: 'Emergency Route Change', message: 'URGENT: Your route has been modified due to road closures. Open the rider app for the updated map.', type: 'alert', priority: 'high' },
  ],
  all: [
    { title: 'BorlaWura System Update', message: 'We have released a major app update! Please update your BorlaWura app from the App Store or Play Store for the best experience.', type: 'system', priority: 'medium' },
    { title: 'Public Holiday Notice', message: 'BorlaWura offices will be closed on the upcoming public holiday. Emergency pickups remain active.', type: 'system', priority: 'low' },
    { title: 'Platform Alert', message: 'We are currently experiencing technical difficulties. Our team is working to resolve this. Thank you for your patience.', type: 'alert', priority: 'high' },
  ],
};

export default function PushNotifications({ adminInfo }: PushNotificationsProps) {
  const [history, setHistory] = useState<PushRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [riderCount, setRiderCount] = useState(0);

  // Compose form state
  const [audience, setAudience] = useState<AudienceKey>('all_users');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notifType, setNotifType] = useState('system');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const userInfo = adminInfo || JSON.parse(localStorage.getItem('user_profile') || '{}');
  const roleKey = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const canSend = ['admin', 'manager'].includes(roleKey);
  const senderName = userInfo.full_name || userInfo.fullName || 'Admin';

  useEffect(() => {
    fetchHistory();
    fetchCounts();

    const channel = supabase
      .channel('push_notifications_history')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .in('target_audience', ['all_users', 'all_riders', 'all'])
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCounts = async () => {
    const [{ count: uc }, { count: rc }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true })
        .not('role', 'in', '("admin","manager","dispatcher","support","finance","support_admin","finance_admin")'),
      supabase.from('riders').select('*', { count: 'exact', head: true }),
    ]);
    setUserCount(uc || 0);
    setRiderCount(rc || 0);
  };

  const getReach = () => {
    if (audience === 'all_users') return userCount;
    if (audience === 'all_riders') return riderCount;
    return userCount + riderCount;
  };

  const applyTemplate = (tpl: typeof TEMPLATES.all_users[0]) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setNotifType(tpl.type);
    setPriority(tpl.priority as any);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please enter a title and message before sending.');
      return;
    }
    if (!canSend) return;
    setSending(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        type: notifType,
        title: title.trim(),
        message: message.trim(),
        priority,
        target_audience: audience,
        sent_by: userInfo.id,
        sent_by_name: senderName,
        is_read: false,
      }]);

      if (error) throw error;

      await logActivity('Push Notification Sent', 'notifications', 'broadcast', {
        audience,
        title: title.trim(),
        sent_by: senderName,
        message: `Broadcast "${title.trim()}" sent to ${audience.replace('_', ' ')}`,
      });

      setSuccess(true);
      setTitle('');
      setMessage('');
      setTimeout(() => setSuccess(false), 4000);
      fetchHistory();
    } catch (err: any) {
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────
  const getAudienceConfig = (key: string) =>
    AUDIENCES.find(a => a.key === key) || AUDIENCES[0];

  const formatTime = (d: string) => {
    const date = new Date(d);
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const audienceColorMap: Record<string, string> = {
    all_users: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    all_riders: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    all: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    admin: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10',
  };

  const priorityColorMap: Record<string, string> = {
    high: 'bg-rose-500 text-white',
    medium: 'bg-amber-500 text-white',
    low: 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200',
  };

  const currentAudience = AUDIENCES.find(a => a.key === audience)!;

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Push Notifications</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Broadcast in-app notifications to users and riders in real time
          </p>
        </div>
        <ExportButton
          data={history.map(n => ({
            Title: n.title,
            Message: n.message,
            Audience: n.target_audience,
            Priority: n.priority,
            Type: n.type,
            Sent_By: n.sent_by_name || 'System',
            Date: new Date(n.created_at).toLocaleString()
          }))}
          fileName="Push_Notification_History"
          title="Push Notification Log"
        />
      </div>

      {/* ── Reach Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {AUDIENCES.map(aud => {
          const count = aud.key === 'all_users' ? userCount : aud.key === 'all_riders' ? riderCount : userCount + riderCount;
          return (
            <div key={aud.key} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${aud.gradient} flex items-center justify-center text-white text-xl shadow-lg`}>
                <i className={aud.icon}></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{count.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{aud.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ══ LEFT: Compose Panel ══ */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Compose Notification</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reach {getReach().toLocaleString()} {currentAudience.label.toLowerCase()} instantly</p>
            </div>
            <div className="p-8 space-y-6">

              {/* Audience Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Audience</label>
                <div className="grid grid-cols-3 gap-3">
                  {AUDIENCES.map(aud => (
                    <button
                      key={aud.key}
                      onClick={() => setAudience(aud.key)}
                      className={`p-4 rounded-2xl border text-center transition-all group ${audience === aud.key
                        ? `bg-gradient-to-br ${aud.gradient} text-white border-transparent shadow-lg`
                        : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10'
                      }`}
                    >
                      <i className={`${aud.icon} text-2xl block mb-1.5 ${audience !== aud.key ? 'text-slate-400' : ''}`}></i>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${audience !== aud.key ? 'text-slate-500 dark:text-slate-400' : ''}`}>{aud.label}</p>
                      <p className={`text-[9px] mt-1 leading-tight ${audience === aud.key ? 'text-white/80' : 'text-slate-400'}`}>
                        {aud.key === 'all_users' ? userCount : aud.key === 'all_riders' ? riderCount : userCount + riderCount} recipients
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</label>
                  <select value={notifType} onChange={e => setNotifType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                    {NOTIFICATION_TYPES.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                  <div className="flex gap-2 h-[46px] items-center">
                    {PRIORITY_OPTIONS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setPriority(p.key as any)}
                        className={`flex-1 h-full rounded-2xl text-[9px] font-bold uppercase tracking-wider transition-all border ${priority === p.key
                          ? p.key === 'high' ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20'
                            : p.key === 'medium' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                            : 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white'
                          : 'border-slate-100 dark:border-white/10 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notification Title</label>
                <input
                  type="text"
                  maxLength={80}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Pickup Schedule Update"
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <p className="text-[9px] font-bold text-slate-400 text-right">{title.length}/80</p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Body</label>
                <textarea
                  rows={4}
                  maxLength={300}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write a clear, concise message to your audience..."
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none leading-relaxed"
                />
                <p className="text-[9px] font-bold text-slate-400 text-right">{message.length}/300</p>
              </div>

              {/* Send Button */}
              {canSend ? (
                <button
                  onClick={handleSend}
                  disabled={sending || !title.trim() || !message.trim()}
                  className={`w-full py-4 rounded-[2rem] text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
                    success
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                      : sending
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : `bg-gradient-to-r ${currentAudience.gradient} text-white hover:opacity-90 active:scale-[0.98] shadow-indigo-500/20`
                  }`}
                >
                  {success ? (
                    <><i className="ri-check-line text-lg"></i> Sent Successfully!</>
                  ) : sending ? (
                    <><div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> Sending...</>
                  ) : (
                    <><i className="ri-send-plane-fill text-lg"></i> Send to {currentAudience.label} · {getReach().toLocaleString()} people</>
                  )}
                </button>
              ) : (
                <div className="w-full py-4 rounded-[2rem] bg-slate-100 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">
                  <i className="ri-lock-line mr-2"></i>Admin or Manager role required to send
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ RIGHT: Templates + History ══ */}
        <div className="space-y-6">

          {/* Quick Templates */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Quick Templates</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">For {currentAudience.label} — click to fill the form</p>
            </div>
            <div className="p-6 space-y-3">
              {(TEMPLATES[audience] || []).map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(tpl)}
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentAudience.gradient} flex items-center justify-center text-white text-sm flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform`}>
                      <i className={NOTIFICATION_TYPES.find(t => t.key === tpl.type)?.icon || 'ri-notification-3-line'}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-0.5 truncate">{tpl.title}</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{tpl.message}</p>
                    </div>
                    <span className={`text-[8px] px-2 py-0.5 rounded-lg font-bold uppercase flex-shrink-0 ${priorityColorMap[tpl.priority]}`}>{tpl.priority}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Card */}
          {(title || message) && (
            <div className="bg-slate-900 dark:bg-white/5 rounded-[2rem] border border-white/10 p-6 space-y-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Preview</p>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentAudience.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                  <i className="ri-notification-3-fill text-lg"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{title || 'Notification Title'}</p>
                    <span className="text-[9px] text-slate-400 ml-2 flex-shrink-0">now</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">{message || 'Your notification message will appear here...'}</p>
                </div>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">This is how it appears on the mobile app</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ Broadcast History ══ */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Broadcast History</h2>
          <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest">{history.length} sent</span>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-28 text-center">
            <i className="ri-notification-off-line text-5xl text-slate-200 dark:text-slate-700 block mb-4"></i>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No notifications sent yet</p>
            <p className="text-[10px] text-slate-400 mt-2">Compose and send your first broadcast above</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                    <th className="px-8 py-5">Notification</th>
                    <th className="px-8 py-5">Audience</th>
                    <th className="px-8 py-5">Priority</th>
                    <th className="px-8 py-5">Sent By</th>
                    <th className="px-8 py-5">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {history.map(notif => {
                    const audCfg = getAudienceConfig(notif.target_audience);
                    const typeCfg = NOTIFICATION_TYPES.find(t => t.key === notif.type) || NOTIFICATION_TYPES[0];
                    return (
                      <tr key={notif.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3 max-w-sm">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${audCfg.gradient} flex items-center justify-center text-white text-sm flex-shrink-0`}>
                              <i className={typeCfg.icon}></i>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{notif.title}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[240px]">{notif.message}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${audienceColorMap[notif.target_audience]}`}>
                            <i className={`${audCfg.icon} mr-1`}></i>{audCfg.label}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${priorityColorMap[notif.priority]}`}>
                            {notif.priority}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{notif.sent_by_name || 'System'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[11px] font-bold text-slate-500">{formatTime(notif.created_at)}</p>
                          <p className="text-[9px] text-slate-400">{new Date(notif.created_at).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-4">
              {history.map(notif => {
                const audCfg = getAudienceConfig(notif.target_audience);
                return (
                  <div key={notif.id} className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-3xl p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${audCfg.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                        <i className={audCfg.icon}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{notif.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                      <span className={`px-2.5 py-1 rounded-xl text-[8px] font-bold uppercase border ${audienceColorMap[notif.target_audience]}`}>{audCfg.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${priorityColorMap[notif.priority]}`}>{notif.priority}</span>
                        <span className="text-[9px] font-bold text-slate-400">{formatTime(notif.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
