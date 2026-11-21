const nodemailer = require("nodemailer");
require("dotenv").config();

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || undefined,
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

function sendVerificationEmail(toEmail, code) {
  return sendMail({
    to: toEmail,
    subject: "Verify your To-Do Pro account",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#110c1c;padding:32px;color:#ffffff;">
        <div style="max-width:520px;margin:0 auto;background:#1b132b;border:1px solid #32254d;border-radius:18px;padding:28px;">
          <h2 style="color:#a855f7;margin-top:0;">Confirm it's you</h2>
          <p style="color:#a89fbf;">Use the 6-digit verification code below to verify your account:</p>
          <div style="background:#261b3d;border-radius:12px;padding:18px;text-align:center;margin:20px 0;">
            <span style="font-size:34px;font-weight:800;letter-spacing:8px;color:#ff7a3d;">${code}</span>
          </div>
          <p style="font-size:12px;color:#a89fbf;">This code expires in 10 minutes.</p>
        </div>
      </div>
    `,
  });
}

function sendSupervisorTaskNotification({ supervisorEmail, userName, userEmail, task }) {
  const confirmUrl = `${BACKEND_URL}/api/tasks/confirm-by-supervisor/${task.id}`;
  const priorityBadge = task.important
    ? `<span style="background:#ff7a3d;color:#fff;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">★ High Priority</span>`
    : `<span style="background:#32254d;color:#d8ccf0;padding:3px 10px;border-radius:99px;font-size:12px;">Normal</span>`;

  return sendMail({
    to: supervisorEmail,
    subject: `📋 New Task Submitted by ${userName}: ${task.title}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#110c1c;padding:32px;color:#ffffff;">
        <div style="max-width:580px;margin:0 auto;background:#1b132b;border:1px solid #32254d;border-radius:18px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#8b5cf6,#ff7a3d);padding:22px 28px;">
            <h2 style="margin:0;color:#ffffff;font-size:20px;">📋 New Task Log Submitted</h2>
            <p style="margin:4px 0 0;color:#fff;opacity:0.9;font-size:13px;">To-Do Pro · Supervisor Review Required</p>
          </div>

          <div style="padding:28px;">
            <p style="margin-top:0;color:#e5dff5;font-size:15px;">
              <b>${userName}</b> (<a href="mailto:${userEmail}" style="color:#ff7a3d;text-decoration:none;">${userEmail}</a>) added a new task to their schedule:
            </p>

            <table style="width:100%;border-collapse:collapse;background:#261b3d;border-radius:12px;overflow:hidden;margin:18px 0;">
              <tr>
                <td style="padding:12px 16px;color:#a89fbf;font-size:13px;border-bottom:1px solid #32254d;width:32%;">Task Title</td>
                <td style="padding:12px 16px;color:#ffffff;font-weight:700;font-size:15px;border-bottom:1px solid #32254d;">${task.title}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#a89fbf;font-size:13px;border-bottom:1px solid #32254d;">Description</td>
                <td style="padding:12px 16px;color:#e5dff5;font-size:14px;border-bottom:1px solid #32254d;">${task.description || "No description provided"}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#a89fbf;font-size:13px;border-bottom:1px solid #32254d;">Category</td>
                <td style="padding:12px 16px;color:#a855f7;font-weight:600;text-transform:capitalize;border-bottom:1px solid #32254d;">${task.category || "Work"}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#a89fbf;font-size:13px;border-bottom:1px solid #32254d;">Date & Time</td>
                <td style="padding:12px 16px;color:#ffffff;font-size:14px;border-bottom:1px solid #32254d;">📅 ${task.date || "-"} &nbsp;&nbsp; ⏰ ${task.time || "-"}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#a89fbf;font-size:13px;">Priority</td>
                <td style="padding:12px 16px;">${priorityBadge}</td>
              </tr>
            </table>

            <div style="text-align:center;margin-top:26px;">
              <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">
                ✅ Confirm & Approve Task
              </a>
              <p style="font-size:12px;color:#a89fbf;margin-top:12px;">
                Clicking this button will mark the task as <b>Confirmed</b> and notify ${userName} immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}

function sendSupervisorDailyConfirmation({ supervisorEmail, userName, userEmail, tasks }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const confirmAllUrl = `${BACKEND_URL}/api/tasks/confirm-day-by-supervisor?email=${encodeURIComponent(userEmail)}&date=${todayStr}`;

  const rows = tasks
    .map(
      (t) => `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #32254d;color:#ffffff;font-weight:600;">
            ${t.title}
            ${t.description ? `<div style="font-size:12px;color:#a89fbf;font-weight:400;margin-top:3px;">${t.description}</div>` : ""}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #32254d;color:#a89fbf;font-size:13px;white-space:nowrap;">
            ${t.time || "-"}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #32254d;font-size:13px;white-space:nowrap;">
            ${t.completed ? `<span style="color:#4ade80;font-weight:700;">✅ Done</span>` : `<span style="color:#ff7a3d;font-weight:700;">⏳ Pending</span>`}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #32254d;text-align:right;">
            <a href="${BACKEND_URL}/api/tasks/confirm-by-supervisor/${t.id}" style="background:#8b5cf6;color:#fff;text-decoration:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;">
              Confirm
            </a>
          </td>
        </tr>
      `
    )
    .join("");

  return sendMail({
    to: supervisorEmail,
    subject: `📊 Daily Task Log from ${userName} (${todayStr})`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#110c1c;padding:32px;color:#ffffff;">
        <div style="max-width:640px;margin:0 auto;background:#1b132b;border:1px solid #32254d;border-radius:18px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#8b5cf6,#ff7a3d);padding:22px 28px;">
            <h2 style="margin:0;color:#ffffff;font-size:20px;">📊 Daily Task Log — ${todayStr}</h2>
            <p style="margin:4px 0 0;color:#fff;opacity:0.9;font-size:13px;">Submitted by ${userName} (${userEmail})</p>
          </div>

          <div style="padding:26px;">
            <p style="margin-top:0;color:#e5dff5;font-size:14px;">
              Here is today's complete task summary (${tasks.length} task${tasks.length > 1 ? "s" : ""}). You can confirm individual tasks or approve the entire day's log below:
            </p>

            <table style="width:100%;border-collapse:collapse;background:#261b3d;border-radius:12px;overflow:hidden;margin:18px 0;">
              <thead>
                <tr style="background:#32254d;text-align:left;font-size:12px;color:#d8ccf0;text-transform:uppercase;">
                  <th style="padding:10px 14px;">Task</th>
                  <th style="padding:10px 14px;">Time</th>
                  <th style="padding:10px 14px;">Status</th>
                  <th style="padding:10px 14px;text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div style="text-align:center;margin-top:26px;">
              <a href="${confirmAllUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">
                ✅ Confirm All Today's Tasks
              </a>
              <p style="font-size:12px;color:#a89fbf;margin-top:12px;">
                ${userName} will receive an instant notification in the To-Do App once confirmed.
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendSupervisorTaskNotification,
  sendSupervisorDailyConfirmation,
};