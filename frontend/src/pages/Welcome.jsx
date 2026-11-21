import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="screen screen-centered">
      <div className="art-circle">🗂️</div>
      <h1 className="page-title">Welcome to the Program</h1>
      <p className="subtitle">
        Organize your tasks, log in with your company webmail, and keep your
        supervisor automatically in the loop.
      </p>
      <div style={{ width: "100%", marginTop: 30 }}>
        <Button onClick={() => navigate("/signup")}>Sign Up</Button>
        <Button variant="outline" onClick={() => navigate("/signin")}>
          Sign In
        </Button>
      </div>
    </div>
  );
}
