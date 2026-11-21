import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="/biometric-setup"
        element={
          <RequireAuth>
            <BiometricSetup />
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/task"
        element={
          <RequireAuth>
            <AddTask />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
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
