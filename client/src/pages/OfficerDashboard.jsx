import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  ShieldCheck,
  Search,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/officer/applications', {
        params: { status: filter || undefined },
      });
      if (res.data.success) {
        setApplications(res.data.applications);
      }
    } catch (err) {
      console.error('Failed to load officer apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [filter]);

  const pendingVerification = applications.filter((a) => a.status === 'submitted').length;
  const underReview = applications.filter((a) => a.status === 'under_review').length;
  const correctionRequests = applications.filter((a) => a.status === 'correction_required').length;
  const approved = applications.filter((a) => a.status === 'approved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification Officer Workstation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Officer: {user?.name} • Document audit and pre-verification review console.
          </p>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500">Pending Assignment</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{pendingVerification}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500">In Active Review</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{underReview}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500">Correction Requested</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{correctionRequests}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500">Completed Approved</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approved}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { label: 'All Active Applications', value: '' },
          { label: 'Pending Review', value: 'submitted' },
          { label: 'Under Review', value: 'under_review' },
          { label: 'Correction Required', value: 'correction_required' },
          { label: 'Approved', value: 'approved' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filter === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Application Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading applications queue...</div>
      ) : applications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          No applications match the current filter.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">App ID</th>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Scholarship</th>
                <th className="px-6 py-3">Submitted At</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => (
                <tr key={app._id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-800">{app.applicationId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{app.applicationData?.studentName}</td>
                  <td className="px-6 py-4 text-slate-700 text-xs">{app.scholarshipId?.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
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
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/officer/verify/${app._id}`}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review & Verify</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OfficerDashboard;
