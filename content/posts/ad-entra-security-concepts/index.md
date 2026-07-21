---
title: "The Security Concepts Behind AD and Entra ID"
date: 2026-07-21T15:11:09+05:30
draft: false
description: "Ten Windows and Entra ID trust concepts explained in plain language — the flaw behind each, how to spot abuse, and how to fix it."
tags: ["Active Directory", "Azure", "Entra ID", "Security", "Kerberos"]
categories: ["Security"]
author:
  name: Vibhu Bhatnagar
---

## The Point

Ten security concepts sit underneath almost everything that goes wrong in Windows and cloud environments. Each one is a form of trust — Windows or Entra ID issuing a token, a ticket, or a permission and then trusting it without double-checking. Attackers don't invent new categories of attack; they find a way to get one of these ten things issued to them, forge it, or steal it. This post walks through each one in plain language, with a real example, the flaw that makes it exploitable, how to spot abuse, and how to close the gap.

## Context

I've spent years moving between on-prem Active Directory and Microsoft 365 / Azure, and it took a while to realize these aren't two different disciplines. They're the same five or six ideas, implemented twice. Once you can explain *why* a Golden Ticket attack works, you can explain *why* a stolen OAuth refresh token works, because it's the same flaw wearing a different name. This post is written so a junior admin — or anyone curious about what's actually going on under the hood — can read it end to end and come away understanding not just *what* these things are, but *why* they break and what to actually do about it.

## 1. Identity Anchor: SID and Object ID

### In Plain Language

Every user, computer, and group in Windows gets a unique serial number the moment it's created. That number — the Security Identifier (SID) — is what Windows actually checks, not your username. Your username is just a label for humans; the SID is the thing the system trusts. In the cloud, Entra ID does the same job with an Object ID (or Immutable ID, for accounts synced from on-prem).

Think of it like a passport number versus your name. Two people can be named "John Smith," but only one has your exact passport number. Every system that checks your identity is really checking that number, not the name printed next to it.

### Real Example

An attacker who briefly gains Domain Admin rights — maybe through a phished password — doesn't need to stay Domain Admin to keep their access. They add their own account's SID into the **SID History** attribute of an existing account, copying in the SID of the Domain Admins group. Now their low-privilege-looking account carries the *history* of admin rights, and Windows honors that history when building the access token at logon. Even after the attacker is removed from every visible admin group, they're still effectively an admin — because the group membership check isn't the only thing granting them rights.

### The Flaw

Windows trusts the SID as the source of truth and largely assumes it's tamper-evident. SID History exists for a legitimate reason (so a user's access doesn't break when their account is migrated between domains), but that same mechanism can be abused to graft privilege onto an account that no admin ever explicitly added to a privileged group.

### How to Spot It

- Audit the `SIDHistory` attribute across your domain — it should be empty or explainable for almost every account:
  ```powershell
  Get-ADUser -Filter {SIDHistory -like "*"} -Properties SIDHistory,SamAccountName
  ```
- Any populated SID History that doesn't correspond to a known, documented domain migration is a red flag.
- Enable SID filtering on any external or forest trust — it discards SID History across that trust boundary automatically.

### How to Fix It

- Treat any unexplained SID History entry as a compromise indicator, not a config quirk — investigate and remove it.
- Enable SID filter quarantining on all external trusts (it's the default on modern Windows Server, but verify it hasn't been disabled).
- In the cloud, monitor for unexpected changes to a user's Immutable ID during hybrid sync — a mismatch there can silently reassign a cloud identity to the wrong on-prem account.

## 2. Proof of Authentication: Kerberos Tickets and OAuth Tokens

### In Plain Language

When you log on, you don't hand your password to every single server you touch all day — that would be slow and risky. Instead, Windows gives you a ticket (a Kerberos Ticket Granting Ticket, or TGT) that says "the domain controller vouches for this person." You show that ticket, not your password, to get access to email, file shares, and applications. The cloud equivalent is an OAuth/OIDC token — a signed piece of data that says "Entra ID vouches for this person" for the next hour or so.

It's like a wristband at a festival. Security checks your ID once at the gate, then you flash the wristband at every stage after that. Nobody re-checks your ID at each stage — they trust the wristband.

### Real Example

**On-prem — Golden Ticket:** the account that signs every Kerberos ticket in a domain is called `krbtgt`. If an attacker steals the password hash of that one account (usually after already gaining Domain Admin once), they can forge a TGT for *any* user — including users that don't exist — with a validity of up to ten years. That forged ticket is accepted by every server in the domain as genuine, because it's signed with the right key. The attacker now has permanent, invisible admin access that doesn't depend on any account staying compromised.

**Cloud — stolen refresh token:** a user's laptop gets infected with malware that steals the OAuth refresh token stored by a business app. The attacker replays that token from their own machine on the other side of the world and gets a fresh access token — no password, no MFA prompt, because the refresh token itself *is* the proof of a prior successful login.

### The Flaw

Both artifacts are "trust me, I already checked" tokens, and neither one is re-verified against the current state of the account once issued. A TGT doesn't ask "is this account still valid, still in this group, still employed here" every time it's used — it just checks the signature. Same with a bearer token: whoever holds it, wins.

### How to Spot It

- **On-prem:** watch for Kerberos tickets with abnormal lifetimes (Event ID 4769 with an unusually long or non-standard ticket lifetime), and TGT requests for accounts that shouldn't be requesting them (Event ID 4768). Microsoft Defender for Identity specifically flags Golden Ticket indicators.
- **Cloud:** review Entra ID sign-in logs for tokens used from unfamiliar locations, impossible-travel patterns, or token replay flagged by Identity Protection.

### How to Fix It

- **On-prem:** reset the `krbtgt` account password *twice*, at least 10 hours apart (a single reset isn't enough because of how ticket-signing keys roll over). Put privileged accounts in the **Protected Users** group, which shortens ticket lifetimes and disables weaker authentication for them.
- **Cloud:** enable Continuous Access Evaluation and Conditional Access token protection, which ties tokens to the specific device they were issued to, so a stolen token doesn't work from a different machine. Revoke refresh tokens for a compromised user immediately.

## 3. Runtime Authorization: Access Tokens and Consent Grants

### In Plain Language

Once you're logged on, Windows wraps up your identity and group memberships into a bundle called an access token, and attaches it to every program you run. When that program tries to open a file or perform an admin action, Windows checks the token, not you personally. In the cloud, an application gets something similar — a permission grant (an OAuth consent) that says exactly what data or actions that app is allowed to touch on a user's behalf.

It's a hall pass. Once a teacher signs it, nobody at the next checkpoint calls the teacher to confirm — they just look at the pass.

### Real Example

**On-prem — token theft:** an attacker who compromises a low-privilege web server finds that a scheduled task on the same box runs as a Domain Admin. They use a tool to duplicate that process's access token and attach it to their own malicious process. Windows sees the token, not the process's actual origin, and grants full Domain Admin rights.

**Cloud — illicit consent grant:** an attacker registers an innocuous-looking app in Entra ID (say, "Document Viewer Pro") and emails a link to it around the company. An employee clicks "Accept" on the consent screen without reading it closely. The app now has a standing grant to read that employee's mailbox — indefinitely, without ever needing their password, and without triggering another MFA prompt.

### The Flaw

Authorization got separated from the human. Once a token or a consent grant exists, the system checks the artifact, not the person or process that originally earned it. Anyone who can get hold of that artifact inherits everything it's allowed to do.

### How to Spot It

- **On-prem:** EDR/Sysmon alerts on `OpenProcess` calls with `PROCESS_QUERY_INFORMATION`/`PROCESS_DUP_HANDLE` access against high-privilege processes are a strong signal of token theft attempts.
- **Cloud:** review OAuth app consent grants regularly:
  ```powershell
  Get-MgOauth2PermissionGrant | Select-Object ClientId, ConsentType, Scope
  ```
  Look for apps with vague, misspelled, or unfamiliar names holding broad `Mail.Read`, `Files.ReadWrite.All`, or `Directory.Read.All` scopes.

### How to Fix It

- **On-prem:** restrict who can log on interactively or run scheduled tasks on servers that host privileged processes — this is standard "tiered admin" segregation.
- **Cloud:** restrict user consent so employees can't approve new apps without admin review, and periodically audit and revoke unused or suspicious app grants with `Remove-MgOauth2PermissionGrant`. Microsoft's own remediation guide for this exact scenario is linked in the references below.

## 4. Secret Custody: LSASS and Key Vault

### In Plain Language

Somewhere on every Windows machine, a process has to hold your actual credentials in memory so it can keep proving who you are without asking you to retype your password constantly. That process is LSASS (Local Security Authority Subsystem Service). In the cloud, the equivalent job — holding secrets so applications don't have to store passwords in their own code — is done by Azure Key Vault, often paired with a Managed Identity.

It's a safe in the back office. Necessary, because someone has to hold the cash — but it's also the first thing a robber goes looking for.

### Real Example

An attacker gets a foothold on a jump box that IT admins regularly RDP into. They wait. Eventually a Domain Admin logs on to fix something, and their credentials get cached in that machine's LSASS memory. The attacker runs a credential-dumping tool against the LSASS process, extracts the Domain Admin's hash, and now has a path to compromise the entire domain — without ever touching a domain controller directly.

### The Flaw

Centralizing secrets is the only practical way to run an OS or a cloud platform — but it also concentrates risk. Whatever process or vault holds the secrets becomes the single highest-value target in the environment, and anyone with sufficient access to that process (often just local admin) can read what it's holding.

### How to Spot It

- Watch for processes opening handles to `lsass.exe` — Sysmon Event ID 10 with `TargetImage` set to `lsass.exe` is the classic detection point, especially from tools like `procdump`, `taskmgr`, or unsigned binaries.
- In Azure, review Key Vault diagnostic logs for unexpected `SecretGet` or `SecretList` operations from identities that don't normally need them.

### How to Fix It

- **On-prem:** enable Credential Guard, which moves credential storage into a virtualized, isolated container that even a local admin can't read directly. Enable LSA Protection (RunAsPPL) so only signed, trusted processes can even attempt to open LSASS. Restrict who can RDP into servers where privileged accounts might log on.
- **Cloud:** move to Managed Identities wherever possible so applications never hold a literal secret at all. Scope Key Vault access policies (or RBAC roles) to the minimum needed, and use private endpoints so the vault isn't reachable from the open internet.

## 5. Credential Material: NTLM Hashes and Password Hash Sync

### In Plain Language

Windows doesn't store your password in plain text — it stores a mathematically derived hash of it. The problem is that, for older authentication (NTLM), the hash itself is enough to authenticate. You don't need to reverse it back into the real password; you can just hand over the hash directly. In hybrid environments, Entra Connect synchronizes a hash of that hash from on-prem AD up to Entra ID, so users can sign in to cloud services with the same password.

Imagine a lock that opens not with your key, but with a photocopy of the key's teeth pattern. If someone gets the photocopy, they don't need the original key at all.

### Real Example

Before LAPS (Local Administrator Password Solution) became standard, most organizations had the same local Administrator password on every workstation, imaged from one master build. Compromise one laptop, extract the local admin's NTLM hash, and an attacker can "pass the hash" straight into every other machine using that identical password — no cracking required, because the hash itself is the credential.

### The Flaw

NTLM's design predates the idea that a hash needs additional protection beyond not knowing the plaintext. In practice, the hash is functionally a password. Anywhere that hash is exposed — memory, network traffic, a badly secured sync server — is a place where identity can be stolen without anyone ever guessing a password.

### How to Spot It

- Audit NTLM usage across the domain (Windows can log every NTLM authentication event) — the goal is to know exactly where and why it's still in use, since it should be shrinking over time in favor of Kerberos.
- Watch for repeated logon events (Event ID 4624, logon type 3) from a single account across many machines in a short window — a common pass-the-hash pattern.

### How to Fix It

- Deploy LAPS so every machine's local admin password is unique and rotated automatically — this alone kills most pass-the-hash lateral movement.
- Put privileged accounts in the Protected Users group, which disables NTLM for them entirely.
- Treat your Entra Connect (or AD FS) server as a Tier 0 asset — the same security tier as a domain controller — because compromising it exposes every synced password hash in the organization at once.

## 6. Authorization List: ACLs and Azure RBAC

### In Plain Language

Every object in Active Directory — a user, a group, an OU, a file — has a list attached to it saying who's allowed to do what. That's the ACL (Access Control List), made up of individual entries (ACEs). In Azure, the same concept exists as role assignments: "this identity has the Contributor role on this resource group."

It's the guest list at the door. The list is the entire security model — if someone's on it who shouldn't be, or has more access than they need, the lock on the door doesn't matter.

### Real Example

A help desk technician was once given `GenericAll` permission on an Organizational Unit years ago, to help with a one-time migration project. Nobody ever removed it. `GenericAll` on an OU includes the ability to reset the password of any user account inside it — including, as it turns out, several accounts that were later added to the Domain Admins group and placed in that OU by mistake. The technician's account, still holding that forgotten permission, is now a viable path to full domain compromise, and nobody flagged it because their group memberships looked completely ordinary.

### The Flaw

Permissions accumulate and rarely get cleaned up. An ACL is only as safe as the last time someone actually reviewed it — and because the check happens silently at access time, an over-permissioned account looks identical to a properly scoped one until someone goes looking.

### How to Spot It

- Use `dsacls` or `Get-Acl` against sensitive OUs and objects to review non-default entries:
  ```powershell
  dsacls "OU=Finance,DC=contoso,DC=com" | Select-String "Allow"
  ```
- Tools like BloodHound are built specifically to map these hidden ACL-based attack paths across a whole domain — worth running periodically even outside a pentest.
- In Azure, audit role assignments regularly:
  ```powershell
  Get-AzRoleAssignment | Where-Object {$_.RoleDefinitionName -eq "Owner"}
  ```

### How to Fix It

- Remove ACEs that no longer map to a current, documented need — treat every non-default ACE as something that has to justify itself.
- Move privileged accounts into a tiered admin model so a help-desk-level account structurally can't hold rights over Domain Admin objects.
- In Azure, prefer scoped custom roles over broad built-in ones like Owner, and assign at the narrowest scope (resource, not subscription) that gets the job done.

## 7. Privilege Persistence: AdminSDHolder and PIM

### In Plain Language

Active Directory has a background job that runs roughly every 60 minutes and re-applies a specific, protective permission template to every account in a privileged group (Domain Admins, Enterprise Admins, and similar). That template lives on a special object called AdminSDHolder. In the cloud, Entra ID takes almost the opposite philosophy with Privileged Identity Management (PIM): instead of permanently protecting standing admin rights, it removes standing rights altogether and only grants them for a limited time when someone actively requests and justifies the need.

One approach reinforces a lock that's always on. The other removes the lock most of the time and only installs it temporarily when it's actually needed.

### Real Example

**On-prem — abusing AdminSDHolder itself:** an attacker who briefly holds Domain Admin doesn't touch group membership at all — that's too obvious and easily reverted. Instead, they add their own account directly to the ACL *on the AdminSDHolder object*. Because AdminSDHolder's permissions get copied down onto every protected account automatically, the attacker now silently has elevated rights over every Domain Admin, Enterprise Admin, and Schema Admin account — and that access re-applies itself every hour even if a defender notices and manually strips a specific permission somewhere else.

**Cloud — standing Global Admin:** an organization assigns three staff members permanent Global Administrator roles "for convenience." One of those accounts gets phished. The attacker now has full, always-on tenant control the moment they get valid credentials — no additional step required, because the privilege was never time-limited in the first place.

### The Flaw

Persistent privilege is efficient for admins and equally efficient for attackers. AdminSDHolder solves "how do we make sure a specific defensive ACL always reapplies" — but that same mechanism becomes a discreet, self-healing backdoor if an attacker gets to define what "the ACL" is, even briefly. PIM solves this from the other direction by minimizing how long privilege exists at all.

### How to Spot It

- **On-prem:** baseline the AdminSDHolder object's ACL when your environment is known-clean, then periodically diff it against the current state:
  ```powershell
  Get-Acl "AD:\CN=AdminSDHolder,CN=System,DC=contoso,DC=com" | Format-List
  ```
  Any unexpected principal on that list deserves immediate investigation.
- **Cloud:** review Entra ID directory role assignments and flag any Global Administrator, Privileged Role Administrator, or similar role held as a *permanent* (not PIM-eligible) assignment.

### How to Fix It

- **On-prem:** restore AdminSDHolder to its documented baseline and monitor it going forward — this isn't a one-time fix, it needs periodic review since it's an easy thing to forget about.
- **Cloud:** move every privileged role to PIM-eligible, time-bound, approval-required activation instead of standing assignment. Require MFA and, where possible, a justification and ticket reference for every activation.

## 8. Impersonation Chains: Kerberos Delegation and Managed Identities

### In Plain Language

Sometimes a service needs to act *as* a user to do its job — a web app that queries a database on your behalf, for example. Kerberos delegation is the mechanism that allows that impersonation on-prem. In Azure, a Managed Identity lets a resource (a VM, a function, a web app) authenticate and act with its own identity instead of a stored password — but that identity can be handed broad permissions too.

It's a power of attorney. Necessary for some jobs — but whoever holds it can act as you, for anything the document doesn't explicitly rule out.

### Real Example

**On-prem — unconstrained delegation:** an old intranet server was configured years ago with "unconstrained delegation" enabled, because at the time it made a specific integration easier. Unconstrained delegation means that server can impersonate *any* user who authenticates to it, for *any* downstream service — not just the one it was originally set up for. An attacker who compromises that server captures the Kerberos tickets of every user who logs into it that day, including, eventually, a Domain Admin doing routine maintenance — and now impersonates that Domain Admin anywhere in the domain.

**Cloud — an over-scoped managed identity:** a VM is given a Managed Identity with Contributor rights across the entire subscription, because it was easier than scoping it down during initial setup. An attacker exploits an unpatched web app running on that VM to get remote code execution. They don't need to steal any credentials — the VM's Managed Identity is right there, and it can now create, modify, or delete almost anything in the subscription.

### The Flaw

Delegation is a trust chain, and trust chains are only as strong as the weakest link that was ever added to them — often for convenience, years earlier, by someone who's since left the company. Nobody revisits "does this really still need to impersonate everyone" until it's actively exploited.

### How to Spot It

- **On-prem:** find every account or computer configured for unconstrained delegation:
  ```powershell
  Get-ADComputer -Filter {TrustedForDelegation -eq $true} -Properties TrustedForDelegation
  ```
  Microsoft Defender for Identity also flags unconstrained delegation configurations directly.
- **Cloud:** review the role assignments held by each Managed Identity, not just the resource it's attached to:
  ```powershell
  Get-AzRoleAssignment -ObjectId <managed-identity-object-id>
  ```

### How to Fix It

- **On-prem:** replace unconstrained delegation with constrained delegation (or resource-based constrained delegation), which limits impersonation to specific, named downstream services instead of "anyone, anywhere."
- **Cloud:** scope Managed Identity role assignments to the exact resource they need, not the subscription or resource group, and review them whenever a VM or app's purpose changes.

## 9. Trust Boundaries: Domain/Forest Trusts and Federation

### In Plain Language

Sometimes two separate Active Directory forests, or an on-prem environment and a cloud tenant, need to trust each other's authentication — so a user in one can access resources in the other without a second account. That's a trust relationship on-prem, and a federation trust or cross-tenant access setting in the cloud.

It's like two countries recognizing each other's passports. Convenient — but it also means a weakness in the other country's passport office becomes your problem too.

### Real Example

A company sets up a forest trust between its well-managed production forest and a lab/dev forest used for testing, because it's easier for engineers to reuse their accounts. The dev forest has looser patching and weaker password policies — practically expected for a test environment — and gets compromised first. Because the trust was configured without SID filtering enabled, the attacker uses SID History injection (see concept #1) inside the compromised dev forest to grant themselves the SID of a production Domain Admins group. The trust relationship — meant to be a convenience — becomes the exact bridge that carries the compromise into the environment everyone actually cared about protecting.

### The Flaw

A trust extends your authentication boundary to include someone else's security posture, whether that's a partner forest, a legacy domain, or an external Entra tenant. The risk isn't hypothetical or symmetric just because the trust is configured "one-way" on paper — the underlying mechanisms (SID History, claims, delegated auth) can still be abused unless explicitly hardened.

### How to Spot It

- **On-prem:** review every existing trust and confirm SID filtering / quarantining is actually enabled, not just assumed:
  ```powershell
  Get-ADTrust -Filter * | Select-Object Name, Direction, SIDFilteringForestAware, SIDFilteringQuarantined
  ```
- **Cloud:** review Entra ID cross-tenant access settings under External Identities — check which organizations have inbound/outbound trust for MFA and device compliance claims, and whether that list still matches active partnerships.

### How to Fix It

- Enable SID filter quarantining on every external trust, and only disable it within a single forest where it would break legitimate replication — never across a forest boundary.
- Remove trusts to forests or domains that no longer serve an active, documented business purpose — every unused trust is pure risk with no offsetting benefit.
- In the cloud, configure explicit, per-organization cross-tenant access settings instead of leaving broad defaults in place.

## 10. Policy Enforcement: Group Policy and Conditional Access

### In Plain Language

Group Policy is how Windows pushes security settings — password complexity, screen lock timeouts, which apps can run — out to every computer in the domain. It's applied at logon and refreshed periodically. Conditional Access is Entra ID's version, but it works differently: instead of just setting a rule once, it can re-evaluate in real time, checking things like device compliance, location, and sign-in risk on every single access attempt, not just at logon.

GPO is a rulebook handed out at the start of the shift. Conditional Access is a bouncer checking your ID again every time you go back inside.

### Real Example

An employee's laptop, fully compliant with all Group Policy settings, gets stolen from their car while they're still logged in. Group Policy already did its job at logon that morning — screen lock is set, password complexity was enforced when the password was created — but none of that stops the thief from simply continuing to use the already-unlocked session, or extracting cached credentials, because GPO has no mechanism to re-check anything mid-session. A cloud-connected environment with Conditional Access, by contrast, can detect that the device suddenly shows unusual sign-in behavior or fails a compliance check and cut off access to mail and files immediately, without waiting for the next logon.

### The Flaw

Group Policy's entire enforcement model is "check once, at logon, then trust the session for as long as it lasts." That was a reasonable design when everything happened inside a physical office network. It becomes a real gap when sessions are long-lived, devices are mobile, and the thing being protected (a cloud mailbox, a SaaS app) isn't sitting behind the same network boundary GPO was built to protect.

### How to Spot It

- Confirm which of your security controls are genuinely continuous versus logon-time-only. Run `gpresult /h report.html` on a sample of machines to see exactly what's actually being applied versus what's assumed.
- In Entra ID, review which apps and users are *not* covered by any Conditional Access policy — a surprisingly common gap is service accounts or legacy protocols left outside CA scope entirely.

### How to Fix It

- Don't try to make GPO do something it fundamentally can't — layer Conditional Access and Intune compliance policies on top for anything cloud-connected, so access can be revoked mid-session, not just blocked at next logon.
- Enable Continuous Access Evaluation where available, so a token can be invalidated in near-real-time when risk signals change, instead of waiting for it to naturally expire.
- For on-prem-only assets that can't benefit from Conditional Access, shorten session and idle-lock timeouts as a partial mitigation, since logon-time enforcement is the best that layer can offer.

## Takeaway

Every one of these ten items is a form of "issue once, trust for a while." That single pattern explains almost every major Windows and Entra ID attack technique in circulation — Golden Tickets, pass-the-hash, illicit consent grants, unconstrained delegation abuse, and over-permissioned managed identities are all the same move, aimed at a different link in the chain. You don't need ten separate mental models to defend against them. You need one: find out what's being trusted, how long it's trusted for, and whether anything ever re-checks it before the damage is done. Everything in this list — SID History audits, krbtgt resets, PIM, Conditional Access, LAPS, scoped RBAC — exists to shorten that window of blind trust.

## References

- [Security Identifiers – Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)
- [Kerberos authentication overview – Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)
- [Guidance about how to configure protected accounts – Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/how-to-configure-protected-accounts)
- [Protected Users Security Group in Windows Server – Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/protected-users-security-group)
- [Access Tokens – Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens)
- [Access tokens in the Microsoft identity platform – Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [Detect and remediate illicit consent grants – Microsoft Learn](https://learn.microsoft.com/en-us/defender-office-365/detect-and-remediate-illicit-consent-grants)
- [What is password hash synchronization with Microsoft Entra ID? – Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-phs)
- [Access Control Lists – Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists)
- [What is Azure role-based access control (Azure RBAC)? – Microsoft Learn](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)
- [What is Privileged Identity Management? – Microsoft Learn](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure)
- [Kerberos Constrained Delegation Overview – Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview)
- [Use Managed Identities with Azure Files – Microsoft Learn](https://learn.microsoft.com/en-us/azure/storage/files/files-managed-identities)
- [Security Considerations for Trusts – Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc755321(v=ws.10))
- [Plan a Conditional Access deployment – Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access)
- [OS Credential Dumping: LSASS Memory – MITRE ATT&CK](https://attack.mitre.org/techniques/T1003/001/)
- [Use Alternate Authentication Material: Pass the Hash – MITRE ATT&CK](https://attack.mitre.org/versions/v7/techniques/T1550/002/)

{{< post-cta >}}
