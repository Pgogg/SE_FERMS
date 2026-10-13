// routes/AppRouter.jsx — Declarative route tree mapping all paths to their page components
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute/ProtectedRoute';
import { ROUTE_ACCESS } from '../constants';

// Page components
import Landing from '../pages/public/Landing/Landing';
import Login from '../pages/auth/Login/Login';
import Register from '../pages/auth/Register/Register';
import ReportIncident from '../pages/citizen/ReportIncident/ReportIncident';
import MyReports from '../pages/citizen/MyReports/MyReports';
import MonitoringDashboard from '../pages/dispatch/MonitoringDashboard/MonitoringDashboard';
import MyAssignments from '../pages/firefighter/MyAssignments/MyAssignments';
import IncidentDetail from '../pages/firefighter/IncidentDetail/IncidentDetail';
import StationResources from '../pages/station/StationResources/StationResources';
import UserManagement from '../pages/admin/UserManagement/UserManagement';
import StationManagement from '../pages/admin/StationManagement/StationManagement';
import Styleguide from '../pages/dev/Styleguide/Styleguide';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Development styleguide (only in DEV mode) */}
        {import.meta.env.DEV && <Route path="/dev/styleguide" element={<Styleguide />} />}

        {/* Citizen routes */}
        <Route
          path="/report"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/report']}>
              <ReportIncident />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reports"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/my-reports']}>
              <MyReports />
            </ProtectedRoute>
          }
        />

        {/* Dispatch & Operations dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/dashboard']}>
              <MonitoringDashboard />
            </ProtectedRoute>
          }
        />

        {/* Firefighter assignments & detail */}
        <Route
          path="/assignments"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/assignments']}>
              <MyAssignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:id"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/assignments/:id']}>
              <IncidentDetail />
            </ProtectedRoute>
          }
        />

        {/* Station resources */}
        <Route
          path="/station"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/station']}>
              <StationResources />
            </ProtectedRoute>
          }
        />

        {/* Admin management routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/admin/users']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stations"
          element={
            <ProtectedRoute roles={ROUTE_ACCESS['/admin/stations']}>
              <StationManagement />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route redirects to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
