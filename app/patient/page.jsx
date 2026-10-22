"use client";
import { useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import Shell from "../Shell";
import { useVault, TAG } from "@/lib/useVault";
import { SAMPLES } from "@/lib/samples";

export default function Patient() {
  const { doEncrypt, hasRealmRole, authenticated } = useTideCloak();
  const { data, error, setError, post } = useVault();
  const [title, setTitle] = useState(SAMPLES[0].title);
  const [text, setText] = useState(SAMPLES[0].text);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  if (!authenticated) return <Shell title="Patient"><p>Please log in.</p></Shell>;
  if (!hasRealmRole("patient")) return <Shell title="Patient"><p className="error">Patients only.</p></Shell>;

  async function upload() {
    setBusy(true); setError(""); setNotice("");
    try {
      // Encryption happens in the browser via the Tide network; the server only ever receives ciphertext.
      const [ciphertext] = await doEncrypt([{ data: text, tags: [TAG] }]);
      await post({ action: "upload", title, ciphertext });
      setNotice("Encrypted with TideCloak and uploaded. The server only holds ciphertext.");
    } catch (e) {
      setError(`Encryption failed: ${e?.message || e}`);
    }
    setBusy(false);
  }

  const pending = data?.requests?.filter((q) => q.status === "pending") || [];
  const others = data?.requests?.filter((q) => q.status !== "pending") || [];

  return (
    <Shell title="Patient">
      <div className="card">
        <h3>Upload a record</h3>
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="muted">Sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.title} className="secondary small" onClick={() => { setTitle(s.title); setText(s.text); }}>{s.title}</button>
          ))}
        </div>
        <label className="muted">Title (visible to staff)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="muted">Record contents (encrypted before it leaves your browser)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={busy || !text} onClick={upload}>{busy ? "Encrypting with Tide..." : "🔒 Encrypt & upload"}</button>
        {notice && <p className="ok">{notice}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>Access requests {pending.length > 0 && <span className="badge pending">{pending.length} waiting</span>}</h3>
        {!data?.requests?.length && <p className="muted">No requests yet. A doctor must request access before they can read anything.</p>}
        {[...pending, ...others].map((q) => (
          <div key={q.id} className="item">
            <span>Dr. <b>{q.doctor}</b> → <b>{q.title}</b> <span className={`badge ${q.status}`}>{q.status}</span></span>
            <span className="row">
              {q.status === "pending" && <>
                <button onClick={() => post({ action: "decide", requestId: q.id, approve: true })}>Approve</button>
                <button className="danger" onClick={() => post({ action: "decide", requestId: q.id, approve: false })}>Deny</button>
              </>}
              {q.status === "approved" && <button className="danger" onClick={() => post({ action: "decide", requestId: q.id, revoke: true })}>Revoke</button>}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>My records</h3>
        {!data?.records?.length && <p className="muted">None yet.</p>}
        {data?.records?.map((r) => (
          <div key={r.id} className="item"><span>🔒 <b>{r.title}</b></span><span className="muted">{new Date(r.createdAt).toLocaleString()}</span></div>
        ))}
      </div>

      <div className="card">
        <h3>Access log</h3>
        <p className="muted">Every upload, request, decision and read of your records.</p>
        {!data?.audit?.length && <p className="muted">Nothing yet.</p>}
        {data?.audit?.map((a, i) => (
          <div key={i} className="log"><span className="muted">{new Date(a.at).toLocaleString()}</span> <b>{a.actor}</b> ({a.role}) {a.event}</div>
        ))}
      </div>
    </Shell>
  );
}
