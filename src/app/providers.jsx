"use client";
import { TideCloakProvider } from "@tidecloak/nextjs";
import tcConfig from "../../data/tidecloak.json";
import { SimTideProvider } from "@/lib/tideSim.jsx";
import { SIMULATED } from "@/lib/tide";

// useDPoP goes inside the config object: tokens are bound to a key held by this browser.
export default function Providers({ children }) {
  if (SIMULATED) {
    return (
      <SimTideProvider>
        <div className="sim-banner">Simulated TideCloak: sign-in, roles and Tide policy checks are simulated in this mode</div>
        {children}
      </SimTideProvider>
    );
  }
  return (
    <TideCloakProvider config={{ ...tcConfig, useDPoP: { mode: "strict", alg: "ES256" } }}>
      {children}
    </TideCloakProvider>
  );
}
