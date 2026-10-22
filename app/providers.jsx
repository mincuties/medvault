"use client";
import { TideCloakProvider } from "@tidecloak/nextjs";
import config from "@/tidecloak.json";

export default function Providers({ children }) {
  return <TideCloakProvider config={config}>{children}</TideCloakProvider>;
}
