---
title: "The Complete MSIEXEC Reference Guide"
date: 2026-08-10T10:00:00+05:30
draft: true
description: "A complete msiexec reference: install, repair, uninstall switches, logging, exit codes, and PowerShell GUID extraction."
tags: ["Windows", "PowerShell", "Windows Administration", "Server", "MSI", "msiexec"]
categories: ["Windows Administration"]
author:
  name: Vibhu Bhatnagar
---
<!--
BEFORE PUBLISHING:
  1. Write your description — shown in post listings and Google
  2. Add relevant tags  — e.g. ["PowerShell", "Active Directory", "Windows Server"]
  3. Set category      — e.g. "PowerShell Automation", "Infrastructure", "Azure"
  4. Change draft: true → draft: false when ready to publish
-->

A practical reference for Windows Installer (`msiexec.exe`) — repair, install, uninstall, logging, and the switches that actually matter in day-to-day sysadmin work.

## What `msiexec` Actually Is

`msiexec.exe` is the engine that interprets `.msi` (Windows Installer) packages. Every MSI-based app — not EXE wrappers like InstallShield bootstrap, but true `.msi` packages — is installed, repaired, modified, and removed through this one binary. It can target a package two ways:

- **By file path** — `msiexec /i "C:\Installers\App.msi"` — points directly at the source file.
- **By product code (GUID)** — `msiexec /f {8686D2A9-3A3F-4B7D-ACE5-37387C5344AC}` — looks up an *already-installed* product using its registered product code, and pulls the cached source from `C:\Windows\Installer\` or the registered `SourceList`.

Both resolve to the same install — the GUID form just skips needing to know (or have) the original file on hand, provided the local cache/source list is intact.

## Core Action Switches

| Switch | Action |
|---|---|
| `/i <package\|productcode>` | Install or configure a product |
| `/f <package\|productcode>` | Repair a product (see repair sub-flags below) |
| `/x <package\|productcode>` | Uninstall a product |
| `/a <package>` | Administrative install — extracts/unpacks to a network image, doesn't install locally |
| `/j<u\|m> <package>` | Advertise the app (per-user `/ju` or per-machine `/jm`) — makes it available without fully installing |
| `/p <patch>` | Apply a patch (`.msp`) |
| `/uninstall <patch>` | Remove a patch |

## Repair (`/f`) — Full Sub-Flag Breakdown

`/f` alone defaults to `/fpecms`, a reasonable middle-ground repair. Combine letters to control exactly what gets checked and rewritten.

| Flag | Rechecks / rewrites... |
|---|---|
| `p` | File missing |
| `o` | File missing, or an **older** version is installed |
| `e` | File missing, or an **equal or older** version is installed |
| `d` | File missing, or a **different** version is installed |
| `c` | File missing, or the installed file's checksum doesn't match |
| `a` | **Force** — reinstall all files regardless of version or checksum |
| `u` | Rewrite all required **user-specific** registry entries |
| `m` | Rewrite all required **machine-specific** registry entries |
| `s` | Overwrite all existing **shortcuts** |
| `v` | Re-cache the local package (runs from source, refreshes the local `.msi` cache in `C:\Windows\Installer`) |

### Repair examples — by GUID

```powershell
# Standard repair, full UI
msiexec /f {8686D2A9-3A3F-4B7D-ACE5-37387C5344AC}

# Force-reinstall everything, quiet with basic progress bar
msiexec /fa {8686D2A9-3A3F-4B7D-ACE5-37387C5344AC} /qb
```

### Repair examples — by installer path

```powershell
# Only replace files that are missing entirely
msiexec /fp "C:\Installers\SomeApp\SomeApp.msi"

# Missing or wrong-version files, no UI at all
msiexec /fd "C:\Installers\SomeApp\SomeApp.msi" /qn

# Full nuke-and-repave: all files, all registry, all shortcuts, re-cache
msiexec /famus "C:\Installers\SomeApp\SomeApp.msi" /qb

# Silent, fully unattended — typical for RMM/SCCM remediation
msiexec /fa "C:\Installers\SomeApp\SomeApp.msi" /qn
```

> **[!] WARNING:** `/f` and `/fa` need access to the original MSI source — either the cached copy in `C:\Windows\Installer\{GUID}.msi`, or the path/network share registered in the product's `SourceList` registry key. If that cache is missing (common after aggressive cleanup tools clear `C:\Windows\Installer`), repair fails with error **1612** or **1706** ("this installation source could not be found"). Pointing `/f` at an explicit file path sidesteps this — but the file should match the originally installed version, or components can mismatch.

## Install / Uninstall

```powershell
# Standard silent install
msiexec /i "C:\Installers\App.msi" /qn

# Install with a log file
msiexec /i "C:\Installers\App.msi" /qn /l*v "C:\Temp\install.log"

# Uninstall by product code (safest — doesn't require the original file)
msiexec /x {8686D2A9-3A3F-4B7D-ACE5-37387C5344AC} /qn

# Uninstall by file path
msiexec /x "C:\Installers\App.msi" /qn
```

`/x` by GUID is generally preferred for uninstalls in remote/scripted contexts — it doesn't depend on the original installer file still existing anywhere.

## UI Level Switches (`/q`)

Control how much (if anything) the user sees during any action:

| Switch | Behavior |
|---|---|
| `/qn` | No UI at all — fully silent |
| `/qb` | Basic UI — progress bar only, no cancel option by default |
| `/qb-` | Basic UI, no "Cancel" button shown |
| `/qb+` | Basic UI, shows a modal completion dialog at the end |
| `/qr` | Reduced UI — progress bar, no modal dialogs |
| `/qf` | Full UI — everything, including modal dialogs (default if `/q` omitted) |

For unattended remediation via RMM or SCCM, `/qn` is the standard choice. `/qb` is useful when you *want* the end user to see something is happening but shouldn't interact with it.

## Logging (`/l`)

Logging is the single most useful troubleshooting tool for a failed MSI action — always attach it when diagnosing.

```powershell
msiexec /i "C:\Installers\App.msi" /qn /l*v "C:\Temp\install.log"
```

| Flag | Logs |
|---|---|
| `/l*` | Verbose logging, all standard info (the practical default for troubleshooting) |
| `/l*v` | Verbose + extra detail (recommended combo for real debugging) |
| `/lv` | Verbose only |
| `/le` | Error messages only |
| `/lw` | Non-fatal warnings |
| `/lp` | Terminal properties |
| `/l+` | Append to an existing log file instead of overwriting |
| `/l!` | Flush each line to disk immediately (useful if the process might be killed mid-run) |

> **[i] INFO:** Without `/l*v`, a failed silent install just disappears with no explanation. Always log during first-time deployment testing, even if you plan to run silent-without-logging afterward.

## Common Properties (`PROPERTY=VALUE`)

Passed at the end of the command line, these override values the MSI package would otherwise prompt for or default to:

```powershell
msiexec /i "C:\Installers\App.msi" /qn INSTALLDIR="D:\Apps\MyApp" ALLUSERS=1
```

| Property | Purpose |
|---|---|
| `ALLUSERS=1` | Install for all users on the machine (vs. just the current user) |
| `REBOOT=ReallySuppress` | Prevent an automatic reboot after install, even if the package wants one |
| `INSTALLDIR=` | Override the default install path (property name varies by vendor — check the MSI's property table) |
| `TRANSFORMS=` | Apply an `.mst` transform file to customize the install |
| `MSIRESTARTMANAGERCONTROL=Disable` | Disable Restart Manager's app-closing prompts during install |

> **[i] INFO:** Property names are package-defined, not universal — `INSTALLDIR` is common but not guaranteed. Check with `msiexec /i package.msi /qn /l*v log.txt` and search the log for `PROPERTY CHANGE`, or open the MSI in Orca/InstEd to see its actual property table.

## Common Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1602` | User cancelled install |
| `1603` | Fatal error during installation (generic catch-all — check the log) |
| `1618` | Another install is already in progress |
| `1619` | Installation package could not be opened (bad path or corrupt file) |
| `1620` | Installation package could not be opened (invalid MSI) |
| `1638` | Another version of this product is already installed |
| `1612` | Installation source not available (missing cached `.msi`) |
| `1706` | No valid source could be found for the product |
| `3010` | Success, but a reboot is required |

## Extracting Installed Application GUIDs (PowerShell)

Avoid `Get-CimInstance Win32_Product` (or the older `Get-WmiObject` form) for this — querying it triggers a consistency-check/reconfigure pass against **every** installed MSI package, which is a documented performance and stability risk, especially on servers. Read the uninstall registry keys directly instead.

### Basic — current architecture only

```powershell
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" |
    Where-Object { $_.DisplayName } |
    Select-Object DisplayName, DisplayVersion, PSChildName |
    Sort-Object DisplayName
```

`PSChildName` is the product code (GUID) — the registry key itself is named after it.

> **[!] WARNING:** On 64-bit Windows, 32-bit applications register under a separate `WOW6432Node` path. Skip it and you silently lose roughly half your installed apps from the results.

### Complete — 32-bit + 64-bit, MSI GUIDs only

```powershell
$paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

Get-ItemProperty $paths -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -and $_.PSChildName -match '^\{[0-9A-F-]{36}\}$' } |
    Select-Object DisplayName, DisplayVersion,
                  @{N='ProductCode'; E={$_.PSChildName}} |
    Sort-Object DisplayName
```

The `PSChildName -match '^\{[0-9A-F-]{36}\}$'` filter excludes EXE-based installers that also write to this key but don't use a GUID key name — important if you're piping the result straight into `msiexec /fa {GUID}`, since a non-GUID entry will just error out.

### Export to CSV (useful for a multi-tenant audit)

```powershell
Get-ItemProperty $paths -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -and $_.PSChildName -match '^\{[0-9A-F-]{36}\}$' } |
    Select-Object DisplayName, DisplayVersion,
                  @{N='ProductCode'; E={$_.PSChildName}} |
    Sort-Object DisplayName |
    Export-Csv "C:\Temp\InstalledApps.csv" -NoTypeInformation
```

### Per-user installs (HKCU context)

Some products register only under the current user rather than machine-wide:

```powershell
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" |
    Where-Object { $_.DisplayName } |
    Select-Object DisplayName, DisplayVersion, PSChildName |
    Sort-Object DisplayName
```

## Quick Reference — Building Your Own Command

```text
msiexec [/i | /f<flags> | /x | /a] <package.msi | {ProductCode}> [/q<n|b|r|f>] [/l<flags> "path"] [PROPERTY=VALUE ...]
```

**Example — a full unattended repair with logging:**

```powershell
msiexec /famus {8686D2A9-3A3F-4B7D-ACE5-37387C5344AC} /qn /l*v "C:\Temp\repair.log" REBOOT=ReallySuppress
```

This forces a full file/registry/shortcut repair with re-caching, runs completely silently, logs everything verbosely, and blocks any automatic reboot.

## References

- [Microsoft Learn — Msiexec.exe command-line options](https://learn.microsoft.com/en-us/windows/win32/msi/command-line-options)
- [Microsoft Learn — Standard installer command-line options](https://learn.microsoft.com/en-us/windows/win32/msi/standard-installer-command-line-options)
- [Microsoft Learn — Error codes](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes)

{{< post-cta >}}