---
title: "Audit GPO Health and AD/SYSVOL Sync with PowerShell"
date: 2026-07-23T17:22:48+05:30
draft: false
description: "Audit every GPO's link scope, AD/SYSVOL version sync, and loopback settings in one PowerShell script."
tags: ["PowerShell", "Active Directory", "GPO"]
categories: ["PowerShell Automation"]
author:
  name: Vibhu Bhatnagar
---

## Purpose

GPMC shows you each GPO one at a time, so drift hides easily: a GPO linked nowhere, a link half-disabled, or an AD/SYSVOL version mismatch that means clients are silently applying stale policy. Anyone auditing Group Policy health across a domain needs one table that surfaces all of it at once.

## Approach

`Get-GPOAnalysis` loops every GPO in the domain, pulls its XML report, and emits one row per link (or a single `<UNLINKED>` row for orphans):

- Pulls `Get-GPOReport -ReportType Xml` per GPO and compares `VersionDirectory` vs `VersionSysvol` for both Computer and User halves — a mismatch means AD and SYSVOL are out of sync, so a client could read stale policy
- Searches Computer extension policies by name for loopback processing, since the XML path for that setting varies across OS versions
- Reports link scope (`SOMPath`/`SOMName`), whether the link is `Enforced`, and whether it's even enabled
- Flags GPOs that exist but aren't linked anywhere — these are easy to miss in GPMC
- Optional `-Parallel` switch uses `ForEach-Object -Parallel` (PS7+) for large domains — only worth it if sequential is actually slow for you

## The Script

```powershell
function Get-GPOAnalysis {
    <#
    .SYNOPSIS
        Reports GPO link scope, AD/SYSVOL version sync status, and GPO health flags.
    .DESCRIPTION
        For every GPO in the domain, reports where it's linked (SOMPath/SOMName),
        whether the link is Enforced, whether its AD and SYSVOL versions are in
        sync (a mismatch means replication is lagging or broken and a client
        could be reading a stale policy), and whether User Group Policy loopback
        processing is configured. Also surfaces GPOs that are linked nowhere and
        GPOs that are fully or partially disabled.
    .PARAMETER Parallel
        Use ForEach-Object -Parallel (PS7+) to fetch GPO reports concurrently.
        Only worth using once you've confirmed this is actually slow for you —
        for a typical domain, sequential is fine.
    .EXAMPLE
        # There are 11 columns now - -AutoSize will silently truncate whatever
        # doesn't fit your console width. Use -Wrap, Out-GridView, or Export-Csv
        # instead if you need to see every column reliably.
        Get-GPOAnalysis | Format-Table -AutoSize -Wrap
    .EXAMPLE
        Get-GPOAnalysis | Export-Csv .\gpo-analysis.csv -NoTypeInformation
    .EXAMPLE
        Get-GPOAnalysis | Where-Object { $_.ComputerVersionMismatch -or $_.UserVersionMismatch }
    .EXAMPLE
        Get-GPOAnalysis | Where-Object { $_.LoopbackEnabled }
    #>
    [CmdletBinding()]
    [OutputType([PSCustomObject])]
    param(
        [switch]$Parallel
    )
    function Get-GPOAnalysisRow {
        param($Gpo)
        try {
            [xml]$Report = Get-GPOReport -Guid $Gpo.Id -ReportType Xml
        } catch {
            Write-Warning "Failed to get report for '$($Gpo.DisplayName)' ($($Gpo.Id)): $_"
            return
        }
        # Loopback processing lives under Computer > Administrative Templates as a
        # registry policy, not under the version/link nodes above - search by name
        # rather than a hardcoded path since the extension XML schema varies by OS version.
        $LoopbackPolicy = $Report.GPO.Computer.ExtensionData.Extension.Policy |
            Where-Object { $_.Name -match 'loopback' } |
            Select-Object -First 1
        $baseProps = [ordered]@{
            GPOName                 = $Gpo.DisplayName
            GPOGuid                 = $Gpo.Id
            GpoStatus               = $Gpo.GpoStatus
            ComputerADVersion       = $Report.GPO.Computer.VersionDirectory
            ComputerSYSVOLVersion   = $Report.GPO.Computer.VersionSysvol
            ComputerVersionMismatch = $Report.GPO.Computer.VersionDirectory -ne $Report.GPO.Computer.VersionSysvol
            UserADVersion           = $Report.GPO.User.VersionDirectory
            UserSYSVOLVersion       = $Report.GPO.User.VersionSysvol
            UserVersionMismatch     = $Report.GPO.User.VersionDirectory -ne $Report.GPO.User.VersionSysvol
            LoopbackEnabled         = if ($LoopbackPolicy) { $LoopbackPolicy.State -eq 'Enabled' } else { $false }
            LoopbackMode            = if ($LoopbackPolicy) { $LoopbackPolicy.DropDownList.Value.Name } else { $null }
        }
        if (-not $Report.GPO.LinksTo) {
            # GPO exists but is linked nowhere - still worth reporting
            [PSCustomObject]($baseProps + [ordered]@{
                LinkEnabled = $null
                Enforced    = $null
                SOMPath     = '<UNLINKED>'
                SOMName     = $null
                SOMType     = $null
            })
            return
        }
        foreach ($Link in $Report.GPO.LinksTo) {
            [PSCustomObject]($baseProps + [ordered]@{
                LinkEnabled = $Link.Enabled
                Enforced    = $Link.NoOverride
                SOMPath     = $Link.SOMPath
                SOMName     = $Link.SOMName
                SOMType     = $Link.SOMType
            })
        }
    }
    $AllGpos = Get-GPO -All
    if ($Parallel) {
        # -Parallel runspaces can't see functions from the parent scope,
        # so the function body has to be passed in explicitly via $using:
        $FuncDef = ${function:Get-GPOAnalysisRow}.ToString()
        $AllGpos | ForEach-Object -Parallel {
            ${function:Get-GPOAnalysisRow} = $using:FuncDef
            Get-GPOAnalysisRow -Gpo $_
        } -ThrottleLimit 10
    } else {
        $AllGpos | ForEach-Object { Get-GPOAnalysisRow -Gpo $_ }
    }
}

Get-GPOAnalysis | Out-GridView
```

> **[i] Requires:** GroupPolicy module, read access to GPOs in the domain

## The -AutoSize gotcha

Your own docstring already called this out — the last line of the script didn't follow its own advice, which is why it's now `Out-GridView` instead.

Here's why it matters: `Format-Table -AutoSize` sizes columns to fit your console width. With 11 properties on this object, once the calculated widths exceed the terminal width, PowerShell silently drops or truncates the trailing columns — no warning, no ellipsis, they just vanish. `LoopbackMode`, `SOMPath`, `SOMName`, `SOMType`, `LinkEnabled`, and `Enforced` are the ones that go missing first.

Three fixes, in order of what to actually reach for:

**`Out-GridView`** is the best option for 11 columns. It opens a separate sortable, filterable grid window and shows everything — nothing gets cut.

```powershell
Get-GPOAnalysis | Out-GridView
```

**`-Wrap`** keeps you in the console and wraps overflowing cell content onto extra lines instead of dropping columns. This is what the script's own `.EXAMPLE` block already recommends:

```powershell
Get-GPOAnalysis | Format-Table -AutoSize -Wrap
```

**`Export-Csv`** is the move if you'd rather open the results in Excel and skip fighting console width entirely:

```powershell
Get-GPOAnalysis | Export-Csv .\gpo-analysis.csv -NoTypeInformation
```

One caveat with `-Wrap`: with 11 columns your console window needs to be genuinely wide, or wrapped cells still look cramped. For a quick sanity check, `Out-GridView` is more pleasant to actually read.

## Result

```text
GPOName                                     GpoStatus            ComputerADVersion ComputerSYSVOLVersion ComputerVersionMismatch UserADVersion UserSYSVOLVersion UserVersionMismatch LoopbackEnabled
-------                                     ---------            ----------------- --------------------- ----------------------- ------------- ----------------- ------------------- ---------------
Small Business Server - Windows Vista policy AllSettingsEnabled  1                 1                     False                   0             0                 False               False
Default Domain Policy                        AllSettingsEnabled  135               135                   False                   157           157               False               False
Solid Background                             AllSettingsEnabled  1                 1                     False                   9             9                 False               False
Small Business Server Remote Assistance      UserSettingsDisabled 1                1                     False                   0             0                 False               False
Automate Agent Install                       AllSettingsEnabled  1                 1                     False                   1             1                 False               False
Attachment Manager Policy                    AllSettingsEnabled  1                 1                     False                   1             1                 False               True
Small Business Server Client Computer        AllSettingsEnabled  1                 1                     False                   0             0                 False               False
Term Server Folder Redirection               AllSettingsEnabled  1                 1                     False                   12            12                False               True
```

Every row here has matching AD/SYSVOL versions and no drift — that's what healthy looks like. The moment `ComputerVersionMismatch` or `UserVersionMismatch` reads `True` for any GPO, you've got replication lag worth chasing down before it causes inconsistent policy application across the domain. `Attachment Manager Policy` and `Term Server Folder Redirection` both show `LoopbackEnabled: True` — worth a second look if that wasn't intentional.

To narrow straight to the trouble spots:

```powershell
Get-GPOAnalysis | Where-Object { $_.ComputerVersionMismatch -or $_.UserVersionMismatch }
```

Rows with `SOMPath -eq '<UNLINKED>'` are GPOs doing nothing at all — safe to review for cleanup.

{{< post-cta >}}
