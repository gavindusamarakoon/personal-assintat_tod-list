// Very small JSON-file "database" so the project runs instantly with zero setup.
// Swap this out for Postgres/MongoDB/etc. later — every route only calls the
// functions below, so that's the only file you'd need to change.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "db.json");

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    writeDB({ users: [], tasks: [] });
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
