import React, { useState, useEffect } from 'react';
import { History, Shield, Clock } from 'lucide-react';
import api from '../services/api';

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        if (res.data.success) {
          setLogs(res.data.logs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Immutable System Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cryptographically recorded security and verification event trail.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Actor</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Status Progression</th>
              <th className="px-6 py-3">Reason / Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log._id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-mono text-slate-500">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-3">
                  <span className="font-semibold text-slate-800">{log.actorId?.name || 'System'}</span>
                  <span className="block text-[10px] uppercase text-slate-400">{log.actorRole}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="px-2 py-0.5 rounded font-mono font-semibold bg-slate-100 text-slate-700">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-3 text-slate-600">
                  {log.previousStatus && (
                    <span>
                      {log.previousStatus} → <strong>{log.newStatus}</strong>
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
