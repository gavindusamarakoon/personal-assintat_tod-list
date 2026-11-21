import React from "react";
import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Welcome from "./pages/Welcome";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import SignIn from "./pages/SignIn";
import BiometricSetup from "./pages/BiometricSetup";
import Home from "./pages/Home";
import AddTask from "./pages/AddTask";
import Profile from "./pages/Profile";

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}

// Desktop Web Dashboard Layout (Sidebar + Main Workspace)
function WebLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (logout) logout();
    navigate("/signin");
  };

  return (
    <div className="web-layout">
      <aside className="web-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">✓</div>
          <div>
            <div className="brand-title">To-Do Pro</div>
            <div className="brand-sub">Personal Workspace</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span>📋</span> Dashboard & Tasks
          </NavLink>
          <NavLink to="/task" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span>➕</span> Create New Task
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span>👤</span> Profile & Stats
          </NavLink>
          <NavLink to="/biometric-setup" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span>🔐</span> Biometric Security
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || "User"}</div>
              <div className="user-email">{user?.email || ""}</div>
            </div>
          </div>
          {logout && (
            <button className="btn-logout" onClick={handleLogout}>
              Sign Out
            </button>
          )}
        </div>
      </aside>

      <main className="web-main">
        <div className="web-content">{children}</div>
      </main>
    </div>
  );
}

// Centered Auth Layout for Welcome / SignIn / SignUp / Verify
function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-card">{children}</div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthLayout><Welcome /></AuthLayout>} />
      <Route path="/signup" element={<AuthLayout><SignUp /></AuthLayout>} />
      <Route path="/verify" element={<AuthLayout><VerifyEmail /></AuthLayout>} />
      <Route path="/signin" element={<AuthLayout><SignIn /></AuthLayout>} />
      <Route
        path="/biometric-setup"
        element={
          <RequireAuth>
            <WebLayout><BiometricSetup /></WebLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <WebLayout><Home /></WebLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/task"
        element={
          <RequireAuth>
            <WebLayout><AddTask /></WebLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <WebLayout><Profile /></WebLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}