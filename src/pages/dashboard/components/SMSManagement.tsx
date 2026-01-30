import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface SMSLog {
  id: string;
  subject: string;
  recipient_group: string;
  recipient_count: number;
  sent_at: string;
  schedule_date?: string;
  status: 'sent' | 'scheduled' | 'failed';
  message: string;
}

export default function SMSManagement() {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [formData, setFormData] = useState({
    recipient: 'riders',
    subject: '',
    message: '',
    scheduleDate: '',
    scheduleTime: '',
  });
  const [charCount, setCharCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [smsHistory, setSmsHistory] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Real stats states
  const [stats, setStats] = useState({
    sent: 0,
    failed: 0,
    scheduled: 0,
    total: 0
  });

  useEffect(() => {
    fetchSMSLogs();
  }, []);

  const fetchSMSLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching SMS logs:', error);
    } else {
      const logs = data || [];
      setSmsHistory(logs);

      // Calculate Stats
      const sent = logs.filter(s => s.status === 'sent').reduce((sum, s) => sum + (s.recipient_count || 0), 0);
      const failed = logs.filter(s => s.status === 'failed').length; // Counting logs, not individual recipients for failed since we don't track per-recipient status yet
      const scheduled = logs.filter(s => s.status === 'scheduled').length;
      setStats({
        sent,
        failed,
        scheduled,
        total: logs.filter(s => s.status === 'sent').length
      });
    }
    setLoading(false);
  };

  const statusConfig = {
    sent: { color: 'emerald', icon: 'ri-checkbox-circle-line', label: 'Delivered' },
    scheduled: { color: 'amber', icon: 'ri-time-line', label: 'Scheduled' },
    failed: { color: 'red', icon: 'ri-error-warning-line', label: 'Failed' },
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'message') setCharCount(value.length);
  };

  const getRecipientCount = async (recipient: string) => {
    // Robustly fetch real counts from database
    if (recipient === 'riders') {
      const { count } = await supabase.from('riders').select('*', { count: 'exact', head: true });
      return count || 0;
    } else if (recipient === 'users') {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      return count || 0;
    } else {
      // Both
      const { count: riders } = await supabase.from('riders').select('*', { count: 'exact', head: true });
      const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
      return (riders || 0) + (users || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const recipientCount = await getRecipientCount(formData.recipient); // await the real count

      // Artificial delay to simulate "processing"
      await new Promise(resolve => setTimeout(resolve, 800));

      const { error } = await supabase.from('sms_logs').insert([{
        recipient_group: formData.recipient,
        subject: formData.subject,
        message: formData.message,
        status: formData.scheduleDate ? 'scheduled' : 'sent',
        recipient_count: recipientCount,
        sent_at: formData.scheduleDate ? `${formData.scheduleDate}T${formData.scheduleTime || '00:00'}:00` : new Date().toISOString(),
        schedule_date: formData.scheduleDate ? `${formData.scheduleDate}T${formData.scheduleTime || '00:00'}:00` : null
      }]);

      if (error) throw error;

      fetchSMSLogs();
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setShowComposeModal(false);
      setFormData({ recipient: 'riders', subject: '', message: '', scheduleDate: '', scheduleTime: '' });
      setCharCount(0);

    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Failed to send SMS. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Campaign Manager</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Broadcast messages to your fleet and customers</p>
        </div>
        <button
          onClick={() => setShowComposeModal(true)}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
        >
          <i className="ri-add-line text-lg"></i>
          New Campaign
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <i className="ri-mail-send-line text-xl"></i>
            </div>
            <span className="text-xs font-semibold bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-1 rounded-full">Total</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
          <p className="text-sm text-gray-500 mt-1">Campaigns created</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <i className="ri-checkbox-circle-line text-xl"></i>
            </div>
            <span className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">Success</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sent.toLocaleString()}</h3>
          <p className="text-sm text-gray-500 mt-1">Messages delivered</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <i className="ri-time-line text-xl"></i>
            </div>
            <span className="text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full">Pending</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scheduled}</h3>
          <p className="text-sm text-gray-500 mt-1">Scheduled campaigns</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <i className="ri-error-warning-line text-xl"></i>
            </div>
            <span className="text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">Issues</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</h3>
          <p className="text-sm text-gray-500 mt-1">Failed deliveries</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Campaign History</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search history..."
                className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer" onClick={fetchSMSLogs}>
              <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 text-left">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Campaign Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Audience</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {smsHistory.map((sms) => (
                <tr key={sms.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold shrink-0">
                        {sms.subject.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sms.subject}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{sms.message}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <i className="ri-user-group-line"></i>
                      {sms.recipient_group.charAt(0).toUpperCase() + sms.recipient_group.slice(1)} ({sms.recipient_count})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(sms.sent_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(sms.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-${statusConfig[sms.status].color}-100 text-${statusConfig[sms.status].color}-700 dark:bg-${statusConfig[sms.status].color}-900/30 dark:text-${statusConfig[sms.status].color}-400`}>
                      <i className={statusConfig[sms.status].icon}></i>
                      {statusConfig[sms.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors p-2 cursor-pointer">
                      <i className="ri-more-2-fill"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {smsHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <i className="ri-inbox-archive-line text-4xl mb-3 opacity-30"></i>
                      <p>No campaigns found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Campaign</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Compose and schedule your message</p>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Audience</label>
                  <select
                    name="recipient"
                    value={formData.recipient}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="riders">All Riders</option>
                    <option value="users">All Users</option>
                    <option value="both">Everyone (Riders + Users)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Campaign Name / Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="e.g. Weekend Promo"
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Content</label>
                <div className="relative">
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none"
                    placeholder="Type your message here..."
                  ></textarea>
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                    {charCount}/500
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <i className="ri-calendar-event-line text-blue-600 dark:text-blue-400"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Schedule Delivery</h4>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-center">Optional</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Pick a future date to send this campaign automatically.</p>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        name="scheduleDate"
                        value={formData.scheduleDate}
                        onChange={handleInputChange}
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-blue-500"
                      />
                      <input
                        type="time"
                        name="scheduleTime"
                        value={formData.scheduleTime}
                        onChange={handleInputChange}
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="flex-1 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                  {sending ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill"></i>
                      {formData.scheduleDate ? 'Schedule Campaign' : 'Send Campaign'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-slide-up">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <i className="ri-check-line text-xl"></i>
          </div>
          <div>
            <h4 className="font-bold">Success!</h4>
            <p className="text-sm opacity-90">Campaign created successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
}
