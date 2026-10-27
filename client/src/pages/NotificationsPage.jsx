import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../services/api';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAll = async () => {
    await api.patch('/notifications/read-all');
    fetchNotifs();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Application events, correction alerts, and verification updates.</p>
        </div>
        <button
          onClick={markAll}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
        >
          <CheckCheck className="w-4 h-4" /> Mark all read
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No notifications right now.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`p-4 flex items-start gap-3 text-xs ${
                n.isRead ? 'bg-white text-slate-600' : 'bg-blue-50/30 text-slate-900 font-medium'
              }`}
            >
              <div className="mt-0.5">
                {n.type === 'correction' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : n.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
