---
title: "Diagnose Wi-Fi Drops with Windows' Built-in WLAN Report"
date: 2026-05-19T10:00:00+05:30
draft: false
description: "One command generates a 3-day Wi-Fi history showing every disconnect cause in plain English. Here's how to read it and find the fix."
tags: ["Windows", "Windows Administration"]
categories: ["Windows Administration"]
author:
  name: Vibhu Bhatnagar
---

Your Wi-Fi drops and you have no idea why. You check the router — it's fine. Other devices are fine. But your PC dropped three times last night and once during a call. The usual `ipconfig` and `ping` checks only tell you what's happening *right now*, not what happened while you weren't watching.

Windows has been logging every Wi-Fi connect, disconnect, and error in the background the whole time. One command pulls it into a readable report.

## What This Covers

How to generate and read the built-in WLAN report to find out *why* your Wi-Fi is dropping — not just *that* it dropped.

## Before You Start

- Works on Windows 10 and 11
- Requires an admin terminal — the command silently fails without it
- Report covers the last three days — run it soon after a problem, not a week later

## Steps

### Step 1: Generate the report

Open Windows Terminal or Command Prompt as administrator. Right-click → **Run as administrator**. Then run:

```cmd
netsh wlan show wlanreport
```

> **[i] Tested on:** Windows 10, Windows 11
> **[i] Requires:** Admin terminal — the command silently fails without it

Windows scans its event logs and writes everything into a single HTML file. Takes a few seconds. The terminal prints the output path when done.

### Step 2: Open the report

The file always lands here:

```text
C:\ProgramData\Microsoft\Windows\WlanReport\wlan-report-latest.html
```

Paste that path into File Explorer or open it directly in any browser.

### Step 3: Read the session graph

The top of the report is a dark timeline strip — every marker is a Wi-Fi event. Green = clean connection. Red = error or disconnect.

Don't read every marker. Look for **clustering**. A few scattered reds across three days is noise. A tight cluster in a 10-minute window means something specific went wrong at that time.

Hover a marker for a quick summary. Click it and the page jumps to the full log entry.

### Step 4: Check Disconnect Reasons first

Below the graph is a small table called **Disconnect Reasons**. This is where I start. It lists every disconnect cause in plain English with a count.

Two entries worth knowing:

- **"The network is disconnected by the driver"** — the Wi-Fi adapter's own software dropped the connection, not the router. A few over three days is normal (power-saving, roaming). A high count points straight at the adapter driver — update it or roll it back.
- **"Failed to connect because no connectable Access Point was visible"** — your PC couldn't see the network at all. Usually the router was rebooting or briefly out of range.

### Step 5: Decode the event IDs (if you need more detail)

The Wireless Sessions list below the table has an event ID on every line. You don't need to memorise them all, but these are the ones that matter:

| ID | Meaning |
|---|---|
| 11000 | Started trying to connect |
| 11001 | Association succeeded |
| 11004 / 11005 / 11010 | Security handshake — stopping, succeeding, starting |
| 11006 | Security step failed (wrong password, key exchange timeout) |
| 10002 | Network module stopped |
| 10311 | PC went to sleep — **not a real disconnect** |

A healthy connection looks like: 11000 → 11001 → 11010 → 11005. If you see 11006, check the password or the clock — key exchanges fail if system time is off.

## Verify

If Disconnect Reasons shows the driver as the culprit, update the adapter driver via Device Manager or your vendor's site. Re-run `netsh wlan show wlanreport` the next day. The count for driver-initiated disconnects should drop to zero or near it.

## Notes

**What this report can't do:**

- No signal strength history — it tells you a session ended, not why the signal was weak
- Three-day window only — if the drop was last week, it's already gone
- Wi-Fi layer only — problems between your router and the internet are invisible here. For that, reach for `tracert` to map where packets are dying

{{< post-cta >}}
