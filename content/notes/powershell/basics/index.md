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

{{< note title="Get list of stopped services" >}}

```powershell
Get-Service | Where-Object { $_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic' }
```
{{< /note >}}

---

{{< note title="Set execution policy on machine" >}}

```powershell
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser
```
{{< /note >}}

---

{{< note title="Get all drive disk space" >}}

```powershell
Get-PSDrive -PSProvider FileSystem
```
{{< /note >}}

---

{{< note title="Get system drive free space" >}}

```powershell
(Get-PSDrive $env:SystemDrive.Trim(':')).Free / 1GB
```
{{< /note >}}

---
{{< note title="Check BIOS information" >}}

```powershell
Get-CimInstance Win32_BIOS
```
{{< /note >}}

---
{{< note title="Check computer information" >}}

```powershell
Get-CimInstance Win32_ComputerSystem
```
{{< /note >}}

---
{{< note title="Check printer information on a machine" >}}

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
{{< note title="Checking who rebooted a production server" >}}

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
