---
title: Networking
weight: 30
menu:
  notes:
    name: Networking
    identifier: notes-powershell-networking
    parent: notes-powershell
    weight: 30
---

{{< note title="Quick LAN Speed Test" >}}
```powershell
# Adapter speed and status
Get-NetAdapter | Select-Object Name, LinkSpeed, Status

# Packet statistics
Get-NetAdapterStatistics |
    Select-Object Name, ReceivedPackets, ReceivedDiscardedPackets, OutboundDiscardedPackets
```
{{< /note >}}

{{< note title="Wireless Report Generation" >}}
```powershell
netsh wlan show wlanreport
```

Generates a full HTML report saved to:
`C:\ProgramData\Microsoft\Windows\WlanReport\wlan-report-latest.html`
{{< /note >}}
