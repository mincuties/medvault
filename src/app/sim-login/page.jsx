"use client";
import { useTide, SIMULATED } from "@/lib/tide";
import { SIM_USERS } from "@/lib/tideSim.jsx";

const HOME = { patient: "/patient", doctor: "/doctor", hospitaladmin: "/admin" };

// Stands in for the Tide enclave sign-in page when running in simulated mode.
export default function SimLogin() {
  const tide = useTide();
  if (!SIMULATED) return <main><p>Simulated sign-in is off. Use Login with TideCloak.</p></main>;
  return (
    <main>
      <div className="card hero">
        <h2>Sign in (simulated Tide enclave)</h2>
        <p className="muted">In real mode this is Tide&apos;s enclave: your password never reaches MedVault or TideCloak.</p>
        {Object.entries(SIM_USERS).map(([u, info]) => (
          <div key={u} className="item">
            <span><b>{info.name}</b> <span className="muted">roles: {info.roles.join(", ")}</span></span>
            <button onClick={() => { tide.signIn(u); window.location.assign(HOME[u]); }}>Sign in as {u}</button>
          </div>
        ))}
      </div>
    </main>
  );
}
