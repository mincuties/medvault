# MedVault

[![Built with TideCloak](https://img.shields.io/badge/Built%20with-TideCloak-0b7a6f)](https://tide.org)

MedVault is a medical record vault where a patient's file opens only when the patient approves a named doctor, and no hospital admin, vendor or AI can open it alone.

## Vision & originality

Patients own their health records, not the hospital's IT team. A doctor gets access to one record, for one visit (24 hours), because the patient signed for it. The approval is not a row in our database: it is a cryptographic policy the Tide network checks on every decryption.

## Trust constraint insight

Today, whoever runs the database can read every record: admins, insiders, vendors, and attackers who steal admin credentials. So patients hold back sensitive history and clinics avoid sharing records. If nobody can open records alone, patients can share everything safely.

## Value & impact

A patient with an HIV or mental health history can store it once and share it with a new specialist in seconds, knowing hospital staff can't browse it, and can see in an access log every request, approval and read.

## Why TideCloak matters

Each record is encrypted in the patient's browser by the Tide network, under a policy using Tide's built-in `RelationshipAttestation:1` contract with the record's id as its only tag. When the patient approves a doctor, the patient signs (in the Tide enclave) a policy naming **that doctor's Tide key, that record, read-only, expiring in 24 hours**. Tide's independent nodes release a decryption only when the caller's token, its `_tide_decryptor` role and that signed policy all match. There is no master key on our server. The hospital admin holds the entire database, signed policies included, and replaying the doctor's policy is still refused by the network. Ordinary login can't promise this, because whoever runs the database can read it. Tokens are DPoP-bound and verified server side.

## Prototype & storytelling

Patient uploads a record (signs a policy, then the data is encrypted before it leaves the browser). The doctor requests access, the patient approves by signing a grant, and the doctor decrypts and reads it. Then the hospital admin opens the same record, sees only ciphertext, and their decrypt attempt is refused by the Tide network.

**Honest notes:** in this demo realm the patient is also the realm's `tide-realm-admin`, because signing a Tide policy needs that authority. In production each patient's grants would be signed through a governed approver flow. Revoking deletes the stored grant so the app stops handing it out; a 24-hour expiry bounds a copy that was kept.

## Build status (22 Oct 2026)

| Part | Status |
|---|---|
| App (patient / doctor / admin pages, API, audit log, revoke) | Built, `next build` passes |
| TideCloak realm with Tide licence, IGA, roles, users | Worked once on a local `tidecloak-dev` (realm licensed, IGA on, users created) |
| Linking Tide accounts | Doctor account linked successfully |
| Full encrypt → approve → decrypt run | **Not yet verified live.** The realm's free licence ran out of user seats after failed sign-ups, and new free licences then failed on Tide's side (`setUpTideRealm` 500, `Midgard FinalizeWallet failed`) on every retry during the hackathon window |

## Setup

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
