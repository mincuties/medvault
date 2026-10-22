"use client";
import { useCallback, useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

export const TAG = "medical";

export function roleOf(hasRealmRole) {
  return ["patient", "doctor", "hospital-admin"].find((r) => hasRealmRole(r));
}

// Loads this user's view of the store and exposes a POST helper.
export function useVault() {
  const { token, authenticated } = useTideCloak();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/store", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setData(await res.json());
    else setError(`Server said ${res.status}`);
  }, [token]);

  const post = useCallback(async (body) => {
    const res = await fetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError(`Server said ${res.status}`);
    await refresh();
  }, [token, refresh]);

  useEffect(() => { if (authenticated) refresh(); }, [authenticated, refresh]);
  return { data, error, setError, refresh, post };
}
