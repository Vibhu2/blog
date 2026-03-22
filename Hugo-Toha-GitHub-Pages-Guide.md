# Hugo + Toha + GitHub Pages
## Complete End-to-End Setup Guide

**Platform:** Windows 10 / 11
**Deploy Target:** GitHub Pages (Free)
**Version:** 3.0 &nbsp;•&nbsp; March 2026
**Reference Site:** https://vibhu2.github.io/blog/
**Reference Repo:** https://github.com/Vibhu2/blog

> **[i] PURPOSE:** This document is written so that any human or AI can reproduce this exact setup
> from scratch in a single pass — no trial and error. Every file change is documented with its
> exact final content. Read the whole guide once before starting.

---

## Contents

- [Overview & Architecture](#overview--architecture)
- [Prerequisites](#prerequisites)
- [Part A — GitHub Setup](#part-a--github-setup)
- [Part B — Local Setup](#part-b--local-setup)
- [Part C — All File Changes](#part-c--all-file-changes)
  - [hugo.yaml](#1-hugoyaml)
  - [go.mod](#2-gomod)
  - [data/en/author.yaml](#3-dataenauthoryaml)
  - [data/en/site.yaml](#4-dataensiteyaml)
  - [data/en/sections/about.yaml](#5-dataensectionsaboutyaml)
  - [data/en/sections/experiences.yaml](#6-dataensectionsexperiencesyaml)
  - [data/en/sections/skills.yaml](#7-dataensectionsskillsyaml)
  - [data/en/sections/education.yaml](#8-dataensectionseducationyaml)
  - [data/en/sections/accomplishments.yaml](#9-dataensectionsaccomplishmentsyaml)
  - [data/en/sections/projects.yaml](#10-dataensectionsprojectsyaml)
  - [data/en/sections/achievements.yaml](#11-dataensectionsachievementsyaml-disable)
  - [data/en/sections/featured-posts.yaml](#12-dataensectionsfeatured-postsyaml-disable)
  - [.github/workflows/deploy.yml](#13-githubworkflowsdeployyml)
  - [.github/workflows/sync-upstream.yml](#14-githubworkflowssync-upstreamyml)
- [Part D — Assets Required](#part-d--assets-required)
  - [Profile Photo](#profile-photo)
  - [Skill Icons](#skill-icons)
  - [Resume PDF](#resume-pdf)
- [Part E — Content Cleanup](#part-e--content-cleanup)
- [Part F — Deploy and Go Live](#part-f--deploy-and-go-live)
- [Part G — Day-to-Day Workflow](#part-g--day-to-day-workflow)
- [Setup Checklist](#setup-checklist)
- [Troubleshooting Reference](#troubleshooting-reference)
- [Useful Links](#useful-links)

---

## Overview & Architecture

One GitHub repo, two branches. That is the entire architecture.

```text
Repo: YOUR-USERNAME/blog
  ├── main branch      ← Where YOU work (Hugo source, Markdown, YAML, config)
  └── gh-pages branch  ← Auto-managed by GitHub Actions (compiled HTML only)
```

You push to `main`. GitHub Actions builds Hugo and pushes the result to `gh-pages`.
GitHub Pages serves `gh-pages` as your live site. You never touch `gh-pages` directly.
Authentication uses the built-in `GITHUB_TOKEN` — no PAT or SSH keys required.

**Why not two repos?** The two-repo approach requires cross-repo authentication (PAT or SSH deploy keys)
which adds complexity and breaks in ways that are hard to debug. Single-repo with `GITHUB_TOKEN` just works.

**Site URL pattern:** `https://YOUR-USERNAME.github.io/REPO-NAME/`
If your repo is named `blog`, your site is at `https://YOUR-USERNAME.github.io/blog/`.
To get the root URL `https://YOUR-USERNAME.github.io/` your repo must be named `YOUR-USERNAME.github.io` — different setup, not covered here.

---

## Prerequisites

### Tools Required

| _Tool_ | _Min Version_ | _Install Command_ |
| :--- | :---: | :--- |
| Hugo Extended | 0.146.0+ | `winget install Hugo.Hugo.Extended` |
| Go | 1.19+ | `winget install GoLang.Go` |
| Node.js LTS | v18.x+ | `winget install OpenJS.NodeJS.LTS` |
| Git | Any recent | `winget install Git.Git` |

> **[!] WARNING:** After every `winget install`, **close and reopen PowerShell**. Tools are not
> available in the same session that installed them.

### Verify Installation

Open a **fresh** PowerShell window (not Admin needed after install) and run:

```powershell
hugo version   # Must show: hugo v0.146.0+extended
go version
node --version
npm --version
git --version
```

> **[!] WARNING:** Hugo output **must** contain `extended`. If it does not:
> ```powershell
> winget uninstall Hugo.Hugo
> winget install Hugo.Hugo.Extended
> ```
> Then close and reopen PowerShell.

### Accounts Required

- GitHub account — free at https://github.com

### Files You Need to Prepare Before Starting

| _File_ | _Where it goes_ | _Notes_ |
| :--- | :--- | :--- |
| Profile photo (PNG/JPG, white/plain background preferred) | `assets/images/author/` | Rename to `vibhu.png` or similar |
| Resume PDF (optional) | `static/files/` | Named `resume.pdf` |

---

## Part A — GitHub Setup

### A.1  Fork the Toha Example Site

1. Go to: `https://github.com/hugo-themes/toha-example-site`
2. Click **Fork** (top-right)
3. Set **Owner** to your GitHub account
4. Set **Repository name** to `blog`
5. Click **Create Fork**

This creates `YOUR-USERNAME/blog` with all sample content pre-wired.

### A.2  No Second Repo Needed

Unlike other Hugo guides, this setup does **not** require a second repo.
GitHub Actions creates and manages the `gh-pages` branch automatically.

---

## Part B — Local Setup

### B.1  Clone the Repo

```powershell
cd $env:USERPROFILE\Documents\GitHub
git clone https://github.com/YOUR-USERNAME/blog.git blog
cd blog
```

### B.2  Install Dependencies

Run these in order — each must complete successfully before the next:

```powershell
hugo mod tidy        # Downloads Toha theme via Go modules (~30-60 seconds first run)
hugo mod npm pack    # Generates package.json from theme requirements
npm install          # Installs all npm packages (Bootstrap, FontAwesome, etc.)
```

### B.3  Test the Local Server

```powershell
hugo server -w
```

Open `http://localhost:1313/blog/` — you should see the sample Toha site.

> **[i] INFO:** If CSS looks broken locally, run with explicit baseURL:
> ```powershell
> hugo server -w --baseURL http://localhost:1313/blog/
> ```

> **[i] INFO:** Press `Ctrl+C` to stop the server.

---

## Part C — All File Changes

These are every file that needs to be created or modified, with exact final content.
Replace all `YOUR-USERNAME` placeholders with your actual GitHub username.

---

### 1. hugo.yaml

**Location:** `hugo.yaml` (repo root)
**What it does:** Main site configuration — URL, language, features, theme settings.

```yaml
baseURL: https://YOUR-USERNAME.github.io/blog/

languageCode: en
title: "Your Name's Blog"

# Use Hugo modules to add theme
module:
  imports:
  - path: github.com/hugo-toha/toha/v4
  mounts:
  - source: static/files
    target: static/files
  - source: ./node_modules/flag-icons/flags
    target: static/flags
  - source: ./node_modules/@fontsource/mulish/files
    target: static/files
  - source: ./node_modules/katex/dist/fonts
    target: static/fonts

# English only — no language switcher
languages:
  en:
    languageCode: en
    languageName: English
    title: "Your Name's Blog"
    weight: 1
defaultContentLanguage: en

# Allow raw HTML in markdown
markup:
  goldmark:
    renderer:
      unsafe: true
  tableOfContents:
    startLevel: 2
    endLevel: 6
    ordered: false

outputs:
  home:
    - HTML
    - RSS
    - JSON

enableEmoji: true

params:
  background: /images/site/background.jpg

  logo:
    main: /images/site/main-logo.png
    inverted: /images/site/inverted-logo.png
    favicon: /images/site/favicon.png

  gitRepo: https://github.com/YOUR-USERNAME/blog
  gitBranch: main

  topNavbar:
    maxVisibleSections: 5

  features:
    theme:
      enable: true
      services:
        light: true
        dark: true
        default: system

    portfolio:
      enable: true

    blog:
      enable: true
      showAuthor: true
      shareButtons:
        facebook: true
        twitter: true
        linkedin: true
        reddit: true
        whatsapp: true
        email: true

    notes:
      enable: true

    comment:
      enable: false       # Enable when you set up Disqus or Giscus

    analytics:
      enable: false       # Enable when you have a GA/GoatCounter ID

    support:
      enable: false

    toc:
      enable: true

    tags:
      enable: true
      on_card: true

    flags:
      enable: false       # Disable — removes language flag switcher from navbar

    embedpdf:
      enable: true

    flowchart:
      enable: true
      services:
        mermaid:
          theme: forest

    math:
      enable: true
      services:
        katex:
          delimiters:
            - left: $$
              right: $$
              display: true
            - left: \\[
              right: \\]
              display: true
            - left: $
              right: $
              display: false
            - left: \\(
              right: \\)
              display: false

    syntaxHighlight:
      enable: true
      services:
        hljs:
          noHighlightRe: /^no-highlight$/i

    videoPlayer:
      enable: true
      services:
        plyr:

    copyCodeButton:
      enable: true

    readingTime:
      enable: true

    pagination:
       maxPostsPerPage: 12

  footer:
    enable: true
    template: footer.html
    navigation:
      enable: true
      customMenus: true
    contactMe:
      enable: true
    credentials:
      enable: true
    newsletter:
      enable: false
    disclaimer:
      enable: true
```

> **[!] WARNING:** `baseURL` must include the trailing slash and the repo name path.
> Wrong value = broken links and missing assets on the live site.

---

### 2. go.mod

**Location:** `go.mod` (repo root)
**What it does:** Declares Go module path and pins the Toha theme version.

```
module github.com/YOUR-USERNAME/blog

go 1.25

// replace(
//     github.com/hugo-toha/toha/v4 => ../toha
// )

require github.com/hugo-toha/toha/v4 v4.13.1-0.20260114145901-84093514293e // indirect
```

> **[i] INFO:** Change only the first line `module github.com/...` — replace with your GitHub username and repo name. Leave the rest exactly as-is.

---

### 3. data/en/author.yaml

**Location:** `data/en/author.yaml`
**What it does:** Controls your name, profile photo, contact links, and the rotating summary text on the front page.

```yaml
name: "Your Full Name"
nickname: "YourFirstName"
greeting: "Hi, I am"
image: "images/author/your-photo.png"   # File must exist in assets/images/author/

contactInfo:
  email: "you@example.com"
  phone: "+XX XXXXXXXXXX"
  github: your-github-username
  linkedin: your-linkedin-profile-slug

summary:
  - Your Primary Job Title
  - Your Main Specialisation
  - Another Key Skill or Technology
  - Another Key Skill or Technology
  - X+ years in your field
```

> **[!] WARNING:** The `image` path is relative to the `assets/` folder. The file **must** be at
> `assets/images/author/your-photo.png`. Placing it in `static/images/` causes a nil pointer build error.

---

### 4. data/en/site.yaml

**Location:** `data/en/site.yaml`
**What it does:** Site-wide metadata — copyright, description for search engines, footer menus, OpenGraph tags for social sharing.

```yaml
copyright: © 2026 Your Name. All rights reserved.

disclaimer: "The views and opinions expressed on this blog are my own and do not represent those of my employer. All content is provided for informational purposes only."

description: "Personal blog and portfolio of Your Name — brief description of your specialisation."

customMenus:
- name: GitHub
  url: https://github.com/YOUR-USERNAME
  hideFromNavbar: false
  showOnFooter: true

openGraph:
  title: "Your Name — Your Job Title"
  type: website
  description: "OpenGraph description shown when your site is shared on social media."
  image: images/author/your-photo.png
  url: https://YOUR-USERNAME.github.io/blog/
```

---

### 5. data/en/sections/about.yaml

**Location:** `data/en/sections/about.yaml`
**What it does:** The About section on the homepage — your designation, company, bio summary, social links, certification badges, and skill indicators.

```yaml
section:
  name: About
  id: about
  enable: true
  weight: 1
  showOnNavbar: true
  template: sections/about.html

designation: Your Job Title
company:
  name: Your Company Name
  url: "https://www.yourcompany.com"

summary: 'Your professional summary — one paragraph describing your experience, specialisations, and what makes you good at your job.'

socialLinks:
- name: Email
  icon: "fas fa-envelope"
  url: "mailto:you@example.com"

- name: Github
  icon: "fab fa-github"
  url: "https://www.github.com/YOUR-USERNAME"

- name: LinkedIn
  icon: "fab fa-linkedin"
  url: "https://www.linkedin.com/in/YOUR-PROFILE"

badges:
- type: certification
  name: Certification Name
  url: "https://certification-verify-url.com"
  badge: "https://badge-image-url.png"    # Direct image URL from Credly or similar

- type: soft-skill-indicator
  name: Problem Solving
  percentage: 90
  color: blue                              # Options: blue, yellow, orange, green, red, pink

- type: soft-skill-indicator
  name: Team Leadership
  percentage: 85
  color: yellow

- type: soft-skill-indicator
  name: Automation Mindset
  percentage: 95
  color: orange
```

> **[i] INFO:** Certification badge images can be found on Credly. Right-click the badge image on your
> Credly profile and copy the image URL.

---

### 6. data/en/sections/experiences.yaml

**Location:** `data/en/sections/experiences.yaml`
**What it does:** Your work history timeline. Each company can have multiple positions.

```yaml
section:
  name: Experiences
  id: experiences
  enable: true
  weight: 3
  showOnNavbar: true

experiences:
- company:
    name: Company Name
    url: "https://www.company.com"
    location: City, Country
    # logo: /images/sections/experiences/company-logo.png  # Optional
    overview: One sentence describing what the company does.
  positions:
  - designation: Your Job Title
    start: Mon YYYY          # e.g. Aug 2019
    # end: Mon YYYY          # Omit if currently working here — shows "Present"
    responsibilities:
    - Specific responsibility with measurable impact where possible.
    - Another responsibility — use numbers (150+ clients, 25+ migrations) for impact.
    - Third responsibility.

- company:
    name: Previous Company
    url: "https://www.previouscompany.com"
    location: City, Country
    overview: One sentence about this company.
  positions:
  - designation: Your Job Title
    start: Oct 2011
    end: Jul 2019
    responsibilities:
    - Responsibility one.
    - Responsibility two.
```

> **[i] INFO:** `end` is optional. If omitted, Toha shows "Present" automatically.
> Company `logo` is optional — if omitted, a placeholder is shown.

---

### 7. data/en/sections/skills.yaml

**Location:** `data/en/sections/skills.yaml`
**What it does:** Skills grid with filter buttons. Each skill shows a logo, description, and links to a category filter.

```yaml
section:
  name: Skills
  id: skills
  enable: true
  weight: 2
  showOnNavbar: true
  filter: true

buttons:
- name: All
  filter: "all"
- name: Microsoft
  filter: "microsoft"
- name: Scripting
  filter: "scripting"
- name: Virtualisation
  filter: "virtualisation"
- name: Security & Backup
  filter: "security"
- name: Monitoring
  filter: "monitoring"

skills:
- name: PowerShell
  logo: /images/sections/skills/powershell.svg
  summary: "Expert-level PowerShell automation for AD, Exchange, ESXi reporting, Azure AD sync monitoring, and bulk infrastructure tasks."
  categories: ["scripting", "microsoft"]
  url: "https://docs.microsoft.com/en-us/powershell/"

- name: Active Directory
  logo: /images/sections/skills/ad.svg
  summary: "AD DS, Sites & Services, GPO, FSMO, replication, AD migrations, Azure AD Connect, hybrid identity across 150+ MSP environments."
  categories: ["microsoft"]

- name: Windows Server
  logo: /images/sections/skills/windows.svg
  summary: "Full lifecycle administration 2008 R2 through 2022. In-place upgrades, Server Core, WSUS, and availability automation."
  categories: ["microsoft"]

- name: DNS & DHCP
  logo: /images/sections/skills/dns.svg
  summary: "Split-brain DNS, zone migrations, conditional forwarders, DHCP failover, scope management, reservations, and IPAM."
  categories: ["microsoft"]

- name: Exchange Server
  logo: /images/sections/skills/exchange.svg
  summary: "Exchange 2010-2019 design and administration. DAG, mailbox management, 25+ on-prem to M365 migrations."
  categories: ["microsoft"]

- name: Microsoft 365 & Azure
  logo: /images/sections/skills/azure.svg
  summary: "Azure Admin (AZ-104), Azure AD, AVD, Intune, Exchange Online, Teams, SharePoint. Tenant-to-Tenant migrations."
  categories: ["microsoft"]
  url: "https://azure.microsoft.com"

- name: VMware vSphere / vCenter
  logo: /images/sections/skills/vmware.svg
  summary: "ESXi, vSphere, vCenter — provisioning, snapshots, vMotion, HA/DRS, and bulk ESXi host upgrades."
  categories: ["virtualisation"]

- name: Hyper-V
  logo: /images/sections/skills/automation.svg
  summary: "Hyper-V management, VM provisioning, P2V/V2V migrations from ESXi to Hyper-V, and DR planning."
  categories: ["virtualisation"]

- name: Datto & Veeam Backup
  logo: /images/sections/skills/backup.svg
  summary: "Backup policy design, monitoring, restore testing, and quarterly BCDR exercises across 150+ clients."
  categories: ["security"]

- name: Microsoft Defender & Sophos
  logo: /images/sections/skills/defender.svg
  summary: "Defender XDR, Sophos Intercept X with EDR, Central Device Encryption, Phish Threat, SentinelOne."
  categories: ["security"]

- name: ConnectWise & PRTG
  logo: /images/sections/skills/monitor.svg
  summary: "ConnectWise Automate scripting, Manage for SLA and ticketing, PRTG and SolarWinds monitoring."
  categories: ["monitoring"]

- name: Python
  logo: /images/sections/skills/python.svg
  summary: "Python scripting for IT automation, API integrations, and tooling alongside PowerShell."
  categories: ["scripting"]

- name: Git & GitHub
  logo: /images/sections/skills/git.png
  summary: "Version control for PowerShell modules, scripts, and documentation. GitHub for CI/CD."
  categories: ["scripting"]
  url: "https://git-scm.com/"
```

> **[!] WARNING:** Every `logo` path must have a corresponding file in `assets/images/sections/skills/`.
> A missing file causes a nil pointer error and breaks the entire build.
> See Part D for icon download instructions.

---

### 8. data/en/sections/education.yaml

**Location:** `data/en/sections/education.yaml`
**What it does:** Your academic qualifications.

```yaml
section:
  name: Education
  id: education
  template: sections/education.html
  enable: true
  weight: 4
  showOnNavbar: true

degrees:
- name: Your Degree Name (e.g. Master of Computer Applications)
  icon: fa-graduation-cap         # Font Awesome icon class
  timeframe: YYYY-YYYY
  institution:
    name: University Name, City
    url: "https://www.university.edu"
  customSections:
    - name: Specialisation
      content: Your Field of Study

- name: Your Second Degree (e.g. Bachelor of Computer Applications)
  icon: fa-university
  timeframe: YYYY-YYYY
  institution:
    name: University Name, City
```

---

### 9. data/en/sections/accomplishments.yaml

**Location:** `data/en/sections/accomplishments.yaml`
**What it does:** Certifications and professional achievements.

```yaml
section:
  name: Accomplishments
  id: accomplishments
  enable: true
  weight: 9
  showOnNavbar: true

accomplishments:
- name: Certification Name
  timeline: "Mon YYYY"
  organization:
    name: Issuing Organisation
    url: https://www.org.com
  courseOverview: "What this certification validates."

- name: Another Certification
  timeline: "Mon YYYY"
  organization:
    name: Issuing Organisation
    url: https://www.org.com
  courseOverview: "What this certification covers."
```

---

### 10. data/en/sections/projects.yaml

**Location:** `data/en/sections/projects.yaml`
**What it does:** Your projects grid with filter buttons. Public GitHub repos automatically show star count.

```yaml
section:
  name: Projects
  id: projects
  enable: true
  weight: 5
  showOnNavbar: true

buttons:
- name: All
  filter: "all"
- name: PowerShell
  filter: "powershell"
- name: Infrastructure
  filter: "infrastructure"

projects:
- name: Project Name
  role: Author
  timeline: "YYYY - Present"
  repo: https://github.com/YOUR-USERNAME/repo-name   # Use for public GitHub repos
  # url: "https://project-website.com"               # Use instead of repo for non-GitHub projects
  summary: What this project does and why it matters. Be specific about the problem it solves.
  tags: ["powershell", "infrastructure"]

- name: Another Project
  role: Author
  timeline: "YYYY - Present"
  summary: Description of the project.
  tags: ["powershell"]
```

---

### 11. data/en/sections/achievements.yaml (Disable)

**Location:** `data/en/sections/achievements.yaml`
**What it does:** Gallery of image-based achievements. Disable if you have no images to show.

```yaml
section:
  name: Achievements
  id: achievements
  enable: false
  weight: 10
  showOnNavbar: false
```

---

### 12. data/en/sections/featured-posts.yaml (Disable)

**Location:** `data/en/sections/featured-posts.yaml`
**What it does:** Pins specific blog posts at the top of the homepage. Disable until you have real posts.

```yaml
section:
  name: Featured Posts
  id: featured-posts
  enable: false
  weight: 7
  showOnNavbar: false
```

---

### 13. .github/workflows/deploy.yml

**Location:** `.github/workflows/deploy.yml`
**What it does:** GitHub Actions workflow — builds Hugo on every push to `main` and deploys to `gh-pages`.

```yaml
name: Deploy Hugo Site

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.21"
          cache: false        # Disable Go module cache — prevents tar exit code 2 errors

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"  # LTS — avoids Node.js 20 deprecation warning

      - name: Install Hugo Extended
        run: |
          wget -O hugo.deb https://github.com/gohugoio/hugo/releases/download/v0.146.0/hugo_extended_0.146.0_linux-amd64.deb
          sudo dpkg -i hugo.deb

      - name: Install dependencies
        run: |
          hugo mod tidy
          hugo mod npm pack
          npm install

      - name: Build site
        run: hugo --minify

      - name: Deploy to gh-pages branch
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_branch: gh-pages
          publish_dir: ./public
```

**Why each decision:**

| _Decision_ | _Why_ |
| :--- | :--- |
| `cache: false` on setup-go | Prevents `tar` exit code 2 error on Go module cache restore |
| Node.js `22` | Avoids Node.js 20 deprecation warning — June 2026 deadline |
| Hugo installed from release binary | More reliable than `peaceiris/actions-hugo` — explicit version pinning |
| `github_token: ${{ secrets.GITHUB_TOKEN }}` | Built-in token — zero setup, no PAT, no SSH keys |
| Same-repo `gh-pages` branch | Eliminates all cross-repo authentication complexity |

---

### 14. .github/workflows/sync-upstream.yml

**Location:** `.github/workflows/sync-upstream.yml`
**What it does:** Weekly automatic sync from the upstream `toha-example-site` repo — pulls in any structural updates from the Toha maintainers.

```yaml
name: Sync Upstream Fork

on:
  schedule:
    - cron: '0 6 * * 1'   # Every Monday at 06:00 UTC
  workflow_dispatch:        # Allow manual trigger from Actions tab

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout fork
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Add upstream remote
        run: git remote add upstream https://github.com/hugo-themes/toha-example-site.git

      - name: Fetch upstream
        run: git fetch upstream

      - name: Merge upstream main
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git merge upstream/main --no-edit --allow-unrelated-histories || echo "Nothing to merge or conflict detected"

      - name: Push to fork
        run: git push origin main
```

> **[i] INFO:** This workflow may fail on the first run with "nothing to merge" — this is harmless.
> It will work correctly on subsequent runs.

---

## Part D — Assets Required

These files must be placed in the correct locations before building. Missing files cause build errors.

### Profile Photo

**Required location:** `assets/images/author/YOUR-PHOTO-NAME.png`

The photo path in `author.yaml` must match the filename here exactly.

> **[!] WARNING:** Do NOT put the photo in `static/images/`. Hugo's Toha theme uses `resources.Get`
> which only searches the `assets/` folder. A photo in `static/` causes this build error:
> `nil pointer evaluating resource.Resource.RelPermalink`

Copy your photo:
```powershell
# Create the folder if it doesn't exist
New-Item -ItemType Directory -Path "assets\images\author" -Force

# Copy your photo (adjust source path)
Copy-Item "$env:USERPROFILE\Downloads\YourPhoto.png" "assets\images\author\your-photo.png"
```

### Skill Icons

**Required location:** `assets/images/sections/skills/`

Every icon referenced in `skills.yaml` must exist here. Missing icons cause this build error:
`nil pointer evaluating resource.Resource.MediaType`

#### Icons already included with the Toha example site

These are ready to use — no download needed:

```text
assets/images/sections/skills/
  cloud.png       git.png        go.png
  linux.png       docker.svg     kubernetes.png
  prometheus.png  c++.png
```

#### Download additional icons

Run this PowerShell script from inside your blog folder to download icons for IT/Microsoft skills:

```powershell
cd assets\images\sections\skills

$icons = @{
    # Microsoft / Windows / Azure (from benc-uk/icon-collection)
    "powershell.svg" = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/logo_powershell.svg"
    "azure.svg"      = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/azure.svg"
    "ad.svg"         = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/active-directory.svg"
    "dns.svg"        = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/dns.svg"
    "windows.svg"    = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/windows-virtual-desktop.svg"
    "exchange.svg"   = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/virtual-machine.svg"
    "defender.svg"   = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/security-center.svg"
    "monitor.svg"    = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/monitor.svg"
    "backup.svg"     = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/recovery-services-vaults.svg"
    "automation.svg" = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/automation.svg"
    "python.svg"     = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/logo_python.svg"

    # Third-party tools (from simple-icons)
    "vmware.svg"     = "https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/vmware.svg"
    "veeam.svg"      = "https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/veeam.svg"
}

foreach ($icon in $icons.GetEnumerator()) {
    try {
        Invoke-WebRequest -Uri $icon.Value -OutFile $icon.Key -TimeoutSec 10
        Write-Host "OK: $($icon.Key)"
    } catch {
        Write-Host "FAIL: $($icon.Key) — $($_.Exception.Message)"
    }
}
```

#### Icon sources reference

| _Source_ | _Best for_ | _Browse at_ |
| :--- | :--- | :--- |
| `benc-uk/icon-collection/azure-docs` | Microsoft, Azure, Windows, AD, DNS | https://github.com/benc-uk/icon-collection |
| `benc-uk/icon-collection/microsoft-365` | Exchange, Teams, SharePoint, Intune | Same repo, different folder |
| `simple-icons` | VMware, Veeam, Python, Git, Linux | https://github.com/simple-icons/simple-icons |

### Resume PDF

**Optional location:** `static/files/resume.pdf`

If you want a downloadable resume link, place your PDF here. Then add to `about.yaml`:

```yaml
resourceLinks:
- title: "My Resume"
  url: "files/resume.pdf"
```

---

## Part E — Content Cleanup

The forked example site includes Bengali sample content that causes build errors.
Run these commands once after cloning, before your first build:

```powershell
# From inside the blog folder

# 1. Delete the Bengali data folder
Remove-Item -Recurse -Force "data\bn" -ErrorAction SilentlyContinue

# 2. Delete all Bengali content files
Get-ChildItem -Recurse -Filter "*.bn.md" | Remove-Item -Force

# Verify — should show no .bn.md files
Get-ChildItem -Recurse -Filter "*.bn.md"
```

---

## Part F — Deploy and Go Live

### F.1  Commit and Push Everything

```powershell
cd "YOUR-BLOG-FOLDER-PATH"

git add .
git commit -m "Initial setup — Hugo Toha blog"
git push
```

### F.2  Watch the Build

Go to: `https://github.com/YOUR-USERNAME/blog/actions`

You will see two workflows triggered:
- **Deploy Hugo Site** — this is the one to watch. Takes 2–3 minutes.
- **Sync Upstream Fork** — may fail on first run, harmless.

Wait for **Deploy Hugo Site** to show a green tick.

### F.3  Enable GitHub Pages

After the first successful build:

1. Go to: `https://github.com/YOUR-USERNAME/blog/settings/pages`
2. Under **Source** → select **Deploy from a branch**
3. Under **Branch** → select `gh-pages` → `/ (root)`
4. Click **Save**

### F.4  Verify Live Site

Your site will be live at:

```
https://YOUR-USERNAME.github.io/blog/
```

Allow 1–10 minutes for DNS propagation on first launch.

---

## Part G — Day-to-Day Workflow

### Writing a New Blog Post

```powershell
# 1. Start local server
hugo server -w

# 2. In a new PowerShell window, scaffold a new post
hugo new posts\post-title\index.md

# 3. Edit the post
code content\posts\post-title\index.md
```

Post front matter template:

```yaml
---
title: "Your Post Title"
date: 2026-03-22T00:00:00+05:30
draft: false
tags: ["windows-server", "powershell"]
categories: ["Infrastructure"]
description: "Short summary shown in post listings."
---

Your post content here in Markdown.
```

> **[!] WARNING:** `draft: true` hides the post from the live site. Always change to `draft: false` before pushing.

### Adding Images to a Post

```text
content\posts\post-title\
  index.md
  screenshot.png         ← Place images alongside the post file
```

Reference in Markdown:
```markdown
![Alt text describing the image](screenshot.png)
```

### Updating Portfolio Data

```powershell
# Edit the relevant YAML file
code data\en\sections\experiences.yaml

# Push — GitHub Actions deploys automatically
git add .
git commit -m "Update work experience"
git push
```

### Quick Reference

| _Task_ | _Command_ |
| :--- | :--- |
| Start local preview | `hugo server -w` |
| Create new blog post | `hugo new posts\post-name\index.md` |
| Test production build locally | `hugo --minify` |
| Update Toha theme | `hugo mod tidy` |
| Push changes live | `git add . && git commit -m "msg" && git push` |
| Watch build | GitHub → blog repo → Actions tab |
| Stop local server | `Ctrl+C` |

---

## Setup Checklist

Use this to track progress. Every item must be ticked before the site will work correctly.

### Tools & Accounts
- [ ] Hugo Extended 0.146.0+ installed — `hugo version` shows `+extended`
- [ ] Go 1.19+ installed
- [ ] Node.js v18 LTS+ installed
- [ ] Git installed
- [ ] GitHub account ready

### GitHub
- [ ] `toha-example-site` forked and named `blog`
- [ ] Repo cloned locally

### Local Dependencies
- [ ] `hugo mod tidy` completed
- [ ] `hugo mod npm pack` completed
- [ ] `npm install` completed
- [ ] Local server runs — `http://localhost:1313/blog/` works

### File Changes (Part C)
- [ ] `hugo.yaml` — `baseURL`, `title`, `gitRepo` updated; `flags: enable: false`
- [ ] `go.mod` — module path updated to `github.com/YOUR-USERNAME/blog`
- [ ] `data/en/author.yaml` — your real name, photo path, contact info
- [ ] `data/en/site.yaml` — your real description, OpenGraph, copyright
- [ ] `data/en/sections/about.yaml` — your designation, company, bio, social links, badges
- [ ] `data/en/sections/experiences.yaml` — your real work history
- [ ] `data/en/sections/skills.yaml` — your skills, all logo paths verified to exist
- [ ] `data/en/sections/education.yaml` — your qualifications
- [ ] `data/en/sections/accomplishments.yaml` — your certifications
- [ ] `data/en/sections/projects.yaml` — your real projects
- [ ] `data/en/sections/achievements.yaml` — disabled
- [ ] `data/en/sections/featured-posts.yaml` — disabled
- [ ] `.github/workflows/deploy.yml` — created with correct content
- [ ] `.github/workflows/sync-upstream.yml` — created

### Assets (Part D)
- [ ] Profile photo in `assets/images/author/` — NOT in `static/`
- [ ] Photo filename matches path in `author.yaml`
- [ ] All skill logos exist in `assets/images/sections/skills/`
- [ ] Every logo path in `skills.yaml` has a corresponding file

### Content Cleanup (Part E)
- [ ] `data/bn/` folder deleted
- [ ] All `*.bn.md` files deleted from `content/`

### Deploy (Part F)
- [ ] Everything committed and pushed to `main`
- [ ] GitHub Actions build shows green tick
- [ ] `gh-pages` branch exists and has HTML files
- [ ] GitHub Pages configured — source set to `gh-pages` / `/ (root)`
- [ ] Live site accessible at `https://YOUR-USERNAME.github.io/blog/`

---

## Troubleshooting Reference

| _Problem_ | _Cause_ | _Solution_ |
| :--- | :--- | :--- |
| `hugo` not found after install | PATH not updated yet | Close PowerShell completely and open fresh |
| `hugo version` missing `extended` | Wrong Hugo package installed | `winget uninstall Hugo.Hugo` then `winget install Hugo.Hugo.Extended` |
| `hugo mod tidy` fails | Go not installed or no internet | Verify `go version` works; check connection |
| `npm install` fails — no `package.json` | `hugo mod npm pack` not run first | Run `hugo mod npm pack` then `npm install` |
| Local build: Bootstrap / fonts not found | npm packages not installed | Run `hugo mod npm pack && npm install` |
| Local Hugo: version warning / incompatible | Locally installed Hugo is old | `winget install Hugo.Hugo.Extended --force` then restart PowerShell |
| Build error: nil pointer — author image | Photo in `static/` instead of `assets/` | Move photo to `assets/images/author/` |
| Build error: nil pointer — skill logo | Logo file missing from `assets/` | Add the file to `assets/images/sections/skills/` |
| Build error: Bengali tags in output | `data/bn/` and `*.bn.md` files not deleted | Run Part E cleanup commands |
| Front page shows "John Doe" / "John's Blog" | `author.yaml` and `hugo.yaml` not updated | Update `data/en/author.yaml` and `hugo.yaml` title |
| Language flag switcher showing | `flags: enable: true` in `hugo.yaml` | Set `flags: enable: false` |
| GitHub Actions: tar exit code 2 | Go module cache restore bug | Add `cache: false` under `setup-go` in `deploy.yml` |
| GitHub Actions: Node.js 20 deprecation | Old node version in workflow | Change `node-version: "20"` to `"22"` |
| GitHub Actions: deploy fails exit code 128 | Auth failure — wrong deploy method | Use `github_token: ${{ secrets.GITHUB_TOKEN }}` — not PAT or SSH |
| `gh-pages` branch not created | Build failed before deploy step | Fix build errors first, then re-push |
| Site 404 after enabling Pages | DNS not propagated yet | Wait 5–10 minutes; verify Pages set to `gh-pages` / root |
| Live site not updating after push | Actions build failed | Check Actions tab — fix error — push again |
| `git push` rejected | Remote has commits you don't have | Run `git pull --rebase` then push |
| Local CSS broken | `baseURL` mismatch | Run `hugo server -w --baseURL http://localhost:1313/blog/` |
| YAML file breaks build | Indentation error | Validate at https://yamlchecker.com |

---

## Useful Links

| _Resource_ | _URL_ |
| :--- | :--- |
| Toha Live Demo | https://toha-example-site.netlify.app |
| Toha Documentation | https://toha-docs.netlify.app/posts |
| Toha GitHub Repo | https://github.com/hugo-themes/toha |
| Toha Example Site | https://github.com/hugo-themes/toha-example-site |
| Hugo Official Docs | https://gohugo.io/documentation/ |
| Hugo Modules Guide | https://gohugo.io/hugo-modules/ |
| GitHub Pages Docs | https://docs.github.com/en/pages |
| GitHub Actions Docs | https://docs.github.com/en/actions |
| peaceiris/actions-gh-pages | https://github.com/peaceiris/actions-gh-pages |
| benc-uk Icon Collection | https://github.com/benc-uk/icon-collection |
| simple-icons | https://github.com/simple-icons/simple-icons |
| Font Awesome Icons | https://fontawesome.com/icons |
| YAML Checker | https://yamlchecker.com |
| Credly (certification badges) | https://www.credly.com |

---

_Hugo + Toha + GitHub Pages Guide — v3.0 — March 2026_
