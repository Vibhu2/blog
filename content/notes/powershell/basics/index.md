---

    identifier: notes-powershell-basics
    parent: notes-powershell
    weight: 10
---
{{< note title="To get last boot time of the machine." >}}

```powershell
(get-date) - (Get-ComputerInfo).OsLastBootUpTime
```
or
```
(Get-CimInstance Win32_OperatingSystem).LastBootUpTime
```

{{< /note >}}

{{< note title="Get list of stopped services" >}}

```powershell
Get-Service | Where-Object {$_.Status -eq "Stopped" -and $_.Starttype -eq "Automatic"}
```

{{< /note >}}

{{< note title="Setting execution Policy on machine" >}}

```powershell
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser
```
{{< /note >}}

{{< note title="Get all Drive Disk Space." >}}

```powershell
Get-PSDrive -PSProvider FileSystem
```
{{< /note >}}
