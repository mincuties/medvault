"use client";
// One interface for the pages, backed by real TideCloak or by the simulation
// (NEXT_PUBLIC_TIDE_MODE=simulated). Both expose the same calls the real Tide SDK has.
import { useTideCloak } from "@tidecloak/nextjs";
import { IAMService } from "@tidecloak/js";
import { useSimTide, simSignPolicy } from "./tideSim.jsx";
import { signRelationshipPolicy } from "./tide/relationship";
import tcConfig from "../../data/tidecloak.json";

export const SIMULATED = process.env.NEXT_PUBLIC_TIDE_MODE === "simulated";

export function useTide() {
  // The mode is fixed at build time, so the hook order never changes between renders.
  return SIMULATED ? useSimTide() : useTideCloak(); // eslint-disable-line react-hooks/rules-of-hooks
}

// secureFetch attaches the access token and a fresh DPoP proof, so a stolen token alone is useless.
export function secureFetch(url, init = {}) {
  const abs = new URL(url, window.location.origin).href;
  if (SIMULATED) {
    return fetch(abs, { ...init, headers: { ...(init.headers || {}), "X-Sim-User": localStorage.getItem("sim-user") || "" } });
  }
  // The SDK builds the DPoP proof from a URL object, so the path must be absolute.
  return IAMService.secureFetch(abs, init);
}

const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// The realm's admin policy authorises signing a relationship policy. Fetched from TideCloak directly
// by the signer's browser, with the signer's own token.
async function fetchAdminPolicy() {
  const base = tcConfig["auth-server-url"].replace(/\/$/, "");
  const res = await secureFetch(`${base}/admin/realms/${tcConfig.realm}/iga/role-policies/name/tide-realm-admin`);
  if (!res.ok) throw new Error(`Could not load the realm admin policy (${res.status})`);
  return fromB64((await res.json()).policy);
}

// Sign a RelationshipAttestation:1 grant for one subject and one record. Real mode opens the Tide enclave.
export async function signGrant(grant) {
  if (SIMULATED) return simSignPolicy(localStorage.getItem("sim-user"), grant);
  return signRelationshipPolicy({ vendorId: tcConfig.vendorId, ...grant }, await fetchAdminPolicy());
}
