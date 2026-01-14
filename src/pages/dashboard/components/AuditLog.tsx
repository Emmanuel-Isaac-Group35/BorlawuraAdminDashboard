import { useState } from 'react';

export default function AuditLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const auditLogs = [
    {
      id: 'AL-001',
      timestamp: '2024-01-15 14:32:15',
      user: 'Admin User',
      userRole: 'Super Admin',
      action: 'User Created',
      target: 'Kwame Mensah',
      targetType: 'User Account',
      ipAddress: '192.168.1.100',
      device: 'Chrome on Windows',
      status: 'Success',
      details: 'Created new user account with subscription plan',
      changes: {
        before: null,
        after: {
          name: 'Kwame Mensah',
          email: 'kwame@example.com',
          phone: '+233 24 123 4567',
          plan: 'Monthly Subscription',
          status: 'Active'
        }
      }
    },
    {
      id: 'AL-002',
      timestamp: '2024-01-15 14:28:42',
      user: 'John Doe',
      userRole: 'Admin',
      action: 'Pickup Assigned',
      target: 'PU-2847',
      targetType: 'Pickup Request',
      ipAddress: '192.168.1.105',
      device: 'Safari on MacOS',
      status: 'Success',
      details: 'Assigned pickup to rider Kofi Adu',
      changes: {
        before: { status: 'Pending', rider: null },
        after: { status: 'Assigned', rider: 'Kofi Adu' }
      }
    },
    {
      id: 'AL-003',
      timestamp: '2024-01-15 14:15:23',
      user: 'Admin User',
      userRole: 'Super Admin',
      action: 'Settings Modified',
      target: 'Service Zone',
      targetType: 'System Settings',
      ipAddress: '192.168.1.100',
      device: 'Chrome on Windows',
      status: 'Success',
      details: 'Updated Accra Central service zone pricing',
      changes: {
        before: { basePrice: '₵15', perKgPrice: '₵2' },
        after: { basePrice: '₵18', perKgPrice: '₵2.50' }
      }
    },
    {
      id: 'AL-004',
      timestamp: '2024-01-15 13:45:10',
      user: 'Jane Smith',
      userRole: 'Admin',
      action: 'Login Failed',
      target: 'admin@borlawura.com',
      targetType: 'Authentication',
      ipAddress: '192.168.1.120',
      device: 'Firefox on Linux',
      status: 'Failed',
      details: 'Failed login attempt - incorrect password',
      changes: null
    },
    {
      id: 'AL-005',
      timestamp: '2024-01-15 13:30:55',
      user: 'Admin User',
      userRole: 'Super Admin',
      action: 'Rider Suspended',
      target: 'Yaw Boateng',
      targetType: 'Rider Account',
      ipAddress: '192.168.1.100',
      device: 'Chrome on Windows',
      status: 'Success',
      details: 'Suspended rider due to multiple complaints',
      changes: {
        before: { status: 'Active', rating: 3.2 },
        after: { status: 'Suspended', rating: 3.2, suspensionReason: 'Multiple complaints' }
      }
    },
    {
      id: 'AL-006',
      timestamp: '2024-01-15 12:15:30',
      user: 'John Doe',
      userRole: 'Admin',
      action: 'Payment Processed',
      target: 'PAY-1523',
      targetType: 'Payment',
      ipAddress: '192.168.1.105',
      device: 'Safari on MacOS',
      status: 'Success',
      details: 'Processed payment for pickup PU-2840',
      changes: {
        before: { status: 'Pending', amount: '₵45' },
        after: { status: 'Completed', amount: '₵45', method: 'Mobile Money' }
      }
    },
  ];

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    return matchesSearch && matchesAction && matchesUser;
  });

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleDownloadReport = (log: any) => {
    // Create a detailed report
    const report = `
AUDIT LOG REPORT
================

Log ID: ${log.id}
Timestamp: ${log.timestamp}
User: ${log.user} (${log.userRole})
Action: ${log.action}
Target: ${log.target} (${log.targetType})
Status: ${log.status}

IP Address: ${log.ipAddress}
Device: ${log.device}

Details:
${log.details}

${log.changes ? `
Changes Made:
-------------
Before: ${JSON.stringify(log.changes.before, null, 2)}
After: ${JSON.stringify(log.changes.after, null, 2)}
` : 'No changes recorded'}

Report Generated: ${new Date().toLocaleString()}
    `.trim();

    // Create and download the file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${log.id}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Show success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
    toast.innerHTML = `
      <i class="ri-download-line text-lg"></i>
      <span class="font-medium">Report downloaded successfully</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit & Compliance Log</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete system activity tracking and traceability</p>
        </div>
        <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-download-line"></i>
          Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Actions Today</span>
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <i className="ri-file-list-3-line text-teal-600 dark:text-teal-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">247</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Admin Actions</span>
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <i className="ri-admin-line text-rose-600 dark:text-rose-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">42</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Financial Actions</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-emerald-600 dark:text-emerald-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">38</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">System Changes</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="ri-settings-3-line text-amber-600 dark:text-amber-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">15</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400 text-sm"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="pl-10 pr-4 py-2 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Action
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Actions</option>
              <option value="User Created">User Created</option>
              <option value="Pickup Assigned">Pickup Assigned</option>
              <option value="Settings Modified">Settings Modified</option>
              <option value="Login Failed">Login Failed</option>
              <option value="Rider Suspended">Rider Suspended</option>
              <option value="Payment Processed">Payment Processed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by User
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Users</option>
              <option value="Admin User">Admin User</option>
              <option value="John Doe">John Doe</option>
              <option value="Jane Smith">Jane Smith</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{log.user}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{log.userRole}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{log.target}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{log.targetType}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      log.status === 'Success'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <i className="ri-eye-line text-gray-600 dark:text-gray-400"></i>
                      </button>
                      <button
                        onClick={() => handleDownloadReport(log)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Download Report"
                      >
                        <i className="ri-file-download-line text-gray-600 dark:text-gray-400"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowDetailsModal(false)}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Audit Log Details
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedLog.id}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-400 text-xl"></i>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Timestamp</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLog.timestamp}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-1 whitespace-nowrap ${
                        selectedLog.status === 'Success'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {selectedLog.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">User</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLog.user}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedLog.userRole}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Action</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLog.action}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Target Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Target Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Target</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLog.target}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLog.targetType}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Technical Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">IP Address</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLog.ipAddress}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Device</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLog.device}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Description
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedLog.details}
                  </p>
                </div>

                {/* Changes */}
                {selectedLog.changes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Changes Made
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Before
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          {selectedLog.changes.before ? (
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {JSON.stringify(selectedLog.changes.before, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              No previous data
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          After
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.changes.after, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => handleDownloadReport(selectedLog)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-download-line"></i>
                  <span>Download Report</span>
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
