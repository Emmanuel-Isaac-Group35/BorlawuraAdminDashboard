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

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    fetchLogs();
    
    const channel = supabase
      .channel('public:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`*, admins (full_name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setLogs((data || []).map(l => ({
        ...l,
        admin_name: (l as any).admins?.full_name || 'System'
      })));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Security Audit Trail</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Institutional record of all administrative operations and system modifications</p>
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
            fileName="Institutional_Security_Audit"
            title="System Security Audit Archive"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10">
           <div className="relative max-w-md group">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"></i>
              <input 
                type="text"
                placeholder="Query audit archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
           </div>
        </div>

        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-5 tracking-widest">Accessing records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 dark:border-white/5">
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="px-8 py-5">Initiator</th>
                  <th className="px-8 py-5">Action Type</th>
                  <th className="px-8 py-5">Object Class</th>
                  <th className="px-8 py-5 text-right">Verification</th>
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
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/10 text-slate-300 hover:text-slate-900 hover:border-slate-300 group-hover:shadow-md transition-all"
                      >
                        <i className="ri-shield-user-line text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                       No audit records identified
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
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Access Log Record</h2>
              <button onClick={() => setSelectedLog(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Protocol Source</p>
                  <p className="text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-tight">{selectedLog.ip_address || 'Internal Network'}</p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Object Identifier</p>
                  <p className="text-[11px] font-mono font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">{selectedLog.target_id.slice(0,16)}...</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Record Payload</p>
                <div className="w-full p-6 bg-slate-900 rounded-[2rem] border border-white/5 overflow-hidden">
                  <pre className="text-indigo-400 text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto scrollbar-hide">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedLog(null)} 
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-xs font-bold uppercase tracking-widest shadow-xl transition-all"
              >
                Retire Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
