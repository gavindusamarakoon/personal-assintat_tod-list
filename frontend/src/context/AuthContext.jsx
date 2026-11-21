import React, { createContext, useContext, useEffect, useState } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem("authUser", JSON.stringify(user));
  }, [user]);

  async function signup(name, email, password) {
    const { data } = await client.post("/auth/signup", { name, email, password });
    return data;
  }

  async function verifyEmail(email, code) {
    const { data } = await client.post("/auth/verify", { email, code });
    return data;
  }

  async function resendCode(email) {
    const { data } = await client.post("/auth/resend-code", { email });
    return data;
  }

  function persistSession(data) {
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("authUser", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function login(email, password) {
    const { data } = await client.post("/auth/login", { email, password });
    persistSession(data);
    return data;
  }

  // --- Face ID / Touch ID / Windows Hello, via WebAuthn ---

  async function enrollBiometrics() {
    const { data: options } = await client.post("/webauthn/register-options");
    const attestationResponse = await startRegistration({ optionsJSON: options });
    const { data } = await client.post("/webauthn/register-verify", attestationResponse);
    return data;
  }

  async function loginWithBiometrics(email) {
    const { data: options } = await client.post("/webauthn/login-options", { email });
    const assertionResponse = await startAuthentication({ optionsJSON: options });
    const { data } = await client.post("/webauthn/login-verify", {
      email,
      response: assertionResponse,
    });
    persistSession(data);
    return data;
  }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        verifyEmail,
        resendCode,
        login,
        logout,
        enrollBiometrics,
        loginWithBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
