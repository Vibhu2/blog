---
title: "Replace Your Monitoring Tools with PowerShell"
date: 2026-06-10T11:30:00+05:30
draft: false
description: "Built-in PowerShell diagnostics for crashes, disk wear, dead services and network activity — plus long-term performance logging you can audit on demand."
tags: ["PowerShell", "Windows", "Diagnostics", "Performance"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---

Task Manager is fine for a live CPU and memory snapshot. What it can't tell you: why the machine rebooted at 3am, which SSD is quietly wearing out, what auto-start service died last week, or what's connecting to an unfamiliar IP right now. PowerShell answers all of that — built in, free, scriptable, and more precise than any GUI. No third-party tools, no dashboard.

These are diagnostics I run in production, grouped by what they actually solve, so you can go from "something feels wrong" to a root cause in minutes. The live-performance snippets come last on purpose — Task Manager covers that ground well, so the things it *can't* do are front-loaded.

> **[i] Requires:** Standard local admin. No extra modules, no installs.

## Crash and Stability Analysis

### System errors in the last 24 hours

```powershell
Get-WinEvent -FilterHashtable @{
    LogName   = 'System'
    Level     = 1,2
    StartTime = (Get-Date).AddHours(-24)
} | Select-Object TimeCreated, Id, LevelDisplayName, Message | Format-List
```

Queries the System log for Critical (Level 1) and Error (Level 2) events from the past 24 hours, with full message text.

The System log is where Windows first records driver failures, hardware errors, and OS-level faults. Filtering to Level 1 and 2 cuts the noise hard — you read only what broke, not a wall of Informational events. The 24-hour window is tight enough to stay relevant but wide enough to catch intermittent issues.

### Unexpected shutdowns and reboots

```powershell
$os = Get-CimInstance Win32_OperatingSystem
[PSCustomObject]@{ LastBoot = $os.LastBootUpTime; Uptime = (Get-Date) - $os.LastBootUpTime }

# 41 = dirty/kernel-power, 6008 = unexpected, 1074 = who initiated a restart
Get-WinEvent -FilterHashtable @{LogName='System'; Id=41,6008,1074; StartTime=(Get-Date).AddDays(-7)} -EA SilentlyContinue |
    Select-Object TimeCreated, Id, Message | Format-List
```

Two things in one. First, when the machine last booted and how long it's been up. Second, the past 7 days for three event IDs:

- **41** — Kernel-Power: the system did not shut down cleanly (BSOD or hard power cut)
- **6008** — the previous shutdown was unexpected
- **1074** — a process or user initiated a restart/shutdown

If a machine rebooted overnight, was it Windows Update (1074, source = Windows Update), a kernel panic (41), or a power failure (6008)? These three IDs answer that definitively, with timestamps.

### Application crashes and hangs

```powershell
# 1000 = App Error, 1002 = App Hang, 1001 = WER/BugCheck
Get-WinEvent -FilterHashtable @{LogName='Application'; Id=1000,1002,1001; StartTime=(Get-Date).AddDays(-7)} -EA SilentlyContinue |
    Select-Object TimeCreated, Id, ProviderName, Message | Format-List
```

Queries the Application log for the past week, targeting three IDs:

- **1000** — Application Error (crash with exception)
- **1002** — Application Hang (process stopped responding)
- **1001** — Windows Error Reporting / BugCheck (BSOD summary)

Users say "Excel just closes" or "the screen goes blue sometimes." These events are the machine's own record of exactly that. ID 1001 even captures the stop code and faulting module for BSODs, which saves you decoding a minidump by hand.

## Storage Health

### Disk health and wear

```powershell
# Full report for all physical disks
Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object DeviceId, Temperature, Wear, ReadErrorsTotal, PowerOnHours

# Flag disks over 80% wear
Get-PhysicalDisk | Get-StorageReliabilityCounter | Where-Object {$_.Wear -gt 80} | Select-Object DeviceId, Wear
```

Pulls SMART-equivalent reliability data from every physical disk. `Wear` matters most for SSDs — it's the percentage of write endurance consumed (0 = new, 100 = fully worn). The second line flags any SSD over 80%.

Hard drives fail without warning; SSDs wear out predictably. `PowerOnHours` tells you how long a drive has run (40,000+ hours is statistically riskier). `ReadErrorsTotal` creeping up on a spinning disk is an early sign of surface degradation. Running this monthly beats any GUI SMART tool.

## Service Health

### Auto-start services that aren't running

```powershell
Get-CimInstance Win32_Service -Filter "StartMode='Auto' AND State!='Running'" |
    Select-Object Name, DisplayName, State, StartMode
```

Lists every service set to start automatically that currently isn't, with display name and state.

An `Auto` service that isn't running was either stopped by an error, crashed silently, or disabled by something that shouldn't have touched it. This surfaces all of them at once — no clicking through `services.msc` row by row. It's especially useful after a Windows Update, where service states can shift unexpectedly.

## Network Monitoring

### Active connections with process ownership

```powershell
Get-NetTCPConnection -State Established |
    Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort,
        @{N='Process';E={(Get-Process -Id $_.OwningProcess -EA SilentlyContinue).Name}} |
    Sort-Object RemoteAddress | Format-Table -AutoSize
```

Lists every established TCP connection, adds the owning process name to each row, and sorts by remote address so connections to the same destination group together.

This is `netstat -b`, but faster and easier to read. If something is phoning home — a process connecting to an unfamiliar IP — it surfaces immediately. It's also handy for app connectivity issues: you can confirm whether a service actually established its connection or is stuck somewhere else.

## Live Performance Monitoring

Task Manager handles most of this fine. Reach for these when you need a *trend* over time, a scriptable snapshot, or output you can drop into a report.

### CPU and memory at a glance

```powershell
Get-Counter '\Processor(_Total)\% Processor Time','\Memory\Available MBytes' -SampleInterval 2 -MaxSamples 30 |
    ForEach-Object {
        [PSCustomObject]@{
            Time       = $_.Timestamp
            CPUPercent = [math]::Round(($_.CounterSamples | Where-Object Path -like '*processor*').CookedValue, 1)
            FreeMB     = [int](($_.CounterSamples | Where-Object Path -like '*available*').CookedValue)
        }
    } | Format-Table Time, CPUPercent, FreeMB -AutoSize:$false
```

Samples CPU utilisation and free RAM every 2 seconds for 30 readings (1 minute), then prints a clean timestamped table.

Task Manager shows you *right now*. This shows you a *trend*. If CPU spikes every 10 seconds like clockwork, that's a scheduled task or a polling loop, not a runaway process. If free memory steadily declines and never recovers, you have a leak. The timestamps make it trivial to correlate against other logs.

### Top 10 processes by RAM, refreshing live

```powershell
while ($true) {
    Clear-Host
    Get-Process |
        Sort-Object WorkingSet64 -Descending |
        Select-Object -First 10 Name, Id, @{Name='RAM_MB';Expression={[math]::Round($_.WorkingSet64/1MB,1)}} |
        Format-Table -AutoSize
    Start-Sleep -Seconds 1
}
```

Every second, clears the screen and reprints the top 10 RAM consumers — a poor man's `htop` for Windows.

When memory pressure is high, you need to know *which* process is eating it and whether that's growing. This loop makes the answer obvious within seconds. Press `Ctrl+C` when done.

### Per-process CPU breakdown

```powershell
Get-Counter '\Process(*)\% Processor Time' -SampleInterval 1 -MaxSamples 2 |
    Select-Object -Last 1 -ExpandProperty CounterSamples |
    Where-Object { $_.InstanceName -notin '_total','idle' } |
    Sort-Object CookedValue -Descending | Select-Object -First 10 InstanceName,
        @{N='CPU%';E={[math]::Round($_.CookedValue/$env:NUMBER_OF_PROCESSORS,1)}}
```

Samples CPU time per process across two intervals to get a proper delta, drops the `_total` and `idle` pseudoprocesses, normalises the value per logical core, and shows the top 10 offenders.

Total CPU% tells you there's a problem. Per-process CPU tells you *who's responsible*. The normalisation step matters — without it, a process on a 16-core machine could report 1600% and mean nothing. This gives you a clean 0–100% figure per process.

## Long-Term Logging and On-Demand Auditing

Everything above is a point-in-time check. The bigger wins come from logging continuously and auditing later — the 3am reboot, the leak that takes two days to surface, the CPU spike that only happens during the nightly backup. Log to CSV now, answer the question whenever it comes up.

### Log performance to CSV, indefinitely

```powershell
$LogPath  = 'C:\Logs\perf-log.csv'
$Counters = '\Processor(_Total)\% Processor Time',
            '\Memory\Available MBytes',
            '\LogicalDisk(_Total)\% Free Space'

# Sample every 60s and append one timestamped row per sample — runs until you stop it
Get-Counter -Counter $Counters -SampleInterval 60 -Continuous |
    ForEach-Object {
        [PSCustomObject]@{
            Time     = $_.Timestamp
            CPU      = [math]::Round(($_.CounterSamples | Where-Object Path -like '*processor*').CookedValue, 1)
            FreeMB   = [int](($_.CounterSamples | Where-Object Path -like '*available*').CookedValue)
            DiskFree = [math]::Round(($_.CounterSamples | Where-Object Path -like '*free space*').CookedValue, 1)
        } | Export-Csv -Path $LogPath -Append -NoTypeInformation
    }
```

Samples CPU, free memory, and free disk every 60 seconds and appends one timestamped row to a CSV — until you press `Ctrl+C`. One row a minute is ~1,440 rows a day; a month is still a small file.

To make it survive reboots and run unattended, register it as a scheduled task set to **At startup** running as `SYSTEM`, or kick it off in the background with `Start-Job`.

> **[!] WARNING:** Make sure the log folder exists and has free space. Left running for months, archive or rotate the CSV so it doesn't grow unbounded.

### Audit the log when something happened

```powershell
$data = Import-Csv 'C:\Logs\perf-log.csv'

# Overall CPU summary across the whole period
$data | Measure-Object CPU -Average -Maximum -Minimum | Format-List Average, Maximum, Minimum

# Every window where free memory dropped below 1 GB
$data | Where-Object { [int]$_.FreeMB -lt 1024 } | Select-Object Time, FreeMB, CPU

# Zoom into a specific incident — e.g. the 30 minutes around a 3am reboot
$data | Where-Object {
    [datetime]$_.Time -gt '2026-06-09 02:45' -and
    [datetime]$_.Time -lt '2026-06-09 03:15'
} | Format-Table -AutoSize
```

Import the CSV and ask it questions. Get the average and peak CPU over the whole period, list every moment memory ran low, or zoom into the minutes around an incident to see what the machine was doing when it fell over. Because it's just objects, you filter and sort it like any other PowerShell data.

## Putting It Together

These snippets cover the full diagnostic loop:

| Category | Snippet | First question it answers |
|---|---|---|
| Stability | System error events | What broke in the last 24 hours? |
| Stability | Shutdown/reboot events | Why did the machine restart? |
| Stability | App crashes & hangs | Which apps are crashing? |
| Storage | Disk reliability counter | Is a disk about to fail? |
| Services | Stopped auto-start services | What service silently died? |
| Network | Active TCP connections | What is connecting to what? |
| Performance | CPU/Memory counter | Is the machine under load over time? |
| Performance | Top RAM processes | Which process is eating memory? |
| Performance | Per-process CPU | Which process is burning CPU? |
| Logging | Continuous CSV logger | What's the trend over hours or days? |
| Logging | CSV audit queries | What was happening at 3am? |

None of these need privileges beyond a standard admin. None need an install. And because they're all scriptable, you can fold them into one diagnostic report, run them on boot, or wrap them in a function that emails you when something looks wrong.

The monitoring software was never the point. The data was.

## References

- [Get-Counter — Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-counter)
- [Get-WinEvent — Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent)
- [Get-StorageReliabilityCounter — Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/storage/get-storagereliabilitycounter)
- Inspired by [I stopped using monitoring software once I learned these PowerShell diagnostics](https://www.makeuseof.com/i-stopped-using-monitoring-software-once-i-learned-these-powershell-diagnostics/) (MakeUseOf)

{{< post-cta >}}
