"use client";
import { useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import Shell from "../Shell";
import { useVault, TAG } from "@/lib/useVault";

export default function Doctor() {
  const { doDecrypt, hasRealmRole, authenticated } = useTideCloak();
  const { data, error, setError, post } = useVault();
  const [plain, setPlain] = useState({});

  if (!authenticated) return <Shell title="Doctor"><p>Please log in.</p></Shell>;
  if (!hasRealmRole("doctor")) return <Shell title="Doctor"><p className="error">Doctors only.</p></Shell>;

  async function read(r) {
    setError("");
    try {
      const [text] = await doDecrypt([{ encrypted: r.ciphertext, tags: [TAG] }]);
      setPlain((p) => ({ ...p, [r.id]: text }));
      post({ action: "viewed", recordId: r.id });
    } catch (e) {
      setError(`Decryption refused: ${e?.message || e}`);
    }
  }

  return (
    <Shell title="Doctor">
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>Patient records</h3>
        {!data?.records?.length && <p className="muted">No records yet.</p>}
        {data?.records?.map((r) => (
          <div key={r.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span><b>{r.title}</b> · patient {r.patient} <span className={`badge ${r.status}`}>{r.status === "none" ? "no access" : r.status}</span></span>
              {["none", "denied", "revoked"].includes(r.status) && <button onClick={() => post({ action: "request", recordId: r.id })}>Request access</button>}
              {r.status === "pending" && <span className="muted">Waiting for patient approval</span>}
              {r.status === "approved" && !plain[r.id] && <button onClick={() => read(r)}>Decrypt & read</button>}
            </div>
            {plain[r.id] && <div className="plain" style={{ marginTop: 10 }}>{plain[r.id]}</div>}
          </div>
        ))}
      </div>
    </Shell>
  );
}
