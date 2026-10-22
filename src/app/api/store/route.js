import { withAuth } from "@/lib/auth/middleware";
import { load, save } from "@/lib/db";

// Every call is verified: TideCloak JWT signature, expiry, and the DPoP proof binding it to the caller.
function who(jwt) {
  const roles = jwt.realm_access?.roles || [];
  const role = ["patient", "doctor", "hospital-admin"].find((r) => roles.includes(r));
  return { user: jwt.preferred_username, key: jwt.tideuserkey || "", role };
}

function remember(db, me) {
  db.users[me.user] = { role: me.role, key: me.key };
}

export const GET = withAuth(async (_req, jwt) => {
  const me = who(jwt);
  if (!me.role) return Response.json({ error: "no MedVault role" }, { status: 403 });
  const db = load();
  remember(db, me);
  save(db);

  if (me.role === "patient") {
    return Response.json({
      records: db.records.filter((r) => r.patient === me.user),
      requests: db.requests.filter((q) => q.patient === me.user),
      // The patient's own read-write policy for each record, needed to encrypt and to re-open it.
      policies: db.policies.filter((p) => p.subject === me.user),
      audit: db.audit.filter((a) => a.patient === me.user),
    });
  }
  if (me.role === "doctor") {
    const mine = db.requests.filter((q) => q.doctor === me.user);
    return Response.json({
      records: db.records.map((r) => {
        const req = mine.find((q) => q.recordId === r.id);
        const pol = db.policies.find((p) => p.recordId === r.id && p.subject === me.user);
        const approved = req?.status === "approved" && pol;
        return {
          id: r.id, patient: r.patient, title: r.title, createdAt: r.createdAt,
          status: req?.status || "none",
          ciphertext: approved ? r.ciphertext : undefined,
          policy: approved ? pol.policy : undefined,
        };
      }),
    });
  }
  // hospital-admin runs the database and sees everything in it: ciphertext and signed policies.
  return Response.json(db);
});

export const POST = withAuth(async (req, jwt) => {
  const me = who(jwt);
  if (!me.role) return Response.json({ error: "no MedVault role" }, { status: 403 });
  const body = await req.json();
  const db = load();
  remember(db, me);
  const log = (patient, event) => db.audit.unshift({ at: new Date().toISOString(), actor: me.user, role: me.role, patient, event });
  const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

  if (body.action === "upload" && me.role === "patient") {
    const { id, title, ciphertext, policy } = body;
    if (!/^[a-z0-9-]{8,64}$/.test(id || "")) return bad("bad record id");
    if (typeof ciphertext !== "string" || !ciphertext) return bad("ciphertext required");
    if (typeof policy !== "string" || !policy) return bad("signed policy required");
    if (db.records.some((r) => r.id === id)) return bad("duplicate id");
    const t = String(title || "Untitled").slice(0, 120);
    db.records.push({ id, patient: me.user, title: t, ciphertext, createdAt: new Date().toISOString() });
    db.policies.push({ recordId: id, subject: me.user, access: "read-write", policy, grantedBy: me.user, at: new Date().toISOString() });
    log(me.user, `encrypted and uploaded "${t}"`);
  } else if (body.action === "request" && me.role === "doctor") {
    const rec = db.records.find((r) => r.id === body.recordId);
    if (!rec) return bad("not found", 404);
    if (!me.key) return bad("your Tide account has no key yet; sign in again");
    const existing = db.requests.find((q) => q.recordId === rec.id && q.doctor === me.user);
    if (existing?.status === "pending") return Response.json({ ok: true });
    if (existing) Object.assign(existing, { status: "pending", doctorKey: me.key });
    else db.requests.push({ id: crypto.randomUUID(), recordId: rec.id, title: rec.title, patient: rec.patient, doctor: me.user, doctorKey: me.key, status: "pending" });
    log(rec.patient, `requested access to "${rec.title}"`);
  } else if (body.action === "decide" && me.role === "patient") {
    const q = db.requests.find((x) => x.id === body.requestId && x.patient === me.user);
    if (!q) return bad("not found", 404);
    if (body.approve) {
      // The grant itself is the policy the patient signed in the Tide enclave for this doctor and record.
      if (typeof body.policy !== "string" || !body.policy) return bad("signed policy required");
      db.policies = db.policies.filter((p) => !(p.recordId === q.recordId && p.subject === q.doctor));
      db.policies.push({ recordId: q.recordId, subject: q.doctor, access: "read", policy: body.policy, grantedBy: me.user, at: new Date().toISOString(), expiry: body.expiry });
      q.status = "approved";
    } else {
      db.policies = db.policies.filter((p) => !(p.recordId === q.recordId && p.subject === q.doctor));
      q.status = body.revoke ? "revoked" : "denied";
    }
    log(me.user, `${q.status} Dr. ${q.doctor} for "${q.title}"`);
  } else if (body.action === "viewed" && me.role === "doctor") {
    const q = db.requests.find((x) => x.recordId === body.recordId && x.doctor === me.user && x.status === "approved");
    if (!q) return bad("forbidden", 403);
    log(q.patient, `decrypted and read "${q.title}"`);
  } else if (body.action === "attempt" && me.role === "hospital-admin") {
    const rec = db.records.find((r) => r.id === body.recordId);
    if (!rec) return bad("not found", 404);
    log(rec.patient, `tried to decrypt "${rec.title}" and was refused by the Tide network`);
  } else {
    return bad("forbidden", 403);
  }
  save(db);
  return Response.json({ ok: true });
});
