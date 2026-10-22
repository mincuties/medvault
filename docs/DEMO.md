# 2-minute demo script

Before recording: TideCloak running, `npm run dev`, three browser windows (or profiles), one per account, all at http://localhost:3000. Allow pop-ups (the Tide enclave opens in one).

| Time | Window | Do | Say |
|---|---|---|---|
| 0:00 | — | Show the landing page | "Whoever runs a hospital database can read every record. MedVault removes that single point of trust." |
| 0:15 | Patient | Log in with TideCloak. Pick the "HIV care summary" sample, click **Encrypt & upload**, approve in the Tide window | "The record is encrypted in my browser by Tide's network, under a policy only I signed. The server gets ciphertext." |
| 0:40 | Doctor | Log in. Click **Request access** on the record | "The doctor sees the title only, and asks." |
| 0:50 | Patient | Refresh. Click **Approve (sign grant)**, approve in the Tide window | "Approving means I sign a policy for this doctor's key, this record, read-only, 24 hours. Tide's nodes enforce it." |
| 1:10 | Doctor | Refresh. Click **Decrypt & read** | "Only now can the doctor read it." |
| 1:25 | Admin | Log in. Show ciphertext, click **Try to decrypt** | "The admin owns the whole database, even the signed grant, and Tide still refuses." |
| 1:45 | Patient | Show the access log; click **Revoke** | "Every step is logged, and the patient can revoke." |
| 1:55 | — | Show README / repo | "Built with TideCloak." |
