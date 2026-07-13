---
title: "The MSP Client Onboarding Checklist I Actually Use"
date: 2026-07-13T11:52:54+05:30
draft: false
description: "A battle-tested MSP client onboarding checklist — department mapping, AD design, naming conventions, and the gaps that always slip through."
tags: ["Active Directory", "M365", "MSP", "Documentation", "Onboarding"]
categories: ["IT Operations"]
author:
  name: Vibhu Bhatnagar
---

## What This Covers

Every MSP has a client onboarding checklist buried in a wiki somewhere. Most of them are wrong — not factually wrong, just incomplete in the way that only becomes obvious three months in, when someone asks "wait, who owns the `info@` mailbox?" and nobody has an answer.

This is the checklist I actually use. It's long on purpose. Onboarding is the one phase where skipping a step doesn't cost you time now — it costs you a 2am phone call in six months when nobody remembers the firewall admin password, or a compliance audit where you can't produce a network diagram because "it's in someone's head."

## Before You Start

Get the paperwork locked before you touch a single device. This sounds obvious until you're three weeks into an engagement realizing the SOW never actually defined what "unlimited support" means.

- MSA, NDA, and SOW signed — and the out-of-scope items written down explicitly, not implied
- SLA defined with real numbers: response times by priority, coverage hours, escalation path
- LOA signed for every third-party vendor you'll need to call on the client's behalf
- DPA in place if GDPR, HIPAA, or similar applies
- Onboarding questionnaires sent — business overview, infrastructure self-assessment, security self-assessment — before Day 1, not during it

The questionnaire step matters more than it looks. Half the value isn't the answers you get back — it's finding out on day one who on the client side actually knows how their own network is wired, versus who just thinks they do.

## Start With the Org Chart, Not the Servers

Here's the mistake I made early in my career: showing up on Day 1 and diving straight into the network. Wrong order. Every downstream decision — AD structure, GPOs, email groups, VLANs, printer assignments — traces back to one thing: the department list. Get that wrong and you'll be renaming OUs six months later while users complain their mapped drives disappeared.

Before touching infrastructure, nail down:

- Full department list, sourced from HR or the org chart — not from asking around
- A named head for each department, plus headcount and site
- Remote/hybrid split per department
- Whether departments map to cost centers or billing codes

Watch for industry-specific departments that don't show up on a generic template — Radiology and Pharmacy for healthcare clients, Paralegals and Secretarial for law firms, Production Floor and QA for manufacturing. Ask the client directly; don't assume their org chart matches the template in your head.

### Turning the Department List Into an AD Design

Once you have departments locked, the AD structure basically writes itself. I use a baseline OU layout on almost every engagement and adjust from there:

```text
DC=client,DC=local
├── _PWSH.in-Managed      ← MSP management objects
├── Computers
│   ├── Desktops
│   │   ├── Finance
│   │   ├── HR
│   │   └── [per department]
│   ├── Laptops
│   ├── Kiosks
├── Users
│   ├── Executives
│   ├── Finance
│   ├── IT
│   ├── [per department]
│   ├── Contractors
│   └── _Disabled
├── Groups
├── Service Accounts
└── Servers
```

For GPOs, build a per-department requirement table before you write a single policy. It doesn't need to be fancy:

| Department | GPO Requirement |
|---|---|
| All Users | Password policy, screensaver lock, Windows Update |
| Executives | Relaxed USB policy, VPN auto-connect |
| Finance | Strict USB block, no local admin, DLP |
| IT | Local admin rights, unrestricted PowerShell |
| Kiosk / Reception | Locked-down desktop |
| Field / Remote | VPN deploy, BitLocker enforced |
| Contractors | Internet-only, no mapped drives |

Also capture, per department: software they actually use day to day (licensed and unlicensed — you'd be surprised how often "unlicensed" shows up), mapped drives, and printer assignments. This is tedious. Do it anyway — it's the difference between a GPO rollout that works and one you're firefighting for a month.

### Email Groups Need Owners, Not Just Names

Every department needs at minimum one distribution list. That part's easy. The part people skip is deciding who *owns* each shared mailbox and DL before it's created — not after. An unowned DL is fine for about six months, and then membership goes stale and nobody notices until someone important gets left off an announcement.

Standard set I create at onboarding for almost every client:

| Group | Address | Purpose |
|---|---|---|
| All Staff | `all@` | Company-wide announcements |
| Executives | `executives@` | Leadership comms |
| IT | `it@` | Internal escalation |
| Alerts / Monitoring | `alerts@` | RMM, backup alerts |

For shared mailboxes (`info@`, `accounts@`, `support@`), document who has Send-As vs. Send-on-Behalf, and who's actually the "owner" if the mailbox breaks. And decide your M365 Groups / Teams naming and expiry policy now — orphaned Teams groups from three reorgs ago are a special kind of mess to clean up later.

### Naming Conventions: Agree Before You Create Anything

Retroactive renaming is expensive. Not "annoying" — expensive, in the literal sense of billable hours spent fixing something that didn't need fixing. Lock these down in writing before the first user account, hostname, or GPO exists:

- **Usernames:** `firstname.lastname` is the default I reach for unless the client has an existing convention or a short-username requirement
- **Hostnames:** `[SITE]-[TYPE]-[###]` for multi-site clients (`SYD-WS-001`), `[TYPE]-[###]` for smaller ones
- **AD groups:** `SEC-` for security groups, `DL-` for distribution, `APP-` for application access, `VPN-` for remote access groups
- **Service accounts:** `svc-[application]`, always documented with an owning app and a responsible admin

The naming convention document takes an hour to write and saves you from the situation where three different techs created three different naming patterns over two years and nobody can search for anything anymore.

### Seating Plans Feed Everything Else

This one gets skipped constantly because it feels like facilities' job, not IT's. It isn't. Your printer GPOs, VLAN assignments, and VoIP extension mapping all depend on knowing who sits where. Get the floor plan, mark department zones, and map desk-to-username. It's boring paperwork that saves a technician from wandering a floor asking "is this your desk?" during a printer rollout.

## Network Infrastructure

Run an automated discovery scan first — Network Detective, Domotz, Liongard, whatever you use. Clients routinely forget devices exist. I've found switches in closets that predated the current IT manager.

For each ISP circuit: provider, account number, NOC contact, circuit type, bandwidth, static IPs, contract expiry, and whether it's primary or failover.

For firewalls: make/model/firmware, management IP and credentials, current NAT rules, site-to-site VPN configs (peer IPs, PSKs, subnets), and HA pairing if it exists. Same depth for switches (VLAN config, spanning tree root, uplinks) and wireless (SSID list with security type and passphrase, guest isolation policy).

Get a Layer 2/3 topology diagram built during this phase if one doesn't already exist. "It's basically flat, there's not much to draw" is the sentence right before you discover the guest VLAN isn't actually isolated.

## Servers, Endpoints, and Everything With a Hostname

For every physical and virtual server: hostname, specs, OS/patch level, role, IP, iDRAC/iLO/IPMI access, warranty status, and confirmation that a monitoring agent is actually deployed and reporting — not just installed.

Domain controllers get their own line item: FQDN, functional levels, FSMO role holders, replication status, and the DSRM password stored in the vault (not in someone's head). File servers need their share list with permissions model documented against AD groups, not individual users.

For endpoints — workstations, laptops, mobile devices — you want a full inventory with warranty/lease expiry and confirmation that EDR and RMM agents are actually installed and phoning home. Flag anything past end-of-life now, while it's a planning conversation, not later when it's an emergency.

## Printers Are Where Security Hygiene Goes to Die

I'll call this out on its own because it's the single most consistent gap I find at onboarding: printers running default admin credentials. `admin/admin`, `admin/1234` — vendors ship them that way and nobody ever changes it. Change every default password during onboarding and put the new ones in the vault. It's a five-minute task per device and it closes a door that's genuinely easy for an attacker to walk through.

Beyond credentials, document IP, physical location, print queue, scan-to-email/folder config (including the SMTP relay it depends on), and supply vendor contract terms.

## VoIP, Identity, and Email

Phone systems need the same rigor: platform, admin portal, DID ranges, and support contract details — plus knowing exactly who to call when the SIP trunk drops at 6am on a Monday.

For identity: pull the full AD user export, separate admin accounts from daily-driver accounts, and identify stale/disabled accounts that are still enabled (this is more common than it should be). On the cloud identity side — Entra ID, Okta, Google Workspace — confirm MFA is actually enforced, not just available, and that there's a documented break-glass account. A single global admin with no MFA and no backup account is a liability, not a convenience.

Email platform documentation should cover SPF/DKIM/DMARC (verified, not assumed configured), anti-spam solution, and litigation hold settings if the client needs them. For M365 specifically, confirm GDAP delegated admin access is set up correctly — this is the difference between managing the tenant properly and someone having full global admin rights they don't need.

## Backup Is Not "Backup Is Running"

This deserves its own paragraph because it's the most dangerous gap in the whole list. "We have backups" is not the same statement as "we have tested restores." Document the backup platform, schedule, retention, and offsite destination — then actually perform a test restore and write down that you did it. RTO and RPO should be numbers, not vibes.

## Security, Compliance, and SaaS Sprawl

Endpoint security (AV/EDR deployed and centrally managed, not just installed) and network security (external vulnerability scan as a baseline, default credentials changed on every network appliance) round out the technical side. For compliance — HIPAA, PCI-DSS, GDPR, whatever applies — document current posture and gaps honestly. Clients would rather hear about a gap at onboarding than discover it during an audit.

Cloud and SaaS inventory is its own project on some clients. For each service: provider, account details, admin credentials in the vault, renewal date, seat count, and data residency. This is also where shadow IT surfaces — SaaS accounts someone signed up for on a company card with zero documented admin access. You will find at least one.

Domain and DNS: registrar, auto-renew status (confirm the payment card on file is current — domains lapse more often from expired cards than anything dramatic), and SSL certificate expiry dates tracked somewhere that actually alerts you, not a spreadsheet nobody opens.

## MSP Tooling and the Handoff

Before you call onboarding done: RMM deployed and alerting tested (not just installed), backup agent deployed with a verified first backup, PSA ticket queue created, and every credential you've touched sitting in the password vault — never in an email thread.

Then hand off properly. Brief the account manager on the environment. Review the client profile with the helpdesk team so the first ticket doesn't start with "who is this client, again?" And book the first QBR within 90 days — not as a formality, but because that's when you circle back on the risks you flagged during onboarding and see whether they got fixed or quietly ignored.

## The Gaps I See Every Time

If you want a preview of what onboarding will surface, here's the pattern that repeats across almost every client I've onboarded, regardless of size or industry:

Printers on default credentials. SSL certificates expiring within 90 days with nobody tracking them. The previous MSP still holding admin access weeks after the transition should have completed. A backup job that's "running" but has never been restore-tested. Stale AD accounts for people who left a year ago. A single global admin account with no MFA. And — the one that causes the most downstream pain — no agreed naming convention, which means every AD object, GPO, and group was created a little differently by whoever happened to be on-site that week.

None of these are exotic problems. They're all boring, all preventable, and all exactly why this checklist exists.

## Takeaway

Onboarding isn't a formality before "real" work starts — it's the foundation everything else gets built on. Get the department list and naming conventions locked in week one, and the AD structure, GPOs, and email groups fall into place instead of becoming a rebuild project later. Skip that step, and you're the tech renaming OUs eighteen months in while explaining to a confused client why their shared drive moved.

{{< post-cta >}}
