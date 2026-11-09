import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Users from './pages/Users.jsx';
import Courses from './pages/Courses.jsx';

// Admin
import AdminLayout from './components/AdminLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Alerts from './pages/Alerts.jsx';
import LockedAccounts from './pages/LockedAccounts.jsx';
import TamperLog from './pages/TamperLog.jsx';

// Student
import StudentLayout from './components/StudentLayout.jsx';
import MyResults from './pages/student/MyResults.jsx';
import MyProfile from './pages/student/MyProfile.jsx';

// Lecturer
import LecturerLayout from './components/LecturerLayout.jsx';
import MyUploads from './pages/lecturer/MyUploads.jsx';
import MyCourses from './pages/lecturer/MyCourses.jsx';
import UploadResult from './pages/lecturer/UploadResult.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md">
          <div className="text-4xl mb-3">🚫</div>
          <div className="text-red-800 font-medium">Access Denied</div>
          <div className="text-sm text-red-600 mt-1">
            Your role ({user.role}) cannot access this page.
          </div>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  if (user.role === 'LECTURER') {
    return <Navigate to="/lecturer" replace />;
  }
  if (user.role === 'STUDENT') {
    return <Navigate to="/student" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
	<Route path="users" element={<Users />} />
	<Route path="courses" element={<Courses />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="locked-accounts" element={<LockedAccounts />} />
        <Route path="tamper-log" element={<TamperLog />} />
      </Route>

      {/* Student */}
      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MyResults />} />
        <Route path="results" element={<MyResults />} />
        <Route path="profile" element={<MyProfile />} />
      </Route>

      {/* Lecturer */}
      <Route
        path="/lecturer"
        element={
          <ProtectedRoute roles={['LECTURER']}>
            <LecturerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MyUploads />} />
        <Route path="upload" element={<UploadResult />} />
        <Route path="uploads" element={<MyUploads />} />
        <Route path="courses" element={<MyCourses />} />
      </Route>

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}