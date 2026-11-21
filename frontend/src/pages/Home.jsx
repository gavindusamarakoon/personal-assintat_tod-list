import React, { useEffect, useState, useMemo, useRef } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Work", color: "#ff7a3d" },
  { id: "meet", name: "Meet", color: "#3b82f6" },
  { id: "personal", name: "Personal", color: "#a855f7" },
  { id: "home", name: "Home", color: "#22c55e" },
];

const COLOR_PALETTE = [
  "#ff7a3d",
  "#a855f7",
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#eab308",
  "#06b6d4",
];

export default function Home() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [toast, setToast] = useState("");
  const seenNotifIds = useRef(new Set());
  const initialLoadDone = useRef(false);

  // Categories
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("todo_categories");
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterMode, setFilterMode] = useState("all");

  // Calendar state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [calendarView, setCalendarView] = useState("monthly");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState("");

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    category: "work",
    date: todayStr,
    time: "09:00",
    important: false,
    remind: false,
  });

  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    localStorage.setItem("todo_categories", JSON.stringify(categories));
  }, [categories]);

  async function fetchAllData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [tasksRes, notifRes] = await Promise.all([
        client.get("/tasks"),
        client.get("/tasks/notifications"),
      ]);
      setTasks(tasksRes.data.tasks || []);

      const list = notifRes.data.notifications || [];
      setNotifications(list);

      // Show live toast if a NEW unread notification arrived
      if (initialLoadDone.current) {
        const brandNew = list.find((n) => !n.read && !seenNotifIds.current.has(n.id));
        if (brandNew) {
          setToast(brandNew.message);
          setTimeout(() => setToast(""), 6000);
        }
      }
      list.forEach((n) => seenNotifIds.current.add(n.id));
      initialLoadDone.current = true;
    } catch {
      if (!silent) setError("Could not load tasks.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData(false);
    // Auto-check every 5 seconds for supervisor confirmations
    const timer = setInterval(() => fetchAllData(true), 5000);
    return () => clearInterval(timer);
  }, []);

  async function openNotifPanel() {
    const nextState = !showNotifPanel;
    setShowNotifPanel(nextState);
    if (nextState && notifications.some((n) => !n.read)) {
      try {
        await client.post("/tasks/notifications/read");
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {}
    }
  }

  // --- Task Actions ---
  function openNewTaskModal() {
    setEditingTask(null);
    setTaskForm({
      title: "",
      description: "",
      category: selectedCategory !== "all" ? selectedCategory : categories[0]?.id || "work",
      date: selectedDate || todayStr,
      time: "09:00",
      important: false,
      remind: false,
    });
    setShowTaskModal(true);
  }

  function openEditTaskModal(task) {
    setEditingTask(task);
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      category: task.category || "work",
      date: task.date || todayStr,
      time: task.time || "",
      important: !!task.important,
      remind: !!task.remind,
    });
    setShowTaskModal(true);
  }

  async function saveTask(e) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setError("");
    setNotice("");
    try {
      if (editingTask) {
        const { data } = await client.put(`/tasks/${editingTask.id}`, taskForm);
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? data.task : t))
        );
        setNotice("Task updated.");
      } else {
        const { data } = await client.post("/tasks", taskForm);
        setTasks((prev) => [data.task, ...prev]);
        setNotice("Task added & detailed email sent to supervisor.");
      }
      setShowTaskModal(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save task.");
    }
  }

  async function toggleTask(task) {
    try {
      const { data } = await client.put(`/tasks/${task.id}`, {
        completed: !task.completed,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
    } catch {
      setError("Could not update task.");
    }
  }

  async function toggleImportant(e, task) {
    e.stopPropagation();
    try {
      const { data } = await client.put(`/tasks/${task.id}`, {
        important: !task.important,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
    } catch {
      setError("Could not update task.");
    }
  }

  async function deleteTask(e, taskId) {
    e.stopPropagation();
    try {
      await client.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setNotice("Task deleted.");
    } catch {
      setError("Could not delete task.");
    }
  }

  async function confirmToday() {
    setConfirming(true);
    setNotice("");
    setError("");
    try {
      await client.post("/tasks/confirm-today");
      setNotice("Detailed daily task log emailed to your supervisor.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not notify supervisor.");
    } finally {
      setConfirming(false);
    }
  }

  function addCategory(e) {
    e.preventDefault();
    if (!catName.trim()) return;
    const newCat = {
      id: catName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      name: catName.trim(),
      color: catColor,
    };
    setCategories((prev) => [...prev, newCat]);
    setCatName("");
    setShowCatModal(false);
  }

  // --- Filtering & Stats ---
  const todaysTasks = tasks.filter((t) => t.date === todayStr);
  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedCategory !== "all" && (t.category || "work") !== selectedCategory) return false;
      if (selectedDate && t.date !== selectedDate) return false;
      if (filterMode === "important" && !t.important) return false;
      if (filterMode === "reminders" && !t.remind) return false;
      if (filterMode === "confirmed" && !t.supervisorConfirmed) return false;
      return true;
    });
  }, [tasks, selectedCategory, selectedDate, filterMode]);

  // --- Calendar Helpers ---
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIdx = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const calendarDays = [];
  for (let i = 0; i < firstDayIdx; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ day: d, iso });
  }

  const getCategoryObj = (id) =>
    categories.find((c) => c.id === id) || { name: "Work", color: "#ff7a3d" };

  return (
    <div className="dash-wrapper">
      {/* Live Toast Notification Popup */}
      {toast && (
        <div className="toast-popup">
          <span>🔔</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Supervisor Approved!</div>
            <div style={{ fontSize: 13 }}>{toast}</div>
          </div>
          <button className="icon-btn" onClick={() => setToast("")}>✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="dash-header">
        <div>
          <h1 className="greeting">Hi, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="subtitle" style={{ margin: "4px 0 0" }}>
            You have <b>{todaysTasks.length}</b> task(s) scheduled for today.
          </p>
        </div>

        <div className="dash-header-actions">
          {/* Notification Bell */}
          <div className="notif-wrap">
            <button className="notif-bell-btn" onClick={openNotifPanel} title="Notifications">
              🔔
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {showNotifPanel && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-title">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet.</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className="notif-item">
                      <div className="notif-msg">✅ {n.message}</div>
                      <div className="notif-time">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            className="btn-inline btn-outline"
            onClick={confirmToday}
            disabled={confirming || todaysTasks.length === 0}
          >
            {confirming ? "Sending..." : "📧 Confirm Today's Tasks"}
          </button>
          <button className="btn-inline btn-primary" onClick={openNewTaskModal}>
            + Create New Task
          </button>
        </div>
      </div>

      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="error-banner">{error}</div>}

      {/* Main 2-Column Web Grid */}
      <div className="dash-grid">
        <div className="dash-left">
          <div className="section-row">
            <span className="section-label">Categories</span>
            <button className="chip-btn" onClick={() => setShowCatModal(true)}>
              + Create new list
            </button>
          </div>

          <div className="cat-grid">
            <div
              className={`cat-card ${selectedCategory === "all" ? "active" : ""}`}
              style={{ borderTop: "4px solid #8b5cf6" }}
              onClick={() => setSelectedCategory("all")}
            >
              <div className="cat-name">All Lists</div>
              <div className="cat-count">{tasks.length} Tasks</div>
            </div>

            {categories.map((cat) => {
              const count = tasks.filter((t) => (t.category || "work") === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className={`cat-card ${selectedCategory === cat.id ? "active" : ""}`}
                  style={{ borderTop: `4px solid ${cat.color}` }}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div className="cat-name">{cat.name}</div>
                  <div className="cat-count">{count} Tasks</div>
                </div>
              );
            })}
          </div>

          {/* Filter Tabs */}
          <div className="filter-bar">
            <div className="filter-tabs">
              <button
                className={`tab-btn ${filterMode === "all" ? "active" : ""}`}
                onClick={() => setFilterMode("all")}
              >
                All Tasks
              </button>
              <button
                className={`tab-btn ${filterMode === "confirmed" ? "active" : ""}`}
                onClick={() => setFilterMode("confirmed")}
              >
                ✅ Confirmed
              </button>
              <button
                className={`tab-btn ${filterMode === "important" ? "active" : ""}`}
                onClick={() => setFilterMode("important")}
              >
                ★ Important
              </button>
              <button
                className={`tab-btn ${filterMode === "reminders" ? "active" : ""}`}
                onClick={() => setFilterMode("reminders")}
              >
                🔔 Reminders
              </button>
            </div>
            {selectedDate && (
              <button className="chip-btn" onClick={() => setSelectedDate("")}>
                Date: {selectedDate} ✕
              </button>
            )}
          </div>

          {/* Task List */}
          <div className="web-task-list">
            {loading && <p className="subtitle">Loading tasks...</p>}
            {!loading && filteredTasks.length === 0 && (
              <div className="empty-state">
                No tasks match this filter. Click <b>+ Create New Task</b> to add one.
              </div>
            )}

            {filteredTasks.map((task) => {
              const cat = getCategoryObj(task.category);
              return (
                <div
                  key={task.id}
                  className="task-card"
                  onClick={() => openEditTaskModal(task)}
                >
                  <button
                    className={`checkbox ${task.completed ? "done" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task);
                    }}
                  >
                    {task.completed ? "✓" : ""}
                  </button>

                  <div className="task-body">
                    <div className="task-title-row">
                      <span className={`task-title ${task.completed ? "done" : ""}`}>
                        {task.title}
                      </span>
                      {task.supervisorConfirmed ? (
                        <span className="confirmed-pill">✅ Supervisor Confirmed</span>
                      ) : (
                        <span className="pending-pill">⏳ Awaiting Approval</span>
                      )}
                    </div>
                    {task.description && <div className="task-desc">{task.description}</div>}
                    <div className="task-badges">
                      <span
                        className="cat-pill"
                        style={{ background: `${cat.color}22`, color: cat.color }}
                      >
                        {cat.name}
                      </span>
                      {task.date && <span className="meta-pill">📅 {task.date}</span>}
                      {task.time && <span className="meta-pill">⏰ {task.time}</span>}
                      {task.remind && <span className="meta-pill">🔔 Remind</span>}
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className={`icon-btn ${task.important ? "star-active" : ""}`}
                      title="Mark Important"
                      onClick={(e) => toggleImportant(e, task)}
                    >
                      ★
                    </button>
                    <button
                      className="icon-btn delete-btn"
                      title="Delete Task"
                      onClick={(e) => deleteTask(e, task.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Calendar + Progress Stats */}
        <div className="dash-right">
          <div className="panel-card">
            <div className="cal-toggle">
              <button
                className={calendarView === "monthly" ? "active" : ""}
                onClick={() => setCalendarView("monthly")}
              >
                MONTHLY
              </button>
              <button
                className={calendarView === "daily" ? "active" : ""}
                onClick={() => {
                  setCalendarView("daily");
                  if (!selectedDate) setSelectedDate(todayStr);
                }}
              >
                DAILY
              </button>
            </div>

            <div className="cal-nav">
              <button
                className="icon-btn"
                onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              >
                ‹
              </button>
              <span className="cal-month">{monthLabel}</span>
              <button
                className="icon-btn"
                onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              >
                ›
              </button>
            </div>

            <div className="cal-weekdays">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="cal-days">
              {calendarDays.map((item, idx) => {
                if (!item) return <span key={`empty-${idx}`} />;
                const hasTask = tasks.some((t) => t.date === item.iso);
                const isSelected = selectedDate === item.iso;
                const isToday = todayStr === item.iso;
                return (
                  <button
                    key={item.iso}
                    className={`cal-day ${isSelected ? "selected" : ""} ${
                      isToday ? "today" : ""
                    }`}
                    onClick={() =>
                      setSelectedDate(selectedDate === item.iso ? "" : item.iso)
                    }
                  >
                    {item.day}
                    {hasTask && <span className="cal-dot" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel-card">
            <div className="section-label" style={{ marginTop: 0 }}>
              Your Progress
            </div>
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-num">{tasks.length}</div>
                <div className="stat-label">Total Tasks</div>
              </div>
              <div className="stat-box">
                <div className="stat-num" style={{ color: "var(--orange)" }}>
                  {completedCount}
                </div>
                <div className="stat-label">Completed</div>
              </div>
            </div>

            <div className="progress-bar-wrap">
              <div className="progress-bar-label">
                <span>Completion Rate</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Add / Edit Task */}
      {showTaskModal && (
        <div className="modal-backdrop" onClick={() => setShowTaskModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? "Edit Task" : "Add New Task"}</h2>
              <button className="icon-btn" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            <form onSubmit={saveTask}>
              <label className="field-label">Task Name</label>
              <input
                className="field-input"
                placeholder="e.g., Team Meeting"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
              />

              <label className="field-label">Description</label>
              <input
                className="field-input"
                placeholder="Short details..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />

              <label className="field-label">Select Category</label>
              <select
                className="field-input"
                value={taskForm.category}
                onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="form-row-2">
                <div>
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    className="field-input"
                    value={taskForm.date}
                    onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Time</label>
                  <input
                    type="time"
                    className="field-input"
                    value={taskForm.time}
                    onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-checks">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={taskForm.important}
                    onChange={(e) => setTaskForm({ ...taskForm, important: e.target.checked })}
                  />
                  <span>★ Important</span>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={taskForm.remind}
                    onChange={(e) => setTaskForm({ ...taskForm, remind: e.target.checked })}
                  />
                  <span>🔔 Remind me</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }}>
                Confirm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Category */}
      {showCatModal && (
        <div className="modal-backdrop" onClick={() => setShowCatModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Category</h2>
              <button className="icon-btn" onClick={() => setShowCatModal(false)}>✕</button>
            </div>
            <form onSubmit={addCategory}>
              <label className="field-label">Category Name</label>
              <input
                className="field-input"
                placeholder="e.g., Sport, Study, Shop"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />

              <label className="field-label">Color</label>
              <div className="color-picker">
                {COLOR_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`color-dot ${catColor === c ? "selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setCatColor(c)}
                  />
                ))}
              </div>

              <button type="submit" className="btn btn-secondary" style={{ marginTop: 20 }}>
                Confirm
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}