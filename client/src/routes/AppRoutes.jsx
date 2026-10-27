import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layouts & Public Pages
import DashboardLayout from '../layouts/DashboardLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ScholarshipsPage from '../pages/ScholarshipsPage';
import ScholarshipDetailPage from '../pages/ScholarshipDetailPage';
import NotificationsPage from '../pages/NotificationsPage';

// Student Pages
import StudentDashboard from '../pages/StudentDashboard';
import StudentProfilePage from '../pages/StudentProfilePage';
import MyApplicationsPage from '../pages/MyApplicationsPage';
import ApplicationViewPage from '../pages/ApplicationViewPage';

// Officer Pages
import OfficerDashboard from '../pages/OfficerDashboard';
import OfficerVerificationPage from '../pages/OfficerVerificationPage';

// Admin Pages
import AdminDashboard from '../pages/AdminDashboard';
import AdminScholarshipsPage from '../pages/AdminScholarshipsPage';
import AdminAuditLogsPage from '../pages/AdminAuditLogsPage';

// Route Protection Guards
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Authenticating...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/scholarships" element={<ScholarshipsPage />} />
      <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />

      {/* Authenticated Dashboard Pages */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Student Specific Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/eligibility"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ScholarshipsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/applications"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/applications/:id"
          element={
            <ProtectedRoute allowedRoles={['student', 'officer', 'admin']}>
              <ApplicationViewPage />
            </ProtectedRoute>
          }
        />

        {/* Officer Routes */}
        <Route
          path="/officer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['officer', 'admin']}>
              <OfficerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/applications"
          element={
            <ProtectedRoute allowedRoles={['officer', 'admin']}>
              <OfficerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officer/verify/:id"
          element={
            <ProtectedRoute allowedRoles={['officer', 'admin']}>
              <OfficerVerificationPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/scholarships"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminScholarshipsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/officers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <OfficerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
