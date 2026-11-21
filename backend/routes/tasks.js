const express = require("express");
const { v4: uuid } = require("uuid");
const { readDB, writeDB } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");
const {
  sendSupervisorTaskNotification,
  sendSupervisorDailyConfirmation,
} = require("../utils/mailer");

const router = express.Router();

function getUser(db, userId) {
  return db.users.find((u) => u.id === userId);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function addNotification(db, userId, message) {
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: uuid(),
    userId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

function renderConfirmHtml(title, subtitle) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
      </head>
      <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#110c1c;font-family:'Segoe UI',Arial,sans-serif;color:#fff;">
        <div style="max-width:460px;width:90%;background:#1b132b;border:1px solid #32254d;border-radius:20px;padding:36px 28px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.45);">
          <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 18px;">✓</div>
          <h2 style="margin:0 0 10px;color:#4ade80;font-size:22px;">${title}</h2>
          <p style="margin:0;color:#a89fbf;font-size:15px;line-height:1.6;">${subtitle}</p>
        </div>
      </body>
    </html>
  `;
}

// =========================================================================
// PUBLIC ROUTES (Supervisor clicks these directly from Email — no login needed)
// =========================================================================

// GET /api/tasks/confirm-by-supervisor/:id
router.get("/confirm-by-supervisor/:id", (req, res) => {
  const db = readDB();
  const task = db.tasks.find((t) => t.id === req.params.id);

  if (!task) {
    return res
      .status(404)
      .send(renderConfirmHtml("Task Not Found", "This task may have been deleted."));
  }

  if (!task.supervisorConfirmed) {
    task.supervisorConfirmed = true;
    task.supervisorConfirmedAt = new Date().toISOString();
    addNotification(db, task.userId, `Supervisor confirmed your task: "${task.title}"`);
    writeDB(db);
  }

  return res.send(
    renderConfirmHtml(
      "Task Confirmed!",
      `You have approved the task <b>"${task.title}"</b>. The employee has been notified in their To-Do Pro dashboard.`
    )
  );
});

// GET /api/tasks/confirm-day-by-supervisor?email=...&date=YYYY-MM-DD
router.get("/confirm-day-by-supervisor", (req, res) => {
  const { email, date } = req.query;
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());

  if (!user) {
    return res
      .status(404)
      .send(renderConfirmHtml("User Not Found", "Could not find the employee record."));
  }

  const targetDate = date || todayStr();
  const dayTasks = db.tasks.filter((t) => t.userId === user.id && t.date === targetDate);

  if (dayTasks.length === 0) {
    return res
      .status(404)
      .send(renderConfirmHtml("No Tasks Found", `No tasks found for ${targetDate}.`));
  }

  let newlyConfirmed = 0;
  dayTasks.forEach((t) => {
    if (!t.supervisorConfirmed) {
      t.supervisorConfirmed = true;
      t.supervisorConfirmedAt = new Date().toISOString();
      newlyConfirmed++;
    }
  });

  if (newlyConfirmed > 0) {
    addNotification(
      db,
      user.id,
      `Supervisor confirmed all ${dayTasks.length} task(s) for ${targetDate}!`
    );
    writeDB(db);
  }

  return res.send(
    renderConfirmHtml(
      "Daily Log Confirmed!",
      `All <b>${dayTasks.length} task(s)</b> submitted by <b>${user.name}</b> for ${targetDate} have been marked as Confirmed.`
    )
  );
});

// =========================================================================
// PROTECTED ROUTES (Logged-in employee only)
// =========================================================================
router.use(requireAuth);

// GET /api/tasks -> all tasks for the logged-in user
router.get("/", (req, res) => {
  const db = readDB();
  const tasks = db.tasks.filter((t) => t.userId === req.userId);
  res.json({ tasks });
});

// GET /api/tasks/notifications -> get user's notifications
router.get("/notifications", (req, res) => {
  const db = readDB();
  const notifications = (db.notifications || []).filter((n) => n.userId === req.userId);
  res.json({ notifications });
});

// POST /api/tasks/notifications/read -> mark all as read
router.post("/notifications/read", (req, res) => {
  const db = readDB();
  (db.notifications || []).forEach((n) => {
    if (n.userId === req.userId) n.read = true;
  });
  writeDB(db);
  res.json({ ok: true });
});

// POST /api/tasks -> creates the task AND emails the supervisor
router.post("/", async (req, res) => {
  const { title, description, category, date, time, important, remind } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const db = readDB();
  const user = getUser(db, req.userId);

  const task = {
    id: uuid(),
    userId: req.userId,
    title,
    description: description || "",
    category: category || "work",
    date: date || todayStr(),
    time: time || "",
    important: !!important,
    remind: !!remind,
    completed: false,
    supervisorConfirmed: false,
    supervisorConfirmedAt: null,
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
    }
  }

  res.json({ task });
});

// PUT /api/tasks/:id -> edit a task
router.put("/:id", (req, res) => {
  const db = readDB();
  const task = db.tasks.find((t) => t.id === req.params.id && t.userId === req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const { title, description, category, date, time, important, remind, completed } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (category !== undefined) task.category = category;
  if (date !== undefined) task.date = date;
  if (time !== undefined) task.time = time;
  if (important !== undefined) task.important = important;
  if (remind !== undefined) task.remind = remind;
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

// POST /api/tasks/confirm-today -> emails supervisor daily log
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