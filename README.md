# MedVault

[![Built with TideCloak](https://img.shields.io/badge/Built%20with-TideCloak-0b7a6f)](https://tide.org)

MedVault is a medical record vault where a patient's file opens only when the patient approves a named doctor, and no hospital admin, vendor or AI can open it alone.

**Demo video (2 min):** [demo.mp4](demo.mp4)

## Vision & originality

Patients own their health records, not the hospital IT team. A doctor gets one record, for one visit (24 hours), because the patient signed for it. The approval is not a database row: it is a cryptographic policy the Tide network checks on every decryption.

## Trust constraint insight

Today, whoever runs the database can read every record: admins, insiders, vendors, and attackers with stolen admin credentials. So patients hold back sensitive history and clinics avoid sharing records. If nobody can open records alone, patients can share everything safely.

## Value & impact

A patient with an HIV or mental health history stores it once and shares it with a new specialist in seconds, knowing hospital staff cannot browse it, and sees every request, approval and read in an access log.

## Why TideCloak matters

Records are encrypted in the patient's browser under Tide's built-in `RelationshipAttestation:1` policy, tagged with the record id. To approve a doctor, the patient signs in the Tide enclave a policy naming that doctor's Tide key, that record, read-only, for 24 hours. Tide's independent nodes decrypt only when token, `_tide_decryptor` role and signed policy all match. Our server has no key: the hospital admin holds the whole database, policies included, and replaying the doctor's policy is still refused. Ordinary login cannot promise this.

## Prototype & storytelling

Patient encrypts and uploads a record. Doctor requests access, patient approves by signing a grant, doctor decrypts and reads it. The hospital admin opens the same record, sees only ciphertext, and is refused by the Tide network.

Honest notes: in this demo realm the patient is also the realm's `tide-realm-admin`, because signing a Tide policy needs that authority; production would use a governed approver flow. Revoke stops the app handing out the grant; the 24-hour expiry bounds a kept copy. See [docs/flow.md](docs/flow.md).

## Two modes

- **Real TideCloak** (`npm run dev`): TideCloak + the Tide network do sign-in, roles, policy signing and threshold encryption.
- **Simulated TideCloak** (`npm run dev:sim`): per the organisers' guidance ("simulate TideCloak's sign-in, roles and access checks for now"), the same pages and API run against a simulator with the same interface and the same `RelationshipAttestation:1` checks (subject, record tag, role, expiry, signature). A yellow banner marks this mode. The demo video was recorded in this mode because Tide's network was intermittently refusing new accounts and licences during the hackathon.

## Build status (22 Oct 2026)

| Part | Status |
|---|---|
| App (patient / doctor / admin pages, API, audit log, revoke) | Built, `next build` passes |
| TideCloak realm with Tide licence, IGA, roles, users | Worked once on a local `tidecloak-dev` (realm licensed, IGA on, users created) |
| Linking Tide accounts | Doctor account linked successfully |
| Full encrypt → approve → decrypt → admin refused, simulated mode | Verified end to end |
| Full encrypt → approve → decrypt run, real mode | **Not yet verified live.** The realm's free licence ran out of user seats after failed sign-ups, and new free licences then failed on Tide's side (`setUpTideRealm` 500, `Midgard FinalizeWallet failed`) on every retry during the hackathon window |

## Setup

Quick demo, no TideCloak needed:

```bash
npm install
npm run dev:sim
```

Open http://localhost:3000, click **Login with TideCloak**, pick patient / doctor / hospitaladmin.

Real TideCloak:

Requirements: Node.js 20+, Docker Desktop, Git Bash (Windows) with `jq` and `curl`.

1. Install and configure:

   ```bash
   npm install
   cp .env.example .env    # set KC_BOOTSTRAP_ADMIN_PASSWORD
   ```

2. Bootstrap TideCloak (Tide's official init script, extended for MedVault). It asks for your Tide licence email and your agreement to Tide's Terms & Conditions (https://tide.org/legal), starts `tideorg/tidecloak-dev`, creates the realm (pick a unique name: realm names are global on the Tide network) with roles `patient`, `doctor`, `hospital-admin`, `_tide_encryptor`, `_tide_decryptor`, enables IGA, and creates users `patient`, `doctor` and `hospitaladmin`:

   ```bash
   REALM_NAME=medvault-<yourname> CLIENT_NAME=medvault-client npm run init
   ```

   It prints three invite links (`INVITE patient/doctor/hospitaladmin`). Open each in a private browser window and create or link a Tide account. The script then assigns roles, makes `patient` the realm's Tide admin and writes `data/tidecloak.json`.

3. Run the app:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 and click **Login with TideCloak**. Each role lands on its own page (`/patient`, `/doctor`, `/admin`). Allow pop-ups: signing a policy opens the Tide enclave. Data is stored in `data/db.json` (synthetic data only; ciphertext and signed policies only).
