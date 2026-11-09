import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const SEVERITY_STYLES = {
  CRITICAL: 'bg-red-100 text-red-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  INFO: 'bg-blue-100 text-blue-800',
};

const ACTION_LABELS = {
  TAMPER_ATTEMPT: '🕵️ Tamper Attempt',
  DUPLICATE_RESULT_UPLOAD_ATTEMPT: '📋 Duplicate Upload Blocked',
  IDS_BLOCKED: '🚫 IDS Blocked',
  ACCOUNT_LOCKED: '🔒 Account Locked',
  LOGIN_FAILED: '❌ Failed Login',
  UNAUTHORIZED_RESULT_UPLOAD_ATTEMPT: '⛔ Unauthorized Upload',
  DATA_INTEGRITY_VIOLATION: '⚠️ Integrity Violation',
  INCIDENT_REPORT_DOWNLOADED: '📄 Report Downloaded',
};

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Tamper Attempts', value: 'TAMPER_ATTEMPT' },
  { label: 'Duplicate Uploads', value: 'DUPLICATE_RESULT_UPLOAD_ATTEMPT' },
  { label: 'IDS Blocks', value: 'IDS_BLOCKED' },
  { label: 'Account Locked', value: 'ACCOUNT_LOCKED' },
  { label: 'Failed Logins', value: 'LOGIN_FAILED' },
];

export default function TamperLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('TAMPER_ATTEMPT');
  const [severityFilter, setSeverityFilter] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (actionFilter) params.set('action', actionFilter);
      if (severityFilter) params.set('severity', severityFilter);

      const { data } = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(data.logs);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport() {
    setDownloadingReport(true);
    try {
      const response = await api.get('/reports/incident.pdf', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Incident report downloaded');
    } catch (err) {
      toast.error('Failed to download report');
    } finally {
      setDownloadingReport(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, severityFilter]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tamper & Audit Log</h1>
          <p className="text-gray-500 mt-1">
            Every sensitive action on the platform, in chronological order.
          </p>
        </div>
        <button
          onClick={downloadReport}
          disabled={downloadingReport}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {downloadingReport ? '⏳ Generating...' : '📄 Download Incident Report (PDF)'}
        </button>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActionFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                actionFilter === f.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>

        <button
          onClick={fetchLogs}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-600">No logs match these filters.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  Action
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  Severity
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  User
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  IP
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {ACTION_LABELS[log.action] || log.action}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        SEVERITY_STYLES[log.severity] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {log.user?.email || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.ipAddress || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}