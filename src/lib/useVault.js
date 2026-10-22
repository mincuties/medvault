"use client";
import { useCallback, useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import { IAMService } from "@tidecloak/js";
import tcConfig from "../../data/tidecloak.json";

export const ROLES = ["patient", "doctor", "hospital-admin"];

export function roleOf(hasRealmRole) {
  return ROLES.find((r) => hasRealmRole(r));
}

// secureFetch attaches the access token and a fresh DPoP proof, so a stolen token alone is useless.
export function secureFetch(url, init) {
  // The SDK builds the DPoP proof from a URL object, so a relative path must be made absolute first.
  return IAMService.secureFetch(new URL(url, window.location.origin).href, init);
}

// The realm's admin policy authorises signing a relationship policy. Fetched from TideCloak directly
// by the signer's browser, with the signer's own token.
export async function fetchAdminPolicy() {
  const base = tcConfig["auth-server-url"].replace(/\/$/, "");
  const res = await secureFetch(`${base}/admin/realms/${tcConfig.realm}/iga/role-policies/name/tide-realm-admin`);
  if (!res.ok) throw new Error(`Could not load the realm admin policy (${res.status})`);
  const { policy } = await res.json();
  return fromB64(policy);
}

export const vendorId = tcConfig.vendorId;

export const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Loads this user's view of the store and exposes a POST helper.
export function useVault() {
  const { authenticated } = useTideCloak();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await secureFetch("/api/store");
    if (res.ok) setData(await res.json());
    else setError(`Server said ${res.status}: ${(await res.json().catch(() => ({}))).error || ""}`);
  }, []);

  const post = useCallback(async (body) => {
    const res = await secureFetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError(`Server said ${res.status}: ${(await res.json().catch(() => ({}))).error || ""}`);
    await refresh();
    return res.ok;
  }, [refresh]);

  useEffect(() => { if (authenticated) refresh(); }, [authenticated, refresh]);
  return { data, error, setError, refresh, post };
}

// A refusal by the Tide network arrives as a threshold failure; the contract's reason is in `cause`.
export function tideError(e) {
  const cause = e?.cause?.message || e?.cause || "";
  return `${e?.message || e}${cause ? ` (${cause})` : ""}`;
}
