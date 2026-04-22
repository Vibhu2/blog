---
title: Basics
weight: 5
menu:
  notes:
    name: Basics
    identifier: notes-powershell-basics
    parent: notes-powershell
    weight: 5
---

{{< note title="PowerShell Version" >}}
```powershell
$PSVersionTable
```
{{< /note >}}

{{< note title="Get Help for Any Command" >}}
```powershell
Get-Help Get-Service -Full
Get-Help Get-Service -Examples
```
{{< /note >}}

{{< note title="Find Commands by Noun or Verb" >}}
```powershell
# All commands that work with services
Get-Command -Noun Service

# All commands that use the verb 'Get'
Get-Command -Verb Get
```
{{< /note >}}

{{< note title="List All Aliases" >}}
```powershell
Get-Alias
```
{{< /note >}}

{{< note title="Pipeline — Filter & Select" >}}
```powershell
# Filter objects
Get-Process | Where-Object { $_.CPU -gt 10 }

# Select specific properties
Get-Process | Select-Object Name, CPU, WorkingSet | Sort-Object CPU -Descending
```
{{< /note >}}

{{< note title="Format Output" >}}
```powershell
# Table
Get-Service | Format-Table Name, Status, StartType -AutoSize

# List (detailed)
Get-Service -Name "wuauserv" | Format-List *
```
{{< /note >}}
