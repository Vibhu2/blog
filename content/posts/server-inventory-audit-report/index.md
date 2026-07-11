---
title: "One-Line Server Inventory & AD Audit Report"
date: 2025-10-04T10:00:00+05:30
draft: false
description: "Bootstrap VB.ServerInventory from a gist and produce a full server + AD audit report — stale accounts, BitLocker, GPOs, patches — in one run."
tags: ["PowerShell", "Active Directory", "Windows Server", "Automation", "Security", "Audit"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---

## Purpose

Every Windows environment I inherit has the same problem — nobody knows what's actually on the servers. Who's got a password older than a year? Which computers haven't checked in for six months? Is BitLocker actually on? This one-liner bootstraps `VB.ServerInventory` and produces a full server + AD audit report in a single run. No agent, no console, no license.

## What This Covers

- What the bootstrap script actually does (line by line)
- The report it produces and what's in it
- Which security baselines the audit checks map to
- How to run it and verify the output

## Before You Start

- Windows Server 2016+ or Windows 10/11 with PowerShell 5.1 or later
- Local admin on the target machine
- Domain admin (or delegated read) if you want the AD, GPO, and DHCP sections populated
- Internet access to reach PSGallery and the gist
- ExecutionPolicy needs to allow the run — the script sets `Unrestricted` for CurrentUser scope

## The Bootstrap

```powershell
Set-ExecutionPolicy Unrestricted -Scope CurrentUser -Force

# Enforce TLS 1.2 — PSGallery rejects older protocols
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Register PSGallery if it's missing (fresh servers often have no repos)
if (-not (Get-PSRepository -Name "PSGallery" -ErrorAction SilentlyContinue)) {
    Register-PSRepository -Default -ErrorAction Stop
}

# Trust PSGallery so Install-Module doesn't prompt
Set-PSRepository -Name "PSGallery" -InstallationPolicy Trusted

# Widen the console buffer so nothing scrolls off screen
$host.UI.RawUI.BufferSize = New-Object System.Management.Automation.Host.Size(500, 9000)

Get-PSRepository

# Pull and execute the inventory script from the gist
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
iex (Invoke-WebRequest "https://gist.githubusercontent.com/Vibhu2/9a4ecf03d30c35d27073c71a2d5f0d4d/raw/b0541f3663701a2b16d0e1a8fd4a4030f9bf70ee/gistfile1.txt" -UseBasicParsing).Content
```

The first block is prep — TLS, repo trust, buffer size. The last line is the actual work: it pulls the `Get-ServerInventory` script from a gist and runs it in the current session.

> **[!] WARNING:** `iex` on remote content is convenient but risky. Only run this against a gist you trust — or better, download the raw file, read it, and dot-source it locally.

## What the Report Contains

`Get-ServerInventory` runs a wide sweep across the machine and (if `-IncludeAD` is set) the domain. The output is grouped into sections:

**System & Hardware**

- OS build, BIOS, CPU, memory, uptime, last boot
- Disk usage per logical drive
- Network adapters — IP, DHCP vs static, DNS

**Software & Roles**

- Installed applications (from the registry uninstall keys — the reliable source)
- Windows Store apps
- Windows Features and Roles
- Installed hotfixes and updates
- Printers, drivers, and recent print jobs

**Directory & Network Services**

- AD domain info
- All GPOs
- DHCP scopes, reservations, exclusions
- DNS zones and forwarders
- SMB shares
- Active RDS / terminal sessions

**Security Posture**

- Azure AD / Entra join status (`dsregcmd /status`)
- BitLocker status and recovery key presence
- Windows Defender configuration

**Audit Findings** — this is the part that matters most

- Users inactive 90+ days
- Computers inactive 90+ days
- Accounts that have never logged in
- Expired user accounts
- Users with **Password Never Expires**
- Admin accounts with passwords older than 1 year
- Empty AD groups
- Accounts with **Password Not Required**

The report renders to console with colored section headers by default. Pass `-ExportCSV` and it writes to `$env:USERPROFILE\Desktop\ServerInventory-[timestamp]`.

## Why This Report Matters

Most SMBs and even mid-size shops don't run a proper audit until something breaks — a ransomware hit, a failed audit, a departing admin. This report gets you 80% of that visibility in one run. Specifically:

- **The stale-account checks catch abandoned identities** — the single most common initial-access vector in AD compromises
- **Password-age and never-expires findings** surface accounts that violate every modern baseline
- **BitLocker + Defender status** confirms two of the checks every cyber insurance renewal asks for
- **Inventory of installed apps and hotfixes** is what you hand a vulnerability team on day one

Run it quarterly on every server. Diff the CSVs. That's your change control.

## Standards This Aligns With

The script doesn't cite any standard directly — but the audit checks map cleanly to controls in every mainstream security baseline. The 90-day inactivity threshold, password-age checks, and privileged-account monitoring are lifted straight from these:

| Check | Aligns with |
| :--- | :--- |
| Inactive users / computers (90+ days) | CIS Controls v8 §6.2, NIST 800-53 AC-2(3), ISO 27001 A.9.2.6 |
| Password Never Expires / no password required | CIS Windows Benchmark §1.1.x, NIST 800-63B, Essential Eight ML1 |
| Admin passwords older than 1 year | CIS Controls v8 §5.4, NIST 800-53 IA-5(1) |
| BitLocker enforcement | CIS Windows Benchmark §18, NIST 800-171 3.13.11 |
| Windows Defender enabled | CIS Controls v8 §10.1, Essential Eight ML1 |
| Empty AD groups / group hygiene | CIS Controls v8 §6.8, ISO 27001 A.9.2.5 |
| Installed patches / hotfixes | CIS Controls v8 §7.3, NIST 800-53 SI-2 |

None of this replaces a formal audit. It gets you ready for one.

## Verify

After the script finishes:

```powershell
# Confirm the CSVs landed
Get-ChildItem "$env:USERPROFILE\Desktop\ServerInventory-*" | Select-Object Name, LastWriteTime

# Spot-check the audit section
Get-Content "$env:USERPROFILE\Desktop\ServerInventory-*\AuditFindings*.csv" | Select-Object -First 20
```

If the AD sections are empty, you're either not on a domain-joined machine or the account running the script doesn't have read access to AD. Re-run under an account with `Domain Users` at minimum.

## Notes

- Skip the Windows Store scan on servers — it's slow and returns nothing useful. Use `-SkipStore`
- On DCs, always pass `-IncludeAD` — otherwise you're only inventorying the box
- For fleet runs, wrap the bootstrap in `Invoke-Command` against a list of servers and dump each report to a share

## References

- [PSGallery — VB.ServerInventory](https://www.powershellgallery.com/packages/VB.ServerInventory)
- [CIS Controls v8](https://www.cisecurity.org/controls/v8)
- [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [ACSC Essential Eight](https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight)
- [Microsoft — dsregcmd status](https://learn.microsoft.com/en-us/azure/active-directory/devices/troubleshoot-device-dsregcmd)

{{< post-cta module="VB.ServerInventory" module_url="https://www.powershellgallery.com/packages/VB.ServerInventory" >}}
