# MedVault

[![Built with TideCloak](https://img.shields.io/badge/Built%20with-TideCloak-0b7a6f)](https://tide.org)

MedVault is a medical record vault where a patient's file opens only when the patient approves a named doctor, and no hospital admin, vendor or AI can open it alone.

## Vision & originality

Patients own their health records, not the hospital's IT team. A doctor gets access for one visit, with the patient's approval.

## Trust constraint insight

Today, whoever runs the database can read every record: admins, insiders, vendors, and attackers who steal admin credentials. So patients hold back sensitive history and clinics avoid sharing records. If nobody can open records alone, patients can share everything safely.

## Value & impact

A patient with an HIV or mental health history can store it once and share it with a new specialist in seconds, knowing hospital staff can't browse it.

## Why TideCloak matters

Records are encrypted in the browser with TideCloak's tag-based encryption (`doEncrypt` / `doDecrypt`, tag `medical`). The key is split across Tide's independent nodes, and they only help decrypt for a user whose TideCloak-signed token carries the `_tide_medical.selfdecrypt` role. There is no master key on our server, so the hospital admin, who runs the database, sees only ciphertext and gets refused when trying to decrypt. Ordinary login can't promise this, because whoever runs the database can read it. With TideCloak's quorum governance (IGA) turned on, even granting a decrypt role is a change request that needs admin quorum approval, so one rogue admin can't quietly give themselves access.

**What is enforced where (honest note):** the Tide network enforces *who can decrypt at all* (role policy on the token). The patient's **Approve / Deny** decision is enforced by our app server: the server only releases a record's ciphertext to a doctor after that patient approves. Making the patient's approval itself a condition checked by the Tide network (a per-record Tide policy) is the next step; we did not build it in this prototype.

## Prototype & storytelling

Patient uploads a record (encrypted before it leaves the browser), doctor requests access, patient approves, doctor decrypts and reads it. Then the hospital admin opens the same record and gets only encrypted data, and their decrypt attempt is refused.

## Setup

Requirements: Node.js 20+, Docker Desktop.

1. Start TideCloak with the MedVault realm imported (run in the project folder):

   ```bash
   docker run -d --name tidecloak -p 8080:8080 -v "${PWD}/medvault-realm.json:/opt/keycloak/data/import/medvault-realm.json" -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=password tideorg/tidecloak-dev:latest
   ```

   The realm `medvault` comes with client `medvault-app`, roles `patient`, `doctor`, `hospital-admin` and `_tide_medical.selfencrypt` / `_tide_medical.selfdecrypt`, and users `patient1`, `doctor1`, `admin1`.

2. Open http://localhost:8080 (admin / password), switch to realm **medvault**:
   - Identity Providers → tide → **Manage License → Request License**.
   - For each of `patient1`, `doctor1`, `admin1`: Users → user → Credentials → **Credential Reset** → action **Link Tide Account** → Copy link, open it in a private window and create/link a Tide account.
   - Clients → medvault-app → Action → **Download adapter config** (Keycloak OIDC JSON). Save it as `tidecloak.json` in the project root (a copy in `public/` is fine too).

3. Run the app:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 and click **Login with TideCloak**. Each role lands on its own page (`/patient`, `/doctor`, `/admin`). Data is stored in `data/db.json` (synthetic data only, ciphertext only).
