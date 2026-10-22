"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTideCloak } from "@tidecloak/nextjs";
import Shell from "./Shell";
import { roleOf } from "@/lib/useVault";

const HOME = { patient: "/patient", doctor: "/doctor", "hospital-admin": "/admin" };

export default function Home() {
  const { authenticated, isInitializing, login, hasRealmRole } = useTideCloak();
  const router = useRouter();
  const role = authenticated ? roleOf(hasRealmRole) : null;

  useEffect(() => { if (role) router.push(HOME[role]); }, [role, router]);

  return (
    <Shell>
      <div className="card">
        <h2>Your medical records open only when you say so.</h2>
        <p>Records are encrypted with keys held by the Tide network, not by this server.
          A doctor can read a record only after the patient approves. The hospital admin sees ciphertext.</p>
        {isInitializing ? <p>Loading...</p> : authenticated ? (
          role ? <p>Redirecting...</p> : <p className="error">Your account has no MedVault role (patient, doctor or hospital-admin).</p>
        ) : (
          <button onClick={() => login()}>Login with TideCloak</button>
        )}
      </div>
    </Shell>
  );
}
