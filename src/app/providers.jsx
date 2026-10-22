"use client";
import { TideCloakProvider } from "@tidecloak/nextjs";
import tcConfig from "../../data/tidecloak.json";

// useDPoP goes inside the config object: tokens are bound to a key held by this browser.
export default function Providers({ children }) {
  return (
    <TideCloakProvider config={{ ...tcConfig, useDPoP: { mode: "strict", alg: "ES256" } }}>
      {children}
    </TideCloakProvider>
  );
}
