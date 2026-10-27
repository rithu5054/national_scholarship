import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [recommendations, setRecommendations] = useState({ eligible: [], notEligible: [] });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [appsRes, recRes, notifRes] = await Promise.all([
          api.get('/applications/my-applications'),
          api.get('/scholarships/recommendations'),
          api.get('/notifications'),
        ]);

        if (appsRes.data.success) setApplications(appsRes.data.applications);
        if (recRes.data.success) setRecommendations(recRes.data.recommendations);
        if (notifRes.data.success) setNotifications(notifRes.data.notifications.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalApps = applications.length;
  const underVerification = applications.filter((a) => a.status === 'under_review' || a.status === 'submitted').length;
  const correctionReq = applications.filter((a) => a.status === 'correction_required').length;
  const approved = applications.filter((a) => a.status === 'approved').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="mt-1 text-blue-100 text-sm">
            {profile?.course ? `${profile.course} • ${profile.academicYear}` : 'Complete your student profile to discover matching scholarships.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/student/profile"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-sm transition"
          >
            Edit Profile
          </Link>
          <Link
            to="/scholarships"
            className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-xl shadow transition"
          >
            Explore Scholarships
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Applications</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalApps}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Under Verification</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">{underVerification}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Correction Required</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{correctionReq}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Approved</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{approved}</p>
        </div>
      </div>

      {/* Active Correction Action Banner */}
      {correctionReq > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Action Required: Document Mismatch or Issue</p>
              <p className="text-xs text-amber-700">A verification officer has returned an application for guided correction.</p>
            </div>
          </div>
          <Link
            to="/student/applications"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Review Discrepancy
          </Link>
        </div>
      )}

      {/* Recommended Scholarships Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Recommended for Your Profile</h2>
          </div>
          <Link to="/scholarships" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recommendations.eligible.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            No matching scholarships found for your criteria. Update your profile or browse all schemes.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.eligible.slice(0, 3).map(({ scholarship, evaluation }) => (
              <div key={scholarship._id} className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                    {scholarship.provider}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">{scholarship.name}</h3>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{scholarship.description}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Award Amount</span>
                    <p className="text-sm font-bold text-slate-900">₹{scholarship.amount?.toLocaleString('en-IN')}</p>
                  </div>
                  <Link
                    to={`/scholarships/${scholarship._id}`}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Applications Table */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Applications</h2>
        {applications.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            You haven't applied for any scholarships yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Application ID</th>
                  <th className="px-6 py-3">Scholarship</th>
                  <th className="px-6 py-3">Current Stage</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">{app.applicationId}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{app.scholarshipId?.name}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{app.currentStage}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : app.status === 'correction_required'
                            ? 'bg-amber-100 text-amber-700'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {app.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/student/applications/${app._id}`}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        View & Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
