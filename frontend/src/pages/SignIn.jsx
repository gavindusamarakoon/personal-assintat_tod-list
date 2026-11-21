import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function SignIn() {
  const { login, loginWithBiometrics } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter your webmail and password.");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/biometric-setup");
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        navigate("/verify", { state: { email: data.email } });
      } else {
        setError(data?.error || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    setError("");
    if (!email) return setError("Enter your webmail first, then tap Face ID.");
    setBioLoading(true);
    try {
      await loginWithBiometrics(email);
      navigate("/home");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Face ID / Touch ID sign-in isn't set up yet, or was cancelled."
      );
    } finally {
      setBioLoading(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="page-title">Sign In</h1>
      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleLogin}>
        <label className="field-label">Company Webmail</label>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com"
        />

        <label className="field-label">Password</label>
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <div style={{ marginTop: 20 }}>
          <Button type="submit" loading={loading}>
            Sign In
          </Button>
          <Button variant="secondary" onClick={handleBiometricLogin} loading={bioLoading}>
            🔐 Sign in with Face ID / Touch ID
          </Button>
          <Button variant="outline" onClick={() => navigate("/signup")}>
            Create your profile
          </Button>
        </div>
      </form>
    </div>
  );
}
