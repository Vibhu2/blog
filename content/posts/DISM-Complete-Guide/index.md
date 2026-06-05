---
title: "DISM: The Windows Administrator's Complete Guide"
date: 2026-06-05T10:00:00+05:30
draft: true
description: "The complete DISM command reference — health repair, component cleanup, features, drivers, packages, and offline image servicing."
tags: ["Windows", "Windows Administration", "Windows Server", "DISM", "WinSxS", "Image Servicing"]
categories: ["Windows Administration"]
author:
  name: Vibhu Bhatnagar
---

## What This Covers

DISM (Deployment Image Servicing and Management) operates at the component store level — below the reach of most other utilities. This makes it the correct tool for repairing corrupted system images, managing Windows features and capabilities, servicing offline WIM files, and reclaiming disk space consumed by the WinSxS folder. Whether you're troubleshooting a degraded server or building a reference image, this is the complete command reference.

> **[i] Prerequisite:** Every command that modifies system state must be run from an **elevated Command Prompt or PowerShell**. The default log is written to `C:\Windows\Logs\DISM\dism.log`.

---

## Before You Start

- Elevated Command Prompt or PowerShell is required for all write operations
- `RestoreHealth` requires an internet connection unless `/Source` is specified
- For image servicing operations, you'll need a WIM/ESD file and an empty mount directory
- `/ResetBase` is irreversible — read the warning before running it

---

## Health Check & Repair

The three health commands form a progressive pipeline. Each stage costs more time but provides more information and capability.

**Quick health flag check** — reads a cached flag; returns instantly with no scanning:

```cmd
DISM /Online /Cleanup-Image /CheckHealth
```

**Deep corruption scan** — walks the full Component Store manifest to detect repairable damage (2–5 minutes, no changes made):

```cmd
DISM /Online /Cleanup-Image /ScanHealth
```

**Repair Component Store** — downloads replacement files from Windows Update and applies them:

```cmd
DISM /Online /Cleanup-Image /RestoreHealth
```

**Repair using a local WIM source** — for air-gapped or offline environments:

```cmd
DISM /Online /Cleanup-Image /RestoreHealth /Source:wim:D:\sources\install.wim:1 /LimitAccess
```

**Repair using multiple local sources** — DISM tries each in order:

```cmd
DISM /Online /Cleanup-Image /RestoreHealth /Source:D:\RepairSource /Source:E:\RepairSource
```

---

## Component Store Cleanup & Optimisation

The WinSxS folder retains superseded update components so updates can be uninstalled. Over time this grows substantially. Always analyse before cleaning.

**Analyse WinSxS** — reports reclaimable space without making changes:

```cmd
DISM /Online /Cleanup-Image /AnalyzeComponentStore
```

**Remove superseded components** — safe cleanup; preserves the ability to uninstall recent updates:

```cmd
DISM /Online /Cleanup-Image /StartComponentCleanup
```

**Aggressive cleanup** — removes *all* superseded versions:

```cmd
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

> **[!] WARNING:** `/ResetBase` is irreversible. Update rollback is no longer possible after this. Only run on fully patched, stable systems.

**Post-service pack cleanup** — removes SP installation backup files (primarily for older Windows versions):

```cmd
DISM /Online /Cleanup-Image /SPSuperseded
```

---

## Feature Management

Optional Windows features — Hyper-V, IIS, .NET Framework, Telnet, SMB protocols — are managed here. Features are either Enabled, Disabled, or Disabled with payload removed.

**List all features:**

```cmd
DISM /Online /Get-Features /Format:Table
```

**Get details on a specific feature:**

```cmd
DISM /Online /Get-FeatureInfo /FeatureName:SMB1Protocol
```

**Enable a feature:**

```cmd
DISM /Online /Enable-Feature /FeatureName:NetFx3
```

**Enable with all dependencies:**

```cmd
DISM /Online /Enable-Feature /FeatureName:NetFx3 /All
```

**Disable a feature:**

```cmd
DISM /Online /Disable-Feature /FeatureName:SMB1Protocol
```

**Disable and remove payload from disk** — frees space; files must be re-downloaded if re-enabled:

```cmd
DISM /Online /Disable-Feature /FeatureName:TelnetClient /Remove
```

---

## Windows Capability Management

Capabilities are higher-level optional components downloaded on demand — not bundled in the base image. Common examples: OpenSSH, RSAT, language packs, OCR, handwriting recognition.

**List all capabilities:**

```cmd
DISM /Online /Get-Capabilities
```

**Get details on a specific capability:**

```cmd
DISM /Online /Get-CapabilityInfo /CapabilityName:OpenSSH.Client~~~~0.0.1.0
```

**Add a capability:**

```cmd
DISM /Online /Add-Capability /CapabilityName:OpenSSH.Client~~~~0.0.1.0
```

**Remove a capability:**

```cmd
DISM /Online /Remove-Capability /CapabilityName:OpenSSH.Client~~~~0.0.1.0
```

---

## Package Management

Packages are individual updates or hotfixes distributed as CAB or MSU files. This is the primary method for applying updates in air-gapped environments where Windows Update is unavailable.

**List installed packages:**

```cmd
DISM /Online /Get-Packages /Format:Table
```

**Get details on a specific package:**

```cmd
DISM /Online /Get-PackageInfo /PackageName:<PackageName>
```

**Add a CAB or MSU package:**

```cmd
DISM /Online /Add-Package /PackagePath:C:\Updates\update.cab
```

**Remove a package:**

```cmd
DISM /Online /Remove-Package /PackageName:<PackageName>
```

---

## Driver Management

DISM provides full lifecycle management for third-party (OEM) drivers — particularly useful for image preparation, driver backup before reimaging, and injecting drivers into offline images.

**List installed third-party drivers:**

```cmd
DISM /Online /Get-Drivers /Format:Table
```

**Get details on a specific driver:**

```cmd
DISM /Online /Get-DriverInfo /Driver:oem10.inf
```

**Add a driver from a folder:**

```cmd
DISM /Online /Add-Driver /Driver:C:\Drivers
```

**Add drivers recursively** — searches all subfolders:

```cmd
DISM /Online /Add-Driver /Driver:C:\Drivers /Recurse
```

**Remove a driver:**

```cmd
DISM /Online /Remove-Driver /Driver:oem10.inf
```

**Export all OEM drivers to a backup folder** — run this before reimaging:

```cmd
DISM /Online /Export-Driver /Destination:C:\DriverBackup
```

---

## Edition Management

DISM can upgrade a Windows installation to a higher edition in-place using a product key — no reinstall required. Primarily used on Windows Server to move from Standard to Datacenter.

**Check the current edition:**

```cmd
DISM /Online /Get-CurrentEdition
```

**List available upgrade targets:**

```cmd
DISM /Online /Get-TargetEditions
```

**Upgrade to a target edition:**

```cmd
DISM /Online /Set-Edition:ServerDatacenter /ProductKey:XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
```

---

## International Settings

Useful when deploying localised images or correcting locale misconfiguration after an in-place upgrade.

**Display all current language and locale settings:**

```cmd
DISM /Online /Get-Intl
```

**Set system locale** (affects date, time, and number formats system-wide):

```cmd
DISM /Online /Set-SysLocale:en-US
```

**Set user locale** (affects the current user's regional format preferences):

```cmd
DISM /Online /Set-UserLocale:en-US
```

**Set input locale** (keyboard layout):

```cmd
DISM /Online /Set-InputLocale:0409:00000409
```

---

## Reserved Storage Management

Windows reserves a portion of disk space for updates, temporary files, and system caches. On storage-constrained devices this can be reclaimed.

**Check reserved storage status:**

```cmd
DISM /Online /Get-ReservedStorageState
```

**Disable reserved storage:**

```cmd
DISM /Online /Set-ReservedStorageState /State:Disabled
```

**Re-enable reserved storage:**

```cmd
DISM /Online /Set-ReservedStorageState /State:Enabled
```

---

## AppX Provisioned Apps

Provisioned apps are the built-in UWP applications (Xbox, Tips, Maps, etc.) that Windows pre-stages for every new user account. Removing them from the provisioned list prevents them from installing for future users — useful for slimming enterprise images.

**List all provisioned apps:**

```cmd
DISM /Online /Get-ProvisionedAppxPackages
```

**Remove a built-in app from the provisioned list:**

```cmd
DISM /Online /Remove-ProvisionedAppxPackage /PackageName:<PackageName>
```

**Add a provisioned app:**

```cmd
DISM /Online /Add-ProvisionedAppxPackage
```

---

## Windows PE & Offline Image Servicing

This is where DISM's real power lies for image engineering teams. Instead of updating live machines, you mount a WIM, apply patches and drivers offline, then capture or deploy the result — dramatically faster at scale.

**Mount a WIM image:**

```cmd
DISM /Mount-Image /ImageFile:C:\install.wim /Index:1 /MountDir:C:\Mount
```

**Unmount and save changes:**

```cmd
DISM /Unmount-Image /MountDir:C:\Mount /Commit
```

**Unmount and discard changes:**

```cmd
DISM /Unmount-Image /MountDir:C:\Mount /Discard
```

**Capture a new image from a running installation:**

```cmd
DISM /Capture-Image /ImageFile:D:\install.wim /CaptureDir:C:\ /Name:"Windows"
```

**Apply an image to a target directory:**

```cmd
DISM /Apply-Image /ImageFile:D:\install.wim /Index:1 /ApplyDir:C:\
```

---

## WIM / ESD Information

Inspect and convert Windows image files without mounting them. Useful for identifying which edition index to use before applying or repairing.

**List all indexes in a WIM file:**

```cmd
DISM /Get-WimInfo /WimFile:D:\sources\install.wim
```

**List all indexes in an ESD file:**

```cmd
DISM /Get-WimInfo /WimFile:D:\sources\install.esd
```

**Export a specific index to a new WIM** — useful for splitting multi-edition WIMs or reducing file size:

```cmd
DISM /Export-Image /SourceImageFile:install.wim /SourceIndex:1 /DestinationImageFile:new.wim
```

---

## Logging & Diagnostics

When commands fail, increasing log verbosity is the first diagnostic step.

**Write logs to a custom path:**

```cmd
DISM /Online /Cleanup-Image /RestoreHealth /LogPath:C:\DISM.log
```

**Enable verbose logging** (level 4 = most detailed):

```cmd
DISM /Online /Cleanup-Image /RestoreHealth /LogLevel:4
```

Log levels range from 1 (errors only) to 4 (all debug information). For production troubleshooting, level 3 or 4 is recommended.

**Default log location:**

```text
C:\Windows\Logs\DISM\dism.log
```

---

## Practical Scripts

### System Repair Sequence

When a Windows installation is behaving erratically — crashes, missing system files, failed updates, or SFC reporting unfixable errors — run DISM *before* SFC. If the Component Store is damaged, SFC draws replacement files from that same store and fails silently. DISM repairs the store first so SFC has a clean foundation.

> **[i] Requires:** Elevated Command Prompt or PowerShell. Internet connection required unless `/Source` is specified.

```cmd
@echo off
:: ============================================================
::  DISM System Repair Script
::  Run from an elevated Command Prompt or PowerShell session.
::  Each stage must complete before the next begins.
:: ============================================================

echo [1/4] Quick health flag check...
DISM /Online /Cleanup-Image /CheckHealth
echo.

echo [2/4] Deep Component Store integrity scan (takes 2-5 min)...
DISM /Online /Cleanup-Image /ScanHealth
echo.

echo [3/4] Repairing Component Store via Windows Update...
DISM /Online /Cleanup-Image /RestoreHealth
echo.

echo [4/4] Running System File Checker against repaired store...
sfc /scannow
echo.

echo Repair sequence complete. Review output above for any remaining issues.
echo Full DISM log: C:\Windows\Logs\DISM\dism.log
pause
```

**Air-gapped environments** — replace step 3:

```cmd
DISM /Online /Cleanup-Image /RestoreHealth /Source:wim:D:\sources\install.wim:1 /LimitAccess
```

### System Cleanup and Maintenance

Useful before capturing a reference image, on storage-constrained systems, or as part of routine server maintenance.

> **[!] WARNING:** `StartComponentCleanup /ResetBase` is irreversible — it removes all superseded components, making all installed updates permanent and uninstallable. Only run on fully patched, stable systems where rollback is not a concern.

```cmd
@echo off
:: ============================================================
::  DISM System Cleanup and Maintenance Script
::  Run from an elevated Command Prompt or PowerShell session.
::  Review AnalyzeComponentStore output before proceeding.
:: ============================================================

echo [1/4] Analysing Component Store - calculating reclaimable space...
DISM /Online /Cleanup-Image /AnalyzeComponentStore
echo.

echo [2/4] Removing superseded components (30-day+ threshold)...
DISM /Online /Cleanup-Image /StartComponentCleanup
echo.

echo [3/4] Re-analysing Component Store to confirm space reclaimed...
DISM /Online /Cleanup-Image /AnalyzeComponentStore
echo.

echo [4/4] Verifying Component Store health post-cleanup...
DISM /Online /Cleanup-Image /RestoreHealth
echo.

echo Cleanup sequence complete.
echo Full DISM log: C:\Windows\Logs\DISM\dism.log
pause
```

**Optional aggressive cleanup** — for image finalisation only. Replace step 2:

```cmd
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

---

## Quick Reference

| Category | Command |
|---|---|
| Quick health check | `DISM /Online /Cleanup-Image /CheckHealth` |
| Deep corruption scan | `DISM /Online /Cleanup-Image /ScanHealth` |
| Repair Component Store | `DISM /Online /Cleanup-Image /RestoreHealth` |
| Analyse WinSxS size | `DISM /Online /Cleanup-Image /AnalyzeComponentStore` |
| Remove superseded components | `DISM /Online /Cleanup-Image /StartComponentCleanup` |
| Aggressive cleanup (irreversible) | `DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase` |
| List optional features | `DISM /Online /Get-Features /Format:Table` |
| List installed packages | `DISM /Online /Get-Packages /Format:Table` |
| List installed drivers | `DISM /Online /Get-Drivers /Format:Table` |
| Export all OEM drivers | `DISM /Online /Export-Driver /Destination:C:\DriverBackup` |
| List capabilities | `DISM /Online /Get-Capabilities` |
| Current Windows edition | `DISM /Online /Get-CurrentEdition` |
| Reserved storage status | `DISM /Online /Get-ReservedStorageState` |
| List provisioned UWP apps | `DISM /Online /Get-ProvisionedAppxPackages` |
| Mount WIM image | `DISM /Mount-Image /ImageFile:C:\install.wim /Index:1 /MountDir:C:\Mount` |
| Capture image | `DISM /Capture-Image /ImageFile:D:\install.wim /CaptureDir:C:\ /Name:"Windows"` |
| WIM file info | `DISM /Get-WimInfo /WimFile:D:\sources\install.wim` |
| Verbose logging | `DISM /Online /Cleanup-Image /RestoreHealth /LogLevel:4` |

## Notes

For day-to-day Windows Server administration, roughly 10% of DISM covers most needs: Health/Repair, Component Store Cleanup, Features, Packages, and Drivers. The remaining functionality — Offline Image Servicing, WIM/ESD manipulation, Edition Management, AppX provisioning — is primarily the domain of OS deployment, MDT, SCCM/MECM, image engineering, and VDI teams.

## References

- [DISM Technical Reference — Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/dism-technical-reference)
- [DISM Image Management Command-Line Options](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/dism-image-management-command-line-options-s14)
- [Repair a Windows Image](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/repair-a-windows-image)
- [Manage the Component Store](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/manage-the-component-store)

{{< post-cta >}}
