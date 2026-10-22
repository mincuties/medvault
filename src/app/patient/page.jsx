"use client";
import { useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import Shell from "../Shell";
import { useVault, fetchAdminPolicy, vendorId, fromB64, tideError } from "@/lib/useVault";
import { signRelationshipPolicy } from "@/lib/tide/relationship";
import { SAMPLES } from "@/lib/samples";

const DAY = 24 * 60 * 60;

export default function Patient() {
  const { doEncrypt, doDecrypt, hasRealmRole, authenticated, getValueFromToken } = useTideCloak();
  const { data, error, setError, post } = useVault();
  const [title, setTitle] = useState(SAMPLES[0].title);
  const [text, setText] = useState(SAMPLES[0].text);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [opened, setOpened] = useState({});

  if (authenticated && !hasRealmRole("patient")) return <Shell title="Patient"><p className="error">Patients only.</p></Shell>;

  async function upload() {
    setBusy("upload"); setError(""); setNotice("");
    try {
      const id = crypto.randomUUID();
      // 1. Sign a policy that lets ME read and write this one record. Approve it in the Tide window.
      const policy = await signRelationshipPolicy(
        { vendorId, subject: { type: "User", id: getValueFromToken("tideuserkey") }, recordId: id, access: "read-write" },
        await fetchAdminPolicy(),
      );
      // 2. Encrypt in the browser under that policy. The record id is the only tag.
      const [ciphertext] = await doEncrypt([{ data: text, tags: [id] }], fromB64(policy));
      // 3. The server receives ciphertext and the signed policy, never the plaintext.
      if (await post({ action: "upload", id, title, ciphertext, policy })) {
        setNotice("Encrypted by the Tide network and uploaded. The server only holds ciphertext.");
      }
    } catch (e) {
      setError(`Upload failed: ${tideError(e)}`);
    }
    setBusy("");
  }

  async function approve(q) {
    setBusy(q.id); setError("");
    try {
      // The grant: a policy naming this doctor's Tide key and this record, read-only, for 24 hours.
      // The Tide network enforces it on every decryption; the hospital cannot forge or widen it.
      const expiry = Math.floor(Date.now() / 1000) + DAY;
      const policy = await signRelationshipPolicy(
        { vendorId, subject: { type: "User", id: q.doctorKey }, recordId: q.recordId, access: "read", expiry },
        await fetchAdminPolicy(),
      );
      await post({ action: "decide", requestId: q.id, approve: true, policy, expiry });
    } catch (e) {
      setError(`Approval failed: ${tideError(e)}`);
    }
    setBusy("");
  }

  async function open(r) {
    setError("");
    try {
      const mine = data.policies.find((p) => p.recordId === r.id);
      const [plain] = await doDecrypt([{ encrypted: r.ciphertext, tags: [r.id] }], fromB64(mine.policy));
      setOpened((o) => ({ ...o, [r.id]: typeof plain === "string" ? plain : new TextDecoder().decode(plain) }));
    } catch (e) {
      setError(`Could not open: ${tideError(e)}`);
    }
  }

  const reqs = data?.requests || [];
  const pending = reqs.filter((q) => q.status === "pending");
  const sorted = [...pending, ...reqs.filter((q) => q.status !== "pending")];

  return (
    <Shell title="Patient">
      {error && <p className="error banner">{error}</p>}

      <div className="card">
        <h3>Access requests {pending.length > 0 && <span className="badge pending">{pending.length} waiting</span>}</h3>
        {!reqs.length && <p className="muted">No requests yet. A doctor must ask before they can read anything.</p>}
        {sorted.map((q) => (
          <div key={q.id} className="item">
            <span>Dr. <b>{q.doctor}</b> → <b>{q.title}</b> <span className={`badge ${q.status}`}>{q.status}</span></span>
            <span className="row">
              {q.status === "pending" && <>
                <button disabled={!!busy} onClick={() => approve(q)}>{busy === q.id ? "Sign in Tide window..." : "Approve (sign grant)"}</button>
                <button className="danger" disabled={!!busy} onClick={() => post({ action: "decide", requestId: q.id, approve: false })}>Deny</button>
              </>}
              {q.status === "approved" && <button className="danger" onClick={() => post({ action: "decide", requestId: q.id, revoke: true })}>Revoke</button>}
            </span>
          </div>
        ))}
        <p className="muted small-print">Approving opens a Tide window where you sign a policy for that doctor and that record only (read-only, 24 hours).</p>
      </div>

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
        <button disabled={!!busy || !text} onClick={upload}>{busy === "upload" ? "Sign in Tide window, then encrypting..." : "🔒 Encrypt & upload"}</button>
        {notice && <p className="ok">{notice}</p>}
      </div>

      <div className="card">
        <h3>My records</h3>
        {!data?.records?.length && <p className="muted">None yet.</p>}
        {data?.records?.map((r) => (
          <div key={r.id}>
            <div className="item">
              <span>🔒 <b>{r.title}</b> <span className="muted">{new Date(r.createdAt).toLocaleString()}</span></span>
              {!opened[r.id] && <button className="secondary small" onClick={() => open(r)}>Open</button>}
            </div>
            {opened[r.id] && <div className="plain">{opened[r.id]}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Access log</h3>
        {!data?.audit?.length && <p className="muted">Nothing yet.</p>}
        {data?.audit?.map((a, i) => (
          <div key={i} className="log"><span className="muted">{new Date(a.at).toLocaleString()}</span> <b>{a.actor}</b> ({a.role}) {a.event}</div>
        ))}
      </div>
    </Shell>
  );
}
