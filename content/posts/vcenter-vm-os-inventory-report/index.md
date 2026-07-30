---
title: "Audit VM OS Drift and Resource Allocation with PowerCLI"
date: 2026-07-29T10:00:00+05:30
draft: true
description: "Connect to vCenter with PowerCLI and pull modular reports for VM guest OS drift and CPU, RAM, and disk allocation — reusable one block at a time."
tags: ["PowerShell", "VMware", "PowerCLI", "vSphere", "Automation", "Audit"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---
<!--
BEFORE PUBLISHING:
  1. Write your description — shown in post listings and Google
  2. Add relevant tags  — e.g. ["PowerShell", "Active Directory", "Windows Server"]
  3. Set category      — e.g. "PowerShell Automation", "Infrastructure", "Azure"
  4. Change draft: true → draft: false when ready to publish
-->

## Purpose

I've walked into more than one environment where half the "Windows Server 2016" tags in vCenter were actually Server 2022 boxes that got upgraded in place two years ago and nobody touched the VM config afterward. Nobody notices until a compliance scan flags an EOL OS that was actually patched current, or a hardware-compatibility check fails against a version that hasn't been true for years. The fix isn't a bigger tool — it's two five-line reports run off the same connection: one for OS drift, one for what's actually allocated in CPU, memory, and disk. Below is both, broken into modular blocks so each one stands alone.

> **[i] Tested on:** vCenter Server 8.0, PowerCLI 13.x, PowerShell 5.1 and 7.4

## What This Covers

- Installing PowerCLI and trusting an internal vCenter's certificate
- Connecting and verifying the session came up before running anything
- A VM guest OS inventory report (configured vs detected)
- A VM resource allocation report (CPU, RAM, provisioned/used disk)
- Disconnecting cleanly, and reusing each block independently

## Before You Start

- PowerShell 5.1 or later, with internet access to PSGallery for the module install
- Network access to the vCenter server on port 443
- A vSphere account with at least read-only access to the VMs you want reported on
- An export folder that exists and is writable — the scripts below create one if it's missing

## Steps

### Step 1: Prepare — Install PowerCLI and Trust the vCenter Certificate

```powershell
# Install the PowerCLI SDK and the main PowerCLI module
if (-not (Get-Module -ListAvailable -Name VMware.VimAutomation.Sdk)) {
    Install-Module -Name VMware.VimAutomation.Sdk -Scope CurrentUser -Force -AllowClobber
}

if (-not (Get-Module -ListAvailable -Name VMware.PowerCLI)) {
    Install-Module -Name VMware.PowerCLI -Scope CurrentUser -Force -AllowClobber
}

# Trust self-signed certs on an internal vCenter — skip this line if your
# vCenter has a certificate issued by a trusted CA
Set-PowerCLIConfiguration -InvalidCertificateAction Ignore -Confirm:$false | Out-Null
```

> **[!] WARNING:** `-InvalidCertificateAction Ignore` disables TLS certificate validation for every PowerCLI session, not just this one. Fine for a vCenter you already trust on an internal network — don't use it against anything reachable from the open internet.

### Step 2: Connect and Verify the Session

```powershell
Connect-VIServer -Server 'vcenterurl' -Credential (Get-Credential)

# Confirm the session actually came up before running any reports
$global:DefaultVIServer
```

If `$global:DefaultVIServer` comes back empty or shows `IsConnected: False`, stop here — check the credential prompt and the server name before moving on.

### Step 3: Report — VM Guest OS Inventory (Configured vs Detected)

vCenter tracks two OS values per VM: what's set in the VM's hardware config, and what VMware Tools detects running inside the guest. They drift apart after in-place OS upgrades or P2V migrations that never got the config field updated.

```powershell
$ExportFolder = 'C:\VMReports'
New-Item -Path $ExportFolder -ItemType Directory -Force | Out-Null

Get-View -ViewType VirtualMachine | Select-Object Name,
    @{N = 'PowerState';   E = { $_.Runtime.PowerState } },
    @{N = 'ConfiguredOS'; E = { $_.Config.GuestFullName } },
    @{N = 'DetectedOS';   E = { $_.Guest.GuestFullName } } |
    Export-Csv -Path "$ExportFolder\VM_OS_Inventory.csv" -NoTypeInformation
```

`Get-View` talks to the vSphere API directly instead of building full PowerCLI objects — worth the odd property paths (`.Runtime.PowerState` instead of `.PowerState`) when you're iterating over a large inventory and only need a few fields. This is exactly the kind of report that exposes drift:

| Name | PowerState | ConfiguredOS | DetectedOS |
| :--- | :--- | :--- | :--- |
| APP-SQL01 | poweredOn | Windows Server 2016 (64-bit) | Microsoft Windows Server 2022 |
| DC-02 | poweredOn | Windows Server 2019 (64-bit) | Microsoft Windows Server 2019 |
| WEB-03 | poweredOn | Other Linux (64-bit) | Ubuntu Linux (64-bit) |

`APP-SQL01` is the case that matters — configured as 2016, actually running 2022. That's the one line a patch or compliance report would get wrong.

### Step 4: Report — VM Compute and Storage Allocation

For CPU, memory, and disk numbers, `Get-VM` is the better tool — the values are already exposed as plain properties, no need to walk the underlying hardware device list.

```powershell
Get-VM | Select-Object Name,
    NumCpu,
    MemoryGB,
    @{N = 'ProvisionedSpaceGB'; E = { [math]::Round($_.ProvisionedSpaceGB, 1) } },
    @{N = 'UsedSpaceGB';        E = { [math]::Round($_.UsedSpaceGB, 1) } } |
    Export-Csv -Path "$ExportFolder\VM_Resource_Allocation.csv" -NoTypeInformation
```

```text
Name        NumCpu MemoryGB ProvisionedSpaceGB UsedSpaceGB
----        ------ -------- ------------------ -----------
APP-SQL01        4       16              300.0        142.6
DC-02             2        8               80.0         38.2
WEB-03            2        4               60.0         12.4
```

`ProvisionedSpaceGB` is what's allocated (thin or thick); `UsedSpaceGB` is what's actually on the datastore. A wide gap on thin-provisioned disks is normal — it's only a problem when the datastore itself is running low on headroom, not when an individual VM's numbers look sparse.

### Step 5: Disconnect

```powershell
Disconnect-VIServer -Server 'vcenterurl' -Confirm:$false
```

Always close the session when you're done — stale connections pile up on the vCenter server if this runs unattended or on a schedule.

## Verify

```powershell
Import-Csv 'C:\VMReports\VM_OS_Inventory.csv' | Measure-Object
Import-Csv 'C:\VMReports\VM_Resource_Allocation.csv' | Measure-Object

# Flag VMs where the configured and detected OS don't match
Import-Csv 'C:\VMReports\VM_OS_Inventory.csv' |
    Where-Object { $_.ConfiguredOS -ne $_.DetectedOS } |
    Format-Table Name, ConfiguredOS, DetectedOS -AutoSize
```

## Notes

- Each block is self-contained — copy just the OS report or just the resource report into a scheduled task without pulling in the other
- Swap `Get-Credential` for a stored credential or service account before putting any of this on a schedule
- For a fleet of vCenters, loop Steps 1–5 over a list of servers and tag each export filename with the vCenter name
- Tools like RVTools give you this and more through a GUI — reach for these scripts instead when you need the output in a pipeline, a scheduled task, or a format you control

## References

- [VMware PowerCLI on PSGallery](https://www.powershellgallery.com/packages/VMware.PowerCLI)
- [Get-View — VMware PowerCLI Cmdlet Reference](https://developer.vmware.com/docs/powercli/latest/vmware.vimautomation.core/commands/get-view/)
- [Get-VM — VMware PowerCLI Cmdlet Reference](https://developer.vmware.com/docs/powercli/latest/vmware.vimautomation.core/commands/get-vm/)

{{< post-cta >}}
