---
title: System Information
weight: 10
menu:
  notes:
    name: System Information
    identifier: notes-powershell-system-info
    parent: notes-powershell
    weight: 10
---

{{< note title="Last Boot Time" >}}
```powershell
# Method 1 — TimeSpan since boot
(Get-Date) - (Get-ComputerInfo).OsLastBootUpTime

# Method 2 — Exact timestamp
(Get-CimInstance Win32_OperatingSystem).LastBootUpTime
```
{{< /note >}}

{{< note title="Computer System Details" >}}
```powershell
Get-CimInstance Win32_ComputerSystem
```
{{< /note >}}

{{< note title="BIOS Information" >}}
```powershell
Get-CimInstance Win32_BIOS
```
{{< /note >}}

{{< note title="Check Computer Domain" >}}
```powershell
(Get-CimInstance Win32_ComputerSystem).Domain
```
{{< /note >}}

{{< note title="All Drive Disk Space" >}}
```powershell
Get-PSDrive -PSProvider FileSystem
```
{{< /note >}}

{{< note title="System Drive Free Space (GB)" >}}
```powershell
(Get-PSDrive $env:SystemDrive.Trim(':')).Free / 1GB
```
{{< /note >}}

{{< note title="Volume Storage Information" >}}
```powershell
Get-Volume
```
{{< /note >}}

{{< note title="Printer Information" >}}
```powershell
Get-CimInstance Win32_Printer |
    Select-Object Name, PortName, Default |
    Format-List
```
{{< /note >}}
