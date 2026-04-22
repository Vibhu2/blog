---
title: Active Directory
weight: 45
menu:
  notes:
    name: Active Directory
    identifier: notes-powershell-active-directory
    parent: notes-powershell
    weight: 45
---

{{< note title="Get AD Group Members Recursively" >}}
```powershell
Get-ADGroupMember -Identity <group_name> -Recursive |
    Select-Object Name, SamAccountName
```
{{< /note >}}

{{< note title="Find Inactive Enabled User Accounts" >}}
```powershell
$tspan = (New-TimeSpan -Days 90)

$inacUser = Search-ADAccount -AccountInactive -TimeSpan $tspan -UsersOnly |
    Where-Object { $_.Enabled -eq $true } |
    Select-Object Name, DistinguishedName, LastLogonDate

Write-Host "$($inacUser.Count) inactive enabled user accounts found" -ForegroundColor Green
$inacUser
```
{{< /note >}}

{{< note title="Get Users Created in the Last 7 Days" >}}
```powershell
$week = (Get-Date).AddDays(-7)

$ADuserInWeek = Get-ADUser -Filter { whenCreated -ge $week } -Properties WhenCreated |
    Select-Object Name, WhenCreated, DistinguishedName

Write-Host "$($ADuserInWeek.Count) users created in the last 7 days" -ForegroundColor Green
$ADuserInWeek
```
{{< /note >}}

{{< note title="Verify DC DNS SRV Records" >}}
```powershell
Resolve-DnsName -Type ALL -Name "_ldap._tcp.dc._msdcs.$env:USERDNSDOMAIN"
```
{{< /note >}}

{{< note title="List All Installed Software" >}}
```powershell
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
    Select-Object DisplayName, DisplayVersion, Publisher, InstallDate |
    Format-Table -AutoSize
```
{{< /note >}}

{{< note title="Get All Active Users with Last Logon Timestamp" >}}
```powershell
Get-ADUser -Filter { Enabled -eq $true } -Properties LastLogonTimeStamp |
    Select-Object Name, @{
        Name       = "LastLogon"
        Expression = { [DateTime]::FromFileTime($_.LastLogonTimeStamp).ToString('dd-MM-yyyy HH:mm:ss') }
    } | Sort-Object LastLogon -Descending
```
{{< /note >}}

{{< note title="Backup All GPOs" >}}
```powershell
Backup-GPO -All -Path "C:\Temp\AllGPO"
```
{{< /note >}}
