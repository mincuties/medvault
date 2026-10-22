"use client";
import { useCallback, useEffect, useState } from "react";
import { useTide, secureFetch } from "./tide";

export const ROLES = ["patient", "doctor", "hospital-admin"];

export function roleOf(hasRealmRole) {
  return ROLES.find((r) => hasRealmRole(r));
}

export const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Loads this user's view of the store and exposes a POST helper.
export function useVault() {
  const { authenticated } = useTide();
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
