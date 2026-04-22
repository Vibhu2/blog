---
title: Services & Scheduled Tasks
weight: 20
menu:
  notes:
    name: Services & Tasks
    identifier: notes-powershell-services-tasks
    parent: notes-powershell
    weight: 20
---

{{< note title="Get Stopped Automatic Services" >}}
```powershell
Get-Service |
    Where-Object { $_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic' }
```
{{< /note >}}

{{< note title="Set Execution Policy" >}}
```powershell
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser
```
{{< /note >}}

{{< note title="Restart LTServices (ConnectWise Automate)" >}}
```powershell
# Stop related processes
$processes = "ltsvcmon","ltsvc","lttray","labvnc","labtechupdate"
Stop-Process -Name $processes -Force -ErrorAction SilentlyContinue

# Restart services
$services = "ltsvcmon","labvnc","ltservice"
Restart-Service -Name $services -Force -ErrorAction SilentlyContinue
```
{{< /note >}}

{{< note title="Scheduled Tasks Run in Last 30 Days" >}}
```powershell
$cutoff = (Get-Date).AddDays(-30)

Get-ScheduledTask | ForEach-Object {
    $info = Get-ScheduledTaskInfo $_
    [PSCustomObject]@{
        TaskName    = $_.TaskName
        State       = $_.State
        LastRunTime = $info.LastRunTime
        TaskPath    = $_.TaskPath
    }
} | Where-Object { $_.LastRunTime -ge $cutoff } |
    Sort-Object LastRunTime |
    Format-Table -AutoSize
```

**Common `LastTaskResult` codes:**

| Code | Meaning |
| :--- | :--- |
| `0` | Success ✅ |
| `1` | Generic failure ⚠️ |
| `2147942402` | File not found 📂 |
| `2147943726` | Logon failure 🔐 |
{{< /note >}}

{{< note title="Who Rebooted the Server" >}}
```powershell
Get-EventLog -Log System -Newest 100 |
    Where-Object { $_.EventID -eq '1074' } |
    Format-Table MachineName, UserName, TimeGenerated -AutoSize
```
{{< /note >}}
