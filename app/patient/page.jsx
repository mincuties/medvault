"use client";
import { useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import Shell from "../Shell";
import { useVault, TAG } from "@/lib/useVault";

export default function Patient() {
  const { doEncrypt, hasRealmRole, authenticated } = useTideCloak();
  const { data, error, setError, post } = useVault();
  const [title, setTitle] = useState("Blood test 2026");
  const [text, setText] = useState("Diagnosis: HIV positive, viral load undetectable.\nMedication: Biktarvy daily.\nNotes: synthetic demo data.");
  const [busy, setBusy] = useState(false);

  if (!authenticated) return <Shell title="Patient"><p>Please log in.</p></Shell>;
  if (!hasRealmRole("patient")) return <Shell title="Patient"><p className="error">Patients only.</p></Shell>;

  async function upload() {
    setBusy(true); setError("");
    try {
      // Encryption happens in the browser via the Tide network; the server only ever receives ciphertext.
      const [ciphertext] = await doEncrypt([{ data: text, tags: [TAG] }]);
      await post({ action: "upload", title, ciphertext });
    } catch (e) {
      setError(`Encryption failed: ${e?.message || e}`);
    }
    setBusy(false);
  }

  return (
    <Shell title="Patient">
      <div className="card">
        <h3>Upload a record</h3>
        <label className="muted">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="muted">Record contents (encrypted before it leaves your browser)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={busy} onClick={upload}>{busy ? "Encrypting..." : "Encrypt & upload"}</button>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>Access requests</h3>
        {!data?.requests?.length && <p className="muted">No requests yet.</p>}
        {data?.requests?.map((q) => (
          <div key={q.id} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
            <span>Dr. <b>{q.doctor}</b> wants to read <b>{q.title}</b> <span className={`badge ${q.status}`}>{q.status}</span></span>
            {q.status === "pending" && (
              <span className="row">
                <button onClick={() => post({ action: "decide", requestId: q.id, approve: true })}>Approve</button>
                <button className="danger" onClick={() => post({ action: "decide", requestId: q.id, approve: false })}>Deny</button>
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3>My records</h3>
        {!data?.records?.length && <p className="muted">None yet.</p>}
        {data?.records?.map((r) => (
          <div key={r.id}><b>{r.title}</b> <span className="muted">{new Date(r.createdAt).toLocaleString()}</span></div>
        ))}
      </div>
    </Shell>
  );
}
