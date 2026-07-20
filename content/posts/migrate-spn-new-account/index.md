---
title: "Migrate a Kerberos SPN to a New Service Account"
date: 2026-07-20T07:30:24+05:30
draft: false
description: "Deregister a Kerberos SPN from an old account and register it on a new one, with diagnostics to inventory and verify SPNs before and after."
tags: ["Active Directory", "Windows Server", "Kerberos", "SPN"]
categories: ["Windows Administration"]
author:
  name: Vibhu Bhatnagar
---

## What This Covers
How to move a Kerberos Service Principal Name (SPN) from one account to another — the manual step migrations, server renames, and account swaps don't do for you.

## Before You Start

- Domain Admin or delegated `Validated write to servicePrincipalName` rights on both the old and new accounts
- `setspn.exe` (built into Windows Server, RSAT-AD-Tools on clients)
- The exact SPN string you're moving — run `setspn -Q <SPN>` if you're not sure who currently holds it
- A maintenance window: clients holding cached Kerberos tickets against the old SPN mapping will keep failing until tickets expire or are purged

## Steps

### Step 1: Inventory all SPNs on an account
Before touching anything, see the full picture — every SPN a given service or machine account currently holds:
```powershell
setspn -L OLDDOMAIN\OldServiceAccount
```
For a server's own computer account (its `HOST/` and auto-registered SPNs):
```powershell
setspn -L OLDDOMAIN\SERVERNAME$
```
This matters because accounts often carry more SPNs than the one you're actively migrating — a SQL server, for example, might hold `MSSQLSvc/server:1433`, `MSSQLSvc/server.fqdn:1433`, and a few `HTTP/` entries for Reporting Services. Moving one and missing the rest is how half your auth breaks and half doesn't.

### Step 2: Confirm current registration of the specific SPN
```powershell
setspn -Q HTTP/service.domain.com
```
This tells you exactly which account owns this SPN. Don't skip this even after Step 1 — it's your last check before you delete anything.

### Step 3: Deregister from the old account
```powershell
setspn -D HTTP/service.domain.com OLDDOMAIN\OldServiceAccount
```
`-D` removes the SPN outright. If it was auto-registered on a computer object (`HOST/` SPNs), it's tied to that machine account, not a service account — target the computer name instead.

### Step 4: Register on the new account
```powershell
setspn -S HTTP/service.domain.com NEWDOMAIN\NewServiceAccount
```
Use `-S`, not `-A`. `-S` checks the whole forest for duplicates before adding; `-A` doesn't. A duplicate SPN across two accounts is the classic cause of intermittent Kerberos failures that look like a network issue.

### Step 5: Check for duplicates forest-wide
```powershell
setspn -X
```
Run this after every SPN move. A leftover copy on the old account — from a rushed migration months ago — will keep breaking auth on a schedule nobody can explain.

### Step 6: Point the service at the new account
Update the service's logon identity — Services console, IIS app pool identity, SQL service account, whatever's hosting it — to the new account, then restart the service.

## Verify

**Server side** — confirm the SPN sits where you expect:
```powershell
setspn -L NEWDOMAIN\NewServiceAccount
```

**Client side** — see what a specific machine is actually requesting and holding tickets for:
```powershell
klist
```
This lists every service ticket currently cached on that machine — a direct view of which SPNs it's authenticating against right now. If the old SPN still shows up in a client's ticket cache after the move, purge and re-test:
```powershell
klist purge
klist get HTTP/service.domain.com
```
A clean ticket for the new mapping, with no fallback prompt or NTLM negotiation, confirms the move held.

## Notes

Situations where this comes up in practice:

- **Service account swap** — moving an app pool from a legacy domain user to a gMSA
- **Server migration or rename** — SQL or IIS moves to a new hostname; the SPN doesn't follow automatically
- **Domain/forest migration** — ADMT-style moves often leave orphaned or duplicate SPNs behind
- **Cluster or load balancer changes** — the SPN needs to sit on the cluster's service account, not an individual node
- **Decommissioned servers reused** — a new box inherits an old hostname and picks up ghost SPN errors from a computer account that was never cleaned up

Run `setspn -L` on both accounts as a standing diagnostic whenever Kerberos auth looks flaky, even outside a migration — it's the fastest way to rule SPNs in or out as the cause.

## References

- [setspn command reference — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setspn)
- [Service Principal Names (SPN) — Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names)
- [klist command reference — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist)
- [Troubleshooting Kerberos errors — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-errors)

{{< post-cta >}}
