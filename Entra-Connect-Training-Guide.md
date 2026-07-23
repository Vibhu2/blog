# Microsoft Entra Connect — Training & Troubleshooting Guide

> Covers Entra Connect (the hybrid identity sync engine) in depth, plus the wider Entra ID capabilities it sits inside — with troubleshooting scenarios, real error codes, and interview-style Q&A. Verified against current Microsoft Learn documentation (July 2026).

---

## Part 1 — Fundamentals

### What is Microsoft Entra ID?

Microsoft Entra ID (formerly Azure Active Directory / Azure AD) is Microsoft's cloud-based identity and access management (IAM) service. It manages user identities, secures access to applications and resources, and enforces security policy through single sign-on (SSO), multi-factor authentication (MFA), conditional access, and identity protection. It is the identity backbone for Microsoft 365, Azure, and thousands of third-party SaaS apps.

### Entra ID vs. on-prem Active Directory

| | On-prem Active Directory (AD DS) | Microsoft Entra ID |
| :--- | :--- | :--- |
| Protocol | Kerberos, NTLM, LDAP | OAuth 2.0, OIDC, SAML, REST/Graph |
| Structure | Hierarchical: forests, domains, OUs | Flat tenant, no OUs |
| Management model | Group Policy, domain-joined machines | Conditional Access, Intune (MDM/MAM) |
| Trust model | Two-way domain/forest trusts | App registrations, federation, guest invites |
| Primary use case | Local network resource access | SaaS/cloud app access, hybrid identity |
| Password reset | Admin-driven or on-prem self-service tools | Self-Service Password Reset (SSPR) |

They are not competitors — most real deployments run both, bridged by Entra Connect.

### How Entra ID integrates with on-prem AD

The bridge is **Microsoft Entra Connect** (formerly Azure AD Connect), a sync engine that runs on a Windows Server and pushes on-prem directory objects (users, groups, contacts, and optionally passwords) up to Entra ID on a schedule. It supports three authentication models — Password Hash Sync, Pass-Through Authentication, and Federation via AD FS — covered in depth in Part 2.

---

## Part 2 — Entra Connect Architecture

### What it does

Entra Connect Sync is the hybrid integration layer between AD DS and Entra ID. Without it, on-prem AD accounts have no relationship to Entra ID — users would need entirely separate cloud identities. It runs as a Windows service, performs **Import → Synchronize → Export** cycles on a schedule (default every 30 minutes), and keeps a local SQL database (the "connector space" and "metaverse") that tracks every object it has seen from both directories.

There are two distinct products to know apart:

| | **Entra Connect Sync (classic)** | **Entra Cloud Sync** |
| :--- | :--- | :--- |
| Sync logic runs | On-prem, on the sync server | In Azure — the on-prem agent just relays AD queries |
| Deployment | Full install, more complex | Lightweight provisioning agent |
| Custom sync rules / attribute transforms | Yes, full editor | Limited |
| Staging server | Yes | Not applicable |
| Multi-forest | Supported via connector config | Native, simpler |
| Exchange Hybrid support | Required for HCW | **Not supported** |
| Writeback (device, group, password) | Supported | Limited (password writeback only, as of 2026) |

Default recommendation: use **Entra Connect Sync (classic)** whenever Exchange Hybrid or advanced writeback is in scope; use **Cloud Sync** for simpler multi-forest scenarios with no on-prem Exchange dependency.

### The three authentication modes

**Password Hash Sync (PHS) — recommended default.** Entra Connect extracts a hash *of the password hash* from AD (not the plaintext, not even the raw NTLM hash) and syncs it to Entra ID. Authentication happens entirely in the cloud.
- Pros: resilient — works even if on-prem AD is unreachable; enables Identity Protection's leaked-credential detection (it can compare the synced hash against known-breached password lists); no extra on-prem infrastructure.
- Cons: a password change can take up to ~2 minutes to propagate; not suitable if policy mandates that authentication must always be validated on-prem.

**Pass-Through Authentication (PTA).** A lightweight agent installed on-prem (never on the Entra Connect server itself, for high availability) forwards each sign-in request to AD DS in real time. No password data is ever stored in the cloud.
- Pros: satisfies compliance requirements that forbid password hashes leaving the premises; enforces on-prem Conditional Access / logon-hour restrictions at the moment of sign-in.
- Cons: if on-prem AD or all PTA agents are down, cloud sign-in fails too; no leaked-credential detection since Entra never sees a hash.

**AD FS Federation.** Entra ID trusts an on-prem AD FS farm as the identity provider; AD FS performs all authentication and issues signed tokens.
- Pros: maximum control — smart card auth, custom claims rules, complex B2B federation.
- Cons: heavy to run and maintain (AD FS servers + Web Application Proxy servers, certificates, load balancers). Most organizations have migrated away from this to PHS or PTA over the last several years.

> **Decision rule:** default to PHS. Move to PTA only if a specific compliance requirement forbids syncing password hashes to the cloud. Reserve AD FS for smart-card or custom-claims requirements that PHS/PTA genuinely cannot satisfy.

### Object matching: soft match vs. hard match

When Entra Connect first links an on-prem AD object to an Entra ID object, it needs a way to decide "is this the same person."

- **Soft match** — Entra Connect looks for an *existing* cloud-only object whose `proxyAddresses` or `userPrincipalName` matches the incoming on-prem object, and links them automatically. Used when cloud accounts already exist before hybrid is turned on (e.g., an org that started on Microsoft 365 cloud-only and later stood up on-prem AD).
- **Hard match** — the admin explicitly sets the on-prem object's GUID (via the `ImmutableID` / `sourceAnchor`, base64-encoded from `mS-DS-ConsistencyGuid` or `objectGUID`) on the target cloud object. This overrides any UPN mismatch and is the more reliable, deterministic method — the correct approach whenever UPNs differ between on-prem and cloud.

`ImmutableID` is the permanent hard link between the two identities. Losing or recalculating it (for example, after an uninstall/reinstall of Entra Connect with a different source-anchor attribute chosen) breaks the link for every previously-synced object — this is one of the most damaging misconfigurations possible and is covered in the troubleshooting section below.

### Staging mode

A **staging server** is a second Entra Connect installation that performs the full Import → Synchronize cycle but is explicitly prevented from exporting anything to Entra ID or writing back to AD. It exists for three reasons:

1. **Safe testing** — validate a sync rule or filtering change before it goes live.
2. **Disaster recovery** — if the active server dies, promote staging to active in minutes instead of rebuilding from scratch.
3. **Pre-commit verification** — see exactly what a filtering change *would* export before it actually happens.

Only one server can be in **active** mode per tenant at a time. Running two active servers causes conflicting writes and directory corruption — this is enforced by Entra ID, not just a best practice.

> **The three staging patterns, visually:**
> - **High availability** — Server A (Active) + Server B (Staging), both always installed. If Server A dies, promote B to Active. You never run both Active at once — that's the one configuration Entra ID actively rejects.
> - **Server replacement** — build the new server in Staging mode alongside the old Active server, validate it, then flip the new one to Active and decommission the old one. The old server never coexists with the new one in Active mode.
> - **Change testing** — before any risky sync rule or filtering change, make the change on a Staging-mode server first, review what it *would* export, and only then apply it to the Active server.
>
> The pattern is always the same: exactly one Active server, any number of Staging servers, and promotion/demotion is how you move between them — never two Actives at once.

### Object filtering (sync scope)

Entra Connect does not sync your entire AD by default; you control scope with one or more filters:

- **OU-based** — include/exclude specific Organizational Units. Simplest, most common.
- **Group-based** — sync only members of a nominated group. Useful for pilots.
- **Attribute-based** — use a custom AD attribute value to include/exclude objects. Most flexible, most complex to maintain.
- **Domain-based** — for multi-forest environments, include/exclude entire domains.

**Critical behavior:** removing an object from sync scope does not delete it immediately. It is *soft-deleted* in Entra ID (moved to the Recycle Bin, `DirSyncEnabled` flips to `False`) and permanently purged after 30 days. Licenses and group memberships are lost immediately even though the object survives in the Recycle Bin — this trips people up constantly (see Scenario 3 below).

### Directional flow — AD is authoritative

For synced objects, AD is the source of truth. Any attribute change made directly in Entra ID for a synced object (disabling the account, changing a display name, etc.) is **overwritten on the next sync cycle** — with one exception: if **password writeback** is enabled, a password reset performed in the cloud (e.g., via SSPR) *does* flow back down to on-prem AD. That's the only writeback path that goes cloud → on-prem by default; everything else flows on-prem → cloud.

### The wizard's "Additional tasks" menu

After initial setup, re-launching the Entra Connect wizard (or Microsoft Entra Connect Sync, its current name — it was called Azure Active Directory Connect through 2023) always lands on an **Additional tasks** screen. This is the day-2 operations hub — knowing what lives here saves a lot of guessing during troubleshooting:

| Task | What it's for |
| :--- | :--- |
| Privacy settings | Opt in/out of diagnostic data sent to Microsoft |
| View or export current configuration | Read-only dump of the current setup — connectors, sign-in method, sync rules summary. First stop when auditing an unfamiliar server |
| Rotate application certificate | Manually rotate the certificate used for application-based authentication to Entra ID (see Scenario 13) |
| Customize synchronization options | Change attribute/domain/OU filtering, enable optional features (writeback, etc.) |
| Configure device options | Hybrid device join / device writeback settings |
| Refresh directory schema | Re-read the AD schema after adding custom attributes — needed before those attributes can be used in sync rules |
| Configure staging mode | Flip this server between Active and Staging |
| Change user sign-in | Switch between PHS, PTA, and AD FS federation |
| Configure Source Anchor | Choose which AD attribute (`objectGUID` or `mS-DS-ConsistencyGuid`) computes `ImmutableID` — see Part 2's soft/hard match section. Changing this on an already-synced environment is what causes mass `InvalidSoftMatch` errors (Scenario 3) |
| Manage federation | AD FS farm management, if federation is in use |
| Troubleshoot | Launches the built-in troubleshooting console — see below |

### The built-in troubleshooting console

Selecting **Troubleshoot** from Additional tasks (or running the "Microsoft Entra Connect Troubleshooting" shortcut from the Start Menu directly) opens a menu-driven PowerShell console — this wraps most of the `ADSyncDiagnostics` cmdlets referenced throughout this guide into a guided workflow:

```
--------------------------------AADConnect Troubleshooting--------------------------------

  Enter '1' - Troubleshoot Object Synchronization
  Enter '2' - Troubleshoot Password Hash Synchronization
  Enter '3' - Collect General Diagnostics
  Enter '4' - Configure AD DS Connector Account Permissions
  Enter '5' - Test Azure Active Directory Connectivity
  Enter '6' - Test Active Directory Connectivity
  Enter 'Q' - Quit
```

This is the right starting point for someone new to a server, or when you don't yet know which of the scenarios below applies — option 3 (Collect General Diagnostics) packages logs and config for a support case, and options 5/6 isolate whether a problem is connectivity (network/firewall/DNS/credentials) before you go chasing sync-rule logic.

### Reading the Synchronization Service Manager Operations tab

The **Operations** tab (Synchronization Service Manager → Operations) is the first place to look for *any* sync problem — it lists every Import/Export/Synchronization run in chronological order, with a **Status** column that tells you where to focus:

| Status | Meaning | Investigate? |
| :--- | :--- | :--- |
| `success` | No issues | No |
| `completed-*-warnings` | Run finished; some data isn't in the expected state | Only after addressing any errors — warnings alone are usually a symptom, not the root cause |
| `completed-*-errors` (e.g., `completed-sync-errors`) | Run finished, but fewer than 5,000 objects had errors | Yes — click the row, then the error link, for the specific object and error |
| `completed-transient-*` | A recoverable, temporary condition (e.g., a domain controller briefly unreachable) | Usually self-resolves on the next cycle; investigate only if it repeats |
| `stopped-error-limit` | More than 5,000 errors — the run aborted automatically | Yes, urgently — this usually means a systemic problem (bad filtering change, broken connector), not isolated bad data |
| `stopped-*` (other) | The run couldn't complete at all — e.g., `stopped-server-down` means the remote system (AD or Entra ID) couldn't be reached | Yes — this is a connectivity or credentials problem, start with the built-in troubleshooting console's options 5/6 above |

Selecting a row shows Import/Export/Synchronization Statistics at the bottom, with clickable links to the specific changed or errored objects — that detail view is where Scenarios 1–11 below actually get diagnosed.

---

## Part 3 — Entra Connect Troubleshooting Playbook

Sync errors surface in three places: the **Synchronization Service Manager** (Operations tab, on the server itself), the **Microsoft Entra Connect Health** portal (if Health agents are installed — strongly recommended for any production deployment), and the on-prem **Application event log**. Health's Synchronization Errors report refreshes every 30 minutes and is the fastest way to see error volume across all connectors.

### Scenario 1 — UPN mismatch / users get `@tenant.onmicrosoft.com` logins

**Symptom:** users can sign in on-prem but their M365 UPN doesn't match their email address (they get `john.doe@contoso.onmicrosoft.com` instead of `john.doe@contoso.com`).

**Cause:** the on-prem AD UPN suffix (often `corp.local` or another non-routable/unverified domain) has no matching **verified domain** in Entra ID. Entra Connect can't publish a UPN it can't verify, so it substitutes the default `.onmicrosoft.com` domain.

**Fix:**
1. Add the production domain (e.g., `contoso.com`) as an additional UPN suffix in AD DS (`Active Directory Domains and Trusts`).
2. Update affected user accounts to the new suffix, or configure UPN suffix routing in the Entra Connect wizard.
3. Alternatively, use the **Alternate Login ID** feature if the UPN can't be changed for other reasons.
4. Force a full sync (`Start-ADSyncSyncCycle -PolicyType Initial`) once the suffix is verified in Entra ID.

### Scenario 2 — `InvalidHardMatch` errors (hard match blocked)

**Symptom:** export fails with error code `InvalidHardMatch` (103) or `AttributeUpdateNotAllowed` (96); message references `OnPremisesObjectIdentifier cannot be changed`.

**Cause:** Entra ID now enforces **hard match security hardening** by default (effective July 2026) — it blocks a hard-match takeover of a cloud object when that object already has `onPremisesObjectIdentifier` set, or holds/([is eligible for]) a privileged Entra role. This stops an attacker (or a careless admin) from re-pointing a privileged cloud account at an arbitrary on-prem object.

**Fix:** identify the block reason, then:
- If the target has a privileged role assigned or eligible — temporarily remove the role/eligibility, let the hard match complete, then reassign it.
- If `onPremisesObjectIdentifier` is already set — clear it to null (via Graph or `ADSyncTools`) and rerun sync.
- If the takeover is genuinely intentional (e.g., planned re-hybridization), temporarily disable `BlockCloudObjectTakeoverThroughHardMatchEnabled`, complete the match, then re-enable it.

Never leave the hardening feature permanently disabled — it's a security control, not a nuisance setting.

### Scenario 3 — `InvalidSoftMatch` / duplicate attribute errors

**Symptom:** a new or changed on-prem object fails to provision with `InvalidSoftMatch` or `AttributeValueMustBeUnique`.

**Cause:** Entra ID enforces uniqueness on `mail`, `proxyAddresses`, `userPrincipalName`, and `onPremisesSecurityIdentifier` across the whole tenant. The classic trigger: two AD objects end up with an overlapping SMTP alias (e.g., both have `bob@contoso.com` somewhere in `proxyAddresses`), or Entra Connect was reinstalled with a different source-anchor attribute chosen, breaking the link for every previously-synced object at once.

**Fix:**
1. Use the Entra Connect Health sync error report to identify the two conflicting objects.
2. Decide which object should keep the disputed value.
3. Remove the duplicate value from the *source* directory (on-prem AD), not directly in Entra ID.
4. Let the next sync cycle pick up the change.

Note: since ~September 2016, **duplicate attribute resiliency** is on by default for new tenants (and rolled out to existing ones) — it lets the *non-conflicting* object still provision instead of blocking entirely, but it does not fix the underlying duplication; you still have to clean up the source data.

### Scenario 4 — Disabling a user in the wrong place

**Symptom:** an admin disables a user directly in the Entra admin center; 30–60 minutes later the account is active again.

**Cause:** AD is authoritative for synced objects. The disable in Entra ID gets overwritten by the next delta sync from AD, which still says the account is enabled.

**Fix:** disable the user in on-prem AD (`Disable-ADAccount`). Entra Connect will propagate the disabled state on the next cycle (or force it immediately with `Start-ADSyncSyncCycle -PolicyType Delta`). For urgent access revocation that can't wait for a sync cycle, revoke the user's Entra ID sign-in sessions directly (`Revoke-MgUserSignInSession`) as an immediate stopgap, then fix AD as the durable source of truth.

### Scenario 5 — Password writeback / SSPR not reaching on-prem AD

**Symptom:** a user resets their password through SSPR in the cloud, but their on-prem AD password is unchanged — now they have two different passwords.

**Cause:** **Password writeback** is an optional feature, off by default. Without it, SSPR only ever changes the cloud-side password.

**Fix:** enable Password Writeback in the Entra Connect wizard (Optional Features → Password writeback). Verify with a test SSPR reset and confirm the AD password's `pwdLastSet` timestamp updates.

### Scenario 6 — Password hash sync appears to do nothing

**Symptom:** PHS is enabled, but no users can sign in with cloud-synced passwords, or a single user's password never syncs.

**Common root causes, roughly in order of likelihood:**
1. The server is in **staging mode** — staging never exports, including password hashes.
2. A **full initial sync hasn't completed yet** — password sync will not start until the first full directory sync finishes.
3. Password Synchronization was left **disabled** even though PHS was selected as the sign-in method (a known interaction bug with older Entra Connect builds when switching sign-in methods via the "Change user sign-in" task).
4. For a single stuck object: the on-prem account predates Windows Server 2003 and simply has no password hash to sync.

**Diagnose with the built-in tooling** (Entra Connect version 1.1.524.0+):
```powershell
Import-Module ADSyncDiagnostics
Invoke-ADSyncDiagnostics -PasswordSync
# For a single object:
Invoke-ADSyncDiagnostics -PasswordSync -ADConnectorName "contoso.com" -DistinguishedName "CN=TestUser,CN=Users,DC=contoso,DC=com"
```
This validates that PHS is enabled tenant-wide, confirms the server isn't in staging mode, checks for password-sync heartbeat events in the Application log, and confirms the AD DS service account has the right permissions.

### Scenario 7 — An attribute isn't flowing to Entra ID (e.g., `department` is blank)

**Symptom:** an attribute is correctly populated in AD but shows blank in Entra ID / the Microsoft 365 admin center.

**Cause:** Entra Connect only exports a predefined set of attributes by default. Anything outside that default set — including many custom or less-common AD attributes — needs an explicit attribute-flow rule.

**Fix:** open the **Synchronization Rules Editor** on the Entra Connect server, clone the relevant default outbound rule (never edit the default rule directly — it gets overwritten on upgrade), and add the missing attribute to the outbound flow. Run a full sync afterward: filtering and sync-rule changes only take effect after `Start-ADSyncSyncCycle -PolicyType Initial`.

### Scenario 8 — Accidental mass deletion is blocked ("export stopped")

**Symptom:** export halts with *"The export operation to Microsoft Entra ID has failed. There were more objects to be deleted than the configured threshold."* Sync Service Manager shows the export run profile status as `stopped-deletion-threshold-exceeded`.

**Cause:** the **accidental deletion prevention** feature (on by default, threshold 500 objects per 30-minute cycle) tripped — usually because an OU was renamed or unselected from sync scope, or a large batch of objects was moved/deleted in AD.

**Fix:**
1. In Synchronization Service Manager → Connectors → the Entra ID connector → **Search Connector Space**, filter Scope = *Pending Export*, check *Delete*, and review exactly which objects are queued for deletion.
2. If the deletions are genuinely expected (e.g., a deliberate OU removal), temporarily lift the block and export:
   ```powershell
   Disable-ADSyncExportDeletionThreshold -AADUserName "admin@contoso.com"
   # run Export from the Entra ID connector
   Enable-ADSyncExportDeletionThreshold -DeletionThreshold 500 -AADUserName "admin@contoso.com"
   ```
3. If they're *not* expected, the deletions are almost always caused by an OU rename or a filtering change taking objects out of scope — put the OU back in scope and re-sync rather than forcing the deletion through.

Never leave the threshold permanently disabled; raise it to a sensible number for your org's size instead if legitimate bulk deletions are a recurring pattern.

### Scenario 9 — `Error Type 114` — can't delete a cloud-only object

**Symptom:** during a hybrid-to-cloud-only migration (moving users out of sync scope), export fails: *"This synchronization operation, Delete, is not valid. Contact Technical Support."*

**Cause:** Entra ID protects cloud-only or already-restored objects from being deleted through the sync engine — usually because the object reference Entra Connect is trying to delete has already been moved to Lost & Found, restored from the Recycle Bin, or lacks a UPN/GUID that Entra Connect expects.

**Fix:** identify the problem object, soft-delete the cloud account via PowerShell, run `Start-ADSyncSyncCycle -PolicyType Delta` to let the deletion import cleanly, confirm it succeeded, then restore the user from the Recycle Bin if needed and re-run delta sync to confirm the error doesn't recur.

### Scenario 10 — Large object / attribute size errors

**Symptom:** export fails with `LargeObject` or `ExceededAllowedLength`, usually tied to `userCertificate`, `thumbnailPhoto`, or `proxyAddresses`.

**Cause:** Entra ID enforces a hard cap of 15 certificates in `userCertificate`, and an overall per-object size ceiling that all attributes contribute to (proxy addresses alone realistically top out around 300 entries, less if the object also carries certificates and multiple license SKUs).

**Fix:** prune stale/expired certificates and unused SMTP/X.400 proxy addresses from the object. There's no per-attribute count you can configure around — the fix is always data cleanup.

### Scenario 11 — Existing Admin Role Conflict

**Symptom:** a specific on-prem user object refuses to soft-match with an existing Entra ID user that shares the same UPN.

**Cause:** Entra Connect refuses to soft-match an on-prem object against a cloud object that currently holds an administrative role — this is a deliberate anti-takeover protection, distinct from (and older than) the hard-match hardening in Scenario 2.

**Fix:** remove the admin role from the cloud object, hard-delete the quarantined conflicting object in the cloud, let the next sync cycle soft-match normally, then reassign the admin role once the link is established.

### Scenario 12 — Health agent shows stale data / "data isn't up to date"

**Symptom:** Entra Connect Health portal shows a warning or error that health data hasn't been received in the last two hours.

**Cause, in order of likelihood:** outbound firewall blocking the Health agent's required endpoints (common on servers also running Web Application Proxy), TLS inspection replacing the certificate the agent presents, or the Health agent service simply not running.

**Fix:** confirm the Health agent services are running, run the built-in **test connectivity tool**, check HTTP proxy configuration if applicable, and confirm agent version is current. If no data arrives for 30 consecutive days the server is disabled from the Health portal entirely and needs the agent reinstalled.

### Scenario 13 — Sync silently stopped running (scheduler suspended)

**Symptom:** no errors anywhere, but changes made days ago in AD still haven't shown up in Entra ID. Sync Service Manager shows no recent runs at all.

**Cause:** the sync scheduler itself is disabled or suspended — most often because someone ran `Set-ADSyncScheduler -SyncCycleEnabled $false` for a maintenance task (e.g., a Single Object Sync troubleshooting session — see Scenario 3's tooling) and forgot to re-enable it, or because `SchedulerSuspended` was set automatically after a run failure.

**Diagnose:**
```powershell
Get-ADSyncScheduler
```
Check these fields specifically:

| Field | What it tells you |
| :--- | :--- |
| `SyncCycleEnabled` | If `False`, the scheduler is fully off — nothing runs automatically |
| `SchedulerSuspended` | If `True`, the scheduler paused itself, usually after repeated failures |
| `StagingModeEnabled` | If `True`, imports/syncs still run but nothing exports — this is expected for a staging server, a red flag for one that's supposed to be Active |
| `SyncCycleInProgress` | If stuck `True` for an unreasonably long time, a run may be hung |
| `NextSyncCycleStartTimeInUTC` | Confirms whether a future run is actually scheduled |

**Fix:** `Set-ADSyncScheduler -SyncCycleEnabled $true` to resume, and `Start-ADSyncSyncCycle -PolicyType Delta` to kick a run immediately. If the server was left in Staging mode unintentionally, promote it to Active via the wizard's **Configure staging mode** task.

### Scenario 14 — Sync stops authenticating to Entra ID (expired application certificate)

**Symptom:** exports to Entra ID start failing tenant-wide with authentication errors; Event ID 1011 (warning) or 1012 (error) appears in the Application event log.

**Cause:** modern Entra Connect versions authenticate to Entra ID using an application identity secured by a certificate (90-day default lifetime) rather than a service account. Entra Connect warns once the certificate has used 70% of its lifetime (Event ID 1011) and errors once it's expired (Event ID 1012). If **automatic rotation** is enabled (the default when Microsoft manages the certificate), this is usually self-healing — but it fails silently if the sync scheduler is suspended (Scenario 13), since rotation piggybacks on the scheduled cycle.

**Fix:**
1. Confirm the scheduler isn't suspended (`Get-ADSyncScheduler`) — rotation can't happen if it is.
2. Check current certificate status: wizard → **View or export current configuration**, scroll to certificate details (thumbprint, `Not valid after`, `Automatic rotation enabled`).
3. For a manual rotation: wizard → **Additional tasks** → **Rotate application certificate**, and follow the prompts.
4. If Entra Connect failed to clean up an old certificate credential after rotating (a separate error event), remove it explicitly: `Remove-EntraApplicationKey -CertificateId <certificateId>`.
5. For bring-your-own-certificate (BYOC) setups, rotation is manual end-to-end — export the new cert, upload it to the app registration's Certificates & Secrets blade, then run `Invoke-ADSyncApplicationCredentialRotation -CertificateSHA256Hash <hash>`.

### Self-service diagnostics in the Entra admin center

Beyond the on-server tools above, **Entra admin center → Entra ID → Entra Connect → Cloud sync → Diagnose and solve problems** hosts a guided troubleshooter with dozens of named scenarios. The ones most relevant to Entra Connect itself (as opposed to MFA Server/AD FS, which also appear in this list):

| Scenario | Overlaps with |
| :--- | :--- |
| Cannot start Azure AD Connect Synchronization Service | New scenario — check the ADSync Windows service and its logon account first |
| Synchronization Service is started but there is no synchronization | Scenario 13 (scheduler suspended) |
| Synchronization issue with specific user, group, or contact object | Scenarios 1–3, 7 |
| Synchronization issue with OU-based (Organizational Unit) filtering | Part 2, Object filtering; Scenario 8 |
| Synchronization Service cannot import/export changes from on-premises AD | Points to AD-side connectivity — pair with troubleshooting console option 6 |
| Synchronization Service cannot import/export changes from Azure AD | Points to Entra-side connectivity/auth — pair with troubleshooting console option 5, or Scenario 14 if it's a certificate issue |

The remaining topics in that portal (Azure MFA Server, the AD FS adapter for cloud MFA, NPS extension, RADIUS) are about **on-prem MFA infrastructure**, not Entra Connect sync itself — relevant if your org still runs AD FS federation, otherwise skippable.

### Quick diagnostic commands

| Command | What it does |
| :--- | :--- |
| `Start-ADSyncSyncCycle -PolicyType Delta` | Force an immediate delta sync (changes only) |
| `Start-ADSyncSyncCycle -PolicyType Initial` | Force a full sync — required after filtering/rule changes |
| `Get-ADSyncConnectorStatistics` | Last sync stats per connector |
| `Get-ADSyncScheduler` | Scheduler state — interval, next run, `SchedulerSuspended`, `StagingModeEnabled` (Scenario 13) |
| `Set-ADSyncScheduler -SyncCycleEnabled $true/$false` | Resume or pause the scheduler |
| `Get-ADSyncToolsDuplicateUsersReport` | Surface duplicate UPN/attribute conflicts |
| `Invoke-ADSyncDiagnostics -PasswordSync` | Diagnose why passwords aren't syncing |
| `Get-ADSyncAADPasswordSyncConfiguration` | Confirm PHS is enabled per AD connector |
| `Get-ADSyncExportDeletionThreshold` | Check current accidental-deletion threshold |
| `Invoke-ADSyncSingleObjectSync -DistinguishedName "<DN>"` | Sync and diagnose one object in isolation, without waiting for a full cycle |
| `Get-ADSyncEntraConnectorCredential` | Show whether the server authenticates via `ServiceAccount` or `Application`, and the app (client) ID |
| `Invoke-ADSyncApplicationCredentialRotation -CertificateSHA256Hash <hash>` | Manually rotate a BYOC application certificate (Scenario 14) |

---

## Part 4 — Broader Entra ID Capabilities (Interview Q&A)

The content below was supplied as source material and has been fact-checked, corrected, and expanded against current Microsoft documentation.

### Conditional Access

**What is it and how does it work?** Conditional Access is Entra ID's policy engine for controlling access based on signals: user/group, location (including named/trusted locations), device compliance state, application sensitivity, and real-time sign-in risk. Policies combine an *assignment* (who/what/where the policy applies to) with *access controls* (grant, block, require MFA, require compliant device, require app protection policy, session controls like limiting cloud app functionality).

**Common pitfall:** deploying a broad "require MFA for all users" policy without excluding break-glass emergency access accounts. Always exclude at least two cloud-only, non-MFA emergency accounts with strong random passwords, monitored separately.

### Identity Protection

**What does it do?** Uses Microsoft's threat intelligence and behavioral analytics to assign risk scores to users and individual sign-ins — detecting things like leaked credentials (via PHS hash comparison), impossible travel, anonymous IP usage, and password spray patterns. Risk policies can then automatically require a password change (user risk) or step-up MFA (sign-in risk), or block access outright for high-risk events.

**Distinction that matters in interviews:** *user risk* (this account's credentials may be compromised, e.g., leaked password) is a different signal from *sign-in risk* (this particular sign-in attempt looks suspicious, e.g., impossible travel) — they can trigger different remediation policies.

### Microsoft Entra Application Proxy

**What does it do?** Provides secure remote access to on-prem web applications without a VPN. A lightweight connector installed on an on-prem server creates an **outbound-only** connection to the App Proxy service — no inbound firewall ports need to open. Once an app is published, external users reach it through an Entra-secured external URL, and Entra ID handles pre-authentication before the request is ever forwarded on-prem.

**Where it overlaps with hybrid Exchange:** the same outbound-connector pattern is used by the Modern Hybrid Agent for Exchange Hybrid — it's built on App Proxy technology, which is why it eliminates the need to expose on-prem Exchange Web Services publicly.

### Self-Service Password Reset (SSPR)

**Implementation steps:** enable SSPR in the Entra admin center, scope it to specific groups (or all users), and configure the number/type of authentication methods required for reset (email, SMS, voice call, Microsoft Authenticator app, or security questions — combinations are configurable). For hybrid users, pair SSPR with **password writeback** (Part 2, Scenario 5) so the reset actually reaches on-prem AD.

**Value:** reduces help-desk password-reset tickets — often one of the highest-volume ticket categories in any org — while improving user experience.

### Identity Governance

Covers the full identity lifecycle and compliance posture, with three main pillars:
- **Access Reviews** — periodic, attestable reviews of who has access to what (group membership, app assignment, role assignment), with reviewers able to approve/deny/escalate. Used heavily for compliance evidence (SOC 2, ISO 27001 audits).
- **Entitlement Management** — bundles of access ("access packages") that users can request through a self-service catalog, with approval workflows and automatic expiration — reduces the standing-access sprawl that manual provisioning creates.
- **Privileged Access Management (PAM)** — closely related to PIM (below); governs just-in-time elevation for the most sensitive roles.

### Single Sign-On (SSO) setup

**Process:** register the application in Entra ID (App Registrations or Enterprise Applications gallery), choose the protocol (SAML or OpenID Connect — see Part 6 for the tradeoffs), configure redirect/reply URLs and the certificate/signing configuration, assign users or groups to the app, and test the full sign-in flow end to end (including sign-out, since broken SLO/logout is a common gap testers miss).

### Privileged Identity Management (PIM)

**What it does:** removes *standing* administrative access. Instead of a user permanently holding Global Administrator, they're made *eligible* for the role and must activate it just-in-time — for a bounded time window, optionally requiring MFA, justification, and/or approval from a designated approver. This dramatically shrinks the attack surface presented by always-on privileged accounts, and every activation is logged and auditable.

### Microsoft Entra ID B2C

**What it's for:** managing *customer/consumer* identities for applications you build — not employee/partner identities (that's B2B/External ID). Setup: create a dedicated B2C tenant, register the application(s) there, configure identity providers (local email/password accounts, or social providers like Google/Facebook), and build **user flows** (or custom policies via Identity Experience Framework for more control) defining the sign-up/sign-in experience, MFA requirements, and profile editing.

---

## Part 5 — Scenario, Best Practice & Behavioral Q&A

### How would you respond to a security breach flagged by Identity Protection?

Review the specific risk events in the Identity Protection dashboard to understand what was actually detected (leaked credential vs. impossible travel vs. anomalous token, etc.). Notify relevant stakeholders per your incident response plan. Enforce immediate remediation — forced password reset and/or MFA re-registration for the affected account, and revoke active sign-in sessions (`Revoke-MgUserSignInSession`) so existing tokens can't be reused. Follow with root-cause investigation (was it phishing? credential stuffing? a leaked password from an external breach?) and tighten Conditional Access / risk policies to close the specific gap that was exploited.

### How would you handle a user who was signed out due to suspicious activity?

Check the specific risk detection details first — don't just take the automated flag at face value. Verify the user's identity through an out-of-band channel (a phone call to a known number, not a reply to the email/chat that reported the issue — that channel could itself be compromised). Only after verifying identity, assist with a password reset and/or MFA re-registration to restore access, and document the incident.

### Best practices for securing Entra ID

Enforce MFA for all users, with extra scrutiny on privileged accounts (PIM activation should itself require MFA). Use Conditional Access to gate access by device compliance and risk level, not just password. Run access reviews on a regular cadence rather than leaving group/app membership to accumulate indefinitely. Apply least privilege via PIM for anything above standard user rights — no permanent Global Admins beyond break-glass accounts. Monitor sign-in and audit logs for anomalies (Entra ID's own logs, forwarded to a SIEM if you have one).

### Ensuring compliance with data protection regulations

Robust identity governance (access reviews + entitlement management) gives you the audit trail regulators ask for. Encrypt data in transit and at rest (mostly Microsoft-managed for M365 workloads, but relevant for any custom apps built on Entra). Maintain detailed logs of administrative actions via the Entra audit log and Unified Audit Log. Use Microsoft Purview for sensitivity labeling and DLP where the regulation requires data classification, not just access control.

### Keeping current with Entra ID changes

Microsoft ships changes to Entra ID continuously — the Microsoft Entra changelog and Azure/Entra blog are the primary sources. Microsoft Learn's "What's new in Microsoft Entra" page and the Entra admin center's Message Center are the two feeds worth checking regularly.

---

## Part 6 — SAML vs. OpenID Connect

Both are used to configure SSO for an application in Entra ID; which one to use depends on the application's requirements — SAML tends to be the only option for older/legacy enterprise software, while OIDC is generally preferred for anything built recently.

| | SAML | OpenID Connect (OIDC) |
| :--- | :--- | :--- |
| Basis | Older XML-based standard | Built on OAuth 2.0, uses JSON (JWT) |
| Typical use case | Enterprise/legacy web apps | Modern web, mobile, and single-page apps |
| Payload format | XML assertions — verbose | JSON web tokens — compact |
| Implementation complexity | Higher — XML signing/canonicalization is fiddly | Generally simpler, broader library support |
| Mobile-friendliness | Poor — not designed for it | Designed with mobile/native apps in mind |

**Practical rule of thumb:** if the vendor only documents SAML, use SAML — don't force OIDC onto an app that wasn't built for it. If you're building something new and both are on the table, OIDC is usually the lower-friction choice.

---

## Sources

- [Microsoft Entra Connect Sync — Prevent accidental deletes](https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-sync-feature-prevent-accidental-deletes)
- [Microsoft Entra Connect Health Alert Catalog](https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-health-alert-catalog)
- [Understanding errors during Microsoft Entra synchronization](https://learn.microsoft.com/entra/identity/hybrid/connect/tshoot-connect-sync-errors)
- [Troubleshoot password hash synchronization with Microsoft Entra Connect Sync](https://learn.microsoft.com/entra/identity/hybrid/connect/tshoot-connect-password-hash-synchronization)
- [How to troubleshoot password synchronization when using Microsoft Entra Connect](https://learn.microsoft.com/troubleshoot/entra/entra-id/user-prov-sync/troubleshoot-pwd-sync)
- [Password Hash Sync automatically enabled during PTA (KB)](https://learn.microsoft.com/troubleshoot/entra/entra-id/user-prov-sync/pwd-hash-sync-auto-enable)
- [Microsoft Entra Connect Health FAQ](https://learn.microsoft.com/entra/identity/hybrid/connect/reference-connect-health-faq)
- [Health service data isn't up to date alert](https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-health-data-freshness)
- [Migrate to cloud authentication using Staged Rollout](https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-staged-rollout)
- [Using the Sync Service Manager Operations tab](https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-sync-service-manager-ui-operations)
- [Troubleshoot an object that is not synchronizing with Microsoft Entra ID](https://learn.microsoft.com/entra/identity/hybrid/connect/tshoot-connect-object-not-syncing)
- [Troubleshoot object synchronization with Microsoft Entra Connect Sync](https://learn.microsoft.com/entra/identity/hybrid/connect/tshoot-connect-objectsync)
- [End-to-end troubleshooting of Microsoft Entra Connect objects and attributes](https://learn.microsoft.com/troubleshoot/entra/entra-id/user-prov-sync/troubleshoot-aad-connect-objects-attributes)
- [Microsoft Entra Connect Single Object Sync](https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-single-object-sync)
- [Authenticate to Microsoft Entra ID by using application identity (certificate rotation)](https://learn.microsoft.com/entra/identity/hybrid/connect/authenticate-application-id)
- [Directory synchronization stops or hasn't registered in more than a day](https://learn.microsoft.com/troubleshoot/entra/entra-id/user-prov-sync/directory-sync-stop-register)
