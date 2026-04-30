---
title: "Automating Azure AD Sync Monitoring Across 155 MSP Clients with PowerShell"
date: 2026-03-22T10:00:00+05:30
draft: false
description: "How I built a PowerShell tool that monitors Azure AD Connect sync status across 155+ MSP clients, auto-triggers forced syncs when thresholds are breached, and eliminated daily manual checks entirely."
tags: ["PowerShell", "Azure AD", "Automation", "MSP", "Active Directory"]
categories: ["PowerShell Automation"]
---

Managing Azure AD Connect sync health across a single tenant is straightforward. Doing it across
155+ MSP clients simultaneously — where each has its own Azure AD tenant, its own sync schedule,
and its own failure modes — is a different problem entirely.

This post covers how I built a monitoring tool that solved this for our team, cutting what used
to be a daily manual check into something that runs automatically and only pages us when something
actually needs attention.

## The Problem

Azure AD Connect sync failures are silent by default. A sync that stopped working three days ago
looks exactly the same in the admin portal as one that ran five minutes ago — until users start
calling because their password changes aren't propagating or new accounts aren't appearing in
cloud apps.

At our MSP, the manual process was: open partner portal, check each tenant's sync status, note
any that haven't synced in over 3 hours, create a ticket, investigate. With 155 clients, that
check alone was taking 45–60 minutes every morning before any actual work started.

The fix had to be automated, and it had to be smart enough to tell the difference between a sync
that's legitimately running (and just hasn't completed yet) versus one that's genuinely stuck.

## The Approach

The tool does three things:

1. **Polls sync status** across all client tenants via the Microsoft Graph API
2. **Evaluates each against a threshold** — any tenant where the last successful sync is older
   than a configurable number of hours gets flagged
3. **Auto-triggers a delta sync** on flagged tenants before raising an alert, because most
   sync issues self-resolve with a forced cycle

The auto-trigger step cuts noise dramatically. About 70% of threshold breaches resolve
themselves when you kick off a delta sync — the original run had just been delayed by
a scheduled task conflict or a brief connectivity blip.

## The Core Logic

```powershell
function Get-VBADSyncStatus {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string[]]$TenantId,

        [int]$ThresholdHours = 3,

        [PSCredential]$Credential
    )

    foreach ($tenant in $TenantId) {
        try {
            $token   = Get-VBGraphToken -TenantId $tenant -Credential $Credential
            $headers = @{ Authorization = "Bearer $($token.access_token)" }
            $uri     = "https://graph.microsoft.com/v1.0/organization"

            $org      = Invoke-RestMethod -Uri $uri -Headers $headers
            $lastSync = [datetime]$org.value[0].onPremisesLastSyncDateTime
            $age      = (Get-Date) - $lastSync

            [PSCustomObject]@{
                TenantId       = $tenant
                DisplayName    = $org.value[0].displayName
                LastSync       = $lastSync
                AgeHours       = [math]::Round($age.TotalHours, 1)
                ThresholdBreached = ($age.TotalHours -gt $ThresholdHours)
                Status         = if ($age.TotalHours -gt $ThresholdHours) { 'ALERT' } else { 'OK' }
                CollectionTime = (Get-Date).ToString('dd-MM-yyyy HH:mm:ss')
            }
        }
        catch {
            [PSCustomObject]@{
                TenantId  = $tenant
                Status    = 'Failed'
                Error     = $_.Exception.Message
                CollectionTime = (Get-Date).ToString('dd-MM-yyyy HH:mm:ss')
            }
        }
    }
}
```

The output is a clean object per tenant — pipe it to `Where-Object { $_.Status -eq 'ALERT' }`
to get only the ones that need attention, or `Export-Csv` for a full daily report.

## The Auto-Trigger

For tenants that breach the threshold, a delta sync is triggered via the Graph API before
the alert fires:

```powershell
function Start-VBADDeltaSync {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string]$TenantId,

        [PSCredential]$Credential
    )

    if ($PSCmdlet.ShouldProcess($TenantId, "Trigger delta sync")) {
        $token   = Get-VBGraphToken -TenantId $TenantId -Credential $Credential
        $headers = @{
            Authorization  = "Bearer $($token.access_token)"
            'Content-Type' = 'application/json'
        }

        $body = '{"clientState":"deltaSync"}'
        $uri  = "https://graph.microsoft.com/v1.0/directory/onPremisesSynchronization/forceSynchronization"

        Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body

        [PSCustomObject]@{
            TenantId  = $TenantId
            Action    = 'DeltaSyncTriggered'
            Timestamp = (Get-Date).ToString('dd-MM-yyyy HH:mm:ss')
        }
    }
}
```

The `-WhatIf` support means you can test the full workflow safely before letting it run
unattended — a habit worth keeping for any function that touches production tenants.

## How It Gets Used

The full workflow runs as a scheduled task every 30 minutes:

```powershell
# Load tenant list from config
$Tenants = Get-Content "$PSScriptRoot\tenants.json" | ConvertFrom-Json

# Check all tenants
$Results = Get-VBADSyncStatus -TenantId $Tenants.TenantId -ThresholdHours 3

# Auto-remediate breaches
$Breached = $Results | Where-Object { $_.ThresholdBreached }

foreach ($tenant in $Breached) {
    Start-VBADDeltaSync -TenantId $tenant.TenantId -Credential $ServiceCred
}

# Wait 10 minutes then re-check
Start-Sleep -Seconds 600

$Recheck = Get-VBADSyncStatus -TenantId $Breached.TenantId -ThresholdHours 3

# Only alert on tenants still breached after the forced sync
$StillBroken = $Recheck | Where-Object { $_.ThresholdBreached }

if ($StillBroken) {
    # Send to ticketing system / Teams webhook
    Send-VBAlert -Results $StillBroken
}
```

The 10-minute wait between trigger and re-check is important — a delta sync on a large
directory can take 5–8 minutes to complete. Alerting immediately after triggering just
creates noise.

## Results

Before this tool: 45–60 minutes every morning on manual checks, and sync failures
occasionally going unnoticed until users called.

After: Zero manual checks. Genuine failures (the ones that don't self-resolve with a
forced sync) generate a ticket automatically. The team now only sees sync issues when
they actually require human intervention — roughly 2–3 times a week across the full
client base, down from daily investigation sessions.

The full module including `Get-VBGraphToken` and `Send-VBAlert` is in the
[VBPowershell repository](https://github.com/Vibhu2/VBPowershell) on GitHub.

---

*Have a similar MSP automation challenge? Drop a comment below or reach out on
[LinkedIn](https://www.linkedin.com/in/vibhu-bhatnagar-02622798).*

{{< post-cta >}}
