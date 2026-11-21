const nodemailer = require("nodemailer");
require("dotenv").config();

// Single reusable SMTP transporter (Gmail for now; swap host/port for your
// company's real mail server later — the rest of the app doesn't change).
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
    subject: "Verify your To-Do App account",
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#13101c;color:#fff">
        <h2 style="color:#A855F7;">Confirm it's you</h2>
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#FF7A3D;">${code}</p>
        <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

function sendSupervisorTaskNotification({ supervisorEmail, userName, userEmail, task }) {
  return sendMail({
    to: supervisorEmail,
    subject: `New task added by ${userName}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#A855F7;">New task added</h2>
        <p><b>${userName}</b> (${userEmail}) added a new task:</p>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px;"><b>Title</b></td><td style="padding:4px 12px;">${task.title}</td></tr>
          <tr><td style="padding:4px 12px;"><b>Description</b></td><td style="padding:4px 12px;">${task.description || "-"}</td></tr>
          <tr><td style="padding:4px 12px;"><b>Date</b></td><td style="padding:4px 12px;">${task.date || "-"}</td></tr>
          <tr><td style="padding:4px 12px;"><b>Time</b></td><td style="padding:4px 12px;">${task.time || "-"}</td></tr>
        </table>
      </div>
    `,
  });
}

function sendSupervisorDailyConfirmation({ supervisorEmail, userName, userEmail, tasks }) {
  const rows = tasks
    .map(
      (t) =>
        `<tr><td style="padding:4px 12px;">${t.title}</td><td style="padding:4px 12px;">${
          t.completed ? "✅ Done" : "◻️ Pending"
        }</td></tr>`
    )
    .join("");

  return sendMail({
    to: supervisorEmail,
    subject: `${userName} confirmed today's tasks`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#FF7A3D;">Today's task confirmation</h2>
        <p><b>${userName}</b> (${userEmail}) confirmed today's task list:</p>
        <table style="border-collapse:collapse;">${rows}</table>
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
