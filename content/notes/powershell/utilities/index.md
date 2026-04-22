---
title: Utilities & Scripting
weight: 40
menu:
  notes:
    name: Utilities
    identifier: notes-powershell-utilities
    parent: notes-powershell
    weight: 40
---

{{< note title="Keep System Awake (VBS)" >}}
```vbscript
Set wsc = CreateObject("WScript.Shell")
Do
    ' Sleep 5 minutes, then send a harmless keypress
    WScript.Sleep(5 * 60 * 1000)
    wsc.SendKeys("{F13}")
Loop
```

Save as `keepawake.vbs` and run with `wscript keepawake.vbs`.
{{< /note >}}

{{< note title="Remove Header from Transcript" >}}
```powershell
Start-Transcript -Path "C:\Logs\output.txt" -IncludeInvocationHeader $false -Force
# Your commands here
Stop-Transcript
```
{{< /note >}}

{{< note title="Install Chocolatey + PowerShell Core" >}}
```powershell
# Step 1 — Install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol =
    [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
Invoke-Expression ((New-Object System.Net.WebClient).DownloadString(
    'https://community.chocolatey.org/install.ps1'))

# Step 2 — Install PowerShell Core
choco install powershell-core -y --force
```
{{< /note >}}
