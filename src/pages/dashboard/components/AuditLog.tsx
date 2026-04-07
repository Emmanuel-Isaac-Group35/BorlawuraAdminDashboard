import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ExportButton from './ExportButton';

interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

export default function AuditLog({ adminInfo }: { adminInfo?: any }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    fetchLogs();
    
    const auditChannel = supabase
      .channel('public:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    const smsChannel = supabase
      .channel('public:sms_logs_audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(smsChannel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select(`*, admins (full_name)`)
        .order('created_at', { ascending: false });

      if (auditError) throw auditError;

      const { data: smsData, error: smsError } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (smsError) throw smsError;

      const combinedLogs = [
        ...(auditData || []).map(l => ({
          ...l,
          admin_name: (l as any).admins?.full_name || 'System'
        })),
        ...(smsData || []).map(s => ({
          id: s.id,
          admin_id: 'system',
          admin_name: s.sender_name || 'SMS Gateway',
          action: `Broadcast: ${s.recipient}`,
          target_type: 'SMS',
          target_id: s.id,
          details: { message: s.message, status: s.status },
          ip_address: 'Gateway',
          created_at: s.created_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setLogs(combinedLogs);
    } catch (error) {
      console.error('Error fetching combined logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.target_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 font-['Montserrat'] animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Activity History</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">A simple list of everything done on this dashboard by staff</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={filteredLogs.map(l => ({
              Date: new Date(l.created_at).toLocaleString(),
              Admin: l.admin_name,
              Action: l.action,
              Target: l.target_type,
              IP: l.ip_address || 'Internal'
            }))}
            fileName="Audit_Log_Report"
            title="Activity History"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
           <div className="relative max-w-md group">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
              <input 
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-black border border-slate-200/60 dark:border-white/5 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
           </div>
        </div>

        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Accessing records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                  <th className="px-8 py-5">Time</th>
                  <th className="px-8 py-5">Staff Member</th>
                  <th className="px-8 py-5">Activity</th>
                  <th className="px-8 py-5">Type</th>
                  <th className="px-8 py-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white">{new Date(log.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                           {log.admin_name.charAt(0)}
                         </div>
                         <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{log.admin_name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-slate-200/50 dark:border-white/5">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{log.target_type}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 text-slate-300 hover:text-emerald-500 hover:border-emerald-500/30 group-hover:shadow-md transition-all"
                      >
                        <i className="ri-shield-user-line text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                       No history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedLog(null)}></div>
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Security Audit Dossier</h2>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-1">Transaction Log Analysis</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-10 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Initiated By (Staff)</p>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                           {selectedLog.admin_name.charAt(0)}
                        </div>
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white">{selectedLog.admin_name}</p>
                     </div>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Target Personnel</p>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                           {(selectedLog.details?.target_user_name || selectedLog.target_type).charAt(0)}
                        </div>
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                           {selectedLog.details?.target_user_name || selectedLog.details?.user || 'System Entity'}
                        </p>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                     <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Executed</p>
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-[9px] font-bold uppercase">{selectedLog.action}</span>
                     </div>
                     <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{selectedLog.details?.message || 'No manual log entry provided'}"
                     </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Execution Time</p>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                           {new Date(selectedLog.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                     </div>
                     <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Network Node (IP)</p>
                        <p className="text-[12px] font-mono font-bold text-emerald-600">
                           {selectedLog.ip_address || '127.0.0.1 (Internal)'}
                        </p>
                     </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Raw Notification Payload</p>
                  <div className="p-6 bg-slate-950 rounded-[2rem] border border-white/5 max-h-40 overflow-y-auto scrollbar-hide">
                     <pre className="text-[11px] font-mono text-emerald-400/80 leading-relaxed">
                        {JSON.stringify(selectedLog.details, null, 2)}
                     </pre>
                  </div>
               </div>

               <button 
                onClick={() => setSelectedLog(null)} 
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all active:scale-95"
              >
                Dismiss Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
