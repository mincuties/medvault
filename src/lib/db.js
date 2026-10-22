import fs from "fs";
import path from "path";

// Tiny JSON-file store. It holds ciphertext and signed policies, never plaintext records.
const FILE = path.join(process.cwd(), "data", "db.json");

export function load() {
  try {
    return { records: [], requests: [], policies: [], users: {}, audit: [], ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return { records: [], requests: [], policies: [], users: {}, audit: [] };
  }
}

export function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
