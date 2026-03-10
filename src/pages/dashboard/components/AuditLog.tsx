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
    <div className="space-y-6 font-['Montserrat'] animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit trail of all administrative actions</p>
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
            fileName="Security_Audit_Log"
            title="System Security Audit Report"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-gray-700">
           <div className="relative max-w-md">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input 
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
           </div>
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
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white">{new Date(log.created_at).toLocaleDateString()}</p>
                      <p className="text-[9px] text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{log.admin_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-[9px] font-bold uppercase tracking-wider">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white uppercase">{log.target_type}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-gray-400 hover:text-teal-500 transition-colors"
                      >
                        <i className="ri-information-line text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Log Details</h2>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-rose-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Source IP</p>
                  <p className="text-xs font-mono font-bold text-teal-600">{selectedLog.ip_address || 'System'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Target ID</p>
                  <p className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate">{selectedLog.target_id}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Detailed Payload</p>
                <div className="w-full p-4 bg-gray-900 rounded-lg overflow-x-auto">
                  <pre className="text-teal-400 text-[10px] font-mono leading-relaxed">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
              
              <button onClick={() => setSelectedLog(null)} className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white text-xs font-bold uppercase rounded-lg hover:bg-gray-200 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
