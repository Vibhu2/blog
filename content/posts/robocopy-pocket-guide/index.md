---
title: "Robocopy: The IT Manager's Pocket Guide to File Server Migrations"
date: 2026-08-17T10:51:06+05:30
draft: false
description: "Every Robocopy switch explained, grouped by when to use it, when to avoid it, and a fully annotated script for a real file server migration."
tags: ["PowerShell", "Windows Administration", "Windows Server", "Migration", "Backup", "Robocopy"]
categories: ["Windows Administration"]
author:
  name: Vibhu Bhatnagar
---

## Why Robocopy still matters

Robocopy (**Ro**bust **F**ile **Copy**) has shipped inside Windows since Vista/Server 2008, and two decades later it's still the tool most IT teams reach for when a file server has to move, mirror, or get backed up. Xcopy and plain `Copy-Item` don't survive a dropped VPN tunnel, don't preserve NTFS permissions, and don't retry a file another process has locked for half a second. Robocopy does all three, natively, with zero extra installs — which is exactly why it earns a place in a migration runbook instead of a third-party tool.

The reasons it keeps winning the job:

- **Restartable copies.** A multi-terabyte transfer over a WAN link *will* hiccup. Robocopy resumes mid-file instead of starting the whole job over.
- **Full metadata fidelity.** NTFS ACLs, owner, auditing (SACL), and timestamps can all travel with the data — non-negotiable when a migrated share still has to honor the same security groups on day one.
- **Retry logic built for real file servers.** Locked files, antivirus scans, and transient share glitches are handled automatically instead of killing the whole job.
- **Mirroring for cutover.** Run it once to seed a few terabytes over a weekend, then run it again minutes before go-live to copy only what changed — the classic "seed, then delta-sync, then cutover" migration pattern.
- **Machine-readable exit codes and logs.** It slots into scheduled tasks, monitoring, and change records without extra tooling.

The flip side: it's a blunt instrument with switches that can silently delete data (`/MIR`, `/PURGE`) or silently drop security metadata if you're not running with the right privileges. The rest of this guide is the reference you want open the next time you're building a migration or backup job.

## How the options are grouped

Robocopy's help text dumps everything in one wall of text. In practice you only ever reason about six buckets: what to copy, how hard to push it, what to leave out, how to handle failures, what to log, and how to package it as a repeatable job.

### 1. Copy options — what actually gets copied, and how aggressively

| Switch | What it does | When to use it | Caution |
|---|---|---|---|
| `/S` | Copies subfolders, skips empty ones | Quick content copies where empty folder structure doesn't matter | Don't use for a migration — you'll lose empty folders users rely on for structure |
| `/E` | Copies subfolders **including empty ones** | Default choice for migrations and backups | — |
| `/LEV:n` | Only copies the top *n* levels | Previewing a huge tree, or copying just top-level shares | Easy to forget it's on and silently miss nested content |
| `/Z` | Restartable mode (checkpoints mid-file) | Flaky WAN/VPN links | Slower than `/ZB`/no-flag on a stable LAN |
| `/B` | Backup mode (uses backup semantics to bypass file-level ACL read restrictions) | You have Backup Operator rights but want to skip files with odd permission blocks | Skips restartability |
| `/ZB` | Restartable mode; falls back to Backup mode on access-denied | **This is the default you want for server migrations** | Needs the account to hold `SeBackupPrivilege`/`SeRestorePrivilege` for the fallback to actually work |
| `/J` | Unbuffered I/O | Large files — VM images, SQL backups, PST files, media | No benefit (and slight overhead) on trees of many small files |
| `/EFSRAW` | Copies EFS-encrypted files in raw form | Migrating EFS-encrypted files between machines that share the same EFS certificates | Incompatible with `/MT`. If certs don't travel with the migration, files become unreadable — verify this before you need it, not after |
| `/COPY:flags` (default `DAT`) | Chooses exactly what file metadata to copy (Data, Attributes, Timestamps, Security/ACLs, Owner, aUditing) | Fine-tune when you need *some* but not all metadata | `S`/`O`/`U` require elevated privileges (Backup/Restore/Security) to succeed |
| `/SEC` | Shortcut for `/COPY:DATS` | You need NTFS permissions preserved but don't care about owner/audit | — |
| `/COPYALL` | Shortcut for `/COPY:DATSOU` — everything | **File server migrations, always** — this is how you keep the same owners, permissions, and audit entries post-move | Run as a domain admin / account with `SeBackupPrivilege`, `SeRestorePrivilege`, and `SeSecurityPrivilege`, or `O` and `U` copying fails silently on some files |
| `/NOCOPY` | Copies nothing — metadata only | Pairing with `/PURGE` to just clean up a destination | Rare in migration work |
| `/SECFIX` / `/TIMFIX` | Re-applies security/timestamps even to files that were skipped | Fixing a prior run that copied data but not ACLs/timestamps correctly | — |
| `/PURGE` | Deletes destination files/folders that no longer exist in source | Keeping destination as an exact subset of source | **Always dry-run first with `/L`.** Point source/destination the wrong way and you mass-delete live data |
| `/MIR` | Mirror = `/E` + `/PURGE` | The final cutover pass of a migration, or a scheduled DR mirror | Same danger as `/PURGE`, amplified — this is the switch responsible for most Robocopy horror stories. Never run it for the first time against production without a `/L` dry run |
| `/MOV` | Copies then **deletes files from source** | Rare — one-way archival to cold storage where you want source emptied | **Do not use for a migration.** If the copy is interrupted or something's wrong at the destination, source data is already gone |
| `/MOVE` | Same as `/MOV` but also deletes source folders | Same narrow archival use case | Same warning as `/MOV`, plus it removes folder structure — effectively never the right choice for a migration |
| `/A+:` / `/A-:` | Adds/removes file attributes post-copy | Niche attribute cleanup | — |
| `/CREATE` | Creates the folder tree and zero-length files only | Pre-staging folder structure/permissions ahead of the real data copy | — |
| `/FAT` | Forces 8.3 FAT-style filenames | Copying to genuinely legacy FAT targets | Never use otherwise — needlessly mangles filenames |
| `/256` | Disables long-path (>256 char) support | Only if the destination truly can't handle long paths | **Avoid.** Modern file servers routinely have paths over 256 characters; this switch will cause silent copy failures on exactly those files |
| `/MON:n` / `/MOT:m` | Re-runs the job when *n* changes are seen, or every *m* minutes | Pre-cutover delta seeding — keep source and destination converging in the days before go-live | Not a substitute for the final `/MIR` cutover pass — it's a background keep-in-sync loop, not a one-shot |
| `/RH:hhmm-hhmm` | Restrict copy start times to a run-hours window | Large migrations that must avoid business-hour bandwidth contention | Combine with `/PF` if you want it enforced per-file rather than per-pass |
| `/IPG:n` | Adds an inter-packet gap to throttle bandwidth | WAN links you can't afford to saturate | Slows the job — only use it if you actually need to protect the link |
| `/SJ` / `/SL` | Copies junctions/symlinks as links, not their targets | File servers with DFS-N junctions or NTFS symlinks | Omitting this can balloon a copy to many times its expected size by following junction targets |
| `/MT[:n]` | Multi-threaded copy (default 8, max 128) | **The single biggest performance lever for migrations.** 8–32 threads is the typical sweet spot | Incompatible with `/IPG` and `/EFSRAW`. More threads isn't always faster — a slow SAN or spinning disks can get worse with too many threads; always pair with `/LOG` (not `/TEE`-only) since console output slows multi-threaded runs |
| `/DCOPY:flags` (default `DA`) | What metadata to copy for **directories** | Add `T` (`/DCOPY:T`) so migrated folders keep their original modified date instead of showing "today" | Auditors and users both notice folder dates that don't match reality — worth the extra flag |
| `/NODCOPY` | Copies no directory metadata | Rare | — |
| `/NOOFFLOAD` | Disables Windows Copy Offload | Copying between storage that doesn't support offload cleanly (some SANs) | Only if you've seen offload-related errors |
| `/COMPRESS` | Requests network compression | WAN transfers where bandwidth is the bottleneck | No effect on LAN, adds CPU overhead |
| `/SPARSE[:Y/N]` | Preserves sparse file state | Migrating VHDs/VHDX or other sparse files | — |
| `/NOCLONE` | Disables ReFS block-cloning optimization | Only if block cloning is causing problems on ReFS targets | Leave default (cloning on) otherwise — it's free performance |

### 2. Throttling — protecting production while you copy

| Switch | When to use it |
|---|---|
| `/IoMaxSize:n[KMG]` | Cap per-I/O size when copying during business hours on shared storage |
| `/IoRate:n[KMG]` | Cap overall throughput, in bytes/sec, on links or arrays you can't saturate |
| `/Threshold:n[KMG]` | Only throttle files above a given size — keeps small metadata-heavy operations fast |
| `/LFSM` / `/LFSM:n[KMG]` | Pause automatically when destination free space gets low, instead of failing outright — useful when the destination volume is close to full during a migration | Incompatible with `/MT` and `/EFSRAW` |

### 3. File selection — what to include or skip

| Switch | When to use it |
|---|---|
| `/A`, `/M` | Archive-bit based incremental copies — classic backup-tool behavior (`/M` also resets the bit) |
| `/IA:` / `/XA:` | Include/exclude by file attribute (hidden, system, etc.) |
| `/XF`, `/XD` | Exclude specific files/folders — **always exclude `$RECYCLE.BIN`, `System Volume Information`, and NFS metadata folders like `._nfs`** on a full-volume migration |
| `/MAX:n`, `/MIN:n` | Size-based filtering — e.g., seed everything under 1 GB first, catch the large files in a second pass |
| `/MAXAGE:n`, `/MINAGE:n` | Age-based filtering — useful for staged migrations (move stale data first, hot data last) |
| `/XJ`, `/XJD`, `/XJF` | Exclude junctions/symlinks entirely rather than following them |
| `/XC`, `/XN`, `/XO` | Exclude changed/newer/older files — fine-tuning for repeated sync passes |
| `/IM` | Include "modified" files (same content, different change time) — rarely needed, off by default for a reason |

### 4. Retry behavior — the difference between "resilient" and "hung forever"

| Switch | Guidance |
|---|---|
| `/R:n` | **Always set this explicitly.** The default is 1,000,000 retries — left alone, a single permanently-locked file can hang your job indefinitely. `/R:5` to `/R:10` is typical for a migration |
| `/W:n` | Default wait is 30 seconds between retries — far too long for a LAN migration. Drop to `/W:3` or `/W:5` so retries don't burn the maintenance window |
| `/REG` | Saves `/R` and `/W` as the machine-wide registry default for all future Robocopy runs. Generally avoid — it's a global side effect most people don't expect from a single script |
| `/TBD` | Waits for a share name to be resolvable — useful in DR/failover scripts where the target share may not exist yet at job start |

### 5. Logging — your audit trail and your troubleshooting tool

| Switch | When to use it |
|---|---|
| `/LOG:file` | Fresh log each run — fine for one-off copies |
| `/LOG+:file` | **Append to an existing log** — use this for migrations so you keep a full history across seed/delta/cutover passes |
| `/TS`, `/FP` | Include timestamps and full paths in the log — worth the size for anything you might need to defend in an audit or change record |
| `/V` | Verbose (logs skipped files too) — useful while validating a job, noisy for routine runs |
| `/NP` | Suppress percentage-copied output — meaningfully shrinks log size on huge trees |
| `/TEE` | Mirrors log output to the console — good for an interactively-watched run, skip it on unattended scheduled jobs |
| `/NJH`, `/NJS` | Trim the job header/summary — useful when parsing logs programmatically |
| `/UNICODE`, `/UNILOG(+)` | Use when source filenames include non-English characters that plain logs would mangle |
| `/L` | **List-only, changes nothing.** This is your dry-run switch — run any `/MIR` or `/PURGE` job with `/L` first, always |

### 6. Job files — for repeatable, standardized runs

`/SAVE:jobname` writes the current parameters to a reusable job file; `/JOB:jobname` runs from one. Worth setting up if you're rolling the same migration pattern across many file servers — it keeps every server's job consistent instead of hand-editing command lines each time.

## Switches to basically never reach for

A short list, because getting this wrong is how data gets deleted:

- **`/MOV` / `/MOVE`** — deletes from source as it copies. There's no undo if the destination turns out wrong. Reserve for genuine one-way archival, never for a migration.
- **`/PURGE` or `/MIR` without a `/L` dry run first.** These are the two switches that delete data. Get in the habit of running the exact same command with `/L` added before you ever run it for real.
- **Leaving `/R` and `/W` at their defaults.** A million retries at 30 seconds apart on a single locked file will make your "5 minute" script look hung for days.
- **`/256`** — disables long-path support. Modern server file trees routinely exceed 256 characters; this switch causes quiet, hard-to-diagnose failures on exactly those paths.
- **`/FAT`** — mangles filenames to 8.3 format. There's essentially no reason to use this outside genuine legacy FAT targets.
- **`/SEC` or `/COPYALL` run from an account without backup/restore/security privileges.** Robocopy won't always error loudly — owner and audit info can silently fail to copy, and you won't notice until someone asks why permissions look wrong post-migration.
- **`/MT` combined with `/IPG` or `/EFSRAW`.** Documented as incompatible by Microsoft — don't fight it.
- **`/REG`** — unless you deliberately want to change the registry-wide default retry behavior for every future Robocopy invocation on that machine.

## Matching switches to the job

| Scenario | Core switches | Why |
|---|---|---|
| **File server migration — initial seed** | `/E /ZB /COPYALL /DCOPY:T /MT:16-32 /R:5 /W:5 /J /XD '$RECYCLE.BIN' 'System Volume Information' /LOG+:file /TS /FP` | Full metadata fidelity, fast, resilient, logged — but no `/PURGE`/`/MIR` yet since destination is still being built up |
| **File server migration — pre-cutover delta sync** | Same as above, plus `/MON:1 /MOT:60` or scheduled repeat runs | Keeps destination converging with source in the days before go-live without a single marathon copy window |
| **File server migration — final cutover** | `/MIR /COPYALL /DCOPY:T /MT:16 /R:10 /W:5 /LOG+:file /TS /FP /TEE` (source read-only or offline during this pass) | `/MIR` guarantees destination is an exact match, including deletions, for the final freeze-and-cutover window |
| **Nightly incremental backup** | `/E /ZB /SEC /R:3 /W:5 /MAXAGE:1` or archive-bit based `/M` | Only recently changed data, resilient to locked files, doesn't need full owner/audit unless your backup policy demands it |
| **Full mirror backup / DR replication** | `/MIR /SEC /R:5 /W:5 /MT:8 /LOG+:file` | Destination should exactly reflect source, including deletions, on a recurring schedule |
| **WAN transfer to a remote site** | `/Z /COMPRESS /IPG:n` (skip `/MT`, or use a small thread count) | Restartable and bandwidth-aware; high thread counts don't help and can worsen a saturated WAN link |
| **One-off "grab these files" copy** | `/S /Z /R:3 /W:5` | Simple, no empty folders needed, no destructive switches involved |
| **Archiving to cold storage (source can be emptied)** | `/MOVE /E /R:3` | The one legitimate case for `/MOVE` — you actually want source gone afterward |

## Annotated walkthrough of a real migration script

This is the script from the originally used file-server-to-local-volume migration/backup job — with every switch explained in context.

```powershell

New-item -path C:\Robocopy -Type Directory -ErrorAction SilentlyContinue
New-item -path C:\Robocopy\Scriptlog -Type Directory -ErrorAction SilentlyContinue
Add-Content "C:\Robocopy\UPrivate-backup-robocopyUUPD.log" "script running"

#Input the variables for the robocopy script

$Source = "\\IPAddress of server\F$"
$Destination = "F:\"
$Retries = 10
$MonitorSourceFiles = 1
$TimeInterval = 15
$MultiThreaded = 20

#This is the Robocopy script
Robocopy.exe $Source $Destination /E /ZB /DCOPY:T /COPYALL /MIR /MON:$MonitorSourceFiles /MOT:$TimeInterval /MT:$MultiThreaded /R:$Retries /W:5 /TS /FP /J /xd '$RECYCLE.BIN' 'System Volume Information' '._nfs' /log+:C:\Scriptlog\box1-backup-robocopyUUPD.log /tee
```

Switch by switch:

- **`/E`** — copies the full tree including empty folders. Right call; a file server migration shouldn't silently drop empty directories users or applications expect to exist.
- **`/ZB`** — restartable mode with backup-mode fallback. Correct for a 5 TB job over a network path — it survives interruptions and can bypass ACL read restrictions on files the copying account owns but doesn't have explicit read rights to. Requires the account running this to hold Backup/Restore privileges for the fallback to actually work.
- **`/DCOPY:T`** — preserves original folder timestamps. Without it, every migrated folder shows today's date as its modified time, which is confusing for both users and anyone auditing the migration later.
- **`/COPYALL`** — copies data, attributes, timestamps, NTFS security, owner, and auditing info. This is what makes it a true migration rather than a plain data copy — permissions and ownership come across intact. Double-check the account running this script has `SeBackupPrivilege`, `SeRestorePrivilege`, and `SeSecurityPrivilege`, or owner/audit info can fail to copy without an obvious error.
- **`/MIR`** — mirrors destination to source exactly, deleting anything in destination not present in source. This is the highest-risk switch in the script. It's appropriate for a *final* backup/migration pass where you want destination to be an exact replica — but it should have been run with `/L` first at least once to confirm source and destination are the right way around before it ever ran for real.
- **`/MON:1 /MOT:5`** — re-runs automatically after 1 change or every 5 minutes. This turns the job into a continuous near-real-time mirror rather than a single pass — sensible for a live backup/DR job, but worth knowing it means the script doesn't exit after one copy; it keeps running and re-syncing.
- **`/MT:20`** — 20 threads. Reasonable for a 5 TB job on a decent network path; worth tuning down if the source or destination storage shows contention rather than assuming higher is always better.
- **`/R:10 /W:5`** — 10 retries, 5 seconds apart, instead of the dangerous default (1,000,000 retries / 30s). This is exactly the override called out above as mandatory — good that it's explicit here.
- **`/TS /FP`** — logs source timestamps and full paths. Good for an audit trail on a job this size.
- **`/J`** — unbuffered I/O, appropriate given large files are likely present on a 5 TB share.
- **`/xd '$RECYCLE.BIN' 'System Volume Information' '._nfs'`** — excludes recycle bin, NTFS system metadata, and NFS metadata folders. Correct and necessary set of exclusions for a full-volume copy.
- **`/log+:...  /tee`** — appends to a persistent log and mirrors it to the console. Good for a job that's likely being watched interactively or reviewed afterward; on a scheduled/unattended run, `/tee` can be dropped since nothing is watching the console.

One thing worth flagging on this specific script: because `/MON`/`/MOT` make it loop indefinitely and `/MIR` is active from the very first pass, this is really running as a **continuous mirror**, not a **staged migration**. For a true file server migration (as opposed to an ongoing backup mirror), the safer pattern is to run the seed passes *without* `/MIR` first — using `/E /ZB /COPYALL /DCOPY:T` — and only add `/MIR` for the final cutover pass once source is frozen or offline. Using this exact script as a standing backup/DR job, on the other hand, is a solid, well-configured use of the tool.

## Quick reference: never / always

**Always:** override `/R` and `/W`, dry-run `/MIR`/`/PURGE` with `/L` first, use `/COPYALL` only from a privileged account, log with `/LOG+` and `/TS /FP` on anything you'll need to reference later.

**Never:** `/MOVE`/`/MOV` on a migration, `/256` or `/FAT` without a genuine legacy requirement, `/MT` paired with `/IPG` or `/EFSRAW`, or a `/MIR` run you haven't dry-run at least once against the real source and destination.
