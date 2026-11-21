const express = require("express");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const { readDB, writeDB } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const RP_ID = process.env.RP_ID || "localhost";
const RP_NAME = process.env.RP_NAME || "To-Do List App";
const ORIGIN = process.env.ORIGIN || "http://localhost:5173";

function findUser(db, id) {
  return db.users.find((u) => u.id === id);
}

// --- Enrolling Face ID / Touch ID / Windows Hello for an already-logged-in user ---

// POST /api/webauthn/register-options   (auth required)
router.post("/register-options", requireAuth, async (req, res) => {
  const db = readDB();
  const user = findUser(db, req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.webauthnCredentials = user.webauthnCredentials || [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform", // forces the device's own biometrics (Face ID/Touch ID/Windows Hello)
      userVerification: "required",
      residentKey: "preferred",
    },
    excludeCredentials: user.webauthnCredentials.map((c) => ({
      id: c.credentialID,
      type: "public-key",
    })),
  });

  user.currentChallenge = options.challenge;
  writeDB(db);
  res.json(options);
});

// POST /api/webauthn/register-verify   (auth required)  { attestationResponse }
router.post("/register-verify", requireAuth, async (req, res) => {
  const db = readDB();
  const user = findUser(db, req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: "Could not verify biometric registration" });
    }

    const { credential } = verification.registrationInfo;
    user.webauthnCredentials = user.webauthnCredentials || [];
    user.webauthnCredentials.push({
      credentialID: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
    });
    user.currentChallenge = null;
    writeDB(db);

    res.json({ message: "Face ID / biometric login enabled" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Registration verification failed" });
  }
});

// --- Logging in with Face ID / Touch ID / Windows Hello (no password) ---

// POST /api/webauthn/login-options   { email }
router.post("/login-options", async (req, res) => {
  const { email } = req.body;
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());

  if (!user || !user.webauthnCredentials || user.webauthnCredentials.length === 0) {
    return res.status(404).json({ error: "No biometric login set up for this account yet" });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
    allowCredentials: user.webauthnCredentials.map((c) => ({
      id: c.credentialID,
      type: "public-key",
    })),
  });

  user.currentChallenge = options.challenge;
  writeDB(db);
  res.json(options);
});

// POST /api/webauthn/login-verify   { email, assertionResponse }
router.post("/login-verify", async (req, res) => {
  const { email, response } = req.body;
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });

  const credential = (user.webauthnCredentials || []).find((c) => c.credentialID === response.id);
  if (!credential) return res.status(400).json({ error: "Unknown credential" });

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credential.credentialID,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: credential.counter,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: "Biometric verification failed" });
    }

    credential.counter = verification.authenticationInfo.newCounter;
    user.currentChallenge = null;
    writeDB(db);

    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Biometric verification failed" });
  }
});

module.exports = router;
