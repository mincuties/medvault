"use client";
// SIMULATED TideCloak + Tide network, for demos when the real Tide network is unavailable
// (allowed by the hackathon organisers). It mirrors the real calls: sign-in, realm roles,
// doEncrypt/doDecrypt gated by a signed per-record policy (RelationshipAttestation:1 rules).
// The "network key" lives in this browser's storage, standing in for Tide's key shares; the
// MedVault server never sees it, exactly like the real design.
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export const SIM_USERS = {
  patient: { roles: ["patient", "_tide_encryptor", "_tide_decryptor"], name: "Pat Nguyen" },
  doctor: { roles: ["doctor", "_tide_decryptor"], name: "Dr. Dana Tran" },
  hospitaladmin: { roles: ["hospital-admin"], name: "Alex Le (hospital admin)" },
};
const keyOf = (u) => `sim-tideuserkey-${u}`;
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

class TideRefusal extends Error {
  constructor(reason) {
    super("policy check failed on the (simulated) ORKs");
    this.cause = reason;
  }
}

async function networkSecret() {
  let s = localStorage.getItem("sim-tide-network-secret");
  if (!s) { s = b64(crypto.getRandomValues(new Uint8Array(32))); localStorage.setItem("sim-tide-network-secret", s); }
  return unb64(s);
}
async function hmacKey() {
  return crypto.subtle.importKey("raw", await networkSecret(), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function recordKey(recordId) {
  const base = await crypto.subtle.importKey("raw", await networkSecret(), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: enc.encode("medvault-sim"), info: enc.encode(recordId) },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// Sign a grant as the network would after the signer approves it in the enclave.
export async function simSignPolicy(signer, { subject, recordId, access, expiry }) {
  if (!SIM_USERS[signer]?.roles.includes("patient")) throw new TideRefusal("only the record owner can sign a grant");
  const roles = access === "read" ? ["_tide_decryptor"] : access === "write" ? ["_tide_encryptor"] : ["_tide_encryptor", "_tide_decryptor"];
  const payload = JSON.stringify({ contractId: "RelationshipAttestation:1", subjectType: "User", subjectId: subject.id, assignmentId: recordId, roles, expiry: expiry || null });
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload));
  return btoa(JSON.stringify({ payload, sig: b64(sig) }));
}

// The checks RelationshipAttestation:1 runs on every ORK.
async function check(user, items, policyBytes, needRole) {
  if (!policyBytes) throw new TideRefusal("no policy supplied for this record");
  const { payload, sig } = JSON.parse(dec.decode(policyBytes)); // bytes of the signed JSON
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(), unb64(sig), enc.encode(payload));
  if (!ok) throw new TideRefusal("policy signature is invalid");
  const p = JSON.parse(payload);
  if (p.expiry && p.expiry < Date.now() / 1000) throw new TideRefusal("policy has expired");
  if (p.subjectId !== keyOf(user)) throw new TideRefusal("subjectId does not match.");
  if (!SIM_USERS[user].roles.includes(needRole)) throw new TideRefusal(`'${needRole}' role not found for this request.`);
  if (!p.roles.includes(needRole)) throw new TideRefusal(`${needRole} not found in list of roles.`);
  for (const it of items) if (it.tags.length !== 1 || it.tags[0] !== p.assignmentId) throw new TideRefusal("Tags do not contain assignmentId.");
}

const Ctx = createContext(null);

export function SimTideProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setInit] = useState(true);
  useEffect(() => { setUser(localStorage.getItem("sim-user")); setInit(false); }, []);

  const login = useCallback(() => { window.location.assign("/sim-login"); }, []);
  const logout = useCallback(() => { localStorage.removeItem("sim-user"); setUser(null); window.location.assign("/"); }, []);
  const hasRealmRole = useCallback((r) => !!user && SIM_USERS[user].roles.includes(r), [user]);
  const claim = useCallback((k) => (k === "preferred_username" ? user : k === "tideuserkey" ? keyOf(user) : undefined), [user]);

  const doEncrypt = useCallback(async (items, policy) => {
    await check(user, items, policy, "_tide_encryptor");
    return Promise.all(items.map(async (it) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await recordKey(it.tags[0]), enc.encode(it.data));
      return "sim:" + b64([...iv, ...new Uint8Array(ct)]);
    }));
  }, [user]);

  const doDecrypt = useCallback(async (items, policy) => {
    await check(user, items, policy, "_tide_decryptor");
    return Promise.all(items.map(async (it) => {
      const raw = unb64(it.encrypted.slice(4));
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, await recordKey(it.tags[0]), raw.slice(12));
      return dec.decode(pt);
    }));
  }, [user]);

  const value = {
    simulated: true, user, authenticated: !!user, isInitializing, login, logout, hasRealmRole,
    getValueFromToken: claim, getValueFromIdToken: claim, doEncrypt, doDecrypt,
    signIn: (u) => { localStorage.setItem("sim-user", u); setUser(u); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSimTide = () => useContext(Ctx);
