---
title: "SetupDiag: A Wintel Admin's Guide to Diagnosing In-Place Upgrade Failures"
date: 2026-07-21T15:37:51+05:30
draft: false
description: "How to use Microsoft's SetupDiag tool to pinpoint the exact driver, app, or disk issue blocking an in-place Windows Server upgrade."
tags: ["Windows", "Windows Administration", "Server", "Windows Server", "SetupDiag", "Troubleshooting", "Migration", "Update", "Upgrade"]
categories: ["Windows Administration"]
author:
  name: Vibhu Bhatnagar
---

## Why this tool exists

Think of an in-place OS upgrade like renovating a house while people are still living in it. Windows Setup has to migrate settings, drivers, and applications from the old structure into the new one without tearing anything down first. When the renovation stalls, Setup usually just tells you "it failed" with a cryptic code like `0xC1900101-0x20017` — it doesn't tell you *which wall* it got stuck on.

SetupDiag is the tool that goes back through the wreckage (Windows Setup's own log files) and tells you which driver, application, disk condition, or compatibility block actually caused the failure. It doesn't fix anything — it's a diagnostic, not a repair tool — but for a Wintel admin running fleet-wide in-place upgrades, it's the fastest way to turn "upgrade failed, no idea why" into "remove Driver X, retry."

## What SetupDiag actually does

SetupDiag parses the log files Windows Setup leaves behind (`setupact.log`, `setuperr.log`, rollback logs, panther logs, etc.) and runs them against a built-in library of known-issue rules (`rules.xml`). Each rule matches a specific failure signature — an incompatible driver, a blocked application, insufficient disk space, a bug check during setup, and so on — and outputs a plain-language explanation plus, where available, a remediation suggestion.

It ships inside Windows Setup itself. During every upgrade attempt, Setup extracts `SetupDiag.exe` to `%SystemDrive%\$Windows.~bt\Sources` and, if the upgrade fails, runs it automatically. Results land at:

- `%WinDir%\Logs\SetupDiag\SetupDiagResults.xml`
- Registry: `HKLM\SYSTEM\Setup\SetupDiag\Results`

If the upgrade succeeds, that `Sources` folder (including `SetupDiag.exe`) moves into `Windows.old` for later cleanup — so if you delete `Windows.old`, you lose the local copy and need to redownload it.

**Gotcha:** when SetupDiag reports multiple failures in one run, the *last* failure listed is typically the actual fatal error, not the first. Don't chase the first line you see.

## Use cases specific to in-place server upgrades

1. **Post-mortem on a failed batch.** After a wave of servers fail an in-place upgrade (Server 2012 R2 → 2019/2022, or 2019 → 2025), run SetupDiag against each failure to bucket them: driver blocks vs. application blocks vs. disk space vs. crash dumps. This turns "40 servers failed" into "12 need a driver update, 8 need an app uninstalled, 20 need disk space."
2. **Pre-emptive scanning.** Some rules (like `CompatScanOnly`) relate to compatibility-only scans — useful if you run Setup with `/Compat ScanOnly` ahead of a maintenance window to catch blockers before you touch production.
3. **Identifying unsupported/legacy drivers.** Rules like `HardblockDeviceOrDriver`, `UnknownDriverMigrationFailure`, and `DriverMigrationFailure` point directly at the driver package name causing the block — critical when a server has an old RAID controller, NIC, or vendor management agent driver that predates the target OS.
4. **Identifying unsupported/legacy applications.** Rules like `CompatBlockedApplicationAutoUninstall`, `CompatBlockedApplicationDismissable`, and `CompatBlockedApplicationManualUninstall` name the offending application — common with old antivirus agents, backup agents, or monitoring agents that haven't been updated for the target OS.
5. **Disk space triage.** `DiskSpaceBlockInDownLevel` and `DiskSpaceFailure` separate "ran out of space before reboot" from "ran out of space after reboot," which changes where you go looking (system partition vs. `Windows.old` staging).
6. **Crash/bug-check analysis.** If a server blue-screens mid-upgrade, SetupDiag can debug the resulting `setupmem.dmp` (with Windows Debugging Tools installed) and tell you which driver or component triggered the bug check.
7. **Offline analysis at scale.** For remote or headless servers, you can copy the Panther/rollback log folders to a central admin workstation and run SetupDiag in offline mode — no need to RDP into every failed box individually.

---

## 1. Prerequisites

| Requirement | Detail |
|---|---|
| Target OS | Must be a currently supported Windows version. The *source* OS can be out of support, as long as the upgrade path to the supported target is itself supported. |
| .NET Framework | 4.7.2 or newer required. Check with: `reg.exe query "HKLM\SOFTWARE\Microsoft\Net Framework Setup\NDP\v4" /s` |
| Privileges | Must run from an **elevated** Command Prompt / PowerShell session — non-elevated runs won't work correctly. |

If .NET is below 4.7.2, install the [.NET Framework 4.8 offline installer](https://go.microsoft.com/fwlink/?linkid=863265) before running the tool.

## 2. Download

Always grab the latest build rather than reusing an old copy — the rules database gets updated as Microsoft identifies new failure signatures:

> [https://go.microsoft.com/fwlink/?linkid=870142](https://go.microsoft.com/fwlink/?linkid=870142)

Save it to a dedicated working folder, e.g. `C:\SetupDiag\SetupDiag.exe`.

## 3. Running SetupDiag — the two modes

### Online mode (default) — analyzing the local, currently-failing machine

Use this when you're sitting on (or remoted into) the box that just failed its upgrade and the failure logs are still present in the default locations. No log-gathering step needed — SetupDiag knows where to look.

```cmd
SetupDiag.exe /Output:C:\SetupDiag\Results.log
```

### Offline mode — analyzing logs collected from another machine

Use this for remote servers, headless boxes, or when you're triaging a batch of failures centrally. Point `/LogsPath` at a folder containing the copied log set; SetupDiag recursively searches all subfolders, so you can just copy the whole parent directory.

```cmd
SetupDiag.exe /Output:C:\SetupDiag\Results.log /LogsPath:D:\Logs\Server01
```

**Which folder to copy from the failed server**, depending on when the failure happened:

- `\$Windows.~bt\Sources\Panther`
- `\$Windows.~bt\Sources\Rollback`
- `\Windows\Panther`
- `\Windows\Panther\NewOS`

Grab the whole folder tree, not individual files — SetupDiag needs the full context to match some rules correctly.

## 4. Parameter reference

| Parameter | What it does |
|---|---|
| `/?` | Displays help. |
| `/Output:<path>` | Full path/filename for the results log. Default: `SetupDiagResults.log` in the current folder. Wrap in quotes if the path has spaces. |
| `/LogsPath:<path>` | Location of logs to analyze for offline mode. Recurses through subfolders. If omitted, SetupDiag checks the local system (online mode). |
| `/ZipLogs:True\|False` | Bundles the results + parsed logs into a zip in the working folder. Defaults to `True`. Set to `False` if you just want the text log, e.g. when scripting bulk triage and don't want to manage zip sprawl. |
| `/Format:xml\|json` | Output format. Default (unset) is plain text, which is the easiest to eyeball manually; use `xml`/`json` if you're feeding results into a script or dashboard. |
| `/Scenario:Recovery\|Debug` | `Recovery` parses reset/recovery logs instead of setup/upgrade logs. `Debug` triggers memory dump debugging if debug tools are present. |
| `/Verbose` | Produces an extra diagnostic log with debugging detail — useful when reporting a problem with SetupDiag itself, not typically needed for routine triage. |
| `/NoTel` | Suppresses diagnostic telemetry to Microsoft. Worth setting in locked-down or air-gapped server environments. |
| `/RegPath:<HKLM\|HKCU path>` | Where to write failure info in the registry. Default: `HKLM\SYSTEM\Setup\MoSetup\Volatile\SetupDiag`. |
| `/AddReg` | In offline mode, also writes failure info to the local registry of the machine running SetupDiag (not the failed machine). Online mode does this by default; offline mode doesn't unless you set this. |

**Note:** the older `/Mode` parameter is deprecated. Specifying `/LogsPath` alone is now enough to trigger offline mode.

## 5. Practical command examples for upgrade-failure triage

Run without parameters just to see help:
```cmd
SetupDiag.exe
```

Standard single-server, on-box triage:
```cmd
SetupDiag.exe /Output:C:\SetupDiag\Results.log
```

Central triage of logs pulled from a remote/failed server:
```cmd
SetupDiag.exe /Output:C:\SetupDiag\Results_Server01.log /LogsPath:D:\Logs\Server01
```

Output path containing spaces:
```cmd
SetupDiag /Output:"C:\Tools\SetupDiag\SetupDiag Results\Results.log"
```

Structured output for scripting/reporting (feed into a CSV or dashboard across many servers):
```cmd
SetupDiag.exe /Output:C:\SetupDiag\Results_Server01.xml /Format:xml /LogsPath:D:\Logs\Server01
```

Debugging a bug-check (BSOD) that happened mid-upgrade — requires Windows Debugging Tools installed on the analysis machine, and the `setupmem.dmp` copied locally (found in `%SystemDrive%\$Windows.~bt\Sources\Rollback` or `%WinDir%\Panther\NewOS\Rollback` on the failed box):
```cmd
SetupDiag.exe /Output:C:\SetupDiag\Dumpdebug.log /LogsPath:D:\Dump
```

Reset/recovery failure analysis (offline):
```cmd
SetupDiag.exe /Output:C:\SetupDiag\RecoveryResults.log /LogsPath:D:\Cabs\PBR_Log /Scenario:Recovery
```

## 6. A repeatable workflow for a batch of failed servers

```
1. Failure occurs → verify: server rolled back, upgrade log/rollback folder exists
2. Copy Panther/Rollback folder from failed server to central share
   → verify: folder copied recursively, includes setupact*.log
3. Run SetupDiag in offline mode against the copied folder, /Format:xml
   → verify: SetupDiagResults file created, "SetupDiag found N matching issue(s)" in console output
4. Open results, identify matched rule + remediation
   → verify: rule name matches a known category (driver, app, disk space, compat block)
5. Take corrective action (uninstall app / update or remove driver / free disk space)
   → verify: retry upgrade, confirm no repeat of same rule match
```

## 7. Reading the results

The output — whether text, XML, or JSON — is structured the same way:

- **System Information** — machine name, manufacturer/model, BIOS version, source/target OS build, registered AV, filter drivers, upgrade start/end timestamps. Useful for confirming you're looking at the right failure and for spotting third-party filter drivers (AV, backup agents) that might be involved.
- **Matched rule / Error section** — the profile name that matched (e.g. `HardblockDeviceOrDriver`), a plain-English description of what went wrong, and — for many rules — a specific remediation recommendation.
- **Reference link** — many results point to the [Windows Setup error code reference](https://learn.microsoft.com/windows/deployment/upgrade/upgrade-error-codes) if you need to dig further into a raw error code.

Sample text output:

```text
Matching Profile found: OptionalComponentOpenPackageFailed - 22952520-EC89-4FBD-94E0-B67DF88347F6
System Information:
    Machine Name = Offline
    Manufacturer = MSI
    ...
    HostOSVersion = 10.0.15063
    TargetOSBuildString = 10.0.16299.15 (rs3_release.170928-1534)
    ...

Error: SetupDiag reports Optional Component installation failed to open OC Package. Package Name: Foundation, Error: 0x8007001F
Recommend you check the "Windows Modules Installer" service (Trusted Installer) is started on the system and set to automatic start, reboot and try the update again.
Error: SetupDiag reports downlevel failure, Operation: Finalize, Error: 0x8007001F - 0x50015
Refer to https://learn.microsoft.com/windows/deployment/upgrade/upgrade-error-codes for error information.
```

## 8. Rules most relevant to "old app / old driver" failures

This is the set of rules you'll hit most often on legacy Wintel estates. Full rule list is in the appendix below.

| Rule name | What it flags | Typical fix |
|---|---|---|
| `HardblockDeviceOrDriver` | A loaded device driver is incompatible with the target OS version. | Identify and remove the named driver package before retrying. |
| `DriverMigrationFailure` | Fatal failure while migrating drivers to the new OS. | Update or remove the offending driver; check OEM for a newer version. |
| `UnknownDriverMigrationFailure` | A bad/unrecognized driver package blocks migration; usually names the package. | Remove the driver package, reboot, retry. Update from OEM if available. |
| `DriverPackageMissingFileFailure` | A driver package is missing a file during device install. | Update the driver package. |
| `UnsignedDriverBootFailure` | An unsigned driver caused a boot failure. | Remove or replace with a signed driver. |
| `CompatBlockedApplicationAutoUninstall` | An app needs uninstalling before Setup can proceed. | Uninstall the named app, retry. |
| `CompatBlockedApplicationDismissable` | Setup ran in `/quiet` mode and hit a dismissible app block (would normally just be a warning). | Either uninstall the app or add `/compat ignorewarning` to the Setup command line if the risk is acceptable. |
| `CompatBlockedApplicationManualUninstall` | An app with no Add/Remove Programs entry is blocking Setup. | Manually remove the associated files/registry entries. |
| `CompatBlockedFODDismissable` | A Feature on Demand installed on the source OS is missing from the target image. | Remove the Windows Feature, reboot, retry. |
| `GenericCompatBlock` | Hardware requirement not met for the target OS (e.g., missing TPM 2.0). | Confirm hardware support; this can occur even when bypasses are attempted. |
| `GatedCompatBlock` | Temporary Microsoft-imposed block on a known problematic driver/software combo pending a fix. | Wait for the fix to roll out, or check for guidance from Microsoft on the specific block. |

## 9. Common questions

**Does SetupDiag fix the problem?** No — it's read-only diagnostics. It tells you what to fix; you (or your automation) still have to remove the driver, uninstall the app, or free up disk space.

**Can I run it before attempting the upgrade?** Not in the sense of scanning a healthy system for future blockers on its own — SetupDiag parses *Setup's own logs*, so it needs an actual Setup run (even a compatibility-only scan via `/Compat ScanOnly`) to have something to analyze.

**Where do the automatic results go if Setup already ran it for me?** `%WinDir%\Logs\SetupDiag\SetupDiagResults.xml` and the registry at `HKLM\SYSTEM\Setup\SetupDiag\Results` — check there first before manually re-running the tool.

**What if no rule matches?** SetupDiag's rule database doesn't cover every possible failure. If nothing matches, fall back to manually reviewing `setupact.log`/`setuperr.log` around the failure timestamp, or search the raw error code against the [upgrade error code reference](https://learn.microsoft.com/windows/deployment/upgrade/upgrade-error-codes).

**Some rules are slow.** Large log sets can take a while to process, particularly memory-dump debugging rules — this is a known limitation, not a hang.

---

## Appendix: Full rule catalog

| Rule Name | Description |
|---|---|
| `CompatScanOnly` | Setup was called with a compatibility-scan-only flag, not a real upgrade attempt. |
| `PlugInComplianceBlock` | Server compliance plug-in compatibility block (server upgrades only). |
| `BitLockerHardblock` | Target OS doesn't support BitLocker but host OS has it enabled. |
| `VHDHardblock` | Host OS is booted from a VHD image — upgrade unsupported. |
| `PortableWorkspaceHardblock` | Host OS is booted from Windows To-Go — upgrade unsupported. |
| `AuditModeHardblock` | Host OS is in Audit Mode — upgrade unsupported. |
| `SafeModeHardblock` | Host OS is in Safe Mode — upgrade unsupported. |
| `InsufficientSystemPartitionDiskSpaceHardblock` | System (boot loader) partition lacks space for upgrade servicing. |
| `CompatBlockedApplicationAutoUninstall` | App must be uninstalled before Setup can continue. |
| `CompatBlockedApplicationDismissable` | Quiet-mode Setup hit a normally-dismissible app warning that became a hard block. |
| `CompatBlockedFODDismissable` | Quiet-mode Setup hit a Feature-on-Demand block; target image is missing an installed feature. |
| `CompatBlockedApplicationManualUninstall` | App with no uninstall entry is blocking Setup; needs manual file removal. |
| `GenericCompatBlock` | System doesn't meet a hardware requirement (e.g. TPM 2.0). |
| `GatedCompatBlock` | Temporary block pending a fix for a known software/driver issue. |
| `HardblockDeviceOrDriver` | Loaded driver incompatible with target OS; must be removed. |
| `HardblockMismatchedLanguage` | Host and target OS language editions don't match. |
| `HardblockFlightSigning` | Pre-release/Insider build with Secure Boot enabled blocks the unsigned build. |
| `DiskSpaceBlockInDownLevel` | Out of disk space during downlevel phase (before first reboot). |
| `DiskSpaceFailure` | Out of disk space after first reboot into the upgrade. |
| `PreReleaseWimMountDriverFound` | Unrecognized `wimmount.sys` driver registered on system. |
| `DebugSetupMemoryDump` | Bug check during setup; debugs the memory dump if tools are available (offline only). |
| `DebugSetupCrash` | Setup process itself crashed, producing a memory dump (offline only). |
| `DebugMemoryDump` | Generic `memory.dmp` from the setup/upgrade operation (offline only). |
| `DeviceInstallHang` | System hung or bug-checked during device installation phase. |
| `DriverPackageMissingFileFailure` | Driver package missing a file during device install. |
| `UnsignedDriverBootFailure` | Unsigned driver caused a boot failure. |
| `BootFailureDetected` | Boot failure during a specific update phase. |
| `WinSetupBootFilterFailure` | Failure in kernel-mode file operations. |
| `FindDebugInfoFromRollbackLog` | Bug check details from rollback log, no debugger required. |
| `AdvancedInstallerFailed` | Fatal failure in an Advanced Installer operation. |
| `AdvancedInstallerPluginInstallFailed` | A component (FOD, language pack, .NET package) failed to install via Advanced Installer. |
| `AdvancedInstallerGenericFailure` | Generic Advanced Installer read/write failure. |
| `FindMigApplyUnitFailure` | Migration "apply" unit failure. |
| `FindMigGatherUnitFailure` | Migration "gather" unit/plug-in failure. |
| `FindMigGatherApplyFailure` | Migration engine gather/apply operation failure. |
| `OptionalComponentFailedToGetOCsFromPackage` | Failed to enumerate optional components from a package. |
| `OptionalComponentOpenPackageFailed` | Failed to open an optional component package. |
| `OptionalComponentInitCBSSessionFailed` | Servicing stack corruption on the downlevel system. |
| `CriticalSafeOSDUFailure` | Failure updating the SafeOS image with a critical dynamic update. |
| `UserProfileCreationFailureDuringOnlineApply` | Critical failure creating/modifying a user profile during online apply. |
| `UserProfileCreationFailureDuringFinalize` | User profile creation error during the finalize phase. |
| `UserProfileSuffixMismatch` | File/object conflict causes profile migration/creation to fail. |
| `DuplicateUserProfileFailure` | Multiple SIDs tied to one user profile; usually an unused local account causing conflict. |
| `WimMountFailure` | Failed to mount a WIM file. |
| `WimMountDriverIssue` | `WimMount.sys` registration failure. |
| `WimApplyExtractFailure` | WIM apply failure during extraction phase. |
| `UpdateAgentExpanderFailure` | DPX expander failure during downlevel phase (Windows Update-based upgrade). |
| `FindFatalPluginFailure` | A plug-in failure deemed fatal to Setup. |
| `MigrationAbortedDueToPluginFailure` | Critical migration plug-in failure aborts migration. |
| `DISMAddPackageFailed` | Critical failure during a DISM add-package operation. |
| `DISMImageSessionFailure` | DISM failed to start an image session. |
| `DISMproviderFailure` | A DISM provider/plug-in failed in a critical operation. |
| `SysPrepLaunchModuleFailure` | Sysprep plug-in failure. |
| `UserProvidedDriverInjectionFailure` | A driver supplied via command line failed to inject. |
| `DriverMigrationFailure` | Fatal failure migrating drivers. |
| `UnknownDriverMigrationFailure` | Bad driver package blocks upgrade; usually names the package. |
| `FindSuccessfulUpgrade` | Confirms the upgrade succeeded, per the logs. |
| `FindSetupHostReportedFailure` | Early-stage failure reported by `setuphost.exe`. |
| `FindDownlevelFailure` | Failure surfaced by SetupPlatform in the downlevel phase. |
| `FindAbruptDownlevelFailure` | Downlevel phase log ends abruptly with a failure. |
| `FindEarlyDownlevelError` | Failure before SetupPlatform is even invoked. |
| `FindSPFatalError` | SetupPlatform encountered a fatal error. |
| `FindSetupPlatformFailedOperationInfo` | Last phase/error info when SetupPlatform reports critical failure. |
| `FindRollbackFailure` | Last operation, phase, and error info when a rollback occurred. |

## References

- [SetupDiag — Microsoft Learn](https://learn.microsoft.com/en-us/windows/deployment/upgrade/setupdiag)
- [Windows Setup error codes reference](https://learn.microsoft.com/windows/deployment/upgrade/upgrade-error-codes)
- [How to use SetupDiag to determine upgrade problems on Windows 10 — Windows Central](https://www.windowscentral.com/how-use-setupdiag-determine-reason-upgrade-problems-windows-10)
- [Direct download: latest SetupDiag](https://go.microsoft.com/fwlink/?linkid=870142)

{{< post-cta >}}
