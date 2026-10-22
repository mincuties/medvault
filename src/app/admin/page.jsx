"use client";
import { useState } from "react";
import { useTide } from "@/lib/tide";
import Shell from "../Shell";
import { useVault, fromB64, tideError } from "@/lib/useVault";

export default function Admin() {
  const { doDecrypt, hasRealmRole, authenticated } = useTide();
  const { data, post } = useVault();
  const [result, setResult] = useState({});

  if (authenticated && !hasRealmRole("hospital-admin")) return <Shell title="Hospital admin"><p className="error">Hospital admins only.</p></Shell>;

  async function tryDecrypt(r) {
    setResult((x) => ({ ...x, [r.id]: { ok: false, text: "Asking the Tide network..." } }));
    // The admin has the whole database, including the policies the patient signed. Try the doctor's one.
    const stolen = data.policies.find((p) => p.recordId === r.id && p.access === "read") || data.policies.find((p) => p.recordId === r.id);
    try {
      const [out] = await doDecrypt([{ encrypted: r.ciphertext, tags: [r.id] }], stolen ? fromB64(stolen.policy) : undefined);
      setResult((x) => ({ ...x, [r.id]: { ok: true, text: typeof out === "string" ? out : new TextDecoder().decode(out) } }));
    } catch (e) {
      setResult((x) => ({ ...x, [r.id]: { ok: false, text: `Refused by the Tide network: ${tideError(e)}` } }));
      post({ action: "attempt", recordId: r.id });
    }
  }

  return (
    <Shell title="Hospital admin">
      <div className="card">
        <h3>Everything stored on the hospital server</h3>
        <p className="muted">You run the database and can read every row, including the signed policies. No key exists here.
          &quot;Try to decrypt&quot; even replays the doctor&apos;s policy from the database.</p>
        {!data?.records?.length && <p className="muted">No records yet.</p>}
        {data?.records?.map((r) => (
          <div key={r.id} className="card inner">
            <div className="item">
              <span><b>{r.title}</b> · patient {r.patient}</span>
              <button className="danger" onClick={() => tryDecrypt(r)}>Try to decrypt</button>
            </div>
            <pre>{r.ciphertext}</pre>
            {result[r.id] && <p className={result[r.id].ok ? "plain" : "error"}>{result[r.id].text}</p>}
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Access requests (metadata only)</h3>
        {!data?.requests?.length && <p className="muted">None.</p>}
        {data?.requests?.map((q) => (
          <div key={q.id} className="item"><span>Dr. {q.doctor} → {q.patient}: {q.title}</span><span className={`badge ${q.status}`}>{q.status}</span></div>
        ))}
      </div>
      <div className="card">
        <h3>Audit log</h3>
        {!data?.audit?.length && <p className="muted">Nothing yet.</p>}
        {data?.audit?.map((a, i) => (
          <div key={i} className="log"><span className="muted">{new Date(a.at).toLocaleString()}</span> <b>{a.actor}</b> ({a.role}) {a.event}</div>
        ))}
      </div>
    </Shell>
  );
}
