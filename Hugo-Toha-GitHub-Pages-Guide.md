# Hugo + Toha Blog — Complete Setup & Usage Guide

**Platform:** Windows 10 / 11
**Version:** 5.0 &nbsp;•&nbsp; March 2026
**Live Site:** https://pwsh.in/
**Source Repo:** https://github.com/Vibhu2/blog

---

> **HOW TO USE THIS GUIDE**
>
> Written for someone with zero prior knowledge of Hugo, Git, or web hosting.
> Every command, every file, every click is documented. Follow steps in exact order.
>
> **For an AI reproducing this setup:** All final file contents are in Part C.
> Replace every `YOUR-USERNAME` placeholder with the actual GitHub username.

---

## Contents

1. [What You End Up With](#1-what-you-end-up-with)
2. [How It Works](#2-how-it-works)
3. [Files to Prepare Before Starting](#3-files-to-prepare-before-starting)
4. [Step 1 — Install Tools](#step-1--install-tools)
5. [Step 2 — Configure Git](#step-2--configure-git)
6. [Step 3 — GitHub Account & Authentication](#step-3--github-account--authentication)
7. [Step 4 — Fork the Example Site](#step-4--fork-the-example-site)
8. [Step 5 — Clone to Your Computer](#step-5--clone-to-your-computer)
9. [Step 6 — Install Site Dependencies](#step-6--install-site-dependencies)
10. [Step 7 — Clean Up Sample Content](#step-7--clean-up-sample-content)
11. [Step 8 — Add Your Profile Photo](#step-8--add-your-profile-photo)
12. [Step 9 — Download Skill Icons](#step-9--download-skill-icons)
13. [Step 10 — Edit All Content Files](#step-10--edit-all-content-files)
14. [Step 11 — Create GitHub Actions Workflows](#step-11--create-github-actions-workflows)
15. [Step 12 — Test Locally](#step-12--test-locally)
16. [Step 13 — Push and Go Live](#step-13--push-and-go-live)
17. [Step 14 — Enable GitHub Pages](#step-14--enable-github-pages)
18. [Step 15 — Custom Domain Setup](#step-15--custom-domain-setup)
19. [Step 16 — Enable HTTPS](#step-16--enable-https)
20. [Part C — Complete File Contents](#part-c--complete-file-contents)
21. [Part D — Writing and Publishing Blog Posts](#part-d--writing-and-publishing-blog-posts)
22. [Setup Checklist](#setup-checklist)
23. [Troubleshooting](#troubleshooting)
24. [Useful Links](#useful-links)

---

## 1. What You End Up With

A personal website at `https://YOUR-USERNAME.github.io/blog/` (or your own domain like `https://pwsh.in/`) with:

- Homepage: photo, About, work experience, skills, projects, education, certifications
- A blog for publishing technical articles written in plain Markdown
- Auto-deploy on every `git push` — live within 2–3 minutes, no manual steps
- Dark/light mode, syntax highlighting, reading time, PDF embed, code copy button
- **Cost: Free.** GitHub Pages hosting is free. All tools are free.

---

## 2. How It Works

```text
Your Computer              GitHub                    Internet
─────────────              ──────                    ────────
Edit YAML/Markdown  →  git push → main branch
                                        ↓
                               GitHub Actions
                               (builds Hugo)
                                        ↓
                               gh-pages branch  →  GitHub Pages  →  https://pwsh.in/
```

**Three things to understand:**

**Hugo** turns your plain text files (Markdown + YAML) into a real HTML website. You never write HTML.

**GitHub** stores your files and runs the build automatically on every push.

**GitHub Pages** serves the compiled HTML files for free.

**Branch setup:** `main` = your source files (what you edit). `gh-pages` = compiled HTML (auto-managed by GitHub Actions — you never touch it).

Authentication uses the built-in `GITHUB_TOKEN` — no personal access tokens or SSH keys needed.

---

## 3. Files to Prepare Before Starting

| _File_ | _Requirements_ | _Used in_ |
| :--- | :--- | :--- |
| Profile photo | PNG or JPG, plain background | Step 8 |
| Resume PDF (optional) | Your CV as PDF | `static/files/resume.pdf` |

Rename your photo to something simple like `vibhu.png` before starting.

---

## Step 1 — Install Tools

### 1.1 Open PowerShell as Administrator

1. Press **Windows key**
2. Type `PowerShell`
3. Right-click **Windows PowerShell** → **Run as administrator**

### 1.2 Check winget is available

```powershell
winget --version
```

If you see a version number — proceed. If not:
1. Open **Microsoft Store** → search **App Installer** → click **Update**
2. Reopen PowerShell as Administrator

### 1.3 Install all four tools

Run each line and wait for it to complete before running the next:

```powershell
winget install Git.Git
winget install GoLang.Go
winget install OpenJS.NodeJS.LTS
winget install Hugo.Hugo.Extended
winget install GitHub.cli
winget install Microsoft.VisualStudioCode
```

> **[!] CRITICAL:** After all installs, **close PowerShell completely** and open a fresh one.
> Tools are not available in the same session that installed them.

### 1.4 Verify everything

Open a **new** PowerShell window and run:

```powershell
git --version      # Expected: git version 2.x.x
go version         # Expected: go version go1.x.x
node --version     # Expected: v22.x.x
npm --version      # Expected: 10.x.x
hugo version       # Expected: hugo v0.146.0-...+extended windows/amd64
gh --version       # Expected: gh version 2.x.x
code --version     # Expected: 1.x.x
```

> **[!] CRITICAL:** Hugo **must** contain `+extended` in the output.
> If it shows without `extended`:
> ```powershell
> winget uninstall Hugo.Hugo
> winget install Hugo.Hugo.Extended
> ```
> Close and reopen PowerShell, check again.

> **[i] NOTE:** VS Code adds a `code` command to open files from PowerShell.
> If `code` is not found, restart PowerShell. If you prefer Notepad, replace
> every `code filename` in this guide with `notepad filename`.

---

## Step 2 — Configure Git

One-time setup. Git needs to know who you are before it can save changes.

```powershell
git config --global user.name "Your Full Name"
git config --global user.email "your-email@example.com"
git config --global init.defaultBranch main
```

> **[!] IMPORTANT:** `init.defaultBranch main` is required. Without it, Git may create a
> `master` branch instead of `main`, and the deploy workflow will never trigger.

Verify:

```powershell
git config --global --list
```

---

## Step 3 — GitHub Account & Authentication

### 3.1 Create account

If you don't have one: go to `https://github.com` → Sign up.
Choose your username carefully — it becomes part of your site URL.

### 3.2 Authenticate your computer with GitHub

```powershell
gh auth login
```

Answer the prompts:
- Where do you use GitHub? → **GitHub.com**
- Preferred protocol? → **HTTPS**
- Authenticate Git with GitHub credentials? → **Yes**
- How to authenticate? → **Login with a web browser**

A code appears — press Enter. Your browser opens. Paste the code → click Authorize.

Verify:

```powershell
gh auth status
```

Expected: `Logged in to github.com as YOUR-USERNAME`

---

## Step 4 — Fork the Example Site

1. Go to `https://github.com/hugo-themes/toha-example-site`
2. Click **Fork** (top-right)
3. Owner → your account
4. Repository name → `blog`
5. Click **Create fork**

> **[i] NOTE:** The repo name `blog` makes your URL `https://YOUR-USERNAME.github.io/blog/`.
> You can use any name — just use that name everywhere this guide says `blog`.

---

## Step 5 — Clone to Your Computer

```powershell
# Create the projects folder
New-Item -ItemType Directory -Path "$env:USERPROFILE\Documents\GitHub" -Force
cd "$env:USERPROFILE\Documents\GitHub"

# Clone — replace YOUR-USERNAME
git clone https://github.com/YOUR-USERNAME/blog.git blog

# Move into the project folder — ALL commands from here run inside this folder
cd blog
```

Confirm your location:

```powershell
Get-Location
# Expected: C:\Users\YOUR-WINDOWS-USERNAME\Documents\GitHub\blog
```

---

## Step 6 — Install Site Dependencies

Run in this exact order:

```powershell
hugo mod tidy
```
Downloads the Toha theme via Go modules. Takes 30–90 seconds first time.

```powershell
hugo mod npm pack
```
Generates `package.json` listing all CSS/JS packages the theme needs.

```powershell
npm install
```
Downloads all packages (Bootstrap, FontAwesome, etc.). Progress bar, then `added X packages`.

> **[!] ORDER MATTERS:** Must run in sequence. If `npm install` says no `package.json`,
> run `hugo mod npm pack` first.

---

## Step 7 — Clean Up Sample Content

The forked repo includes Bengali sample content that causes build errors. Delete it once:

```powershell
Remove-Item -Recurse -Force "data\bn" -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Filter "*.bn.md" | Remove-Item -Force
```

Confirm clean (should return nothing):

```powershell
Get-ChildItem -Recurse -Filter "*.bn.md"
```

---

## Step 8 — Add Your Profile Photo

> **[!] CRITICAL — WRONG FOLDER BREAKS THE BUILD:**
> Photo must be in `assets\images\author\` — NOT `static\images\`.
> The theme uses `resources.Get` which only looks in `assets\`.
> Photo in `static\` = `nil pointer evaluating resource.Resource.RelPermalink` build error.

```powershell
New-Item -ItemType Directory -Path "assets\images\author" -Force

# Adjust source path to where your photo actually is
Copy-Item "$env:USERPROFILE\Downloads\YourPhoto.png" "assets\images\author\vibhu.png"
```

Remember the filename — you will reference it in `author.yaml` in Step 10.

---

## Step 9 — Download Skill Icons

Every skill in `skills.yaml` needs a matching icon in `assets\images\sections\skills\`.
A missing icon = nil pointer build error crashing the entire build.

### Icons already included (no download needed)

```text
cloud.png  git.png  go.png  linux.png  docker.svg  kubernetes.png  prometheus.png  c++.png
```

### Download IT/Microsoft icons

```powershell
cd "$env:USERPROFILE\Documents\GitHub\blog\assets\images\sections\skills"

$icons = @{
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
    "vmware.svg"     = "https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/vmware.svg"
    "veeam.svg"      = "https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/veeam.svg"
}

foreach ($icon in $icons.GetEnumerator()) {
    try {
        Invoke-WebRequest -Uri $icon.Value -OutFile $icon.Key -TimeoutSec 10
        Write-Host "OK: $($icon.Key)"
    } catch {
        Write-Host "FAIL: $($icon.Key)"
    }
}

# Return to blog root
cd "$env:USERPROFILE\Documents\GitHub\blog"
```

All lines should show `OK`. If any show `FAIL`, check internet and retry individually.

---

## Step 10 — Edit All Content Files

All content lives in `data\en\`. Open each file, replace with your real information, save.

```powershell
# To open in VS Code:
code data\en\author.yaml

# To open in Notepad (if no VS Code):
notepad data\en\author.yaml
```

Complete final content for every file is in **Part C**. Edit these files:

1. `hugo.yaml` — baseURL, title, gitRepo
2. `go.mod` — module path
3. `data\en\author.yaml`
4. `data\en\site.yaml`
5. `data\en\sections\about.yaml`
6. `data\en\sections\experiences.yaml`
7. `data\en\sections\skills.yaml`
8. `data\en\sections\education.yaml`
9. `data\en\sections\accomplishments.yaml`
10. `data\en\sections\projects.yaml`
11. `data\en\sections\achievements.yaml` — disable
12. `data\en\sections\featured-posts.yaml` — disable

---

## Step 11 — Create GitHub Actions Workflows

### Create the workflows folder

```powershell
New-Item -ItemType Directory -Path ".github\workflows" -Force
```

### Create deploy.yml

```powershell
code .github\workflows\deploy.yml
```

Paste content from Part C → File 13. Save.

### Create sync-upstream.yml

```powershell
code .github\workflows\sync-upstream.yml
```

Paste content from Part C → File 14. Save.

---

## Step 12 — Test Locally

### Full build test (no browser)

```powershell
hugo --minify
```

Success looks like:
```text
Start building sites …
Total in 1976 ms
```

Any `Error:` in output = fix it before continuing. See Troubleshooting section.

### Preview in browser

```powershell
hugo server -w
```

Open `http://localhost:1313/blog/` — your site with your content.

> **[i] NOTE:** If CSS looks broken (no fonts/colours), run:
> ```powershell
> hugo server -w --baseURL http://localhost:1313/blog/
> ```

> **[i] NOTE:** To see draft posts locally (hidden on live site):
> ```powershell
> hugo server -w -D
> ```

Press `Ctrl+C` to stop the server.

---

## Step 13 — Push and Go Live

```powershell
cd "$env:USERPROFILE\Documents\GitHub\blog"
git add .
git status
```

Review what changed — your YAML, photo, icons, workflow files should all be listed.

```powershell
git commit -m "Initial setup — Hugo Toha blog"
git push
```

Watch the build: `https://github.com/YOUR-USERNAME/blog/actions`

- **Deploy Hugo Site** → this is the one to watch (orange = running, green = done, red = failed)
- **Sync Upstream Fork** → may fail first time, harmless

First build takes 2–3 minutes.

---

## Step 14 — Enable GitHub Pages

After the first green build:

1. Go to `https://github.com/YOUR-USERNAME/blog/settings/pages`
2. Under **Source** → **Deploy from a branch**
3. Under **Branch** → select `gh-pages` → `/ (root)`
4. Click **Save**

Site is live at `https://YOUR-USERNAME.github.io/blog/` within 1–10 minutes.

---

## Step 15 — Custom Domain Setup

Skip this step if you are happy with the default `github.io` URL.

### Step 15.1 — Verify your domain with GitHub (recommended)

This prevents domain takeover attacks. Do this at account level, not repo level.

1. Go to `https://github.com/settings/pages`
2. Click **Add a domain**
3. Enter your domain (e.g. `pwsh.in`) → click **Add domain**
4. GitHub shows you a TXT record to add, something like:

| _Type_ | _Name_ | _Value_ |
| :--- | :--- | :--- |
| TXT | `_github-pages-challenge-YOUR-USERNAME.pwsh.in` | `some-random-string` |

5. Add that TXT record in Cloudflare DNS (DNS only, grey cloud)
6. Back on GitHub → click **Verify**

### Step 15.2 — Set custom domain in repo settings

1. Go to `https://github.com/YOUR-USERNAME/blog/settings/pages`
2. Under **Custom domain** → type your domain → click **Save**

GitHub creates a CNAME file in `gh-pages` branch automatically.

### Step 15.3 — Add DNS records in Cloudflare

Cloudflare → your domain → **DNS → Records**. Add all of these.

**Every record must be DNS only (grey cloud) — NOT proxied (orange cloud).**
Orange cloud blocks GitHub's TLS certificate verification permanently.

**4× A records (IPv4):**

| _Type_ | _Name_ | _Value_ | _Proxy_ |
| :--- | :--- | :--- | :--- |
| A | `@` | `185.199.108.153` | DNS only ☁️ |
| A | `@` | `185.199.109.153` | DNS only ☁️ |
| A | `@` | `185.199.110.153` | DNS only ☁️ |
| A | `@` | `185.199.111.153` | DNS only ☁️ |

**4× AAAA records (IPv6):**

| _Type_ | _Name_ | _Value_ | _Proxy_ |
| :--- | :--- | :--- | :--- |
| AAAA | `@` | `2606:50c0:8000::153` | DNS only ☁️ |
| AAAA | `@` | `2606:50c0:8001::153` | DNS only ☁️ |
| AAAA | `@` | `2606:50c0:8002::153` | DNS only ☁️ |
| AAAA | `@` | `2606:50c0:8003::153` | DNS only ☁️ |

**1× CNAME (www redirect):**

| _Type_ | _Name_ | _Value_ | _Proxy_ |
| :--- | :--- | :--- | :--- |
| CNAME | `www` | `YOUR-USERNAME.github.io` | DNS only ☁️ |

> **[!] WARNING:** Any extra A/AAAA records on `@` not in this list will block certificate generation. Delete any old hosting records on `@`.

### Step 15.4 — Update hugo.yaml and site.yaml

```powershell
# In hugo.yaml — change baseURL
# From: baseURL: https://YOUR-USERNAME.github.io/blog/
# To:   baseURL: https://pwsh.in/

# In data/en/site.yaml — update OpenGraph url
# From: url: https://YOUR-USERNAME.github.io/blog/
# To:   url: https://pwsh.in/
```

### Step 15.5 — Add CNAME file to static/

This file ensures your custom domain survives every deployment. Without it, GitHub Actions overwrites the CNAME file after every push and breaks the custom domain.

```powershell
"pwsh.in" | Out-File -FilePath "static\CNAME" -Encoding ascii -NoNewline
```

### Step 15.6 — Commit and push

```powershell
git add .
git commit -m "Custom domain — pwsh.in"
git push
```

### Step 15.7 — Verify DNS is resolving

```powershell
Resolve-DnsName pwsh.in -Type A | Select-Object Name, IPAddress
```

All four GitHub IPs should appear. If you see anything else, your A records are wrong or proxy is on.

---

## Step 16 — Enable HTTPS

The **Enforce HTTPS** checkbox stays greyed out until GitHub provisions a TLS certificate from Let's Encrypt. This happens automatically after DNS resolves correctly.

### Why it's greyed out — checklist

If the checkbox is greyed out after 30 minutes, check each item:

- [ ] All A/AAAA records in Cloudflare are **DNS only (grey cloud)** — not proxied
- [ ] No extra A/AAAA records on `@` beyond the eight GitHub IPs
- [ ] The CNAME file exists in the `gh-pages` branch (GitHub creates this when you save the domain in Settings)
- [ ] DNS has propagated — verify with `Resolve-DnsName pwsh.in -Type A`

### How to restart certificate provisioning

If the checkbox is still greyed out after everything above checks out:

1. Go to `https://github.com/YOUR-USERNAME/blog/settings/pages`
2. Click **Remove** next to your custom domain
3. Type the domain again → click **Save**

This restarts the DNS check and certificate provisioning from scratch.

### Enable it

Once you see a green tick next to your domain in Pages settings:
tick **Enforce HTTPS** → done.

`http://pwsh.in` will now automatically redirect to `https://pwsh.in`.

---

## Part C — Complete File Contents

Every file that needs to be created or modified. Replace `YOUR-USERNAME` throughout.

---

### File 1: hugo.yaml

**Path:** `hugo.yaml` (repo root) — replace entire file.

```yaml
baseURL: https://pwsh.in/

languageCode: en
title: "Vibhu's Blog"

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

languages:
  en:
    languageCode: en
    languageName: English
    title: "Vibhu's Blog"
    weight: 1
defaultContentLanguage: en

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
  gitRepo: https://github.com/Vibhu2/blog
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
      enable: false
    analytics:
      enable: false
    support:
      enable: false
    toc:
      enable: true
    tags:
      enable: true
      on_card: true
    flags:
      enable: false
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

---

### File 2: go.mod

**Path:** `go.mod` (repo root) — change first line only.

```
module github.com/Vibhu2/blog

go 1.25

require github.com/hugo-toha/toha/v4 v4.13.1-0.20260114145901-84093514293e // indirect
```

---

### File 3: data/en/author.yaml

```yaml
name: "Vibhu Bhatnagar"
nickname: "Vibhu"
greeting: "Hi, I am"
image: "images/author/vibhu.png"

contactInfo:
  email: "vibhu@pwsh.in"
  phone: "+91 8979989222"
  github: Vibhu2
  linkedin: vibhu-bhatnagar-02622798

summary:
  - Senior Wintel Administrator
  - Active Directory & DNS/DHCP Specialist
  - Exchange Server SME
  - PowerShell Automation Engineer
  - 15+ years in enterprise IT infrastructure
```

---

### File 4: data/en/site.yaml

```yaml
copyright: © 2026 Vibhu Bhatnagar. All rights reserved.

disclaimer: "The views and opinions expressed on this blog are my own and do not represent those of my employer. All content is provided for informational purposes only."

description: "Personal blog and portfolio of Vibhu Bhatnagar — Senior Wintel Administrator specialising in Active Directory, Exchange Server, PowerShell automation, and enterprise IT infrastructure."

customMenus:
- name: GitHub
  url: https://github.com/Vibhu2
  hideFromNavbar: false
  showOnFooter: true

openGraph:
  title: "Vibhu Bhatnagar — Senior Wintel Administrator"
  type: website
  description: "Personal blog and portfolio — Active Directory, Exchange, PowerShell automation and enterprise infrastructure."
  image: images/author/vibhu.png
  url: https://pwsh.in/
```

---

### File 5: data/en/sections/about.yaml

```yaml
section:
  name: About
  id: about
  enable: true
  weight: 1
  showOnNavbar: true
  template: sections/about.html

designation: Senior Advanced System Administrator
company:
  name: IT By Design
  url: "https://www.itbydesign.com"

summary: 'Senior Wintel Administrator with 15+ years of hands-on experience specialising in Active Directory architecture, DNS/DHCP infrastructure, and full Exchange Server lifecycle management. Proven track record delivering AD migrations, DNS redesigns, DHCP failover implementations, and diverse migration projects across 150+ managed client environments. Deep expertise in PowerShell automation — reducing multi-day manual processes to minutes — combined with strong VMware vSphere/vCenter and Hyper-V virtualisation skills.'

socialLinks:
- name: Email
  icon: "fas fa-envelope"
  url: "mailto:vibhu@pwsh.in"
- name: Github
  icon: "fab fa-github"
  url: "https://www.github.com/Vibhu2"
- name: LinkedIn
  icon: "fab fa-linkedin"
  url: "https://www.linkedin.com/in/vibhu-bhatnagar-02622798"

badges:
- type: certification
  name: Microsoft Azure Administrator (AZ-104)
  url: "https://learn.microsoft.com/en-us/certifications/azure-administrator/"
  badge: "https://images.credly.com/size/680x680/images/336eebfc-0ac3-4553-9a67-b402f491f185/azure-administrator-associate-600x600.png"
- type: certification
  name: Datto Certified Technical Specialist
  url: "https://www.datto.com"
  badge: "https://images.credly.com/size/680x680/images/ba16c380-fe58-4e71-8f9c-e31bcd0810a6/image.png"
- type: soft-skill-indicator
  name: Problem Solving
  percentage: 90
  color: blue
- type: soft-skill-indicator
  name: Team Leadership
  percentage: 85
  color: yellow
- type: soft-skill-indicator
  name: Automation Mindset
  percentage: 95
  color: orange
```

---

### File 6: data/en/sections/experiences.yaml

```yaml
section:
  name: Experiences
  id: experiences
  enable: true
  weight: 3
  showOnNavbar: true

experiences:
- company:
    name: IT By Design
    url: "https://www.itbydesign.com"
    location: Noida, India
    overview: IT By Design is a leading managed services provider delivering IT support and infrastructure solutions to businesses worldwide.
  positions:
  - designation: Senior Advanced System Administrator
    start: Aug 2019
    responsibilities:
    - Architected and maintained AD environments across 150+ MSP clients — GPOs, OU structures, FSMO roles, replication topology, and AD health.
    - Designed and implemented split-brain DNS configurations, zone migrations, and conditional forwarder policies for multi-site enterprise clients.
    - Deployed DHCP failover pairs and managed scope configurations, reservations, and IPAM — eliminating address conflicts and single points of failure.
    - Led AD migration and clean-up projects including stale object removal, GPO consolidation, and trust relationship reviews across 22+ client environments.
    - Executed 25+ on-premises Exchange to Microsoft 365 migrations including hybrid configuration, MX cutover, mail flow validation, and post-migration support.
    - Delivered Tenant-to-Tenant M365 migrations covering mailboxes, calendars, and Teams data with zero unplanned downtime.
    - Managed VMware ESXi, vSphere and vCenter Server — provisioning, snapshots, resource pools, vMotion, and HA/DRS configuration.
    - Executed bulk upgrade of 150+ ESXi hosts to version 8.0.3 with minimal service disruption.
    - Built Azure AD Sync Monitor tracking 155+ clients — auto-triggers forced sync when threshold exceeded, eliminated daily manual checks entirely.
    - Automated ESXi host inventory and documentation generation, cutting monthly reporting from 10 days to under 1 hour.
    - Deployed DUO MFA, Microsoft Defender XDR, and Sophos Endpoint Security; implemented zero-day vulnerability remediation workflows.
    - Managed Datto and Veeam backup environments — policy design, monitoring, restore testing, and quarterly BCDR exercises across 150+ clients.
    - Delivered 15% increase in operational efficiency and 20% reduction in ticket volume through automation and preventive maintenance.

- company:
    name: Pacific Infotech
    url: "https://www.pacificinfotech.co.uk"
    location: Moradabad, India
    overview: Pacific Infotech is a UK-based managed services provider.
  positions:
  - designation: Senior Analyst & Client Support
    start: Oct 2011
    end: Jul 2019
    responsibilities:
    - Managed Windows Server and AD infrastructure for 200–350 user environments — DNS, DHCP, GPO, file services, and user administration.
    - Deployed and maintained Exchange Server 2010/2013 — mailbox management, transport rules, DAG configuration.
    - Maintained VMware ESXi and Hyper-V platforms — VM provisioning, backup, and disaster recovery planning.
    - Configured and managed PRTG for full infrastructure monitoring across all client environments.
    - Managed AppAssure, Backup Exec, and Datto backup environments including DR exercises.

- company:
    name: Dell International
    url: "https://www.dell.com"
    location: Gurgaon, India
    overview: Dell Technologies is a global leader in IT solutions, hardware, and services.
  positions:
  - designation: Client Technical Support Associate
    start: Jun 2011
    end: Sep 2011
    responsibilities:
    - Provided technical support to US-based clients for Dell hardware and bundled software.
    - Diagnosed and resolved hardware, OS, virus, malware, and spyware issues.

- company:
    name: Teleperformance CRM Services
    url: "https://www.teleperformance.com"
    location: Gurgaon, India
    overview: Teleperformance is a global leader in outsourced customer experience management.
  positions:
  - designation: Associate — Adobe Technical Support (SME)
    start: May 2010
    end: Jun 2011
    responsibilities:
    - Provided technical support for Adobe Creative Suite as Subject Matter Expert.
    - Supported Photoshop, After Effects, Premiere Elements, Premiere Pro, and Encore for US-based customers.

- company:
    name: Wipro
    url: "https://www.wipro.com"
    location: Okhla, India
    overview: Wipro is a leading global IT and business process services company.
  positions:
  - designation: Tech Support — HP
    start: Jan 2009
    end: Mar 2010
    responsibilities:
    - Provided technical support for HP hardware and peripherals.
    - Handled inbound support calls resolving hardware and software issues.
```

---

### File 7: data/en/sections/skills.yaml

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
  summary: "Expert-level automation for AD, Exchange, ESXi reporting, Azure AD sync monitoring, and bulk infrastructure tasks. Author of custom modules reducing multi-day processes to minutes."
  categories: ["scripting", "microsoft"]
  url: "https://docs.microsoft.com/en-us/powershell/"

- name: Active Directory
  logo: /images/sections/skills/ad.svg
  summary: "AD DS, Sites & Services, GPO, FSMO, replication, AD migrations, Azure AD Connect, and hybrid identity across 150+ MSP environments."
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
  summary: "Exchange 2010-2019 — DAG, mailbox management, connectors, and 25+ on-prem to M365 migrations."
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
  summary: "Backup policy, monitoring, restore testing, and quarterly BCDR exercises across 150+ clients."
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
  summary: "Version control for PowerShell modules, scripts, and documentation. GitHub for CI/CD pipelines."
  categories: ["scripting"]
  url: "https://git-scm.com/"
```

---

### File 8: data/en/sections/education.yaml

```yaml
section:
  name: Education
  id: education
  template: sections/education.html
  enable: true
  weight: 4
  showOnNavbar: true

degrees:
- name: Master of Computer Applications (MCA)
  icon: fa-graduation-cap
  timeframe: 2011-2014
  institution:
    name: Punjab Technical University, Moradabad
    url: "https://www.ptu.ac.in"
  customSections:
    - name: Specialisation
      content: Computer Science

- name: Bachelor of Computer Applications (BCA)
  icon: fa-university
  timeframe: Completed before 2011
  institution:
    name: India
```

---

### File 9: data/en/sections/accomplishments.yaml

```yaml
section:
  name: Accomplishments
  id: accomplishments
  enable: true
  weight: 9
  showOnNavbar: true

accomplishments:
- name: Microsoft Azure Administrator (AZ-104)
  timeline: "Aug 2021"
  organization:
    name: Microsoft
    url: https://learn.microsoft.com/en-us/certifications/azure-administrator/
  courseOverview: "Validates expertise in implementing, managing, and monitoring Azure environments."

- name: Microsoft 365 Security Administration
  timeline: "Aug 2021"
  organization:
    name: Microsoft
    url: https://learn.microsoft.com/en-us/certifications/
  courseOverview: "Covers M365 security administration including identity, compliance, and threat protection."

- name: Datto Certified Technical Specialist
  timeline: "Sep 2019"
  organization:
    name: Datto
    url: https://www.datto.com
  courseOverview: "Certifies proficiency in Datto backup, disaster recovery, and business continuity products."

- name: Sophos Intercept X Advanced with EDR
  timeline: "Apr 2020"
  organization:
    name: Sophos
    url: https://www.sophos.com
  courseOverview: "Endpoint protection and EDR — threat hunting, deep learning malware detection, incident response."

- name: Sophos Central Device Encryption
  timeline: "Apr 2020"
  organization:
    name: Sophos
    url: https://www.sophos.com
  courseOverview: "Full disk encryption management using BitLocker and FileVault — policy deployment and key recovery."

- name: Sophos Central Email & Phish Threat
  timeline: "Apr 2020"
  organization:
    name: Sophos
    url: https://www.sophos.com
  courseOverview: "Email security and simulated phishing training — protecting against email-borne threats."

- name: MCTS — Windows Server 2008 Active Directory
  timeline: "May 2012"
  organization:
    name: Microsoft
    url: https://learn.microsoft.com
  courseOverview: "Validated expertise in configuring and managing Active Directory on Windows Server 2008."

- name: Windows Server 2008 Network Infrastructure, Configuring
  timeline: "Apr 2016"
  organization:
    name: Microsoft
    url: https://learn.microsoft.com
  courseOverview: "Covers DNS, DHCP, routing, remote access, and network policy services."
```

---

### File 10: data/en/sections/projects.yaml

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
- name: Azure
  filter: "azure"
- name: Infrastructure
  filter: "infrastructure"

projects:
- name: Azure AD Sync Monitor
  role: Author
  timeline: "2022 - Present"
  summary: PowerShell automation monitoring Azure AD Connect sync across 155+ MSP clients. Auto-triggers forced sync when threshold exceeded — eliminated daily manual checks entirely.
  tags: ["powershell", "azure"]

- name: ESXi Reporting Automation
  role: Author
  timeline: "2021 - Present"
  summary: Automated ESXi host inventory and documentation across client environments. Reduced monthly reporting from 10 days to under 1 hour via PowerCLI.
  tags: ["powershell", "infrastructure"]

- name: Workstation Profile Scanner
  role: Author
  timeline: "2020 - Present"
  summary: Enumerates user profiles, mapped printers, and default printer settings across network machines. Critical input for 22+ server migration projects.
  tags: ["powershell", "infrastructure"]

- name: Automate/ScreenConnect Reconciliation
  role: Author
  timeline: "2021 - Present"
  summary: API-driven script detecting record discrepancies between ConnectWise Automate and ScreenConnect, with automated service restart for affected endpoints.
  tags: ["powershell", "infrastructure"]

- name: VBPowershell Module Library
  role: Author
  timeline: "2023 - Present"
  url: "https://github.com/Vibhu2/VBPowershell"
  summary: Personal PowerShell module library for Windows Server administration — AD, Exchange, reporting, and MSP tooling built to production standards.
  tags: ["powershell"]
```

---

### File 11: data/en/sections/achievements.yaml

```yaml
section:
  name: Achievements
  id: achievements
  enable: false
  weight: 10
  showOnNavbar: false
```

---

### File 12: data/en/sections/featured-posts.yaml

```yaml
section:
  name: Featured Posts
  id: featured-posts
  enable: false
  weight: 7
  showOnNavbar: false
```

---

### File 13: .github/workflows/deploy.yml

**Create `.github\workflows\` folder first, then create this file.**

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
          cache: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"

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

| _Setting_ | _Why_ |
| :--- | :--- |
| `cache: false` on Go | Prevents `tar exit code 2` error |
| `node-version: "22"` | Node 20 deprecated in Actions from 2026 |
| Hugo from `.deb` file | Pinned exact version, more reliable than action-based install |
| `github_token` | Built-in token — no PAT or SSH keys needed |

---

### File 14: .github/workflows/sync-upstream.yml

```yaml
name: Sync Upstream Fork

on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

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
          git merge upstream/main --no-edit --allow-unrelated-histories || echo "Nothing to merge"

      - name: Push to fork
        run: git push origin main
```

> **[i] NOTE:** Fails on first run — normal and harmless. Works on subsequent weekly runs.

---

### File 15: archetypes/default.md

This is the template Hugo uses whenever you run `hugo new posts\post-name\index.md`.
It pre-fills the front matter and gives you a consistent structure.

```markdown
---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: true
description: ""
tags: [""]
categories: [""]
author:
  name: Vibhu Bhatnagar
---

<!--
BEFORE PUBLISHING:
  1. Write your description — shown in post listings and Google
  2. Add relevant tags  — e.g. ["PowerShell", "Active Directory", "Windows Server"]
  3. Set category      — e.g. "PowerShell Automation", "Infrastructure", "Azure"
  4. Change draft: true → draft: false when ready to publish
-->

## Introduction

<!-- Hook — what problem does this post solve? -->

## The Problem

<!-- What was wrong / what triggered this? -->

## The Solution

<!-- What you built or did -->

## How It Works

<!-- Technical walkthrough -->

## Results

<!-- What changed after — numbers are best -->

---

*Questions or feedback? Reach out on [LinkedIn](https://www.linkedin.com/in/vibhu-bhatnagar-02622798) or leave a comment below.*
```

---

## Part D — Writing and Publishing Blog Posts

This section covers the complete daily blogging workflow from idea to live post.

---

### D.1 — How Posts Work

Each blog post is a folder inside `content\posts\` containing an `index.md` file.
Any images for that post sit alongside the `index.md` in the same folder.

```text
content\posts\
  my-post-title\
    index.md         ← Post content (Markdown)
    screenshot.png   ← Images for this post (optional)
    diagram.jpg
```

The folder name becomes the URL: `https://pwsh.in/posts/my-post-title/`

---

### D.2 — Start the Local Preview Server

Before writing, start the local server so you can see changes instantly in your browser.

```powershell
cd "$env:USERPROFILE\Documents\GitHub\blog"
hugo server -w
```

Open your browser to `http://localhost:1313/`

The `-w` flag means "watch" — any file you save automatically refreshes the browser.

**To see draft posts** (posts with `draft: true`) in the local preview:

```powershell
hugo server -w -D
```

> **[i] NOTE:** Local preview uses `localhost:1313` not your custom domain, so CSS may
> look different from the live site if your `baseURL` is set to `https://pwsh.in/`.
> For a pixel-perfect local preview:
> ```powershell
> hugo server -w --baseURL http://localhost:1313/
> ```

Press `Ctrl+C` to stop the server when done.

---

### D.3 — Create a New Post

Open a **second PowerShell window** (keep the server running in the first one):

```powershell
cd "$env:USERPROFILE\Documents\GitHub\blog"

# Replace 'my-post-title' with your actual title — use hyphens, no spaces
hugo new posts\my-post-title\index.md
```

This creates the file with front matter pre-filled from the archetype template.
Open it to edit:

```powershell
code content\posts\my-post-title\index.md
```

---

### D.4 — The Post File (Front Matter + Content)

When you open the new file it looks like this:

```yaml
---
title: "My Post Title"
date: 2026-03-22T10:00:00+05:30
draft: true
description: ""
tags: [""]
categories: [""]
author:
  name: Vibhu Bhatnagar
---
```

**Fill in each field:**

| _Field_ | _What to put_ | _Notes_ |
| :--- | :--- | :--- |
| `title` | Full post title | Shown as H1 heading and in browser tab |
| `date` | Publication date | Format: `YYYY-MM-DDTHH:MM:SS+05:30` (IST = +05:30) |
| `draft` | `true` or `false` | `true` = hidden everywhere. Change to `false` to publish |
| `description` | 1–2 sentence summary | Shown in post listings, Google results, and social shares |
| `tags` | Array of tags | e.g. `["PowerShell", "Active Directory", "Windows Server"]` |
| `categories` | Array with one category | e.g. `["PowerShell Automation"]` or `["Infrastructure"]` |

**Optional front matter fields:**

```yaml
hero: hero.jpg           # Hero image (place in same folder as index.md)
menu:
  sidebar:
    name: Short Title    # Shorter name shown in sidebar navigation
    identifier: unique-id
    weight: 10           # Controls sort order — lower = higher up
```

> **[!] IMPORTANT:** `draft: true` hides the post from the live site and from
> `hugo server -w` (but shows in `hugo server -w -D`).
> Always change to `draft: false` before pushing when you want it to go live.

---

### D.5 — Writing in Markdown

After the front matter `---` closing line, write your post content in Markdown.

**Basic formatting:**

```markdown
## Section Heading

### Sub-heading

Regular paragraph text. **Bold text.** *Italic text.* `inline code`.

- Unordered list item
- Another item

1. Numbered list
2. Second item

[Link text](https://example.com)

![Image alt text](screenshot.png)
```

**Code blocks with syntax highlighting:**

````markdown
```powershell
Get-ADUser -Filter * | Select-Object Name, SamAccountName
```

```python
print("Hello World")
```

```bash
sudo apt update && sudo apt upgrade
```
````

**Block quote:**

```markdown
> This is a block quote — useful for important notes or callouts.
```

**Table:**

```markdown
| _Column 1_ | _Column 2_ | _Column 3_ |
| :--- | :---: | ---: |
| Left aligned | Centered | Right aligned |
| Value | Value | Value |
```

---

### D.6 — Adding Images to a Post

Place image files in the same folder as `index.md`:

```text
content\posts\my-post-title\
  index.md
  screenshot.png
  architecture-diagram.jpg
```

Reference in your post:

```markdown
![Description of what the image shows](screenshot.png)
```

For a hero/banner image at the top of the post, add to front matter:

```yaml
hero: hero.jpg
```

And place `hero.jpg` in the same folder.

---

### D.7 — Test Before Publishing

With the local server running, check:

- Post appears at `http://localhost:1313/posts/my-post-title/`
- Title, date, tags display correctly
- Code blocks render with syntax highlighting
- Images load correctly
- No spelling mistakes

Run a full build to catch any errors:

```powershell
hugo --minify
```

No errors = safe to publish.

---

### D.8 — Publish the Post

1. Set `draft: false` in the front matter
2. Save the file
3. Push to GitHub:

```powershell
cd "$env:USERPROFILE\Documents\GitHub\blog"
git add .
git commit -m "Add post: my-post-title"
git push
```

4. Watch the build: `https://github.com/Vibhu2/blog/actions`
5. Green tick = live at `https://pwsh.in/posts/my-post-title/`

Build takes 2–3 minutes.

---

### D.9 — Edit an Existing Post

```powershell
# Open the post
code content\posts\my-post-title\index.md

# Edit, save, then push
git add .
git commit -m "Update post: my-post-title"
git push
```

---

### D.10 — Delete the Sample Posts

The forked repo includes sample posts you should remove once you have real content.
Check what sample posts exist:

```powershell
Get-ChildItem content\posts
```

Remove the ones you don't want (adjust folder names to what exists):

```powershell
Remove-Item -Recurse -Force "content\posts\introduction" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "content\posts\markdown-sample" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "content\posts\shortcodes" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "content\posts\category" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "content\posts\rich-content" -ErrorAction SilentlyContinue

git add .
git commit -m "Remove sample posts"
git push
```

> **[i] NOTE:** Your real first post is already created and live:
> `content\posts\automating-ad-sync-monitoring-with-powershell\index.md`
> Open it with `code content\posts\automating-ad-sync-monitoring-with-powershell\index.md`
> to edit or update it.

---

### D.11 — Blogging Quick Reference

| _Task_ | _Command_ |
| :--- | :--- |
| Start local preview | `hugo server -w` |
| Start preview including drafts | `hugo server -w -D` |
| Start preview with correct CSS | `hugo server -w --baseURL http://localhost:1313/` |
| Create new post | `hugo new posts\post-name\index.md` |
| Open post for editing | `code content\posts\post-name\index.md` |
| Test full build (no server) | `hugo --minify` |
| Publish all changes | `git add . && git commit -m "msg" && git push` |
| Watch live build status | GitHub → Vibhu2/blog → Actions tab |
| View live site | https://pwsh.in |

---

## Setup Checklist

### Tools
- [ ] `winget --version` works
- [ ] `git --version` works
- [ ] `go version` works
- [ ] `node --version` works (v18+)
- [ ] `npm --version` works
- [ ] `hugo version` shows `+extended`
- [ ] `gh --version` works
- [ ] `git config --global user.name` is set
- [ ] `git config --global user.email` is set
- [ ] `git config --global init.defaultBranch` is `main`
- [ ] `gh auth status` shows logged in to github.com

### GitHub & Repo
- [ ] GitHub account exists
- [ ] `toha-example-site` forked and named `blog`
- [ ] Repo cloned to `Documents\GitHub\blog`

### Dependencies
- [ ] `hugo mod tidy` — no errors
- [ ] `hugo mod npm pack` — `package.json` exists
- [ ] `npm install` — `node_modules` exists

### Content Cleanup
- [ ] `data\bn` folder deleted
- [ ] All `*.bn.md` files deleted
- [ ] `Get-ChildItem -Recurse -Filter "*.bn.md"` returns nothing

### Assets
- [ ] Profile photo in `assets\images\author\` (NOT `static\`)
- [ ] Photo filename matches `image:` in `author.yaml`
- [ ] All skill icons downloaded to `assets\images\sections\skills\`
- [ ] Every `logo:` in `skills.yaml` has a matching file

### Files (Part C)
- [ ] `hugo.yaml` — baseURL, title, gitRepo updated
- [ ] `go.mod` — module path updated
- [ ] `data\en\author.yaml` — real info
- [ ] `data\en\site.yaml` — real info
- [ ] `data\en\sections\about.yaml`
- [ ] `data\en\sections\experiences.yaml`
- [ ] `data\en\sections\skills.yaml`
- [ ] `data\en\sections\education.yaml`
- [ ] `data\en\sections\accomplishments.yaml`
- [ ] `data\en\sections\projects.yaml`
- [ ] `data\en\sections\achievements.yaml` — disabled
- [ ] `data\en\sections\featured-posts.yaml` — disabled
- [ ] `.github\workflows\deploy.yml` — created
- [ ] `.github\workflows\sync-upstream.yml` — created
- [ ] `archetypes\default.md` — updated

### Build & Deploy
- [ ] `hugo --minify` — no errors
- [ ] Local server shows correct content
- [ ] All changes pushed to `main`
- [ ] GitHub Actions — Deploy Hugo Site shows green
- [ ] `gh-pages` branch exists
- [ ] GitHub Pages configured — `gh-pages` / `/(root)`
- [ ] Site accessible at `https://YOUR-USERNAME.github.io/blog/`

### Custom Domain (optional)
- [ ] Domain verified at account level (`github.com/settings/pages`)
- [ ] Custom domain set in repo Pages settings
- [ ] All 4 A records added in Cloudflare — DNS only
- [ ] All 4 AAAA records added — DNS only
- [ ] CNAME for `www` added — DNS only
- [ ] No extra records on `@`
- [ ] `hugo.yaml` baseURL updated to custom domain
- [ ] `site.yaml` OpenGraph URL updated
- [ ] `static\CNAME` file contains domain name
- [ ] `Resolve-DnsName` returns all 4 GitHub IPs
- [ ] Enforce HTTPS ticked in Pages settings

---

## Troubleshooting

### Installation

| _Problem_ | _Fix_ |
| :--- | :--- |
| `winget` not recognised | Install App Installer from Microsoft Store |
| Any tool not found after install | Close PowerShell, open fresh window |
| `hugo version` missing `+extended` | `winget uninstall Hugo.Hugo` then `winget install Hugo.Hugo.Extended` — restart PS |
| `gh auth login` no browser opens | Run `gh auth login --web` |

### Dependencies

| _Problem_ | _Fix_ |
| :--- | :--- |
| `hugo mod tidy` network error | Check internet connection |
| `npm install` no `package.json` | Run `hugo mod npm pack` first |
| Bootstrap / fonts not found locally | Run `hugo mod npm pack && npm install` |

### Build Errors

| _Problem_ | _Fix_ |
| :--- | :--- |
| `nil pointer` on author image | Photo is in `static\` not `assets\images\author\` |
| `nil pointer` on skill logo | Logo file missing — add to `assets\images\sections\skills\` |
| Bengali content errors | Re-run Step 7 cleanup commands |
| `YAML parse error` | Validate at https://yamlchecker.com |
| Local Hugo version warning | `winget install Hugo.Hugo.Extended --force` — restart PS |

### Git & Push

| _Problem_ | _Fix_ |
| :--- | :--- |
| `git push` asks for password | Run `gh auth login` |
| `git push` rejected | `git pull --rebase` then push |
| `git commit` needs name/email | Run `git config --global` commands from Step 2 |
| Branch is `master` not `main` | `git branch -m master main && git push -u origin main` |

### GitHub Actions

| _Problem_ | _Fix_ |
| :--- | :--- |
| `tar exit code 2` | Add `cache: false` under `setup-go` |
| Node.js 20 deprecation | Change `node-version: "20"` to `"22"` |
| Deploy fails exit code 128 | Use `github_token: ${{ secrets.GITHUB_TOKEN }}` |
| `gh-pages` branch not created | Build failed — fix errors first, re-push |

### Custom Domain & HTTPS

| _Problem_ | _Fix_ |
| :--- | :--- |
| Enforce HTTPS greyed out | Cloudflare proxy is orange — switch all records to DNS only (grey) |
| Enforce HTTPS still greyed out after 30 min | Remove domain in Pages settings, re-add — restarts cert provisioning |
| Site 404 after setting custom domain | DNS not propagated — wait 10 min, check with `Resolve-DnsName` |
| Custom domain breaks after push | Add `static\CNAME` file containing your domain |
| Certificate never provisions | Extra A/AAAA records on `@` in Cloudflare — delete them |

### Display

| _Problem_ | _Fix_ |
| :--- | :--- |
| Local CSS broken | `hugo server -w --baseURL http://localhost:1313/` |
| Site shows "John Doe" | `author.yaml` not updated |
| Language flag switcher visible | `flags: enable: false` in `hugo.yaml` |
| Draft post not showing locally | Run `hugo server -w -D` |
| Draft post showing on live site | `draft: true` is NOT set — check front matter |

---

## Useful Links

| _Resource_ | _URL_ |
| :--- | :--- |
| Live site | https://pwsh.in |
| Source repo | https://github.com/Vibhu2/blog |
| Toha Live Demo | https://toha-example-site.netlify.app |
| Toha Documentation | https://toha-docs.netlify.app/posts |
| Toha GitHub | https://github.com/hugo-themes/toha |
| Hugo Documentation | https://gohugo.io/documentation/ |
| GitHub Pages Docs | https://docs.github.com/en/pages |
| GitHub Actions Docs | https://docs.github.com/en/actions |
| GitHub CLI Docs | https://cli.github.com/manual/ |
| GitHub Pages HTTPS docs | https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https |
| GitHub Custom Domain docs | https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site |
| peaceiris/actions-gh-pages | https://github.com/peaceiris/actions-gh-pages |
| benc-uk icon collection | https://github.com/benc-uk/icon-collection |
| simple-icons | https://github.com/simple-icons/simple-icons |
| Font Awesome icons | https://fontawesome.com/icons |
| YAML checker | https://yamlchecker.com |
| Markdown guide | https://www.markdownguide.org |
| Credly (cert badges) | https://www.credly.com |

---

## Repo File Structure

```text
blog/
├── .github/workflows/
│   ├── deploy.yml               ← Builds + deploys on push to main
│   └── sync-upstream.yml        ← Weekly theme update sync
├── archetypes/
│   └── default.md               ← Post template used by hugo new
├── assets/images/
│   ├── author/
│   │   └── vibhu.png            ← Profile photo — MUST be here not static/
│   ├── sections/skills/
│   │   └── *.svg / *.png        ← Skill icons — MUST be here
│   └── site/
│       ├── background.jpg
│       ├── favicon.png
│       ├── main-logo.png
│       └── inverted-logo.png
├── content/
│   └── posts/
│       └── post-name/
│           ├── index.md         ← Post content
│           └── image.png        ← Post images (alongside index.md)
├── data/en/
│   ├── author.yaml
│   ├── site.yaml
│   └── sections/
│       ├── about.yaml
│       ├── accomplishments.yaml
│       ├── achievements.yaml    ← disabled
│       ├── education.yaml
│       ├── experiences.yaml
│       ├── featured-posts.yaml  ← disabled
│       ├── projects.yaml
│       ├── recent-posts.yaml
│       └── skills.yaml
├── static/
│   ├── CNAME                    ← Custom domain — survives every deploy
│   └── files/resume.pdf         ← Optional downloadable resume
├── go.mod                       ← Hugo module, Toha version pinned
├── hugo.yaml                    ← Main site config
├── package.hugo.json            ← npm template
└── package.json                 ← Generated by hugo mod npm pack
```

---

_Hugo + Toha + GitHub Pages Guide — v5.0 — March 2026_
