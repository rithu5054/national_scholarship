import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Search,
  CheckCircle2,
  FileText,
  Bell,
  History,
  ShieldCheck,
  Users,
  Settings,
  BarChart3,
  FileCheck,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/profile', label: 'My Profile', icon: User },
    { to: '/scholarships', label: 'Find Scholarships', icon: Search },
    { to: '/student/eligibility', label: 'Eligibility Checker', icon: CheckCircle2 },
    { to: '/student/applications', label: 'My Applications', icon: FileText },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const officerLinks = [
    { to: '/officer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/officer/applications?filter=assigned', label: 'Assigned Applications', icon: FileCheck },
    { to: '/officer/applications?status=submitted', label: 'Pending Verification', icon: CheckCircle2 },
    { to: '/officer/applications?status=correction_required', label: 'Correction Requests', icon: AlertTriangle },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/admin/scholarships', label: 'Scholarship Management', icon: FileSpreadsheet },
    { to: '/admin/officers', label: 'Officer Management', icon: Users },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: History },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  let links = studentLinks;
  if (user.role === 'officer') links = officerLinks;
  if (user.role === 'admin') links = adminLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {user.role} Portal
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-8 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Pre-Verification Engine</p>
        <p className="mt-1">Active mismatch detection & OCR verification service running.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
