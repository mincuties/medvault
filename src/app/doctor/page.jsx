"use client";
import { useState } from "react";
import { useTide } from "@/lib/tide";
import Shell from "../Shell";
import { useVault, fromB64, tideError } from "@/lib/useVault";

export default function Doctor() {
  const { doDecrypt, hasRealmRole, authenticated } = useTide();
  const { data, error, setError, post } = useVault();
  const [plain, setPlain] = useState({});
  const [busy, setBusy] = useState("");

  if (authenticated && !hasRealmRole("doctor")) return <Shell title="Doctor"><p className="error">Doctors only.</p></Shell>;

  async function read(r) {
    setError(""); setBusy(r.id);
    try {
      // The Tide network checks the patient-signed policy: this doctor's key, this record, read access.
      const [out] = await doDecrypt([{ encrypted: r.ciphertext, tags: [r.id] }], fromB64(r.policy));
      setPlain((p) => ({ ...p, [r.id]: typeof out === "string" ? out : new TextDecoder().decode(out) }));
      post({ action: "viewed", recordId: r.id });
    } catch (e) {
      setError(`Decryption refused: ${tideError(e)}`);
    }
    setBusy("");
  }

  return (
    <Shell title="Doctor">
      {error && <p className="error banner">{error}</p>}
      <div className="card">
        <h3>Patient records</h3>
        <p className="muted">You see titles only. To read one, ask the patient; they sign a grant for you in Tide.</p>
        {!data?.records?.length && <p className="muted">No records yet.</p>}
        {data?.records?.map((r) => (
          <div key={r.id} className="card inner">
            <div className="item">
              <span><b>{r.title}</b> · patient {r.patient} <span className={`badge ${r.status}`}>{r.status === "none" ? "no access" : r.status}</span></span>
              <span className="row">
                {["none", "denied", "revoked"].includes(r.status) && <button onClick={() => post({ action: "request", recordId: r.id })}>Request access</button>}
                {r.status === "pending" && <span className="muted">Waiting for the patient</span>}
                {r.status === "approved" && !plain[r.id] && <button disabled={!!busy} onClick={() => read(r)}>{busy === r.id ? "Decrypting..." : "🔓 Decrypt & read"}</button>}
              </span>
            </div>
            {plain[r.id] && <div className="plain">{plain[r.id]}</div>}
          </div>
        ))}
      </div>
    </Shell>
  );
}
