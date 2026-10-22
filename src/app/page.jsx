"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTideCloak } from "@tidecloak/nextjs";
import Link from "next/link";
import { roleOf } from "@/lib/useVault";

const HOME = { patient: "/patient", doctor: "/doctor", "hospital-admin": "/admin" };

export default function Home() {
  const { authenticated, isInitializing, login, logout, hasRealmRole } = useTideCloak();
  const router = useRouter();
  const role = authenticated ? roleOf(hasRealmRole) : null;

  useEffect(() => { if (role) router.push(HOME[role]); }, [role, router]);

  return (
    <main>
      <header><h1><Link href="/" className="brand">Med<span>Vault</span></Link></h1></header>
      <div className="card hero">
        <h2>Your medical record opens only for the doctor you approve.</h2>
        <p>Records are encrypted in your browser. The key is split across Tide&apos;s independent nodes, and they
          release a decryption only to the doctor named in a policy <b>you</b> signed, for that one record.
          The hospital admin runs the database and still sees only ciphertext.</p>
        {isInitializing ? <p className="muted">Loading...</p> : authenticated ? (
          role ? <p className="muted">Redirecting...</p> : <>
            <p className="error">Your account has no MedVault role (patient, doctor or hospital-admin).</p>
            <button className="secondary" onClick={() => logout()}>Log out</button>
          </>
        ) : (
          <button onClick={() => login()}>Login with TideCloak</button>
        )}
        <p className="muted small-print">Go to: <Link href="/patient">Patient</Link> · <Link href="/doctor">Doctor</Link> · <Link href="/admin">Hospital admin</Link></p>
      </div>
      <div className="grid3">
        <div className="card"><b>1 · Patient</b><p className="muted">Encrypts a record under a policy only they can open.</p></div>
        <div className="card"><b>2 · Doctor</b><p className="muted">Requests access. Reads only after the patient signs a grant.</p></div>
        <div className="card"><b>3 · Hospital admin</b><p className="muted">Holds the whole database, and still cannot decrypt.</p></div>
      </div>
      <div className="card">
        <h3>Where the key lives</h3>
        <div className="arch">
          <div className="box">Browser<small>encrypts / decrypts, signs grants in the Tide enclave</small></div>
          <div className="arrow">⇄</div>
          <div className="box">MedVault server<small>ciphertext + signed policies only. No key.</small></div>
          <div className="arrow">⇄</div>
          <div className="box tide">Tide network<small>20 independent nodes each hold a key share and check the patient&apos;s policy</small></div>
        </div>
      </div>
    </main>
  );
}
