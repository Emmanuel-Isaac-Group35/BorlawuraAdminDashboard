import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';
import { sendSMS } from '../../../lib/sms';

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
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0
  });

  const [newMessage, setNewMessage] = useState({
    target: 'all_users',
    message: '',
    sender_name: '',
    custom_recipient: '',
    sector: 'all'
  });

  const settings = JSON.parse(localStorage.getItem('borlawura_settings') || '{}');
  const availableZones = settings.zones || ['Accra Central', 'Osu', 'Tema', 'Madina', 'Legon', 'Spintex'];
  const configuredSenderId = settings.notifications?.senderId || 'BORLAWURA';

  useEffect(() => {
    setNewMessage(prev => ({ ...prev, sender_name: configuredSenderId }));
  }, [configuredSenderId]);

  const userInfo = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const currentRole = (userInfo.role || 'Admin').toLowerCase().replace(/\s+/g, '_');
  const canSend = currentRole === 'super_admin' || currentRole === 'manager' || currentRole === 'admin' || userInfo.role === 'Admin';

  useEffect(() => {
    fetchSMSLogs();
    
    const channel = supabase
      .channel('public:sms_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_logs' }, () => {
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
      alert('Administrative clearance required for broadcasts.');
      return;
    }

    if (sending) return;

    try {
      setSending(true);
      
      let recipients: string[] = [];
      let targetLabel = '';

      if (newMessage.target === 'custom') {
        if (!newMessage.custom_recipient) {
          throw new Error('Please specify a direct recipient phone number.');
        }
        recipients = [newMessage.custom_recipient];
        targetLabel = `Direct: ${newMessage.custom_recipient}`;
      } else if (newMessage.target === 'all_users' || newMessage.target === 'sector_users') {
        let query = supabase.from('users').select('phone_number, location');
        if (newMessage.target === 'sector_users' && newMessage.sector !== 'all') {
          query = query.eq('location', newMessage.sector);
        }
        const { data: users, error: usersError } = await query;
        if (usersError) throw usersError;
        recipients = users?.map(u => u.phone_number).filter(p => p && p.length >= 10) || [];
        targetLabel = newMessage.target === 'sector_users' ? `Sector: ${newMessage.sector}` : 'All Users (Residents)';
      } else if (newMessage.target === 'all_riders') {
        const { data: riders, error: ridersError } = await supabase.from('riders').select('phone_number');
        if (ridersError) throw ridersError;
        recipients = riders?.map(r => r.phone_number).filter(p => p && p.length >= 10) || [];
        targetLabel = 'Field Personnel (Riders)';
      }

      if (recipients.length === 0) {
        throw new Error(`Operational Failure: No valid recipients identified for target [${newMessage.target}]. Ensure participant records contain active phone numbers.`);
      }

      const result = await sendSMS({
        recipients,
        message: newMessage.message,
        sender: newMessage.sender_name
      });

      const status = result.success ? 'sent' : 'failed';

      await supabase.from('sms_logs').insert([{
        recipient: targetLabel,
        message: newMessage.message,
        sender_name: newMessage.sender_name,
        status: status
      }]);

      if (!result.success) {
        throw new Error(result.message || 'System transmission error via Arkesel Gateway');
      }

      alert(`Campaign synchronized and deployed to ${recipients.length} recipients successfully.`);
      setShowComposeModal(false);
      setNewMessage({ target: 'all_users', message: '', sender_name: configuredSenderId, custom_recipient: '', sector: 'all' });
      fetchSMSLogs();
    } catch (error: any) {
       console.error('Error sending SMS:', error);
       alert(`Transmission Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-10 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Signal Broadcast</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Deploy institutional communications and operational alerts via SMS</p>
        </div>
        <div className="flex items-center gap-4">
          <ExportButton 
            data={smsHistory.map(l => ({ 
              Recipient: l.recipient, 
              Content: l.message, 
              Status: l.status, 
              Timestamp: new Date(l.created_at).toLocaleString() 
            }))}
            fileName="Communication_Audit_Trail"
            title="Institutional SMS Audit"
          />
          {canSend && (
            <button
              onClick={() => setShowComposeModal(true)}
              className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
            >
              <i className="ri-quill-pen-line text-lg"></i>
              Initiate Broadcast
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Transmission Volume', value: stats.total, icon: 'ri-chat-voice-line', color: 'indigo', sub: 'Total signals deployed' },
          { label: 'Verified Delivery', value: stats.sent, icon: 'ri-checkbox-circle-line', color: 'emerald', sub: 'Confirmed by gateway' },
          { label: 'Signal Errors', value: stats.failed, icon: 'ri-close-circle-line', color: 'rose', sub: 'Failed transmissions' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-6">
              <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600 shadow-inner`}>
                <i className={`${stat.icon} text-2xl`}></i>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">{stat.sub}</p>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white leading-none tracking-tighter mb-2">{stat.value}</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden min-h-[400px]">
        <div className="px-10 py-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex items-center justify-between">
           <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">Transmission Hierarchy</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Audit trail of institutional signals</p>
           </div>
           <div className="flex h-2 w-2 relative">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></div>
           </div>
        </div>
        
        {loading ? (
          <div className="p-32 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 mt-6 font-bold uppercase tracking-widest animate-pulse">Synchronizing Terminal Logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-50 dark:border-white/5">
                  <th className="px-10 py-5">Signal Target</th>
                  <th className="px-10 py-5">Communication Payload</th>
                  <th className="px-10 py-5">Deployment Date</th>
                  <th className="px-10 py-5 text-right">Gateway Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {smsHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 border border-slate-100 dark:border-white/5 shadow-sm group-hover:scale-110 transition-transform">
                          <i className="ri-user-voice-line text-lg"></i>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{log.recipient}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Origin: {log.sender_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic line-clamp-2 max-w-xl">"{log.message}"</p>
                    </td>
                    <td className="px-10 py-7 whitespace-nowrap">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{new Date(log.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 opacity-70">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-10 py-7 text-right">
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-[0.15em] border ${
                        log.status === 'sent' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' 
                        : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400'
                      }`}>
                        {log.status === 'sent' ? 'Synchronized' : 'Deployment Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
                {smsHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-32 text-center">
                       <i className="ri-chat-off-line text-4xl text-slate-200 dark:text-slate-800 mb-4 inline-block"></i>
                       <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">No communication history identified in terminal</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showComposeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setShowComposeModal(false)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
            <div className="px-10 py-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Signal Configuration</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1 border-l-2 border-indigo-500">Institutional Protocol 4.2</p>
              </div>
              <button 
                onClick={() => setShowComposeModal(false)} 
                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 transition-all"
              >
                <i className="ri-close-line text-3xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSendSMS} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">Target Segment</label>
                  <select 
                    value={newMessage.target}
                    onChange={e => setNewMessage({...newMessage, target: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="all_users">All Users (Residents)</option>
                    <option value="sector_users">Geographical Sector (Area)</option>
                    <option value="all_riders">All Riders (Personnel)</option>
                    <option value="custom">Direct Signal (Manual)</option>
                  </select>
                </div>

                {newMessage.target === 'sector_users' && (
                  <div className="space-y-3 animate-slide-down">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">Operational Sector</label>
                    <select 
                      value={newMessage.sector}
                      onChange={e => setNewMessage({...newMessage, sector: e.target.value})}
                      className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer shadow-lg shadow-indigo-500/5 text-indigo-600"
                    >
                      <option value="all">Select Targeted Area</option>
                      {availableZones.map((zone: string) => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">Originator ID</label>
                  <input 
                    type="text"
                    value={newMessage.sender_name}
                    onChange={e => setNewMessage({...newMessage, sender_name: e.target.value.slice(0, 11).toUpperCase()})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                    placeholder="BORLAWURA"
                  />
                </div>
              </div>

              {newMessage.target === 'custom' && (
                <div className="space-y-3 animate-slide-down">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">Direct Recipient Endpoint</label>
                  <input 
                    type="tel"
                    required
                    value={newMessage.custom_recipient}
                    onChange={e => setNewMessage({...newMessage, custom_recipient: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="E.g. 0540000000"
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">Signal Payload</label>
                <textarea 
                  required
                  value={newMessage.message}
                  onChange={e => setNewMessage({...newMessage, message: e.target.value})}
                  className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-[2rem] text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[160px] resize-none scrollbar-hide"
                  placeholder="Compose institutional signal..."
                ></textarea>
                <div className="flex justify-between px-2 items-center">
                  <div className="flex items-center gap-3">
                     <span className={`text-[10px] font-bold uppercase tracking-widest ${newMessage.message.length > 160 ? 'text-rose-500' : 'text-slate-400'}`}>
                       {newMessage.message.length} <span className="opacity-50">/ 160 units</span>
                     </span>
                     {newMessage.message.length > 160 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                     )}
                  </div>
                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.1em] px-3 py-1 bg-indigo-50 rounded-lg dark:bg-indigo-500/10">
                    Cycle: {Math.ceil(newMessage.message.length / 160)} SMS units
                  </span>
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={sending}
                  className={`w-full py-5 rounded-[2rem] text-xs font-bold uppercase tracking-[0.25em] shadow-2xl transition-all active:scale-[0.98] ${
                    sending 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30'
                  }`}
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-3">
                       <i className="ri-loader-4-line animate-spin text-lg"></i>
                       Synchronizing with Gateway...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                       <i className="ri-send-plane-fill text-lg"></i>
                       Deploy Broadcast
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
