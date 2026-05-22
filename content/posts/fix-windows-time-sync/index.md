---
title: "Fix Windows Time Sync with w32tm"
date: 2026-05-22T10:00:00+05:30
draft: false
description: "Unified script that detects domain membership and applies the correct NTP fix — AD hierarchy for domain machines, public NTP for workgroup."
tags: ["PowerShell", "Windows", "Windows Server", "NTP", "w32tm"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---

## Purpose

Windows system clock drifting or refusing to sync. This script detects whether the machine is domain-joined and takes the correct NTP path automatically — no manual branching needed.

## Approach

- If domain-joined → restore AD hierarchy sync (fighting domain policy with internet NTP is a support ticket waiting to happen)
- If workgroup/standalone → configure public NTP peers and force resync

## The Script

Run as Administrator:

```powershell
$isDomainJoined = (Get-CimInstance Win32_ComputerSystem).PartOfDomain

if ($isDomainJoined) {
    Write-Host "Domain-joined — syncing from AD hierarchy" -ForegroundColor Cyan
    w32tm /config /syncfromflags:domhier /update
    Restart-Service w32time
    w32tm /resync /force
} else {
    Write-Host "Workgroup machine — configuring public NTP" -ForegroundColor Cyan
    w32tm /config /manualpeerlist:"time.google.com time.cloudflare.com pool.ntp.org" /syncfromflags:manual /reliable:no /update
    Restart-Service w32time
    w32tm /resync /force
}
```

## If Resync Fails

Re-register the Windows Time Service, then re-run the script above:

```powershell
Stop-Service w32time
w32tm /unregister
w32tm /register
Start-Service w32time
w32tm /resync /force
```

## Result

```powershell
w32tm /query /status   # sync status, stratum, last sync time
w32tm /query /source   # confirms which source responded
```

Domain machines should show a DC as the source. Workgroup machines should show one of the configured NTP peers.

## Reliable Public NTP Servers

| Server | Owner |
| :--- | :--- |
| `time.google.com` | Google |
| `time.cloudflare.com` | Cloudflare |
| `pool.ntp.org` | NTP Pool Project |
| `time.windows.com` | Microsoft |

> **[i] Tested on:** Windows 10/11, Windows Server 2019–2022
> **[i] Requires:** Local Administrator (or Domain Admin for domain time config)

{{< post-cta >}}
