---
identifier: notes-powershell-basics
parent: notes-powershell
weight: 8
---
{{< note title="Get last boot time of the machine" >}}

```powershell
(Get-Date) - (Get-ComputerInfo).OsLastBootUpTime
```

**Alternative:**

```powershell
(Get-CimInstance Win32_OperatingSystem).LastBootUpTime
```

{{< /note >}}

---

{{< note title="Get list of Stopped Services" >}}

```powershell
Get-Service | Where-Object { $_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic' }
```

{{< /note >}}

---

{{< note title="Set Execution Policy on Machine" >}}

```powershell
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser
```

{{< /note >}}

---

{{< note title="Get all Drive Disk Space" >}}

```powershell
Get-PSDrive -PSProvider FileSystem
```

{{< /note >}}

---

{{< note title="Get System Drive free Space" >}}

```powershell
(Get-PSDrive $env:SystemDrive.Trim(':')).Free / 1GB
```

{{< /note >}}

---

{{< note title="Check BIOS Information" >}}

```powershell
Get-CimInstance Win32_BIOS
```

{{< /note >}}

---

{{< note title="Check computer Information" >}}

```powershell
Get-CimInstance Win32_ComputerSystem
```

{{< /note >}}

---

{{< note title="Check Printer Information on a Machine" >}}

```powershell
Get-CimInstance Win32_Printer | Select-Object Name, PortName, Default| Format-List

```

{{< /note >}}

---

{{< note title="Keep System Awake ( VB ) Script" >}}

```powershell
set wsc = CreateObject("WScript.Shell")
Do
'Five minutes
WScript.Sleep(5*60*1000)
wsc.SendKeys("{F13}")
Loop
```

This is a vbs script so save it as keepawake.vbs and run it.
{{< /note >}}

---

{{< note title="Install PowerShell core using chocolaty" >}}

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;
 iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
choco install powershell -force --yes choco install powershell-core -force --yes Start-Sleep -Seconds 90 exit exit
```

{{< /note >}}

---

{{< note title="Who Rebooted Production Server" >}}

```powershell
Get-EventLog –Log System –Newest 100 | Where-Object {$_.EventID –eq ‘1074’} | FT MachineName, UserName, TimeGenerated -AutoSize
```

{{< /note >}}

---

{{< note title="Check Computer Domain" >}}

```powershell
(Get-CimInstance Win32_ComputerSystem).Domain
```

{{< /note >}}

---

{{< note title="Restart LTServices." >}}

```powershell
# Stop related processes
$processes = "ltsvcmon","ltsvc","lttray","labvnc","labtechupdate"
Stop-Process -Name $processes -Force -ErrorAction SilentlyContinue-Force

# Restart services
$services = "ltsvcmon","labvnc","ltservice"
Restart-Service -Name $services -Force -ErrorAction SilentlyContinue
```

{{< /note >}}

---

{{< note title="Schedules Task In Last 30 days" >}}

```powershell
$cutoff = (Get-Date).AddDays(-30)

Get-ScheduledTask | ForEach-Object {
    $info = Get-ScheduledTaskInfo $_
    [PSCustomObject]@{
        TaskName    = $_.TaskName
        State       = $_.State
        LastRunTime = $info.LastRunTime
		TaskPath    = $_.TaskPath
        #LastResult  = $info.LastTaskResult
    }
} | Where-Object { $_.LastRunTime -ge $cutoff } |
Sort-Object LastRunTime | FT -auto
```

Common LastTaskResult codes:

0 → Success ✅
1 → Incorrect function / generic failure ⚠
2147942402 (0x80070002) → File not found 📂
2147943726 (0x8007052E) → Logon failure 🔐

{{< /note >}}

---

{{< note title="Storage Information">}}

```powershell
get-volume
```

{{< /note >}}

{{< note title="Remove Header from Transcript">}}

```powershell
Start-Transcript -Path "C:\Realtime\DC-Diagnostic_DSI.txt" -IncludeInvocationHeader $false -Force
# Your commands here
Stop-Transcript
```

{{< /note >}}


{{< note title="Complete Wireless Report Generation ">}}

```powershell
netsh wlan show wlanreport
```

{{< /note >}}


{{< note title="Quick Lan Speed Test  ">}}

```powershell
Get-NetAdapter | Select-Object Name, LinkSpeed, Status
Get-NetAdapterStatistics | Select-Object Name, ReceivedPackets, ReceivedDiscardedPackets, OutboundDiscardedPackets
```

{{< /note >}}
