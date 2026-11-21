import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import TaskCard from "../components/TaskCard";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysTasks = tasks.filter((t) => t.date === todayStr);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data } = await client.get("/tasks");
      setTasks(data.tasks);
    } catch (err) {
      setNotice("Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function toggleTask(task) {
    try {
      const { data } = await client.put(`/tasks/${task.id}`, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
    } catch (err) {
      setNotice("Could not update task.");
    }
  }

  async function confirmToday() {
    setConfirming(true);
    setNotice("");
    try {
      await client.post("/tasks/confirm-today");
      setNotice("Your supervisor has been emailed today's task list.");
    } catch (err) {
      setNotice(err.response?.data?.error || "Could not notify supervisor");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="home-header">
        <div className="greeting">Hi, {user?.name?.split(" ")[0]} 👋</div>
        <button className="avatar-link" onClick={() => navigate("/profile")}>
          👤
        </button>
      </div>

      <div className="section-label">Today · {todaysTasks.length} task(s)</div>
      {notice && <div className="success-banner">{notice}</div>}

      <div className="task-list">
        {loading && <p className="subtitle">Loading...</p>}
        {!loading && tasks.length === 0 && (
          <p className="empty-state">No tasks yet. Tap + to add one.</p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task)}
            onOpen={() => navigate("/task", { state: { task } })}
          />
        ))}
      </div>

      <div className="confirm-bar">
        <Button onClick={confirmToday} loading={confirming} disabled={todaysTasks.length === 0}>
          Confirm Today's Tasks
        </Button>
      </div>

      <button className="fab" onClick={() => navigate("/task")}>
        +
      </button>
    </div>
  );
}
