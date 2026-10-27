import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

const MyApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await api.get('/applications/my-applications');
        if (res.data.success) {
          setApplications(res.data.applications);
        }
      } catch (err) {
        console.error('Failed to load applications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading your applications...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Scholarship Applications</h1>
          <p className="text-sm text-slate-500 mt-1">Track verification statuses, resolve corrections, and view decisions.</p>
        </div>
        <Link
          to="/scholarships"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          Apply for New Scheme
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          You currently have no applications on file. Browse scholarships to start your journey.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app._id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400">{app.applicationId}</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      app.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : app.status === 'correction_required'
                        ? 'bg-amber-100 text-amber-800'
                        : app.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{app.scholarshipId?.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Draft Mode'} • Current Stage: <strong className="text-slate-700">{app.currentStage}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <Link
                  to={`/student/applications/${app._id}`}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  <span>Track & Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApplicationsPage;
