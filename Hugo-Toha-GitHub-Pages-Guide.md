# Hugo + Toha + GitHub Pages
## End-to-End Setup Guide

**Platform:** Windows 10 / 11
**Deploy Target:** GitHub Pages (Free)
**Version:** 2.0 &nbsp;•&nbsp; March 2026
**Live Site:** https://vibhu2.github.io/blog/
**Source Repo:** https://github.com/Vibhu2/blog

---

## Contents

- [Overview](#overview)
- [Step 1 — Install Prerequisites](#step-1--install-prerequisites)
- [Step 2 — Fork the Example Site](#step-2--fork-the-example-site)
- [Step 3 — Create the Pages Repo](#step-3--create-the-pages-repo)
- [Step 4 — Clone Locally and Install Dependencies](#step-4--clone-locally-and-install-dependencies)
- [Step 5 — Configure the Site](#step-5--configure-the-site)
- [Step 6 — Personalise Your Content](#step-6--personalise-your-content)
- [Step 7 — Add Skill Icons](#step-7--add-skill-icons)
- [Step 8 — Set Up GitHub Actions Deploy](#step-8--set-up-github-actions-deploy)
- [Step 9 — Enable GitHub Pages](#step-9--enable-github-pages)
- [Step 10 — Day-to-Day Workflow](#step-10--day-to-day-workflow)
- [Repo Architecture](#repo-architecture)
- [File Structure Reference](#file-structure-reference)
- [Setup Checklist](#setup-checklist)
- [Troubleshooting Reference](#troubleshooting-reference)

---

## Overview

This guide builds a personal portfolio and blog using Hugo (static site generator), the Toha theme,
and publishes it free on GitHub Pages. The site lives at `https://YOUR-USERNAME.github.io/blog/`.

### What You End Up With

- A live site at `https://YOUR-USERNAME.github.io/blog/`
- Portfolio with About, Experience, Skills, Projects, Education, Certifications
- A fully functional blog with categories, tags, and reading time
- Auto-deploy on every `git push` — no manual build steps needed
- Zero hosting cost

### Architecture — Single Repo, Two Branches

This setup uses **one repo with two branches** — the simplest and most reliable approach.

```text
Repo: YOUR-USERNAME/blog
  ├── main branch      ← Where YOU work (Hugo source, Markdown, YAML, config)
  └── gh-pages branch  ← Auto-managed by GitHub Actions (compiled HTML)
```

GitHub Pages serves from the `gh-pages` branch. You never touch it directly.
GitHub Actions builds on every push to `main` and pushes the result to `gh-pages` automatically.
Authentication uses the built-in `GITHUB_TOKEN` — no PAT or SSH keys needed.

```text
You write a post or update YAML
        ↓
git push → main branch
        ↓
GitHub Actions builds Hugo
        ↓
Compiled HTML pushed → gh-pages branch
        ↓
GitHub Pages serves your live site
```

### Technology Stack

| _Component_ | _What It Does_ |
| :--- | :--- |
| Hugo Extended 0.146.0+ | Static site generator — builds the site from Markdown + YAML |
| Toha Theme v4 | Pre-built portfolio + blog theme, loaded via Go modules |
| Go Modules | How Hugo pulls in the Toha theme as a dependency |
| Node.js / npm | Required for Toha's CSS/JS build pipeline |
| GitHub Pages | Free static site hosting — served from `gh-pages` branch |
| GitHub Actions | CI/CD — builds on push, deploys to `gh-pages` automatically |

---

## Step 1 — Install Prerequisites

Open **PowerShell as Administrator**.

### 1.1  Install Hugo Extended, Go, and Node.js

```powershell
winget install Hugo.Hugo.Extended
winget install GoLang.Go
winget install OpenJS.NodeJS.LTS
```

> **[!] WARNING:** Close and reopen PowerShell after installs complete — tools are not available in the same session.

### 1.2  Verify Git

```powershell
git --version
```

If not found:

```powershell
winget install Git.Git
```

### 1.3  Verify All Tools

Open a **fresh** PowerShell window and run:

```powershell
hugo version
go version
node --version
npm --version
git --version
```

> **[!] WARNING:** Hugo **must** show `extended` in its output — e.g. `hugo v0.146.0+extended`.
> If it shows without `extended`, reinstall:
> ```powershell
> winget uninstall Hugo.Hugo
> winget install Hugo.Hugo.Extended
> ```

### 1.4  Optional — Install VS Code

```powershell
winget install Microsoft.VisualStudioCode
```

---

## Step 2 — Fork the Example Site

The Toha example site is pre-wired with the correct folder structure, config, and sample content.

1. Go to: `https://github.com/hugo-themes/toha-example-site`
2. Click **Fork** (top-right)
3. Owner: your GitHub account
4. Repository name: `blog`
5. Click **Create Fork**

> **[i] INFO:** The repo name `blog` means your site URL will be `https://YOUR-USERNAME.github.io/blog/`.
> Use `YOUR-USERNAME.github.io` as the name only if you want the root URL with no path — but that requires
> a different setup (two repos). The single-repo approach shown here uses any other name.

---

## Step 3 — Create the Pages Repo

**Skip this step** — with the single-repo architecture, you do not need a second repo.
GitHub Actions pushes compiled HTML into the `gh-pages` branch of your `blog` repo.
GitHub Pages then serves from that branch.

---

## Step 4 — Clone Locally and Install Dependencies

```powershell
# Clone to your preferred location
cd $env:USERPROFILE\Documents\GitHub

# Replace YOUR-USERNAME with your GitHub username
git clone https://github.com/YOUR-USERNAME/blog.git blog
cd blog
```

### 4.1  Load the Hugo Theme Module

```powershell
hugo mod tidy
```

> **[i] INFO:** This downloads the Toha theme via Go modules. Takes 30–60 seconds the first time.

### 4.2  Generate Node Dependency Config

```powershell
hugo mod npm pack
```

### 4.3  Install npm Packages

```powershell
npm install
```

### 4.4  Start the Local Dev Server

```powershell
hugo server -w
```

Open `http://localhost:1313/blog/` in your browser. The `-w` flag enables live reload.

> **[i] INFO:** Press `Ctrl+C` to stop the local server.

---

## Step 5 — Configure the Site

### 5.1  Update hugo.yaml

Open `hugo.yaml` in the root of your project. The critical fields to change:

```yaml
baseURL: "https://YOUR-USERNAME.github.io/blog/"

languageCode: en
title: "Your Name's Blog"

languages:
  en:
    languageCode: en
    languageName: English
    title: "Your Name's Blog"
    weight: 1
defaultContentLanguage: en
```

> **[!] WARNING:** `baseURL` must match your actual GitHub Pages URL exactly — including the trailing slash
> and the `/blog/` path. Wrong value breaks all links and assets.

**Disable language flags** (removes the language switcher from the navbar):

```yaml
    flags:
      enable: false
```

**Point gitRepo to your fork:**

```yaml
  gitRepo: https://github.com/YOUR-USERNAME/blog
  gitBranch: main
```

### 5.2  Remove Bengali Sample Content

The forked example site includes Bengali (bn) content files that cause build errors if left in place.
Delete them before building:

```powershell
# Run from inside the blog folder
Remove-Item -Recurse -Force data\bn -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Filter "*.bn.md" | Remove-Item -Force
```

This removes the `data\bn` folder and all `.bn.md` content files.

### 5.3  Update go.mod Module Path

Open `go.mod` and change the module path from the original owner to yours:

```
module github.com/YOUR-USERNAME/blog
```

---

## Step 6 — Personalise Your Content

All personalisation happens in two places:

| _Location_ | _What it controls_ |
| :--- | :--- |
| `data/en/author.yaml` | Your name, photo, contact info, rotating summary |
| `data/en/site.yaml` | Site description, copyright, footer menu, OpenGraph |
| `data/en/sections/*.yaml` | Each homepage section (About, Skills, Experience, etc.) |

### 6.1  author.yaml

```yaml
name: "Your Full Name"
nickname: "YourFirstName"
greeting: "Hi, I am"
image: "images/author/your-photo.png"   # Must exist in assets/images/author/
contactInfo:
  email: "you@example.com"
  phone: "+XX XXXXXXXXXX"
  github: your-github-username
  linkedin: your-linkedin-slug

summary:
  - Your Job Title
  - Your Specialisation
  - Another Key Skill
  - One More Line
```

> **[!] WARNING:** The profile photo must be in `assets/images/author/` — NOT `static/images/`.
> Hugo's theme uses `resources.Get` which only searches the `assets/` folder.
> Putting the photo in `static/` causes a nil pointer build error.

### 6.2  site.yaml

```yaml
copyright: © 2026 Your Name. All rights reserved.

disclaimer: "Your disclaimer text here."

description: "Short description of your site for search engines."

customMenus:
- name: GitHub
  url: https://github.com/YOUR-USERNAME
  hideFromNavbar: false
  showOnFooter: true

openGraph:
  title: "Your Name — Your Title"
  type: website
  description: "OpenGraph description for social sharing."
  image: images/author/your-photo.png
  url: https://YOUR-USERNAME.github.io/blog/
```

### 6.3  about.yaml

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
  name: Your Company
  url: "https://www.yourcompany.com"

summary: 'Your professional summary paragraph here.'

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
  name: Your Certification Name
  url: "https://certification-url.com"
  badge: "https://badge-image-url.png"

- type: soft-skill-indicator
  name: Problem Solving
  percentage: 90
  color: blue
```

### 6.4  experiences.yaml

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
    overview: One sentence about the company.
  positions:
  - designation: Your Job Title
    start: Mon YYYY
    # Leave out 'end' if currently working here
    responsibilities:
    - Responsibility one — be specific and quantified where possible.
    - Responsibility two.
    - Responsibility three.
```

### 6.5  skills.yaml

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
- name: Category Name
  filter: "category-slug"

skills:
- name: Skill Name
  logo: /images/sections/skills/icon-name.svg   # Must exist in assets/images/sections/skills/
  summary: "Description of your skill level and experience."
  categories: ["category-slug"]
  url: "https://optional-link.com"
```

> **[!] WARNING:** Skill logos must exist in `assets/images/sections/skills/`.
> A missing logo file causes a nil pointer build error — Hugo cannot find the resource.
> Always verify the file exists before referencing it in YAML.

### 6.6  education.yaml

```yaml
section:
  name: Education
  id: education
  template: sections/education.html
  enable: true
  weight: 4
  showOnNavbar: true

degrees:
- name: Your Degree Name
  icon: fa-graduation-cap
  timeframe: YYYY-YYYY
  institution:
    name: University Name
    url: "https://www.university.edu"
```

### 6.7  accomplishments.yaml (Certifications)

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
  courseOverview: "What this certification covers."
```

### 6.8  projects.yaml

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
- name: Category
  filter: "category"

projects:
- name: Project Name
  role: Author
  timeline: "YYYY - Present"
  repo: https://github.com/YOUR-USERNAME/repo   # Optional — shows star count if public
  url: "https://project-url.com"                # Use instead of repo if not on GitHub
  summary: "What this project does and why it matters."
  tags: ["category"]
```

### 6.9  Disable Sections You Don't Need

To hide a section completely, set both `enable` and `showOnNavbar` to `false`:

```yaml
section:
  name: Achievements
  id: achievements
  enable: false
  showOnNavbar: false
```

---

## Step 7 — Add Skill Icons

Skill icons must be SVG or PNG files placed in `assets/images/sections/skills/`.
The best source is the `benc-uk/icon-collection` GitHub repository which has Microsoft, Azure,
and infrastructure icons in clean SVG format.

### 7.1  Download Icons

Run this from inside your blog folder:

```powershell
cd assets\images\sections\skills

$icons = @{
    "powershell.svg" = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/logo_powershell.svg"
    "azure.svg"      = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/azure.svg"
    "ad.svg"         = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/active-directory.svg"
    "dns.svg"        = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/dns.svg"
    "windows.svg"    = "https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/windows-virtual-desktop.svg"
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
```

### 7.2  Available Icon Sources

| _Source_ | _URL_ | _Best For_ |
| :--- | :--- | :--- |
| benc-uk/icon-collection/azure-docs | `https://raw.githubusercontent.com/benc-uk/icon-collection/master/azure-docs/` | Microsoft, Azure, AD, DNS, Windows |
| benc-uk/icon-collection/microsoft-365 | `https://raw.githubusercontent.com/benc-uk/icon-collection/master/microsoft-365/` | Exchange, Teams, SharePoint, Intune |
| simple-icons | `https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/` | VMware, Veeam, Python, Git, Linux |

Browse the full icon list at `https://github.com/benc-uk/icon-collection`

### 7.3  The Icons Already in the Repo

These come with the Toha example site and can be used directly:

```text
assets/images/sections/skills/
  cloud.png      git.png      go.png
  linux.png      docker.svg   kubernetes.png
  prometheus.png c++.png
```

---

## Step 8 — Set Up GitHub Actions Deploy

### 8.1  Create the Workflow File

```powershell
New-Item -ItemType Directory -Path .github\workflows -Force
```

### 8.2  Create deploy.yml

Create `.github/workflows/deploy.yml` with the following content:

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

**Key design decisions in this workflow:**

- `cache: false` on setup-go prevents a known `tar` exit code 2 error when restoring Go module cache
- Node.js `22` instead of `20` avoids the Node.js deprecation warning
- Hugo is installed directly from the release binary rather than via the `peaceiris/actions-hugo` action — more reliable and version-pinned
- `github_token: ${{ secrets.GITHUB_TOKEN }}` is the built-in token — no PAT or SSH key setup needed
- Deploys to `gh-pages` branch of the **same repo** — single-repo architecture, zero cross-repo auth

### 8.3  Push to GitHub

```powershell
git add .
git commit -m "Initial setup — Hugo Toha blog"
git push
```

Go to `https://github.com/YOUR-USERNAME/blog/actions` to watch the build.
First build takes 2–3 minutes. On success the `gh-pages` branch is created automatically.

---

## Step 9 — Enable GitHub Pages

After the first successful build (green tick in Actions):

1. Go to: `https://github.com/YOUR-USERNAME/blog/settings/pages`
2. Under **Source** → select **Deploy from a branch**
3. Under **Branch** → select `gh-pages` → `/ (root)`
4. Click **Save**

Your site will be live at `https://YOUR-USERNAME.github.io/blog/` within 1–2 minutes.

> **[i] INFO:** First-time DNS propagation can take up to 10 minutes. If you see a 404, wait and try again.

---

## Step 10 — Day-to-Day Workflow

All work happens on the `main` branch. The `gh-pages` branch manages itself.

### 10.1  Writing a New Blog Post

```powershell
# 1. Start local server
hugo server -w

# 2. In a new PowerShell window, create a new post
hugo new posts\post-title\index.md

# 3. Edit the post
code content\posts\post-title\index.md

# 4. Preview at http://localhost:1313/blog/ (live reloads as you type)

# 5. When ready, set draft: false in the front matter

# 6. Push — GitHub Actions deploys automatically
git add .
git commit -m "Add post: post-title"
git push
```

### 10.2  Post Front Matter

```yaml
---
title: "Your Post Title"
date: 2026-03-22T00:00:00+05:30
draft: false
tags: ["tag1", "tag2"]
categories: ["category"]
description: "Short summary shown in post listings"
---

Write your post content here in Markdown.
```

> **[!] WARNING:** `draft: true` makes the post invisible on the live site. Always set to `false` before pushing.

### 10.3  Adding Images to Posts

Place images in the same folder as the post:

```text
content\posts\post-title\
  index.md
  screenshot.png
```

Reference in Markdown:

```markdown
![Alt text](screenshot.png)
```

### 10.4  Updating Portfolio Data

```powershell
# Edit any YAML file in data\en\sections\
code data\en\sections\experiences.yaml

# Push to deploy
git add .
git commit -m "Update work experience"
git push
```

### 10.5  Quick Reference

| _Task_ | _Command_ |
| :--- | :--- |
| Start local preview | `hugo server -w` |
| Create new blog post | `hugo new posts\post-name\index.md` |
| Build for production (manual test) | `hugo --minify` |
| Update Toha theme to latest | `hugo mod tidy` |
| Push changes live | `git add . && git commit -m "msg" && git push` |
| Check Actions build status | GitHub → blog repo → Actions tab |
| Stop local server | `Ctrl+C` in PowerShell |

---

## Repo Architecture

```text
blog/                                   ← Root of your Hugo site
│
├── .github/
│   └── workflows/
│       ├── deploy.yml                  ← GitHub Actions — builds and deploys on push to main
│       └── sync-upstream.yml           ← Weekly sync from toha-example-site upstream
│
├── archetypes/
│   └── default.md                      ← Template for new posts
│
├── assets/
│   └── images/
│       ├── author/
│       │   └── your-photo.png          ← Profile photo — MUST be here, not in static/
│       ├── sections/
│       │   └── skills/
│       │       └── *.svg / *.png       ← Skill icons — MUST be here
│       └── site/
│           ├── background.jpg          ← Landing page background
│           ├── favicon.png
│           ├── main-logo.png
│           └── inverted-logo.png
│
├── content/
│   ├── posts/                          ← Your blog posts go here
│   │   └── post-name/
│   │       └── index.md
│   └── notes/                          ← Notes section (can be disabled)
│
├── data/
│   └── en/
│       ├── author.yaml                 ← Your name, photo, contact info, summary
│       ├── site.yaml                   ← Site description, copyright, menus
│       └── sections/
│           ├── about.yaml              ← About section
│           ├── accomplishments.yaml    ← Certifications
│           ├── achievements.yaml       ← Gallery (disable if not using)
│           ├── education.yaml          ← Education
│           ├── experiences.yaml        ← Work history
│           ├── featured-posts.yaml     ← Featured posts (disable if not using)
│           ├── projects.yaml           ← Projects
│           ├── recent-posts.yaml       ← Recent posts
│           └── skills.yaml             ← Skills with icons
│
├── static/
│   └── files/
│       └── resume.pdf                  ← Optional — link from about.yaml resourceLinks
│
├── go.mod                              ← Hugo module config — points to Toha theme version
├── go.sum
├── hugo.yaml                           ← Main site configuration
├── package.hugo.json                   ← npm package template (used by hugo mod npm pack)
└── package.json                        ← Generated by hugo mod npm pack — do not edit manually
```

---

## File Structure Reference

### hugo.yaml — Key Fields

```yaml
baseURL: "https://YOUR-USERNAME.github.io/blog/"   # MUST match exactly — trailing slash required
languageCode: en
title: "Your Blog Title"

# Only English — no other languages
languages:
  en:
    languageCode: en
    languageName: English
    title: "Your Blog Title"
    weight: 1
defaultContentLanguage: en

params:
  background: /images/site/background.jpg
  logo:
    main: /images/site/main-logo.png
    inverted: /images/site/inverted-logo.png
    favicon: /images/site/favicon.png
  gitRepo: https://github.com/YOUR-USERNAME/blog
  gitBranch: main

  features:
    flags:
      enable: false    # Hides language flag switcher
    analytics:
      enable: false    # Disable until you have a tracking ID
    comment:
      enable: false    # Disable until you set up Disqus/Giscus
```

### go.mod — Module Path

```
module github.com/YOUR-USERNAME/blog

go 1.25

require github.com/hugo-toha/toha/v4 v4.13.1-0.20260114145901-84093514293e // indirect
```

---

## Setup Checklist

### Prerequisites

- [ ] Hugo Extended 0.146.0+ installed — `hugo version` shows `extended`
- [ ] Go 1.19+ installed — `go version` returns a result
- [ ] Node.js v18 LTS+ installed — `node --version` returns v18.x or higher
- [ ] Git installed — `git --version` returns a result
- [ ] GitHub account exists

### Repository Setup

- [ ] `toha-example-site` forked and renamed to `blog` on GitHub
- [ ] Repo cloned locally
- [ ] `hugo mod tidy` completed successfully
- [ ] `hugo mod npm pack` completed successfully
- [ ] `npm install` completed successfully
- [ ] `hugo server -w` running — site visible at `http://localhost:1313/blog/`

### Content Cleanup

- [ ] `data\bn` folder deleted
- [ ] All `.bn.md` files deleted from `content\`
- [ ] `go.mod` module path updated to `github.com/YOUR-USERNAME/blog`
- [ ] `hugo.yaml` baseURL updated to `https://YOUR-USERNAME.github.io/blog/`

### Personalisation

- [ ] `data\en\author.yaml` updated with real name, photo path, contact info
- [ ] `data\en\site.yaml` updated with real description and OpenGraph
- [ ] Profile photo placed in `assets\images\author\` (not `static\images\`)
- [ ] `data\en\sections\about.yaml` updated
- [ ] `data\en\sections\experiences.yaml` updated
- [ ] `data\en\sections\skills.yaml` updated — all logo paths verified to exist
- [ ] `data\en\sections\education.yaml` updated
- [ ] `data\en\sections\accomplishments.yaml` updated
- [ ] `data\en\sections\projects.yaml` updated
- [ ] Unused sections disabled (`enable: false`)

### Skill Icons

- [ ] All skill logos exist in `assets\images\sections\skills\`
- [ ] Every logo path in `skills.yaml` has a corresponding file

### Deploy

- [ ] `.github\workflows\deploy.yml` created with correct content
- [ ] All changes committed and pushed to `main`
- [ ] GitHub Actions build green (Actions tab shows success)
- [ ] `gh-pages` branch created and populated
- [ ] GitHub Pages configured on `blog` repo — source set to `gh-pages` branch / `/ (root)`
- [ ] Live site accessible at `https://YOUR-USERNAME.github.io/blog/`

---

## Troubleshooting Reference

| _Problem_ | _Solution_ |
| :--- | :--- |
| `hugo` not found after install | Close PowerShell completely and open a fresh window |
| `hugo version` does not show `extended` | `winget uninstall Hugo.Hugo` then `winget install Hugo.Hugo.Extended` |
| `hugo mod tidy` fails | Ensure Go is installed and `go version` works; check internet connection |
| `npm install` fails — missing `package.json` | Run `hugo mod npm pack` first — this generates `package.json` |
| Build error: nil pointer on author image | Photo must be in `assets/images/author/` — not `static/images/author/` |
| Build error: nil pointer on skill logo | Skill logo file does not exist in `assets/images/sections/skills/` — add the file |
| Build error: Bootstrap not found locally | Run `hugo mod npm pack && npm install` to install all npm dependencies |
| Local Hugo build fails with version warning | Local Hugo is too old — `winget install Hugo.Hugo.Extended --force` then restart PowerShell |
| Bengali content causing build errors | Delete `data\bn` folder and all `*.bn.md` files from `content\` |
| Site builds but shows wrong name / John Doe | `data\en\author.yaml` not updated — check the file has your name |
| Profile photo not showing | File is in `static\images\` instead of `assets\images\` — move it |
| Skills section crashes the build | A logo path in `skills.yaml` references a file that doesn't exist in `assets\` |
| GitHub Actions fails: tar exit code 2 | Add `cache: false` under `setup-go` in `deploy.yml` |
| GitHub Actions: Node.js 20 deprecation | Change `node-version: "20"` to `node-version: "22"` in `deploy.yml` |
| Site shows 404 after enabling Pages | Wait 5–10 minutes for DNS. Verify Pages is set to `gh-pages` branch in Settings |
| Changes pushed but live site not updating | Check Actions tab — if build failed, site will not update |
| `hugo server -w` port already in use | Run `hugo server -w --port 1314` |
| YAML file causes site to break | YAML is whitespace-sensitive — validate at yamlchecker.com |
| `git push` rejected — remote has changes | Run `git pull --rebase` first, then push |

---

## Useful Links

| _Resource_ | _URL_ |
| :--- | :--- |
| Toha Live Demo | https://toha-example-site.netlify.app |
| Toha Documentation | https://toha-docs.netlify.app/posts |
| Toha GitHub Repo | https://github.com/hugo-themes/toha |
| Toha Example Site Repo | https://github.com/hugo-themes/toha-example-site |
| Hugo Official Docs | https://gohugo.io/documentation/ |
| Hugo Modules Guide | https://gohugo.io/hugo-modules/ |
| GitHub Pages Docs | https://docs.github.com/en/pages |
| GitHub Actions Docs | https://docs.github.com/en/actions |
| peaceiris/actions-gh-pages | https://github.com/peaceiris/actions-gh-pages |
| benc-uk Icon Collection | https://github.com/benc-uk/icon-collection |
| simple-icons | https://github.com/simple-icons/simple-icons |
| Font Awesome Icons | https://fontawesome.com/icons |
| YAML Syntax Checker | https://yamlchecker.com |
| Markdown Guide | https://www.markdownguide.org |

---

_Hugo + Toha + GitHub Pages Guide — v2.0 — March 2026_
