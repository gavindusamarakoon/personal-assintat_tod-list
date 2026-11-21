const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.VERCEL
  ? "/tmp/db.json"
  : path.join(__dirname, "..", "db.json");

const DEFAULT_DB = { users: [], tasks: [], notifications: [] };

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return { ...DEFAULT_DB };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return { ...DEFAULT_DB };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };