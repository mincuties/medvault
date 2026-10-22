import { withAuth } from "./middleware";

// Real mode: TideCloak JWT + DPoP verification (withAuth). Simulated mode: the user named in
// X-Sim-User, with the same claims shape a TideCloak token carries.
const SIM_ROLES = {
  patient: ["patient", "_tide_encryptor", "_tide_decryptor"],
  doctor: ["doctor", "_tide_decryptor"],
  hospitaladmin: ["hospital-admin"],
};

export function withMedVaultAuth(handler) {
  if (process.env.NEXT_PUBLIC_TIDE_MODE !== "simulated") return withAuth(handler);
  return async (req) => {
    const u = req.headers.get("x-sim-user");
    if (!SIM_ROLES[u]) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return handler(req, { preferred_username: u, tideuserkey: `sim-tideuserkey-${u}`, realm_access: { roles: SIM_ROLES[u] } });
  };
}
