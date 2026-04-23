---
title: "Managing Printer Mappings Across User Profiles with PowerShell"
date: 2026-04-23T10:00:00+05:30
draft: false
description: "How I built a set of PowerShell functions inside VB.WorkstationReport to migrate, replace, and add printer mappings across all user profiles on Windows workstations — without touching a single machine manually."
tags: ["PowerShell", "Printers", "Windows", "Module", "Registry", "RMM", "Sysadmin"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---

Printer management at scale is one of those problems that looks trivial until you are staring at 200 workstations, each with multiple user profiles, each with their own mapped printers, and a print server migration starting in two days.

Doing it manually is not an option. Doing it via Group Policy works for connected machines but breaks for laptops on VPN, offline profiles, and anyone who mapped printers manually outside GPO. What you actually need is something that understands how Windows stores printer mappings per user, can work on both online and offline profiles, and can be deployed from your RMM in a single script run.

This post covers the three functions I built into the `VB.WorkstationReport` module to solve this — and why each one exists.

---

## The Problem With Printer Mappings at Scale

Windows stores printer mappings inside each user's registry hive (`NTUSER.DAT`). Every user on a machine has their own copy. This means:

- There is no single machine-level list of "who has what printer"
- A user who is not currently logged in has their hive sitting on disk as `NTUSER.DAT` — you cannot read or write it without mounting it first
- UNC printers (`\\server\printer`) and IP printers (`10.30.1.50`) are stored differently and need different handling
- Running `Add-Printer` or `Remove-Printer` only works for the currently logged-in user — you cannot use them to update another user's mappings

When you have a print server migration, or you need to push a new printer to every user on a fleet of machines, none of the built-in cmdlets give you what you need.

---

## How Windows Stores Printer Mappings

Before looking at the functions, it helps to understand what is actually being written to the registry.

For each user profile, the relevant keys are:

```
HKU\{SID}\Printers\Connections\,,server,sharename
```
This is the connection marker for a UNC printer. The backslashes in the path are replaced with commas — `\\server\printer` becomes `,,server,printer`. The presence of this subkey is what tells Windows the printer is mapped for this user.

```
HKU\{SID}\Software\Microsoft\Windows NT\CurrentVersion\Devices
```
This maps each printer name to its port. For a UNC printer the value is `winspool,Ne00:`. For a direct IP printer it is `winspool,IP_10.30.1.50`.

```
HKU\{SID}\Software\Microsoft\Windows NT\CurrentVersion\PrinterPorts
```
Same as `Devices` but includes timeout values: `winspool,Ne00:,15,45`. Only present on some profiles — the functions skip it gracefully if it does not exist.

```
HKU\{SID}\Software\Microsoft\Windows NT\CurrentVersion\Windows  (Device value)
```
Stores the user's default printer as a string: `PrinterName,winspool,Ne00:`.

---

## The Function Chain

The three new functions build on top of existing `VB.WorkstationReport` functions rather than duplicating their logic:

```
Set-VBUserPrinterMigration  /  Add-VBUserPrinter
  |
  |-- Get-VBUserProfile             enumerate all non-system profiles, Loaded flag
  |-- Mount-VBUserHive              mount NTUSER.DAT for offline profiles
  |-- Get-VBUserPrinterMappings     optional pre-migration backup snapshot
  |-- Update-VBUserPrinterRegistry  registry writes per user  [private]
  |-- Dismount-VBUserHive           safe hive unload after work is done
```

`Mount-VBUserHive` returns an `AlreadyLoaded` flag — if the user was already logged in, the hive is already at `HKU\{SID}` and no mount is needed. Either way, the registry path is identical, so the same code handles both online and offline users with no branching needed.

`Dismount-VBUserHive` checks the `HiveMounted` flag on the mount result — it only unloads hives that the function itself mounted. It never touches a hive that was already loaded before we started.

---

## Migrating Existing Printer Mappings — `Set-VBUserPrinterMigration`

This function is for when a printer a user already has mapped needs to be replaced with a different one. It will only touch a user's printer if that user actually has the old printer mapped — nobody gets a printer they did not already have.

### Supported migration types

| From | To | Example use case |
| :--- | :--- | :--- |
| UNC → UNC | `\\OldServer\HP01` → `\\NewServer\HP01` | Print server migration |
| UNC → IP | `\\PrintServer\HP01` → `10.30.1.50` | Move from shared to direct IP |
| IP → UNC | `10.30.1.60` → `\\PrintServer\Canon02` | Consolidate direct IPs to a print server |
| IP → IP | `10.30.1.50` → `10.30.1.55` | Printer replaced at same location |

### Input: the mapping CSV

The primary input is a CSV file. This is the format to use when deploying via RMM because it separates the data from the script — one CSV, many machines.

```csv
OldPath,NewPath,DriverName
\\PrintServer01\HP_Floor2,10.30.1.50,HP LaserJet 400 M401
\\PrintServer01\Canon_HR,10.30.1.51,Canon Generic Plus PCL6
10.30.1.60,\\PrintServer02\Ricoh_Reception,
\\PrintServer01\Zebra_Labels,\\PrintServer02\Zebra_Labels,
```

Column rules:
- `OldPath` — the printer the user currently has mapped (UNC or IP)
- `NewPath` — what to replace it with (UNC or IP)
- `DriverName` — required when `NewPath` is an IP address, blank is fine for UNC destinations

To create the CSV from PowerShell before deploying:

```powershell
$csv = @"
OldPath,NewPath,DriverName
\\PrintServer01\HP_Floor2,10.30.1.50,HP LaserJet 400 M401
\\PrintServer01\Canon_HR,10.30.1.51,Canon Generic Plus PCL6
10.30.1.60,\\PrintServer02\Ricoh_Reception,
\\PrintServer01\Zebra_Labels,\\PrintServer02\Zebra_Labels,
"@
$csv | Out-File -FilePath 'C:\Temp\PrinterMappings.csv' -Encoding UTF8
```

### Running the migration

Always run a dry run first. This shows exactly what would change without touching anything:

```powershell
Set-VBUserPrinterMigration -MappingCsv 'C:\Temp\PrinterMappings.csv' -WhatIf
```

Once you are satisfied with the output, run it for real. The `-BackupMappings` flag captures each user's current printer state to a CSV before making any changes — useful for rollback reference:

```powershell
Set-VBUserPrinterMigration -MappingCsv 'C:\Temp\PrinterMappings.csv' `
    -BackupMappings `
    -BackupPath 'C:\Realtime\Reports\PrinterBackup.csv'
```

To target a single user only:

```powershell
Set-VBUserPrinterMigration -MappingCsv 'C:\Temp\PrinterMappings.csv' -TargetUser 'jdoe'
```

For UNC to UNC migrations where all printers share the same path pattern, the hashtable input is cleaner than a CSV:

```powershell
$mappings = @{
    '\\OldPrintServer\HP01'    = '\\NewPrintServer\HP01'
    '\\OldPrintServer\Canon02' = '\\NewPrintServer\Canon02'
    '\\OldPrintServer\Zebra01' = '\\NewPrintServer\Zebra01'
}
Set-VBUserPrinterMigration -PrinterMappings $mappings
```

### What the output looks like

The function returns one object per user per mapping rule. Pipe it to `Export-Csv` for a full audit trail:

```powershell
$results = Set-VBUserPrinterMigration -MappingCsv 'C:\Temp\PrinterMappings.csv'

# Full results to CSV
$results | Export-Csv -Path "\\FileServer\Logs\Migration_$env:COMPUTERNAME.csv" `
    -NoTypeInformation -Encoding UTF8

# Review only failures
$results | Where-Object { $_.Status -eq 'Failed' } | Format-Table

# See what was skipped (user did not have that printer)
$results | Where-Object { $_.Action -eq 'Skipped' }
```

Each result object contains:

| Property | Description |
| :--- | :--- |
| `ComputerName` | Machine the change was applied to |
| `Username` | User profile that was processed |
| `OldPath` | The printer that was replaced |
| `NewPath` | The printer that was added |
| `Action` | `Migrated`, `Skipped`, `AlreadyMigrated`, or `Failed` |
| `Details` | Exactly which registry keys were written or removed |
| `Status` | `Success` or `Failed` |
| `Timestamp` | When the action ran |

### RMM deployment pattern

Since machine-level IP port creation requires the script to run locally (not over WinRM), the recommended pattern for fleet deployment via RMM is:

```powershell
# Deploy CSV to machine first (push via RMM file copy)
# Then run:

$results = Set-VBUserPrinterMigration -MappingCsv 'C:\Temp\PrinterMappings.csv' `
    -BackupMappings `
    -BackupPath "\\FileServer\Logs\Backup_$env:COMPUTERNAME.csv"

$results | Export-Csv `
    -Path "\\FileServer\Logs\Migration_$env:COMPUTERNAME.csv" `
    -NoTypeInformation `
    -Encoding UTF8
```

Each machine writes its own log file named by `$env:COMPUTERNAME` — no collisions when 200 machines run simultaneously.

---

## Adding New Printers to User Profiles — `Add-VBUserPrinter`

`Set-VBUserPrinterMigration` only acts on printers that are already mapped — it will not add a printer to a user who does not already have the old one. Sometimes you need to push a new printer to everyone regardless of their current setup. That is what `Add-VBUserPrinter` is for.

Common use cases:
- A new department printer has been installed and needs pushing to all user profiles
- A specific user needs a printer added directly without any migration
- You want to set a printer as the default for a group of users

### Adding an IP printer to all users

```powershell
# First confirm the driver is installed on the machine
Get-PrinterDriver | Select-Object Name

# Then add the printer to all profiles
Add-VBUserPrinter -PrinterPath '10.30.1.55' `
                  -PrinterName 'HP_Accounts' `
                  -DriverName  'HP LaserJet 400 M401'
```

`PrinterName` becomes the display name in the user's printer list. `DriverName` is required for IP destinations — the function validates this immediately and throws a clear error if it is missing rather than failing silently mid-run.

### Adding a UNC printer to all users

UNC printers do not need a driver name. Windows pulls the driver from the print server when the user next logs on.

```powershell
Add-VBUserPrinter -PrinterPath '\\PrintServer02\Canon_Reception'
```

### Targeting a single user

```powershell
# By username
Add-VBUserPrinter -PrinterPath '10.30.1.55' `
                  -PrinterName 'HP_Accounts' `
                  -DriverName  'HP LaserJet 400 M401' `
                  -TargetUser  'jdoe'

# By SID
Add-VBUserPrinter -PrinterPath '\\PrintServer02\Finance_HP' `
                  -TargetUser  'S-1-5-21-3456789012-1234567890-123456789-1001'
```

### Setting the new printer as default

```powershell
Add-VBUserPrinter -PrinterPath '10.30.1.55' `
                  -PrinterName 'HP_Accounts' `
                  -DriverName  'HP LaserJet 400 M401' `
                  -TargetUser  'jdoe' `
                  -SetAsDefault
```

This writes to `HKU\{SID}\...\Windows → Device` — the same key Windows itself updates when a user changes their default printer.

### Idempotency

Running the function multiple times against the same machine is safe. If the printer is already in a user's profile the function returns `Action = 'AlreadyExists'` and moves on without writing anything:

```powershell
$results = Add-VBUserPrinter -PrinterPath '\\PrintServer02\Canon_Reception'
$results | Where-Object { $_.Action -eq 'AlreadyExists' }
```

### Dry run

```powershell
Add-VBUserPrinter -PrinterPath '10.30.1.55' `
                  -PrinterName 'HP_Accounts' `
                  -DriverName  'HP LaserJet 400 M401' `
                  -WhatIf
```

---

## The Registry Worker — `Update-VBUserPrinterRegistry`

This is the private function that does the actual registry work inside `Set-VBUserPrinterMigration`. You do not call it directly — it is an internal component of the module. It is worth understanding what it does because it is where the four migration types are actually handled.

For each mapping rule it:

1. Normalises paths (forward slashes to backslashes, trims trailing slashes, lowercases for comparison)
2. Converts UNC paths to connection key names: `\\server\printer` → `,,server,printer`
3. Searches for the old printer — UNC via the `Connections` subkey, IP via the port value in the `Devices` key
4. Checks idempotency — if the new printer already exists and the old one is already gone, returns `AlreadyMigrated` and skips
5. Reads the old `Devices` value to carry it forward for UNC→UNC migrations (preserves the assigned port)
6. Adds the new `Connections` key and/or `Devices`/`PrinterPorts` entries
7. Removes the old entries
8. Updates the `Device` value in the `Windows` key if the migrated printer was the user's default

The separation between `Set-VBUserPrinterMigration` (orchestration) and `Update-VBUserPrinterRegistry` (registry work) means the registry logic is isolated, testable, and reusable by other functions if needed — without exposing unsafe entry points.

---

## The Supporting Functions

These existed in the module before the printer migration work and are called by both new functions.

### `Get-VBUserProfile`

Enumerates all non-system user profiles via `Win32_UserProfile`. The `Loaded` property tells you whether each profile's hive is currently active in `HKEY_USERS` — i.e. whether the user is currently logged in.

```powershell
Get-VBUserProfile | Select-Object Username, SID, Loaded, ProfilePath
```

### `Mount-VBUserHive`

Mounts a user's `NTUSER.DAT` to `HKU\{SID}` if it is not already loaded. Accepts `SID` or `Username`. Returns `HiveMounted` (did we mount it) and `AlreadyLoaded` (was it already there).

```powershell
$mount = Mount-VBUserHive -Username 'jdoe'
```

### `Dismount-VBUserHive`

Unloads a hive mounted by `Mount-VBUserHive`. Pipeline-compatible with the mount result. Critically: it only unloads hives where `HiveMounted = $true` — if the hive was already loaded before we started (active user session), it is left alone.

```powershell
# In production code, always use finally to guarantee dismount
$mount = Mount-VBUserHive -Username 'jdoe'
try {
    # ... registry work ...
}
finally {
    $mount | Dismount-VBUserHive | Out-Null
}
```

A GC flush and one-second sleep run before `reg.exe unload` — this releases any stale PowerShell handles to registry keys that would otherwise cause an "Access is denied" error.

### `Get-VBUserPrinterMappings`

Audits current printer mappings for all users. Used by `Set-VBUserPrinterMigration` for the optional pre-migration backup snapshot. Also useful standalone for a before/after comparison:

```powershell
# Before migration
Get-VBUserPrinterMappings -TableOutput | Export-Csv 'Before.csv' -NoTypeInformation

# Run migration...

# After migration
Get-VBUserPrinterMappings -TableOutput | Export-Csv 'After.csv' -NoTypeInformation
```

---

## Important Notes

**Drivers for IP printers must already be installed.** The functions do not install drivers. Run `Get-PrinterDriver | Select-Object Name` on the target machine to confirm the driver is present before adding an IP printer.

**Machine-level port and printer creation requires local execution.** `Add-PrinterPort` and `Add-Printer` do not work reliably over WinRM on PS 5.1. Both functions throw a terminating error if you try to target a remote machine for an IP printer operation. The intended deployment model is RMM pushing the script to run locally on each workstation.

**A user logoff/logon may be required for changes to take full effect.** The registry writes happen immediately, but active Windows sessions cache some printer state. The changes will be fully applied at the next logon.

**Always run `-WhatIf` first.** Both functions support `-WhatIf` via `SupportsShouldProcess`. There is no cost to a dry run and it confirms exactly which users and which printers will be affected before anything is changed.

---

## Module Version

All functions are part of `VB.WorkstationReport` v1.8.0.

```powershell
# Verify module version
Get-Module VB.WorkstationReport | Select-Object Name, Version

# List all printer management functions
Get-Command -Module VB.WorkstationReport | Where-Object { $_.Name -like '*Printer*' -or $_.Name -like '*Hive*' }
```
