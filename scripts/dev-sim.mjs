// Runs the app with simulated TideCloak (organiser-approved fallback when the Tide network is unavailable).
import { spawn } from "node:child_process";
spawn("npx", ["next", "dev", "--webpack"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_TIDE_MODE: "simulated" },
}).on("exit", (code) => process.exit(code ?? 0));
