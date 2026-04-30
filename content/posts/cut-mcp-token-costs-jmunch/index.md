---
title: "Cut MCP Token Costs 88% with jmunch-mcp"
date: 2026-04-24T23:36:10+05:30
draft: False
description: "jmunch-mcp is a transparent proxy that intercepts fat MCP payloads and replaces them with handles your agent queries surgically — saving up to 98% on tokens."
tags: ["Automation", "Windows", "AI Tools", "MCP"]
categories: ["Automation"]
author:
  name: Vibhu Bhatnagar
---

## Introduction

If you run Claude Desktop, Claude Code, or any MCP-enabled client through the day, you are burning tokens you never asked for. Every MCP server call that returns a large payload — GitHub issues, Firecrawl scrapes, search results — dumps the entire response into context whether your agent needed three lines or three hundred thousand tokens worth of data.

[jmunch-mcp](https://github.com/jgravelle/jmunch-mcp) is a transparent MCP proxy that sits in front of your existing MCP servers and fixes this without changing anything about how you work.

## The Problem

Most MCP servers return everything and let the agent sort it out. Call the GitHub MCP server for a list of issues and you get a 379,000-token response in context. Call Firecrawl to scrape a page and 259,000 tokens land whether you needed a summary or the full content. The agent reads the whole pile. You pay for the whole pile. And because this happens on every call, the waste compounds fast across a working session.

This is not a bug in any specific MCP server — it is just how the protocol works by default. The upstream returns what it has. There was no layer in between to intercept and compress.

## The Solution

jmunch-mcp is that layer. It wraps any existing MCP server, forwards every tool call to the upstream, and intercepts large responses before they hit your agent's context. Instead of the full payload, the agent receives a **handle** — a lightweight reference it can query using a small set of universal verbs:

| Verb | What it does |
| :--- | :--- |
| `peek` | Return a summary or top N rows |
| `slice` | Return a row range or a JSONPath expression |
| `search` | Full-text search over the payload |
| `aggregate` | Group-by, count, sum over tabular data |
| `describe` | Schema and shape of the payload |
| `list_handles` | Show all active handles in the session |

The agent drills into exactly what it needs. Everything else stays out of context.

## How It Works

### Install

```bash
pip install jmunch-mcp
```

Or from source:

```bash
git clone https://github.com/jgravelle/jmunch-mcp
cd jmunch-mcp
pip install -e .
```

### Init — one-time setup

```bash
jmunch-mcp init
```

`init` scans three sources automatically — your MCP client configs (Claude Desktop, Claude Code, Cursor, Windsurf, Continue), running MCP processes on your machine, and a built-in catalog of popular upstreams (GitHub, Firecrawl, filesystem, fetch, Brave Search, Slack). It renders a checklist. Tick the upstreams you want wrapped. It rewrites your client config and writes one `.toml` per selection into `./configs/`.

Non-interactive flags for automation:

| Flag | What it does |
| :--- | :--- |
| `--yes` | Auto-select everything already registered in a client config |
| `--dry-run` | Show what would change, write nothing |
| `--overwrite` | Overwrite existing `.toml` configs |
| `--out <dir>` | Write configs to a custom directory |
| `--no-running` | Skip scanning running processes |
| `--no-catalog` | Skip the built-in upstream catalog |

### Content-aware routing

Under the hood, jmunch-mcp routes payloads based on their shape:

- **Tabular content** (GitHub issues, PRs, commits) → SQLite backend → answers `peek`, `slice`, `aggregate`
- **JSON content** (Firecrawl scrapes, sitemaps) → JSON-tree backend → answers `peek`, `slice` via JSONPath, `search`

Your agent never needs to know which backend handled it — the verbs are the same regardless.

### Manual config

If you prefer wiring things up yourself instead of using `init`:

```bash
jmunch-mcp --config examples/config.toml
```

Point your MCP client at `jmunch-mcp --config <path>` instead of the upstream server directly. Add `--report` to print a token summary on session shutdown.

### Auto-launch — nothing to run per session

Once `init` has rewritten your client config, jmunch-mcp spawns automatically as a subprocess every time your MCP client starts. There is nothing to launch manually before a session.

> **[i] INFO:** On Windows with MSIX-packaged Claude Desktop, the app may read config from `%LOCALAPPDATA%\Packages\AnthropicPBC.Claude_*\LocalCache\Roaming\Claude\` instead of the standard `%APPDATA%\Claude\`. If MCP tools do not appear after restart, check which path actually contains your `mcpServers` config.

### Dashboard

jmunch-mcp ships a local read-only web UI that shows your cumulative token savings:

```bash
jmunch-mcp dashboard              # opens at http://127.0.0.1:7878
jmunch-mcp dashboard --open       # also launches your browser
```

Available flags:

| Flag | Default | What it does |
| :--- | :---: | :--- |
| `--port` | `7878` | Change the listen port |
| `--host` | `127.0.0.1` | Change the bind address |
| `--db <path>` | *(auto)* | Point at a non-default metrics DB |
| `--open` | — | Auto-launch browser |

The dashboard shows three views — cumulative totals, per-upstream breakdowns, and a time series of every forwarded call. No cloud, no telemetry, everything local. Rows with zero savings are hidden. Metrics populate once you have made at least one proxied call — run a wrapped upstream first, then open the dashboard.

## Results

Benchmarks from the repo, measured end-to-end with a fixed script of tool calls run direct vs proxied:

| Suite | Direct | via jmunch-mcp | Saved |
| :--- | ---: | ---: | ---: |
| GitHub — `facebook/react` issues/PRs/commits | 379,878 tok | 44,328 tok | **335,550 (88.3%)** |
| Firecrawl — Wikipedia + sitemap + search | 259,574 tok | 2,928 tok | **256,646 (98.9%)** |

Wall-clock time also dropped — 19% faster on GitHub, 44% faster on Firecrawl — because the agent never pages through data it did not need.

For anyone running MCP-heavy workflows all day, the savings compound across every session. Wrap once, save forever.

**Repo:** [https://github.com/jgravelle/jmunch-mcp](https://github.com/jgravelle/jmunch-mcp) — MIT licensed.

> **[i] Tested on:** Windows 11, Claude Desktop (MSIX), Python 3.12, jmunch-mcp v0.0.3

---

*Questions or feedback? Reach out on [LinkedIn](https://www.linkedin.com/in/vibhu-bhatnagar-02622798) or leave a comment below.*
{{< post-cta >}}
