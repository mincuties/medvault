# MedVault: how it works

```
 Patient browser            MedVault server (Next.js)         Tide network (20 independent ORKs)
 ───────────────            ─────────────────────────         ──────────────────────────────────
 1. sign policy P(patient, record, read-write) ─────────────────▶ enclave approval, threshold-signed
 2. doEncrypt(record, tag=recordId, P) ─────────────────────────▶ key shares encrypt; no node has the key
 3. POST ciphertext + P ────────▶ stores ciphertext + P only
                                    (never plaintext, no key)
 Doctor browser
 4. POST request ───────────────▶ request(pending, doctor's tideuserkey)
 Patient browser
 5. sign policy G(doctor key, record, read, 24h) ───────────────▶ enclave approval, threshold-signed
 6. POST approve + G ───────────▶ stores G
 Doctor browser
 7. GET ciphertext + G ◀────────
 8. doDecrypt(ciphertext, tag=recordId, G) ─────────────────────▶ each ORK checks: caller key == G.subject,
                                                                   tag == G.record, caller has _tide_decryptor,
                                                                   G grants read, G not expired → plaintext
 Hospital admin browser
 9. GET whole DB (ciphertext, P, G) ◀──
10. doDecrypt(ciphertext, G) ───────────────────────────────────▶ refused: not G's subject, no _tide_decryptor
```

## Who can do what

| Actor | Has | Can read a record? |
|---|---|---|
| Patient | `patient`, `_tide_encryptor`, `_tide_decryptor`; a read-write policy per own record | Yes, own records |
| Doctor | `doctor`, `_tide_decryptor`; a read policy only after the patient signs one | Only granted records, until expiry |
| Hospital admin | `hospital-admin`; the entire database file | No. Has ciphertext and policies, but the network refuses |
| MedVault server | ciphertext, signed policies, audit log | No key exists here |

## Where each check happens

- **Tide network (cryptographic):** who may decrypt which record. Enforced by `RelationshipAttestation:1` on every ORK.
- **TideCloak IGA (governance):** realm roles and admin changes go through change requests; `tide-realm-admin` authority is needed to sign a policy.
- **MedVault server (application):** verifies the TideCloak JWT and DPoP proof on every call, decides which rows each role sees, records the audit log.

## Code map

| File | What it does |
|---|---|
| `src/app/patient/page.jsx` | upload (sign policy → encrypt), approve (sign grant for doctor), revoke, open own record |
| `src/app/doctor/page.jsx` | request access, decrypt with the patient's grant |
| `src/app/admin/page.jsx` | shows the raw database, tries to decrypt with a policy taken from it |
| `src/app/api/store/route.js` | JWT + DPoP verified API, JSON store, audit log |
| `src/lib/tide/relationship.ts` | Tide's helper to build and sign `RelationshipAttestation:1` policies |
| `scripts/init-tidecloak.sh` | Tide's bootstrap script, extended with MedVault roles and three users |
