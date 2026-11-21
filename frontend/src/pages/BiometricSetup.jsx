import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function BiometricSetup() {
  const { enrollBiometrics } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setError("");
    setLoading(true);
    try {
      await enrollBiometrics();
      navigate("/home");
    } catch (err) {
      // User may have cancelled the prompt, or the device has no biometrics.
      setError("Could not enable Face ID / Touch ID on this device. You can try again later from Profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen screen-centered">
      <div className="logo-circle">🔐</div>
      <h1 className="page-title">Enable Face ID?</h1>
      <p className="subtitle">
        Use your device's Face ID, Touch ID, or Windows Hello to sign in next
        time, instead of typing your password.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ width: "100%", marginTop: 24 }}>
        <Button onClick={handleEnable} loading={loading}>
          Enable Face ID
        </Button>
        <Button variant="outline" onClick={() => navigate("/home")}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
