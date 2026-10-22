"use client";
import { useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import Shell from "../Shell";
import { useVault, TAG } from "@/lib/useVault";

export default function Admin() {
  const { doDecrypt, hasRealmRole, authenticated } = useTideCloak();
  const { data } = useVault();
  const [result, setResult] = useState({});

  if (!authenticated) return <Shell title="Hospital admin"><p>Please log in.</p></Shell>;
  if (!hasRealmRole("hospital-admin")) return <Shell title="Hospital admin"><p className="error">Hospital admins only.</p></Shell>;

  async function tryDecrypt(r) {
    try {
      const [text] = await doDecrypt([{ encrypted: r.ciphertext, tags: [TAG] }]);
      setResult((x) => ({ ...x, [r.id]: { ok: true, text } }));
    } catch (e) {
      setResult((x) => ({ ...x, [r.id]: { ok: false, text: `Decryption refused by the Tide network: ${e?.message || e}` } }));
    }
  }

  return (
    <Shell title="Hospital admin">
      <div className="card">
        <h3>Everything stored on the hospital server</h3>
        <p className="muted">The admin runs the database and sees every row, but it only holds ciphertext. No key exists on this server.</p>
        {!data?.records?.length && <p className="muted">No records yet.</p>}
        {data?.records?.map((r) => (
          <div key={r.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span><b>{r.title}</b> · patient {r.patient}</span>
              <button className="danger" onClick={() => tryDecrypt(r)}>Try to decrypt</button>
            </div>
            <pre>{typeof r.ciphertext === "string" ? r.ciphertext : JSON.stringify(r.ciphertext)}</pre>
            {result[r.id] && <p className={result[r.id].ok ? "plain" : "error"}>{result[r.id].text}</p>}
          </div>
        ))}
      </div>
    </Shell>
  );
}
