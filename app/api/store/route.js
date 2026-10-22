import { NextResponse } from "next/server";
import { verifyTideCloakToken } from "@tidecloak/nextjs/server";
import config from "@/tidecloak.json";
import { load, save } from "@/lib/db";

async function whoAmI(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!token) return null;
  const payload = await verifyTideCloakToken(config, token, []);
  if (!payload) return null;
  const roles = payload.realm_access?.roles || [];
  const role = ["patient", "doctor", "hospital-admin"].find((r) => roles.includes(r));
  return { user: payload.preferred_username, role };
}

export async function GET(req) {
  const me = await whoAmI(req);
  if (!me?.role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = load();
  if (me.role === "patient") {
    return NextResponse.json({
      records: db.records.filter((r) => r.patient === me.user),
      requests: db.requests.filter((q) => q.patient === me.user),
      audit: (db.audit || []).filter((a) => a.patient === me.user),
    });
  }
  if (me.role === "doctor") {
    // Doctors see metadata of all records, but ciphertext only for approved ones.
    const mine = db.requests.filter((q) => q.doctor === me.user);
    return NextResponse.json({
      records: db.records.map((r) => {
        const req = mine.find((q) => q.recordId === r.id);
        return {
          id: r.id, patient: r.patient, title: r.title, createdAt: r.createdAt,
          status: req?.status || "none",
          ciphertext: req?.status === "approved" ? r.ciphertext : undefined,
        };
      }),
    });
  }
  // hospital-admin: sees everything stored on the server, which is only ciphertext.
  return NextResponse.json(db);
}

export async function POST(req) {
  const me = await whoAmI(req);
  if (!me?.role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = load();
  const id = () => Math.random().toString(36).slice(2, 10);
  db.audit ||= [];
  const log = (patient, event) => db.audit.unshift({ at: new Date().toISOString(), actor: me.user, role: me.role, patient, event });

  if (body.action === "upload" && me.role === "patient") {
    if (typeof body.ciphertext !== "string" || !body.ciphertext) {
      return NextResponse.json({ error: "ciphertext required" }, { status: 400 });
    }
    db.records.push({
      id: id(), patient: me.user, title: String(body.title || "Untitled").slice(0, 120),
      ciphertext: body.ciphertext, createdAt: new Date().toISOString(),
    });
    log(me.user, `uploaded encrypted record "${body.title}"`);
  } else if (body.action === "request" && me.role === "doctor") {
    const rec = db.records.find((r) => r.id === body.recordId);
    if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
    const existing = db.requests.find((q) => q.recordId === rec.id && q.doctor === me.user);
    if (existing && existing.status === "pending") return NextResponse.json({ ok: true });
    if (existing) existing.status = "pending";
    else db.requests.push({ id: id(), recordId: rec.id, title: rec.title, patient: rec.patient, doctor: me.user, status: "pending" });
    log(rec.patient, `requested access to "${rec.title}"`);
  } else if (body.action === "decide" && me.role === "patient") {
    const q = db.requests.find((x) => x.id === body.requestId && x.patient === me.user);
    if (!q) return NextResponse.json({ error: "not found" }, { status: 404 });
    q.status = body.approve ? "approved" : body.revoke ? "revoked" : "denied";
    log(me.user, `${q.status} Dr. ${q.doctor} for "${q.title}"`);
  } else if (body.action === "viewed" && me.role === "doctor") {
    const q = db.requests.find((x) => x.recordId === body.recordId && x.doctor === me.user && x.status === "approved");
    if (!q) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    log(q.patient, `decrypted and read "${q.title}"`);
  } else {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  save(db);
  return NextResponse.json({ ok: true });
}
