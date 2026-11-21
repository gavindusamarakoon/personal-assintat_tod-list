import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/verify", { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="page-title">Sign Up</h1>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label className="field-label">Name</label>
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />

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
            Sign Up
          </Button>
          <Button variant="outline" onClick={() => navigate("/signin")}>
            Already have an account? Sign In
          </Button>
        </div>
      </form>
    </div>
  );
}
