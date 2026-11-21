import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout, enrollBiometrics } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnableBiometrics() {
    setLoading(true);
    setNotice("");
    try {
      await enrollBiometrics();
      setNotice("Face ID / Touch ID enabled for this device.");
    } catch (err) {
      setNotice("Could not enable Face ID on this device/browser.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen screen-centered">
      <div className="top-bar" style={{ alignSelf: "flex-start" }}>
        <button className="back-btn" onClick={() => navigate("/home")}>
          ←
        </button>
      </div>

      <div className="logo-circle">👤</div>
      <h1 className="page-title">{user?.name}</h1>
      <p className="subtitle">{user?.email}</p>

      {notice && <div className="success-banner">{notice}</div>}

      <div style={{ width: "100%", marginTop: 30 }}>
        <Button variant="secondary" onClick={handleEnableBiometrics} loading={loading}>
          🔐 Enable Face ID / Touch ID
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}
