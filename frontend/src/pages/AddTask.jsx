import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../api/client";
import Button from "../components/Button";

export default function AddTask() {
  const location = useLocation();
  const navigate = useNavigate();
  const existing = location.state?.task;

  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [date, setDate] = useState(existing?.date || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(existing?.time || "");
  const [important, setImportant] = useState(existing?.important || false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setError("");
    if (!title) return setError("Title is required.");
    setLoading(true);
    try {
      if (existing) {
        await client.put(`/tasks/${existing.id}`, { title, description, date, time, important });
      } else {
        // Creating a task automatically emails the supervisor (handled server-side).
        await client.post("/tasks", { title, description, date, time, important });
      }
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error || "Could not save task");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setLoading(true);
    try {
      await client.delete(`/tasks/${existing.id}`);
      navigate("/home");
    } catch (err) {
      setError("Could not delete task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate("/home")}>
          ←
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>
          {existing ? "Edit Task" : "Add Task"}
        </h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <label className="field-label">Task name</label>
      <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting" />

      <label className="field-label">Description</label>
      <input
        className="field-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Morning running"
      />

      <label className="field-label">Date</label>
      <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <label className="field-label">Time</label>
      <input className="field-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />

      <div className="checkbox-row" onClick={() => setImportant((v) => !v)}>
        <span style={{ color: important ? "var(--orange)" : "var(--text-muted)", fontSize: 18 }}>★</span>
        <span>Mark as important</span>
      </div>

      <div style={{ marginTop: 24 }}>
        <Button onClick={handleSave} loading={loading}>
          {existing ? "Save Changes" : "Confirm"}
        </Button>
        {existing && (
          <Button variant="outline" onClick={handleDelete}>
            Delete Task
          </Button>
        )}
      </div>
    </div>
  );
}
