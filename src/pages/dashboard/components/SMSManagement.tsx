import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';

interface SMSLog {
  id: string;
  recipient: string;
  message: string;
  status: 'sent' | 'pending' | 'failed' | 'scheduled';
  created_at: string;
  sender_name: string;
}

export default function SMSManagement() {
  const [smsHistory, setSmsHistory] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0
  });

  const [newMessage, setNewMessage] = useState({
    target: 'all',
    message: '',
    sender_name: 'BORLAWURA'
  });

  const currentRole = localStorage.getItem('simulatedRole') || 'Admin';
  const canSend = currentRole === 'super_admin' || currentRole === 'manager' || currentRole === 'Admin';

  useEffect(() => {
    fetchSMSLogs();
    
    const channel = supabase
      .channel('public:sms_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_logs' }, () => {
        fetchSMSLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSMSLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const logs = data || [];
      setSmsHistory(logs);
      
      setStats({
        total: logs.length,
        sent: logs.filter(l => l.status === 'sent').length,
        failed: logs.filter(l => l.status === 'failed').length
      });
    } catch (error) {
      console.error('Error fetching SMS logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) {
      alert('Permission denied.');
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_ARKESEL_API_KEY || 'UEJrVktDRnBqeWZpdmxXSG1WbHk';
      
      // Get recipients
      let recipients: string[] = [];
      if (newMessage.target === 'all') {
        const { data: users } = await supabase.from('users').select('phone_number');
        recipients = users?.map(u => u.phone_number).filter(p => p) || [];
      } else if (newMessage.target === 'riders') {
        const { data: riders } = await supabase.from('riders').select('phone_number');
        recipients = riders?.map(r => r.phone_number).filter(p => p) || [];
      }

      if (recipients.length === 0) {
        alert('No recipients found for this group.');
        return;
      }

      // Arkesel API
      const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: newMessage.sender_name,
          message: newMessage.message,
          recipients: recipients
        })
      });

      const result = await response.json();
      const status = response.ok ? 'sent' : 'failed';

      await supabase.from('sms_logs').insert([{
        recipient: newMessage.target,
        message: newMessage.message,
        sender_name: newMessage.sender_name,
        status: status
      }]);

      if (!response.ok) throw new Error(result.message || 'API Error');

      alert(`Campaign sent successfully to ${recipients.length} recipients.`);
      setShowComposeModal(false);
      setNewMessage({ target: 'all', message: '', sender_name: 'BORLAWURA' });
      fetchSMSLogs();
    } catch (error: any) {
       console.error('Error sending SMS:', error);
       alert(`Failed to send campaign: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Broadcast SMS alerts and notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={smsHistory.map(l => ({ 
              Recipient_Group: l.recipient, 
              Message: l.message, 
              Status: l.status, 
              Date: new Date(l.created_at).toLocaleString() 
            }))}
            fileName="SMS_History"
            title="SMS Campaign Report"
          />
          {canSend && (
            <button
              onClick={() => setShowComposeModal(true)}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-teal-600 transition-all flex items-center gap-2"
            >
              <i className="ri-quill-pen-line"></i>
              New Campaign
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Campaigns', value: stats.total, icon: 'ri-chat-history-line', color: 'teal' },
          { label: 'Sent Successfully', value: stats.sent, icon: 'ri-check-double-line', color: 'emerald' },
          { label: 'Failed Attempts', value: stats.failed, icon: 'ri-error-warning-line', color: 'rose' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500`}>
              <i className={`${stat.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-gray-700">
           <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transmission History</h2>
        </div>
        
        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Target Group</th>
                  <th className="px-6 py-4">Message Content</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {smsHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{log.recipient}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-1">"{log.message}"</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white">{new Date(log.created_at).toLocaleDateString()}</p>
                      <p className="text-[9px] text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded text-[9px] font-bold uppercase ${
                        log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowComposeModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Send SMS Broadcast</h2>
              <button onClick={() => setShowComposeModal(false)} className="text-gray-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSendSMS} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recipient Group</label>
                <select 
                  value={newMessage.target}
                  onChange={e => setNewMessage({...newMessage, target: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All Registered Users</option>
                  <option value="riders">Active Rider Fleet</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sender ID</label>
                <input 
                  type="text"
                  value={newMessage.sender_name}
                  onChange={e => setNewMessage({...newMessage, sender_name: e.target.value.slice(0, 11).toUpperCase()})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                  placeholder="MAX 11 CHARS"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message</label>
                <textarea 
                  required
                  value={newMessage.message}
                  onChange={e => setNewMessage({...newMessage, message: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[120px]"
                  placeholder="Enter your message here..."
                ></textarea>
                <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                  <span>{newMessage.message.length} Characters</span>
                  <span>{Math.ceil(newMessage.message.length / 160)} SMS Unit(s)</span>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowComposeModal(false)} className="flex-1 py-3 text-xs font-bold uppercase rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-teal-500 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-teal-600">
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
