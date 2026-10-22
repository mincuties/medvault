import fs from "fs";
import path from "path";

// Tiny JSON-file store. It only ever holds ciphertext, never plaintext records.
const FILE = path.join(process.cwd(), "data", "db.json");

export function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { records: [], requests: [] };
  }
}

export function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
