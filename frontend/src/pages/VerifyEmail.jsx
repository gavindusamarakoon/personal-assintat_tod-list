import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const { verifyEmail, resendCode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!email) {
    return (
      <div className="screen screen-centered">
        <p className="subtitle">No email to verify. Please sign up first.</p>
        <Button onClick={() => navigate("/signup")}>Go to Sign Up</Button>
      </div>
    );
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (code.length < 6) return setError("Enter the 6-digit code.");
    setLoading(true);
    try {
      await verifyEmail(email, code);
      setSuccess("Email verified! Redirecting to sign in...");
      setTimeout(() => navigate("/signin"), 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setSuccess("");
    try {
      await resendCode(email);
      setSuccess("A new code has been sent.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="screen screen-centered">
      <h1 className="page-title">Verify your email</h1>
      <p className="subtitle">
        We sent a 6-digit code to
        <br />
        <strong style={{ color: "var(--orange)" }}>{email}</strong>
      </p>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <form onSubmit={handleVerify} style={{ width: "100%" }}>
        <input
          className="field-input code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          maxLength={6}
          style={{ marginTop: 20 }}
        />
        <div style={{ marginTop: 16 }}>
          <Button type="submit" loading={loading}>
            Verify
          </Button>
          <Button variant="outline" onClick={handleResend} loading={resending}>
            Resend Code
          </Button>
        </div>
      </form>
    </div>
  );
}
