import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../services/api';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminMetrics = async () => {
      try {
        const res = await api.get('/admin/stats');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminMetrics();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading system telemetry...</div>;
  if (!data) return <div className="p-12 text-center text-slate-500">Could not retrieve metrics.</div>;

  const { metrics, charts } = data;
  const PIE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ScholarTrack System Operations Console</h1>
        <p className="text-sm text-slate-500 mt-1">
          High-level institutional oversight, scheme distribution, and mismatch analytics.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Registered Students</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalStudents}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Verification Officers</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalOfficers}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Active Scholarships</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.totalScholarships}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Total Applications</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalApplications}</p>
        </div>
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Application Status Distribution</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.statusDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {charts.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mismatch Categories Bar Chart (Main Novelty Metrics) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Detected Mismatch Categories</h2>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Pre-Verification Engine
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.mismatchBreakdown}>
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Applications Grouped by Scheme */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Volume by Scholarship Scheme</h2>
        <div className="divide-y divide-slate-100 text-xs">
          {charts.appsByScholarship.map((sch, i) => (
            <div key={i} className="py-3 flex justify-between items-center">
              <span className="font-semibold text-slate-800">{sch.name}</span>
              <span className="px-3 py-1 bg-slate-100 rounded-full font-bold text-slate-700">
                {sch.count} applications
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
