const express = require("express");
const { v4: uuid } = require("uuid");
const { readDB, writeDB } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");
const {
  sendSupervisorTaskNotification,
  sendSupervisorDailyConfirmation,
} = require("../utils/mailer");

const router = express.Router();
router.use(requireAuth);

function getUser(db, userId) {
  return db.users.find((u) => u.id === userId);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// GET /api/tasks  -> all tasks for the logged-in user
router.get("/", (req, res) => {
  const db = readDB();
  const tasks = db.tasks.filter((t) => t.userId === req.userId);
  res.json({ tasks });
});

// POST /api/tasks  { title, description, date, time, important }
// Creates the task AND emails the supervisor right away.
router.post("/", async (req, res) => {
  const { title, description, date, time, important } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const db = readDB();
  const user = getUser(db, req.userId);

  const task = {
    id: uuid(),
    userId: req.userId,
    title,
    description: description || "",
    date: date || todayStr(),
    time: time || "",
    important: !!important,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  db.tasks.push(task);
  writeDB(db);

  const supervisorEmail = process.env.SUPERVISOR_EMAIL;
  if (supervisorEmail) {
    try {
      await sendSupervisorTaskNotification({
        supervisorEmail,
        userName: user.name,
        userEmail: user.email,
        task,
      });
    } catch (err) {
      console.error("Failed to notify supervisor:", err.message);
      // Task is still created even if the email fails.
    }
  }

  res.json({ task });
});

// PUT /api/tasks/:id  -> edit a task
router.put("/:id", (req, res) => {
  const db = readDB();
  const task = db.tasks.find((t) => t.id === req.params.id && t.userId === req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const { title, description, date, time, important, completed } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (date !== undefined) task.date = date;
  if (time !== undefined) task.time = time;
  if (important !== undefined) task.important = important;
  if (completed !== undefined) task.completed = completed;

  writeDB(db);
  res.json({ task });
});

// DELETE /api/tasks/:id
router.delete("/:id", (req, res) => {
  const db = readDB();
  const before = db.tasks.length;
  db.tasks = db.tasks.filter((t) => !(t.id === req.params.id && t.userId === req.userId));
  if (db.tasks.length === before) return res.status(404).json({ error: "Task not found" });
  writeDB(db);
  res.json({ message: "Task deleted" });
});

// POST /api/tasks/confirm-today
// Marks today's tasks reviewed and emails the supervisor a summary.
router.post("/confirm-today", async (req, res) => {
  const db = readDB();
  const user = getUser(db, req.userId);
  const today = todayStr();
  const todaysTasks = db.tasks.filter((t) => t.userId === req.userId && t.date === today);

  if (todaysTasks.length === 0) {
    return res.status(400).json({ error: "No tasks scheduled for today" });
  }

  const supervisorEmail = process.env.SUPERVISOR_EMAIL;
  if (supervisorEmail) {
    try {
      await sendSupervisorDailyConfirmation({
        supervisorEmail,
        userName: user.name,
        userEmail: user.email,
        tasks: todaysTasks,
      });
    } catch (err) {
      console.error("Failed to send daily confirmation:", err.message);
      return res.status(500).json({ error: "Tasks found but failed to email supervisor" });
    }
  }

  res.json({ message: "Supervisor notified of today's tasks", tasks: todaysTasks });
});

module.exports = router;
