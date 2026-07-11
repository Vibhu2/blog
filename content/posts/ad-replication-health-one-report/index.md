---
title: "One PowerShell Report for AD Replication Troubleshooting"
date: 2026-07-11T09:00:00+05:30
draft: false
description: "Test-VBReplicationHealth runs every AD, DFSR, SYSVOL, NETLOGON, event-log, and FSMO check in one pass and prints a colour-coded report."
tags: ["PowerShell", "Active Directory", "Windows Server", "DFSR", "SYSVOL", "FRS"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---

## Purpose

Every AD replication issue turns into the same routine — `repadmin /showrepl`, `dfsrdiag replicationstate`, `dfsrmig /GetMigrationState`, GPO version compares, event log spelunking, share checks. Different console for each, output that doesn't line up, and half of them run only on a DC.

`Test-VBReplicationHealth.ps1` replaces that dance with a single script that runs every one of those checks and returns one colour-coded report — plus a structured object you can pipe or export.

> **[i] Tested on:** Windows Server 2019, 2022, PowerShell 5.1 and 7.4
> **[i] Requires:** Domain user with read access to AD + SYSVOL. Runs from a DC, a management box with RSAT, or any domain-joined server.

## What it checks

| Section | What runs |
| :--- | :--- |
| **DC inventory** | DNS resolution + ping for every DC in the domain |
| **Server inventory** | All `OperatingSystem -like '*Server*'` computer objects, online state, OS version |
| **SYSVOL replication mode** | 4-tier detection — `dfsrmig.exe` → AD LDAP (`msDFSR-Enabled`) → service state → registry. Surfaces *which method* answered |
| **AD replication** | `Get-ADReplicationPartnerMetadata` for every source→destination pair. Age of last success, consecutive failures, partner type |
| **DFSR / FRS detail** | `dfsrdiag.exe replicationstate /verbose` (authoritative) with WMI `DfsrConnectionInfo` fallback. Parses replication state per RG/RF/partner |
| **Event log check** | DFS Replication and File Replication Service logs, level 2+3, split into last 24h (counts toward score) and 24h–7d (informational) |
| **SYSVOL consistency** | Reads `GPT.ini` version from every DC's SYSVOL and diffs. Flags both policy-count mismatches and version drift |
| **NETLOGON / SYSVOL shares** | `Test-Path \\DC\NETLOGON` and `\\DC\SYSVOL` per DC — the ones that always break before replication does |
| **FSMO roles** | Schema, Domain Naming, PDC, RID, Infrastructure — plus ping test on each holder |
| **Overall score** | Percentage, rated EXCELLENT / GOOD / FAIR / CRITICAL, plus a bulleted "items requiring attention" block |

The whole thing runs in under a minute on a domain with a handful of DCs.

## Why one report matters

Troubleshooting AD replication is usually not one broken thing — it's one broken thing plus five things that *look* wrong because you're only seeing them for the first time. A stale DC. A SYSVOL access denied. An event 4012 from three days ago. A missing GPO on one DC.

Running seven separate tools in seven different formats makes it easy to miss which of those actually matters right now. One report, one format, one health score — the noise stays in the log, the real issue stands out in red.

## Design notes worth calling out

- **Data / display split** — `Get-*` functions return objects, `Write-*` functions render them. Same data feeds the console table, the returned `PSCustomObject`, and the `-ExportCsv` output.
- **4-tier SYSVOL mode detection** — most scripts only check the service or the registry. Both lie during a migration. Starting with `dfsrmig.exe /GetMigrationState` is the only reliable answer on Server 2008+; the other three tiers are fallbacks for when it isn't available.
- **AD LDAP query searches the whole domain tree, not `OU=Domain Controllers`** — that OU path is not reliable on every domain. Every DC I've hit that has a customised OU structure trips scripts that hard-code the path.
- **Event log split into two windows** — last 24h counts toward the health score, 24h–7d shows as informational. Old errors shouldn't drag today's score down, but you still want to see them.
- **SYSVOL policy-count mismatch is flagged separately from version drift** — a DC missing a policy entirely is a different failure mode than a stale version, and it deserves its own line.

## Run it

Grab the script from GitHub — it's in my [PowershellScripts](https://github.com/Vibhu2/PowershellScripts/blob/main/Miscelinous_Scripts/Test-VBReplicationHealth2.ps1) repo:

```powershell
# Direct run
.\Test-VBReplicationHealth2.ps1

# The script auto-invokes Test-VBReplicationHealth at the bottom.
# Dot-source it if you want to call the function with parameters:
. .\Test-VBReplicationHealth2.ps1
Test-VBReplicationHealth -WarningThresholdHours 4 -ExportCsv
Test-VBReplicationHealth -QuickMode   # skips DFSR detail + event log
```

Parameters:

| Parameter | Purpose |
| :--- | :--- |
| `-WarningThresholdHours` | AD replication age (hours) before a partner flips to Warning. Default 2. |
| `-QuickMode` | Skips DFSR/FRS detail and event log. Useful for a fast heartbeat check. |
| `-ExportCsv` | Dumps all connection results to CSV. Path default: `$env:TEMP\ReplicationReport_<timestamp>.csv` |
| `-ExportPath` | Override the CSV path. |

The function also **returns a `PSCustomObject`** with `HealthPct`, `Status`, `ReplMode`, `SysvolConsistent`, `Summary` counts, and the full `Results` array — so you can pipe it into a monitoring tool, a report, or a Slack webhook.

## Verify

Success looks like this at the end:

```text
SUMMARY
-------
  Overall Health  : 100% (EXCELLENT)
  Replication Mode: DFSR (via dfsrmig.exe)
  SYSVOL Sync     : Consistent
  AD Replication  : 6 OK  0 WARN  0 FAIL
  DFSR/FRS        : 12 OK  0 WARN  0 FAIL
  Completed in    : 18.4s on DC01
```

Anything less than EXCELLENT prints an `[!] Items requiring attention:` block with the exact source→destination pair, the status, and the underlying error or state — so the next command you type is targeted, not a fishing trip.

## References

- [Get-ADReplicationPartnerMetadata](https://learn.microsoft.com/powershell/module/activedirectory/get-adreplicationpartnermetadata) — Microsoft Learn
- [dfsrdiag replicationstate](https://learn.microsoft.com/windows-server/storage/dfs-replication/dfsrdiag-replicationstate) — DFSR diagnostic reference
- [dfsrmig migration state values](https://learn.microsoft.com/windows-server/storage/dfs-replication/migrate-sysvol-to-dfsr) — SYSVOL FRS-to-DFSR migration
- [DFSR WMI provider (`DfsrConnectionInfo`)](https://learn.microsoft.com/previous-versions/windows/desktop/dfsr/dfsrconnectioninfo) — connection state codes
- Script source: [PowershellScripts/Miscelinous_Scripts/Test-VBReplicationHealth2.ps1](https://github.com/Vibhu2/PowershellScripts/blob/main/Miscelinous_Scripts/Test-VBReplicationHealth2.ps1)

{{< post-cta >}}
