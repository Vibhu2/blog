---
title: "Running PowerShell as the Logged-On User from SYSTEM Context"
date: 2026-04-23T12:00:00+05:30
draft: false
description: "How Invoke-VBasCurrentUser solves the classic sysadmin problem of collecting user-specific data — GPOs, printers, HKCU registry — from a script running as SYSTEM via Intune or an RMM agent."
tags: ["PowerShell", "Intune", "RMM", "GPO", "SYSTEM", "Module", "Sysadmin", "Windows"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---

If you have ever deployed a PowerShell script through Intune, a RMM agent, or Task Scheduler running as SYSTEM, you have hit this wall at least once: the script works perfectly when you run it interactively, but returns nothing — or the wrong thing — when deployed at scale.

The reason is almost always the same. The script is collecting user-specific data. And SYSTEM is not the user.

---

## The Problem: SYSTEM and the User Are Not the Same Session

When Intune or your RMM agent executes a PowerShell script, it runs in the SYSTEM context. SYSTEM is a highly privileged account, but it is completely isolated from the interactive user session happening on the same machine at the same time.

This means:

- `HKCU:\` registry reads return nothing — SYSTEM's hive has no meaningful data
- `gpresult /r /scope user` produces output for SYSTEM, not the logged-on user
- `Get-Printer` lists system-level printers, not the user's mapped printers
- Drive mappings, folder redirections, and shell folder customisations are all invisible

If you are trying to audit what GPOs are applied to a user, what printers they have, or what their shell folder paths are — you need to be in their session. Not SYSTEM's.

---

## The Traditional Workaround and Why It Falls Short

The typical approach is to grab the current username from a WMI query (`Win32_ComputerSystem.UserName`), build a remote path to their profile hive, and mount it with `reg.exe load`. Then you query offline.

That works for registry reads. But it does not work for:

- `gpresult` — this requires live policy application, not offline hive inspection
- Printer enumeration — printers are session-aware
- Any COM or shell-based enumeration that requires a live user token

For those cases you actually need to run code inside the user's session, impersonating their token. That is exactly what `Invoke-VBasCurrentUser` does.

---

## How Does It Work?

The function embeds a C# extension (`RunAsUser.ProcessExtensions`) that is compiled inline on first use and cached for the session — no external module or install step required. It uses Windows impersonation APIs to:

1. Enumerate active WTS sessions to find the interactive user
2. Call `WTSQueryUserToken` to get their session token
3. Duplicate the token with `DuplicateTokenEx`
4. Build a matching environment block with `CreateEnvironmentBlock`
5. Call `CreateProcessAsUser` to spawn a new PowerShell process under that token

The result is a real PowerShell process running as the logged-on user, started from SYSTEM — with the user's full token, their `HKCU`, their session printers, their applied GPOs.

The only requirement on the calling side is `SeDelegateSessionUserImpersonatePrivilege`, which SYSTEM always has.

---

## The Function

`Invoke-VBasCurrentUser` lives in the `VB.WorkstationReport` module. It is a standards-compliant wrapper around the original logic — all parameters are preserved. The C# source is embedded directly in the `.ps1` file and compiled on first use via `Add-Type`. Once compiled it is cached for the PowerShell session, so subsequent calls have no compilation overhead. No external module install, no dependency check, no prerequisites beyond SYSTEM privileges.

```powershell
# Install the dependency once
Install-Module RunAsUser -Scope AllUsers

# Import the module
Import-Module VB.WorkstationReport
```

---

## Use Cases and Examples

### 1 — Enumerate Applied GPOs for the Logged-On User

The classic trigger for this function. When you deploy a GPO troubleshooting script via Intune or an RMM agent, `gpresult` run as SYSTEM tells you what policies apply to SYSTEM — not the user.

```powershell
Invoke-VBasCurrentUser -ScriptBlock {
    gpresult /r /scope user | Out-File 'C:\Temp\gpo_report.txt' -Encoding UTF8
}
```

After the script completes, `C:\Temp\gpo_report.txt` contains the GPO Resultant Set of Policy for the actual logged-on user. Pull it back through your RMM or upload it to a central store.

### 2 — Write the Username into the Output Path

Sometimes you want the report to be named after the user. Use `-ExpandStringVariables` to expand variables from the SYSTEM calling scope into the user-context scriptblock before it runs.

```powershell
$LoggedOnUser = (Get-CimInstance -ClassName Win32_ComputerSystem).UserName -replace '.*\\', ''

Invoke-VBasCurrentUser -ScriptBlock {
    gpresult /r /scope user | Out-File "C:\Temp\gpo_$LoggedOnUser.txt" -Encoding UTF8
} -ExpandStringVariables
```

Without `-ExpandStringVariables`, `$LoggedOnUser` would be evaluated inside the spawned process (where it is not defined) and would be empty.

### 3 — Enumerate Printers in the User Session

`Get-Printer` is session-aware. Running it as SYSTEM returns system-managed printers only, not the user's mapped UNC or IP printers. Running it as the current user gives you the full picture.

```powershell
Invoke-VBasCurrentUser -ScriptBlock {
    Get-Printer | Select-Object Name, Type, PortName, PrinterStatus |
        Export-Csv 'C:\Temp\printers.csv' -NoTypeInformation -Encoding UTF8
} -CaptureOutput
```

### 4 — Export HKCU Group Policy Registry Branch

For environments where you need the raw registry state rather than the formatted gpresult output:

```powershell
Invoke-VBasCurrentUser -ScriptBlock {
    $RegPath = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Group Policy'
    reg export $RegPath 'C:\Temp\gpo_hkcu.reg' /y
}
```

### 5 — Long Scripts: Avoid the Command Line Length Limit

Base64-encoding a large scriptblock can push past the OS command line limit (32767 chars on Windows 8+). Use `-CacheToDisk` to write the script to a temp file instead.

```powershell
Invoke-VBasCurrentUser -ScriptBlock {
    # long multi-step audit scriptblock
    # ...
} -CacheToDisk
```

The temp file is cleaned up automatically after execution.

### 6 — Fire and Forget

When you want to kick off a process in the user session without blocking the SYSTEM script:

```powershell
Invoke-VBasCurrentUser -ScriptBlock {
    Start-Process 'C:\Tools\UserAudit.exe'
} -NoWait
```

---

## Putting It Together: Full GPO Audit Pattern

A common real-world pattern for RMM deployment:

```powershell
# Step 1 -- Resolve the logged-on username from SYSTEM
$LoggedOnUser = (Get-CimInstance -ClassName Win32_ComputerSystem).UserName -replace '.*\\', ''
$OutputFile   = Join-Path 'C:\Temp' "GPO_${LoggedOnUser}_$(Get-Date -Format 'yyyyMMdd-HHmm').txt"

# Step 2 -- Ensure output folder exists
if (-not (Test-Path 'C:\Temp')) { New-Item -ItemType Directory -Path 'C:\Temp' | Out-Null }

# Step 3 -- Run gpresult in the user session
Invoke-VBasCurrentUser -ScriptBlock {
    gpresult /r /scope user | Out-File $OutputFile -Encoding UTF8
} -ExpandStringVariables

# Step 4 -- Confirm the file was created
if (Test-Path $OutputFile) {
    Write-Output "GPO report saved: $OutputFile"
} else {
    Write-Warning "GPO report not created -- check Invoke-VBasCurrentUser output"
}
```

---

## What It Will Not Do

A few things worth being clear about:

- **Requires an active interactive session.** If no user is logged on, the WTS token query fails and the function writes an error.
- **One logged-on user only.** On a terminal server or multi-session host with several active users, the function targets the first active session found. It is not designed for multi-session enumeration.
- **No pipeline support.** This function executes a scriptblock. It does not return structured objects. If you need structured data back, write the output to a file inside the scriptblock and read the file from the SYSTEM script after execution.

---

## Installation

```powershell
# Install or update VB.WorkstationReport -- no other dependencies needed
Install-Module VB.WorkstationReport -Scope AllUsers
# or if pulling from the local repo:
Import-Module C:\Path\To\VB.WorkstationReport\VB.WorkstationReport.psd1
```

`Invoke-VBasCurrentUser` is in the `Public\` folder and is exported automatically. The C# type compiles on first call and is cached for the session — nothing else to install.

---

**Reference:** [Microsoft Docs — Windows Terminal Services API (WTSQueryUserToken)](https://learn.microsoft.com/en-us/windows/win32/api/wtsapi32/nf-wtsapi32-wtsqueryusertoken)

## Source

The function is part of the `VB.WorkstationReport` module. The embedded C# impersonation logic is adapted from the open-source [RunAsUser module by KelvinTegelaar](https://github.com/KelvinTegelaar/RunAsUser), published under the MIT licence.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Run PowerShell as the Logged-On User from SYSTEM Context",
  "description": "Use Invoke-VBasCurrentUser to execute a scriptblock in the interactive user session from a script running as SYSTEM via Intune, an RMM agent, or Task Scheduler.",
  "totalTime": "PT10M",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Install the VB.WorkstationReport module",
      "text": "Run Install-Module VB.WorkstationReport -Scope AllUsers from an elevated PowerShell session. The module is available on PowerShell Gallery and requires no additional dependencies."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Import the module in your SYSTEM-context script",
      "text": "Add Import-Module VB.WorkstationReport to the top of your script. Invoke-VBasCurrentUser is exported automatically and the embedded C# type compiles on first call."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Call Invoke-VBasCurrentUser with a scriptblock",
      "text": "Pass the code you want to run in the user session as a -ScriptBlock argument. The function obtains the interactive user WTS token and impersonates that session to execute your code."
    },
    {
      "@type": "HowToStep",
      "position": 4,
      "name": "Retrieve output via a file if structured data is needed",
      "text": "Invoke-VBasCurrentUser does not return pipeline objects. Write results to a file inside the scriptblock (e.g. Export-Csv or Out-File), then read the file from your SYSTEM script after execution."
    }
  ]
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Does Invoke-VBasCurrentUser work when no user is logged on?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. If no user is logged on, the WTS token query fails and the function writes an error. An active interactive session is required."
      }
    },
    {
      "@type": "Question",
      "name": "Can Invoke-VBasCurrentUser target multiple users on a terminal server?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. On a terminal server or multi-session host with several active users, the function targets the first active session found. It is not designed for multi-session enumeration."
      }
    },
    {
      "@type": "Question",
      "name": "Does Invoke-VBasCurrentUser return structured objects via the pipeline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. The function executes a scriptblock but does not return structured objects. To get data back, write the output to a file inside the scriptblock and read the file from your SYSTEM script after execution."
      }
    }
  ]
}
</script>

{{< post-cta module="VB.WorkstationReport" module_url="https://www.powershellgallery.com/packages/VB.WorkstationReport" >}}
