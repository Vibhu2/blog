---
title: Services Auto start but stopped

---

{{< note title="Services Auto start but stopped" >}}

```bash
Get-CimInstance Win32_Service | Where-Object { $_.StartMode -eq "Auto" -and $_.State -ne "Running" } | Select-Object Name, DisplayName, State, StartMode
```

{{< /note >}}
