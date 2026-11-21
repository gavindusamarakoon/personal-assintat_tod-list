const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const { readDB, writeDB } = require("../utils/db");
const { sendVerificationEmail } = require("../utils/mailer");

const router = express.Router();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit OTP
}

function isAllowedDomain(email) {
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim();
  if (!domain) return true; // no restriction set
  return email.toLowerCase().endsWith("@" + domain.toLowerCase());
}

// POST /api/auth/signup  { name, email, password }
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  if (!isAllowedDomain(email)) {
    return res.status(403).json({ error: "Please sign up with your company webmail address" });
  }

  const db = readDB();
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateCode();

  const user = {
    id: uuid(),
    name,
    email,
    passwordHash,
    verified: false,
    verificationCode: code,
    verificationExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  writeDB(db);

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("Failed to send verification email:", err.message);
    return res.status(500).json({ error: "Account created but failed to send verification email" });
  }

  res.json({ message: "Verification code sent to your email", email });
});

// POST /api/auth/verify  { email, code }
router.post("/verify", (req, res) => {
  const { email, code } = req.body;
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());

  if (!user) return res.status(404).json({ error: "No account found for this email" });
  if (user.verified) return res.json({ message: "Already verified" });
  if (!user.verificationCode || user.verificationCode !== code) {
    return res.status(400).json({ error: "Incorrect verification code" });
  }
  if (Date.now() > user.verificationExpires) {
    return res.status(400).json({ error: "Code expired, please request a new one" });
  }

  user.verified = true;
  delete user.verificationCode;
  delete user.verificationExpires;
  writeDB(db);

  res.json({ message: "Email verified. You can now log in." });
});

// POST /api/auth/resend-code  { email }
router.post("/resend-code", async (req, res) => {
  const { email } = req.body;
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user) return res.status(404).json({ error: "No account found for this email" });
  if (user.verified) return res.json({ message: "Already verified" });

  const code = generateCode();
  user.verificationCode = code;
  user.verificationExpires = Date.now() + 10 * 60 * 1000;
  writeDB(db);

  await sendVerificationEmail(email, code);
  res.json({ message: "New verification code sent" });
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());

  if (!user) return res.status(404).json({ error: "No account found for this email" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: "Incorrect password" });

  // Email verification is REQUIRED before login is allowed.
  if (!user.verified) {
    return res.status(403).json({
      error: "Please verify your company email before logging in",
      requiresVerification: true,
      email: user.email,
    });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

module.exports = router;
