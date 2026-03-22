# Hugo + Toha Blog — Complete Setup Guide
## From Zero to Live Site on GitHub Pages

**Platform:** Windows 10 / 11
**Version:** 4.0 &nbsp;•&nbsp; March 2026
**Reference Site:** https://vibhu2.github.io/blog/
**Reference Repo:** https://github.com/Vibhu2/blog

---

> **HOW TO USE THIS GUIDE**
>
> This document is written for someone with no prior knowledge of Hugo, Git, or web hosting.
> Every command, every file, every click is documented. Follow the steps in exact order.
> Do not skip anything — each step depends on the previous one.
>
> If you are an AI reproducing this setup: every file's complete final content is in Part C.
> Replace every `YOUR-USERNAME` placeholder with the actual GitHub username before starting.

---

## Contents

1. [What You Will End Up With](#1-what-you-will-end-up-with)
2. [How It Works — The Big Picture](#2-how-it-works--the-big-picture)
3. [Before You Start — Files to Prepare](#3-before-you-start--files-to-prepare)
4. [Step 1 — Install the Tools](#step-1--install-the-tools)
5. [Step 2 — Configure Git](#step-2--configure-git)
6. [Step 3 — Create a GitHub Account](#step-3--create-a-github-account)
7. [Step 4 — Fork the Example Site on GitHub](#step-4--fork-the-example-site-on-github)
8. [Step 5 — Clone the Repo to Your Computer](#step-5--clone-the-repo-to-your-computer)
9. [Step 6 — Install Site Dependencies](#step-6--install-site-dependencies)
10. [Step 7 — Clean Up Sample Content](#step-7--clean-up-sample-content)
11. [Step 8 — Add Your Profile Photo](#step-8--add-your-profile-photo)
12. [Step 9 — Download Skill Icons](#step-9--download-skill-icons)
13. [Step 10 — Edit All Content Files](#step-10--edit-all-content-files)
14. [Step 11 — Create the GitHub Actions Workflow](#step-11--create-the-github-actions-workflow)
15. [Step 12 — Test the Build Locally](#step-12--test-the-build-locally)
16. [Step 13 — Push to GitHub and Go Live](#step-13--push-to-github-and-go-live)
17. [Step 14 — Enable GitHub Pages](#step-14--enable-github-pages)
18. [Part C — Complete File Contents](#part-c--complete-file-contents)
19. [Part D — Day-to-Day Usage](#part-d--day-to-day-usage)
20. [Setup Checklist](#setup-checklist)
21. [Troubleshooting](#troubleshooting)
22. [Useful Links](#useful-links)

---

## 1. What You Will End Up With

A free personal website at `https://YOUR-USERNAME.github.io/blog/` containing:

- A homepage with your photo, About section, work experience, skills, projects, education,
  and certifications
- A blog where you can publish articles written in plain text (Markdown)
- Automatic publishing — every time you save and push a change, the site updates itself
  within 2–3 minutes, no manual steps needed
- Dark/light mode, reading time, syntax highlighting, and PDF embedding built in

**Cost:** Free. GitHub Pages hosting is free. The tools are free. No credit card needed.

---

## 2. How It Works — The Big Picture

```
Your Computer                  GitHub                    Internet
─────────────                  ──────                    ────────
You write/edit   →  git push → main branch
YAML and                             ↓
Markdown files               GitHub Actions
                             (builds the site)
                                     ↓
                             gh-pages branch  →  GitHub Pages  →  Live Website
```

**Three things to understand before starting:**

**Hugo** is the program that turns your plain text files (Markdown + YAML) into a real website
with HTML, CSS, and JavaScript. You never write HTML yourself.

**GitHub** is where your files are stored online (free). It also runs the build process
automatically whenever you push changes.

**GitHub Pages** is GitHub's free website hosting. It serves the compiled HTML files
that Hugo produced.

**The branch setup:** Your repo has two branches. `main` is where your source files live —
this is what you edit. `gh-pages` is where the compiled website HTML goes — GitHub Actions
creates and manages this automatically. You never touch `gh-pages` directly.

---

## 3. Before You Start — Files to Prepare

Have these ready on your computer before starting:

| _File_ | _Requirements_ | _Where it goes later_ |
| :--- | :--- | :--- |
| **Profile photo** | PNG or JPG. Plain/white background works best. Any reasonable size. | `assets/images/author/` |
| **Resume PDF** (optional) | Your CV as a PDF file | `static/files/` |

Rename your photo to something simple like `vibhu.png` or `photo.png` before starting.

---

## Step 1 — Install the Tools

You need four tools: Hugo, Go, Node.js, and Git.

### 1.1 — Open PowerShell

PowerShell is the command-line tool built into Windows. To open it:

1. Press the **Windows key**
2. Type `PowerShell`
3. Right-click **Windows PowerShell**
4. Click **Run as administrator**

A blue window will open. This is where you type commands.

### 1.2 — Check if winget is available

`winget` is the Windows package manager used to install tools. Type this and press Enter:

```powershell
winget --version
```

If you see a version number (e.g. `v1.6.3482`), winget is available. Skip to step 1.3.

If you see `winget is not recognized`, you need to install it first:

1. Open the **Microsoft Store** (search for it in the Start menu)
2. Search for **App Installer**
3. Click **Get** or **Update**
4. Close and reopen PowerShell as Administrator
5. Run `winget --version` again to confirm

### 1.3 — Install all tools

Run each command. Wait for each to finish completely before running the next:

```powershell
winget install Git.Git
```

```powershell
winget install GoLang.Go
```

```powershell
winget install OpenJS.NodeJS.LTS
```

```powershell
winget install Hugo.Hugo.Extended
```

> **[!] IMPORTANT:** After all four installs complete, **close PowerShell completely** and
> open a fresh one (Run as administrator again). The tools will not work in the same session
> that installed them — Windows needs to reload the PATH.

### 1.4 — Verify everything installed correctly

Open a **new** PowerShell window and run each line:

```powershell
git --version
```
Expected: `git version 2.x.x`

```powershell
go version
```
Expected: `go version go1.x.x windows/amd64`

```powershell
node --version
```
Expected: `v22.x.x` (or similar v18+)

```powershell
npm --version
```
Expected: `10.x.x` (or similar)

```powershell
hugo version
```
Expected: `hugo v0.146.0-...+extended windows/amd64`

> **[!] CRITICAL:** The Hugo output **must** contain the word `extended`.
> If it shows Hugo without `extended`, the site will fail to build. Fix it:
>
> ```powershell
> winget uninstall Hugo.Hugo
> winget install Hugo.Hugo.Extended
> ```
> Then close and reopen PowerShell, and check `hugo version` again.

### 1.5 — Optional: Install VS Code (text editor)

VS Code is a free code editor that makes editing YAML and Markdown much easier.
If you already have a text editor you prefer, skip this.

```powershell
winget install Microsoft.VisualStudioCode
```

After install, close and reopen PowerShell. Test with:

```powershell
code --version
```

> **[i] NOTE:** All file editing in this guide uses `code filename` to open VS Code.
> If you did not install VS Code, you can open any file with Notepad instead:
> `notepad filename` — everything works the same, just a different editor.

---

## Step 2 — Configure Git

Git needs to know who you are before it can save (commit) any changes.
This is a one-time setup on your computer.

```powershell
git config --global user.name "Your Full Name"
git config --global user.email "your-email@example.com"
git config --global init.defaultBranch main
```

Use the same email address you will use for your GitHub account.
The last line ensures your default branch is always called `main` — required for the
GitHub Actions workflow to trigger correctly.

Verify it saved:

```powershell
git config --global --list
```

You should see your name and email in the output.

---

## Step 3 — Create a GitHub Account

If you already have a GitHub account, skip this step.

1. Go to `https://github.com`
2. Click **Sign up**
3. Follow the steps — choose a username carefully, it will be part of your site URL
4. Verify your email address

**Your site URL will be:** `https://YOUR-GITHUB-USERNAME.github.io/blog/`

### 3.1 — Set up GitHub authentication on your computer

When you push files to GitHub, your computer needs to prove who you are.
The easiest method is the GitHub CLI (command-line tool).

Install it:

```powershell
winget install GitHub.cli
```

Close and reopen PowerShell, then authenticate:

```powershell
gh auth login
```

Answer the prompts:
- **Where do you use GitHub?** → GitHub.com
- **What is your preferred protocol?** → HTTPS
- **Authenticate Git with your GitHub credentials?** → Yes
- **How would you like to authenticate?** → Login with a web browser
- Copy the code shown, press Enter — your browser opens, paste the code, click Authorize

You are now authenticated. `git push` will work without asking for passwords.

---

## Step 4 — Fork the Example Site on GitHub

"Forking" means making your own copy of someone else's repo. The Toha theme comes with
a ready-made example site that has all the folders and config pre-set. You fork this
instead of starting from scratch.

1. Make sure you are logged into GitHub in your browser
2. Go to: `https://github.com/hugo-themes/toha-example-site`
3. Click the **Fork** button in the top-right corner
4. Under **Owner**, select your GitHub account
5. Under **Repository name**, type: `blog`
6. Leave everything else as default
7. Click **Create fork**

GitHub creates `YOUR-USERNAME/blog` with all the sample content inside.

> **[i] NOTE:** The repo name `blog` determines part of your URL. With this name your site
> will be at `https://YOUR-USERNAME.github.io/blog/`. If you name it something else,
> change `blog` to that name in all paths throughout this guide.

---

## Step 5 — Clone the Repo to Your Computer

"Cloning" downloads the repo from GitHub to your computer so you can edit files locally.

### 5.1 — Create a folder for your projects

```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\Documents\GitHub" -Force
cd "$env:USERPROFILE\Documents\GitHub"
```

### 5.2 — Clone your forked repo

Replace `YOUR-USERNAME` with your actual GitHub username:

```powershell
git clone https://github.com/YOUR-USERNAME/blog.git blog
```

This downloads all files into a new folder called `blog`.

### 5.3 — Move into the project folder

Every command from this point forward must be run from inside this folder:

```powershell
cd blog
```

Verify you are in the right place:

```powershell
Get-Location
```

Expected output: `C:\Users\YOUR-WINDOWS-USERNAME\Documents\GitHub\blog`

---

## Step 6 — Install Site Dependencies

The Toha theme requires some packages to be downloaded before you can build the site.
Run these three commands in order from inside the `blog` folder:

```powershell
hugo mod tidy
```

This downloads the Toha theme via Go modules. Takes 30–90 seconds the first time.
You will see it printing module names as it downloads.

```powershell
hugo mod npm pack
```

This reads the theme's requirements and generates a `package.json` file listing
all the JavaScript/CSS packages needed (Bootstrap, FontAwesome, etc.).

```powershell
npm install
```

This reads `package.json` and downloads all the packages. Takes 30–60 seconds.
You will see a progress bar and finally `added X packages`.

> **[!] IMPORTANT:** These three commands must be run in this exact order.
> If `npm install` complains about missing `package.json`, run `hugo mod npm pack` first.

---

## Step 7 — Clean Up Sample Content

The forked repo contains Bengali-language sample content that will cause build errors.
Delete it now before doing anything else:

```powershell
# Delete Bengali data folder
Remove-Item -Recurse -Force "data\bn" -ErrorAction SilentlyContinue

# Delete all Bengali content files
Get-ChildItem -Recurse -Filter "*.bn.md" | Remove-Item -Force
```

Confirm they are gone (this command should return nothing):

```powershell
Get-ChildItem -Recurse -Filter "*.bn.md"
```

---

## Step 8 — Add Your Profile Photo

Your profile photo must be placed in `assets\images\author\`.

> **[!] CRITICAL:** The photo **must** go in `assets\images\author\` — NOT in `static\images\`.
> The Toha theme uses `resources.Get` which only looks inside `assets\`.
> If your photo is in `static\`, the build will crash with this error:
> `nil pointer evaluating resource.Resource.RelPermalink`

Create the folder and copy your photo:

```powershell
# Create the folder (safe to run even if it already exists)
New-Item -ItemType Directory -Path "assets\images\author" -Force

# Copy your photo — adjust the source path to wherever your photo actually is
# Example if your photo is in Downloads:
Copy-Item "$env:USERPROFILE\Downloads\YourPhoto.png" "assets\images\author\vibhu.png"
```

Change `YourPhoto.png` to your actual filename, and `vibhu.png` to whatever name you want to use.
Remember the name you choose — you will need to put it in `author.yaml` in Step 10.

---

## Step 9 — Download Skill Icons

Every skill card on your homepage needs an icon image. The icons must be SVG or PNG files
stored in `assets\images\sections\skills\`. Missing icons crash the build.

### 9.1 — Icons already included

These come with the forked repo and are ready to use as-is:

```text
assets/images/sections/skills/
  cloud.png    git.png    go.png    linux.png
  docker.svg   kubernetes.png   prometheus.png   c++.png
```

### 9.2 — Download additional icons

Run this script from inside the `blog` folder to download icons for all the skills
configured in this guide. It uses two reliable public sources:

```powershell
cd assets\images\sections\skills

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
        Write-Host "FAIL: $($icon.Key) — $($_.Exception.Message)"
    }
}

# Return to the blog root folder when done
cd "$env:USERPROFILE\Documents\GitHub\blog"
```

Every line should show `OK: filename.svg`. If any show FAIL, check your internet connection
and run the failing ones manually.

### 9.3 — Verify all icons are present

```powershell
Get-ChildItem assets\images\sections\skills
```

You should see: `ad.svg`, `automation.svg`, `azure.svg`, `backup.svg`, `cloud.png`,
`defender.svg`, `dns.svg`, `docker.svg`, `exchange.svg`, `git.png`, `go.png`,
`kubernetes.png`, `linux.png`, `monitor.svg`, `powershell.svg`, `python.svg`,
`veeam.svg`, `vmware.svg`, `windows.svg`

---

## Step 10 — Edit All Content Files

This is where you put in your actual information. Every file below needs to be edited.

**How to edit:** Open the file in your editor, replace the content completely, save.

```powershell
# To open a file in VS Code:
code data\en\author.yaml

# To open a file in Notepad (if you don't have VS Code):
notepad data\en\author.yaml
```

The complete final content for every file is in **Part C** of this guide.
Go to Part C now, copy each file's content, and save it.

Files to edit (in this order):

1. `hugo.yaml` — main site config
2. `go.mod` — module path
3. `data\en\author.yaml` — your name, photo, contacts
4. `data\en\site.yaml` — site description, OpenGraph
5. `data\en\sections\about.yaml` — About section
6. `data\en\sections\experiences.yaml` — work history
7. `data\en\sections\skills.yaml` — skills with icons
8. `data\en\sections\education.yaml` — qualifications
9. `data\en\sections\accomplishments.yaml` — certifications
10. `data\en\sections\projects.yaml` — projects
11. `data\en\sections\achievements.yaml` — disable this section
12. `data\en\sections\featured-posts.yaml` — disable this section

---

## Step 11 — Create the GitHub Actions Workflow

GitHub Actions is the automated build system. When you push changes to GitHub, it reads
this workflow file and automatically builds and deploys your site.

### 11.1 — Create the workflows folder

```powershell
New-Item -ItemType Directory -Path ".github\workflows" -Force
```

### 11.2 — Create the deploy workflow

The complete file content is in Part C, item 13. Copy it exactly into a new file:

```powershell
code .github\workflows\deploy.yml
```

### 11.3 — Create the upstream sync workflow

This automatically checks for theme updates every Monday. Content is in Part C, item 14:

```powershell
code .github\workflows\sync-upstream.yml
```

---

## Step 12 — Test the Build Locally

Before pushing anything to GitHub, verify the site builds without errors on your computer.

```powershell
hugo --minify
```

A successful build ends with something like:

```text
Start building sites …
Total in 1976 ms
```

If you see `Error:` anywhere in the output, fix it before continuing.
Check the Troubleshooting section at the end of this guide for common errors.

### 12.2 — Preview the site in your browser

```powershell
hugo server -w
```

Open your browser and go to: `http://localhost:1313/blog/`

You should see your site with your name, photo, and content. Press `Ctrl+C` to stop.

> **[i] NOTE:** If the site loads but looks unstyled (no fonts, no colours), run:
> ```powershell
> hugo server -w --baseURL http://localhost:1313/blog/
> ```

---

## Step 13 — Push to GitHub and Go Live

Once the local build is clean, push everything to GitHub:

```powershell
cd "$env:USERPROFILE\Documents\GitHub\blog"

git add .
git status
```

`git status` shows you what files changed. Review it — you should see your YAML files,
your photo, icons, and workflow files all listed as new/modified.

```powershell
git commit -m "Initial setup — Hugo Toha blog"
git push
```

`git push` uploads everything to GitHub. The first push may open a browser window to
confirm your GitHub credentials — follow the prompts.

### 13.2 — Watch the build

Go to: `https://github.com/YOUR-USERNAME/blog/actions`

You will see the **Deploy Hugo Site** workflow running (orange dot = running, green = success,
red = failed). Click on it to see live logs.

The first build takes 2–3 minutes. When it shows a green tick, your site is ready.

> **[i] NOTE:** You will also see a **Sync Upstream Fork** workflow. It may show as failed
> on first run — this is normal and harmless. It will work correctly every week after that.

---

## Step 14 — Enable GitHub Pages

After the first successful build you must tell GitHub to serve your site:

1. Go to: `https://github.com/YOUR-USERNAME/blog/settings/pages`
2. Under **Source** → select **Deploy from a branch**
3. Under **Branch** → open the dropdown → select **gh-pages**
4. In the folder dropdown next to it → select **/ (root)**
5. Click **Save**

Your site is now live at: `https://YOUR-USERNAME.github.io/blog/`

Allow 1–10 minutes for the first load. If you see a 404, wait a few minutes and refresh.

---

## Part C — Complete File Contents

These are the exact final contents of every file that needs to be created or modified.
Copy each block exactly. Replace `YOUR-USERNAME` with your GitHub username throughout.

---

### File 1: hugo.yaml

**Path:** `hugo.yaml` (in the root of the blog folder — not inside any subfolder)
**Action:** Replace the entire existing file content with this.

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

# Allow raw HTML in markdown files
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

**Path:** `go.mod` (root of blog folder)
**Action:** Replace the entire file. Change only the first line — put your GitHub username and repo name.

```
module github.com/YOUR-USERNAME/blog

go 1.25

require github.com/hugo-toha/toha/v4 v4.13.1-0.20260114145901-84093514293e // indirect
```

---

### File 3: data/en/author.yaml

**Path:** `data\en\author.yaml`
**Action:** Replace entire file.
**Note:** Change `vibhu.png` in the `image` field to match whatever you named your photo in Step 8.

```yaml
name: "Your Full Name"
nickname: "YourFirstName"
greeting: "Hi, I am"
image: "images/author/vibhu.png"

contactInfo:
  email: "you@example.com"
  phone: "+XX XXXXXXXXXX"
  github: YOUR-USERNAME
  linkedin: your-linkedin-profile-slug

summary:
  - Your Primary Job Title
  - Your Main Specialisation
  - Another Key Skill
  - Another Key Skill
  - X+ years in your field
```

---

### File 4: data/en/site.yaml

**Path:** `data\en\site.yaml`
**Action:** Replace entire file.

```yaml
copyright: © 2026 Your Full Name. All rights reserved.

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
  description: "Description shown when your site is shared on LinkedIn, Twitter, WhatsApp etc."
  image: images/author/vibhu.png
  url: https://YOUR-USERNAME.github.io/blog/
```

---

### File 5: data/en/sections/about.yaml

**Path:** `data\en\sections\about.yaml`
**Action:** Replace entire file.

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

summary: 'Your professional summary — one paragraph. Describe your experience, specialisations, and key achievements.'

socialLinks:
- name: Email
  icon: "fas fa-envelope"
  url: "mailto:you@example.com"

- name: Github
  icon: "fab fa-github"
  url: "https://www.github.com/YOUR-USERNAME"

- name: LinkedIn
  icon: "fab fa-linkedin"
  url: "https://www.linkedin.com/in/YOUR-LINKEDIN-SLUG"

badges:
- type: certification
  name: Certification Name
  url: "https://certification-verify-url.com"
  badge: "https://images.credly.com/size/680x680/your-badge-id/image.png"

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

> **[i] HOW TO GET BADGE IMAGE URLs:** Go to your Credly profile, find your certification badge,
> right-click the badge image, click "Copy image address". Paste that URL into the `badge:` field.

---

### File 6: data/en/sections/experiences.yaml

**Path:** `data\en\sections\experiences.yaml`
**Action:** Replace entire file. Add/remove companies as needed — the pattern repeats.

```yaml
section:
  name: Experiences
  id: experiences
  enable: true
  weight: 3
  showOnNavbar: true

experiences:
- company:
    name: Current Company Name
    url: "https://www.company.com"
    location: City, Country
    overview: One sentence about what the company does.
  positions:
  - designation: Your Current Job Title
    start: Mon YYYY
    responsibilities:
    - What you did — be specific. Use numbers where possible (150+ clients, 25+ migrations).
    - Another responsibility.
    - Another responsibility.

- company:
    name: Previous Company Name
    url: "https://www.previouscompany.com"
    location: City, Country
    overview: One sentence about the company.
  positions:
  - designation: Your Previous Job Title
    start: Mon YYYY
    end: Mon YYYY
    responsibilities:
    - Responsibility one.
    - Responsibility two.
```

> **[i] NOTE:** If you are still at a company, leave out the `end:` line entirely.
> Toha will automatically show "Present" for the current role.

---

### File 7: data/en/sections/skills.yaml

**Path:** `data\en\sections\skills.yaml`
**Action:** Replace entire file.

> **[!] CRITICAL:** Every `logo:` path in this file must have a matching file in
> `assets/images/sections/skills/`. If any file is missing the build will crash.
> The icons in this file match exactly what was downloaded in Step 9.

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

**Path:** `data\en\sections\education.yaml`
**Action:** Replace entire file.

```yaml
section:
  name: Education
  id: education
  template: sections/education.html
  enable: true
  weight: 4
  showOnNavbar: true

degrees:
- name: Your Highest Degree (e.g. Master of Computer Applications)
  icon: fa-graduation-cap
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

### File 9: data/en/sections/accomplishments.yaml

**Path:** `data\en\sections\accomplishments.yaml`
**Action:** Replace entire file. Add or remove entries to match your certifications.

```yaml
section:
  name: Accomplishments
  id: accomplishments
  enable: true
  weight: 9
  showOnNavbar: true

accomplishments:
- name: Your Certification Name
  timeline: "Mon YYYY"
  organization:
    name: Issuing Organisation
    url: https://www.org.com
  courseOverview: "What this certification validates — one or two sentences."

- name: Another Certification
  timeline: "Mon YYYY"
  organization:
    name: Issuing Organisation
    url: https://www.org.com
  courseOverview: "What this covers."
```

---

### File 10: data/en/sections/projects.yaml

**Path:** `data\en\sections\projects.yaml`
**Action:** Replace entire file.

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
  repo: https://github.com/YOUR-USERNAME/repo-name
  summary: What this project does. What problem it solves. What impact it had.
  tags: ["powershell", "infrastructure"]

- name: Another Project
  role: Author
  timeline: "YYYY - Present"
  summary: Description of the project.
  tags: ["powershell"]
```

> **[i] NOTE:** Use `repo:` for public GitHub repos (automatically shows star count).
> Use `url:` instead of `repo:` for anything not on GitHub.

---

### File 11: data/en/sections/achievements.yaml

**Path:** `data\en\sections\achievements.yaml`
**Action:** Replace entire file. This disables the section.

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

**Path:** `data\en\sections\featured-posts.yaml`
**Action:** Replace entire file. This disables the section until you have real blog posts.

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

**Path:** `.github\workflows\deploy.yml`
**Action:** Create this file (and folder) — it does not exist in the forked repo.

This is the GitHub Actions workflow that builds and deploys your site automatically.

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

**Why these specific settings:**

| _Setting_ | _Why_ |
| :--- | :--- |
| `cache: false` on Go | Prevents a known `tar exit code 2` error in GitHub Actions |
| `node-version: "22"` | Node.js 20 is deprecated in Actions as of 2026 — 22 is current LTS |
| Hugo from `.deb` file | Pinned to exact version — more reliable than action-based install |
| `github_token` | Built-in GitHub token — no personal access token or SSH keys needed |
| `gh-pages` branch, same repo | Eliminates all cross-repo authentication complexity |

---

### File 14: .github/workflows/sync-upstream.yml

**Path:** `.github\workflows\sync-upstream.yml`
**Action:** Create this file.

This pulls in theme structure updates from the Toha example site every Monday.
It will not overwrite your content — only structural/template changes from the upstream.

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

> **[i] NOTE:** This workflow will fail on its first run — that is expected and harmless.
> It succeeds on subsequent weekly runs once the `gh-pages` branch exists.

---

## Part D — Day-to-Day Usage

### Writing a New Blog Post

```powershell
# 1. Go to your blog folder
cd "$env:USERPROFILE\Documents\GitHub\blog"

# 2. Start the local preview server
hugo server -w
```

Your browser will open (or navigate to) `http://localhost:1313/blog/` and show your site live.
It automatically refreshes whenever you save a file.

```powershell
# 3. Open a SECOND PowerShell window (don't close the first one — that's your server)
#    In the new window, go to the blog folder:
cd "$env:USERPROFILE\Documents\GitHub\blog"

# 4. Create a new post (replace post-title with your actual title, using hyphens not spaces)
hugo new posts\my-post-title\index.md

# 5. Open and edit the post
code content\posts\my-post-title\index.md
```

The generated file will look like this — edit it:

```yaml
---
title: "My Post Title"
date: 2026-03-22T00:00:00+05:30
draft: true
tags: ["tag1", "tag2"]
categories: ["Category Name"]
description: "Short summary shown in post listings and search results."
---

Write your post content here in Markdown.

## Section Heading

Regular paragraph text. **Bold text.** *Italic text.*

- List item one
- List item two

```python
# Code block with syntax highlighting
print("Hello World")
```
```

> **[!] IMPORTANT:** `draft: true` makes the post invisible on the live site.
> Change it to `draft: false` when the post is ready to publish.

### Publishing Your Post

```powershell
# Make sure you are in the blog folder
cd "$env:USERPROFILE\Documents\GitHub\blog"

git add .
git commit -m "Add post: my-post-title"
git push
```

Go to `https://github.com/YOUR-USERNAME/blog/actions` — watch the build turn green.
Your post will be live within 2–3 minutes.

### Adding Images to a Post

Place image files in the same folder as your post:

```text
content\posts\my-post-title\
    index.md
    screenshot.png
    diagram.jpg
```

Reference them in your Markdown:

```markdown
![Description of the image](screenshot.png)
```

### Updating Your Portfolio (skills, experience, etc.)

```powershell
# Edit the relevant file
code data\en\sections\experiences.yaml

# Save the file, then push
git add .
git commit -m "Update work experience"
git push
```

### Quick Command Reference

| _What you want to do_ | _Command_ |
| :--- | :--- |
| Start local preview | `hugo server -w` |
| Create a new blog post | `hugo new posts\post-name\index.md` |
| Test the build without starting server | `hugo --minify` |
| Save and publish all changes | `git add . && git commit -m "message" && git push` |
| Check build status | Go to GitHub → your blog repo → Actions tab |
| Update the Toha theme to latest version | `hugo mod tidy` |
| Stop the local server | Press `Ctrl+C` in the PowerShell running it |

---

## Setup Checklist

Work through this in order. Every item must be done before the site will work.

### Tools
- [ ] `winget --version` returns a version number
- [ ] `git --version` works
- [ ] `go version` works
- [ ] `node --version` works (v18+)
- [ ] `npm --version` works
- [ ] `hugo version` works AND shows `+extended`
- [ ] Git configured — `git config --global user.name` is set
- [ ] Git configured — `git config --global user.email` is set
- [ ] Git configured — `git config --global init.defaultBranch main` is set
- [ ] GitHub CLI installed — `gh --version` works
- [ ] GitHub CLI authenticated — `gh auth status` shows "Logged in to github.com"

### GitHub & Repo
- [ ] GitHub account created
- [ ] `toha-example-site` forked and renamed to `blog`
- [ ] Repo cloned to `Documents\GitHub\blog`
- [ ] Inside the `blog` folder in PowerShell

### Dependencies
- [ ] `hugo mod tidy` completed with no errors
- [ ] `hugo mod npm pack` completed — `package.json` exists in root
- [ ] `npm install` completed — `node_modules` folder exists

### Content Cleanup
- [ ] `data\bn` folder deleted
- [ ] All `*.bn.md` files deleted from `content\`
- [ ] Verified clean: `Get-ChildItem -Recurse -Filter "*.bn.md"` returns nothing

### Assets
- [ ] Profile photo copied to `assets\images\author\` (NOT `static\images\`)
- [ ] Photo filename matches the `image:` value in `data\en\author.yaml`
- [ ] All 13 skill icons downloaded to `assets\images\sections\skills\`
- [ ] Every `logo:` path in `skills.yaml` has a matching file confirmed

### File Changes (Part C)
- [ ] `hugo.yaml` — `baseURL`, `title`, `gitRepo` updated
- [ ] `go.mod` — module path changed to `github.com/YOUR-USERNAME/blog`
- [ ] `data\en\author.yaml` — your real name, photo filename, contacts
- [ ] `data\en\site.yaml` — your description, OpenGraph, copyright
- [ ] `data\en\sections\about.yaml` — your role, company, bio, social links, badges
- [ ] `data\en\sections\experiences.yaml` — your real work history
- [ ] `data\en\sections\skills.yaml` — your skills, all logos verified
- [ ] `data\en\sections\education.yaml` — your qualifications
- [ ] `data\en\sections\accomplishments.yaml` — your certifications
- [ ] `data\en\sections\projects.yaml` — your projects
- [ ] `data\en\sections\achievements.yaml` — disabled (`enable: false`)
- [ ] `data\en\sections\featured-posts.yaml` — disabled (`enable: false`)
- [ ] `.github\workflows\deploy.yml` — created
- [ ] `.github\workflows\sync-upstream.yml` — created

### Build & Deploy
- [ ] `hugo --minify` runs with no errors locally
- [ ] `hugo server -w` shows correct content at `http://localhost:1313/blog/`
- [ ] `git add . && git commit -m "..." && git push` completed
- [ ] GitHub Actions — Deploy Hugo Site shows green tick
- [ ] `gh-pages` branch exists in the repo
- [ ] GitHub Pages configured — source = `gh-pages` branch / `/(root)`
- [ ] Live site accessible at `https://YOUR-USERNAME.github.io/blog/`

---

## Troubleshooting

### Installation Issues

| _Problem_ | _Fix_ |
| :--- | :--- |
| `winget` not recognised | Install App Installer from the Microsoft Store |
| Tool not found after install | Close PowerShell completely and open a fresh window |
| `hugo version` missing `extended` | `winget uninstall Hugo.Hugo` then `winget install Hugo.Hugo.Extended` — reopen PowerShell |
| `gh auth login` opens no browser | Run `gh auth login --web` and follow the manual code entry |

### Dependency Issues

| _Problem_ | _Fix_ |
| :--- | :--- |
| `hugo mod tidy` fails with network error | Check internet connection; try again |
| `hugo mod tidy` fails: Go not found | Close and reopen PowerShell after Go install |
| `npm install` fails: no `package.json` | Run `hugo mod npm pack` first, then `npm install` |
| `npm install` fails: permission error | Run PowerShell as Administrator |

### Build Errors

| _Problem_ | _Fix_ |
| :--- | :--- |
| `nil pointer` error on author image | Photo is in `static\images\` not `assets\images\author\` — move it |
| `nil pointer` error on skill logo | A `logo:` path in `skills.yaml` has no matching file — add the icon file |
| Bootstrap / fonts not found locally | Run `hugo mod npm pack && npm install` |
| Build warns about Hugo version incompatibility | Local Hugo is old — `winget install Hugo.Hugo.Extended --force` then reopen PowerShell |
| Bengali content still causing issues | Re-run the cleanup in Step 7 |
| `YAML parse error` | YAML is space-sensitive — validate the file at https://yamlchecker.com |

### Git & Push Issues

| _Problem_ | _Fix_ |
| :--- | :--- |
| `git push` asks for username/password repeatedly | Run `gh auth login` to set up credential manager |
| `git push` rejected: remote has changes | Run `git pull --rebase` then `git push` |
| `git commit` fails: needs name/email | Run `git config --global user.name "Name"` and `git config --global user.email "email"` |
| `git commit` fails: branch is `master` not `main` | Run `git branch -m master main` then `git push -u origin main` |

### GitHub Actions Issues

| _Problem_ | _Fix_ |
| :--- | :--- |
| Build fails: `tar exit code 2` | Add `cache: false` under `setup-go` in `deploy.yml` |
| Build fails: Node.js 20 deprecated | Change `node-version: "20"` to `"22"` in `deploy.yml` |
| Deploy fails: exit code 128 | Using PAT or SSH instead of `github_token` — use `github_token: ${{ secrets.GITHUB_TOKEN }}` |
| `gh-pages` branch never created | Build failed before deploy step — fix build error first, re-push |
| Sync Upstream fails on first run | Normal — it will work on subsequent weekly runs |

### Site Display Issues

| _Problem_ | _Fix_ |
| :--- | :--- |
| Site shows 404 after enabling Pages | Wait 5–10 minutes; confirm Pages set to `gh-pages` / `/(root)` |
| Live site not updating after push | Check Actions tab — if build failed, site did not update |
| Local site has no CSS / looks unstyled | Run `hugo server -w --baseURL http://localhost:1313/blog/` |
| Site still shows "John Doe" | `data\en\author.yaml` or `hugo.yaml` title not updated |
| Language flag switcher visible | Set `flags: enable: false` in `hugo.yaml` |
| Profile photo not showing | Photo is in `static\` instead of `assets\images\author\` |

---

## Useful Links

| _Resource_ | _URL_ |
| :--- | :--- |
| Toha Live Demo | https://toha-example-site.netlify.app |
| Toha Documentation | https://toha-docs.netlify.app/posts |
| Toha GitHub | https://github.com/hugo-themes/toha |
| Toha Example Site Repo | https://github.com/hugo-themes/toha-example-site |
| Hugo Documentation | https://gohugo.io/documentation/ |
| Hugo Modules Guide | https://gohugo.io/hugo-modules/ |
| GitHub Pages Documentation | https://docs.github.com/en/pages |
| GitHub Actions Documentation | https://docs.github.com/en/actions |
| GitHub CLI Documentation | https://cli.github.com/manual/ |
| peaceiris/actions-gh-pages | https://github.com/peaceiris/actions-gh-pages |
| benc-uk icon collection | https://github.com/benc-uk/icon-collection |
| simple-icons | https://github.com/simple-icons/simple-icons |
| Font Awesome icon search | https://fontawesome.com/icons |
| YAML syntax checker | https://yamlchecker.com |
| Markdown guide | https://www.markdownguide.org |
| Credly (certification badges) | https://www.credly.com |

---

## Repo File Structure Reference

```text
blog/                                        ← Root of your Hugo project
│
├── .github/
│   └── workflows/
│       ├── deploy.yml                       ← Builds + deploys on every push to main
│       └── sync-upstream.yml               ← Weekly theme update check
│
├── assets/
│   └── images/
│       ├── author/
│       │   └── vibhu.png                   ← Profile photo — MUST be here
│       ├── sections/
│       │   └── skills/
│       │       └── *.svg / *.png           ← Skill icons — MUST be here
│       └── site/
│           ├── background.jpg              ← Homepage background image
│           ├── favicon.png                 ← Browser tab icon
│           ├── main-logo.png               ← Navbar logo
│           └── inverted-logo.png           ← Navbar logo (dark mode)
│
├── content/
│   └── posts/                              ← Your blog posts go here
│       └── post-name/
│           ├── index.md                    ← Post content
│           └── image.png                   ← Post images (alongside index.md)
│
├── data/
│   └── en/
│       ├── author.yaml                     ← Your name, photo, contacts, summary
│       ├── site.yaml                       ← Description, copyright, OpenGraph
│       └── sections/
│           ├── about.yaml
│           ├── accomplishments.yaml
│           ├── achievements.yaml
│           ├── education.yaml
│           ├── experiences.yaml
│           ├── featured-posts.yaml
│           ├── projects.yaml
│           ├── recent-posts.yaml
│           └── skills.yaml
│
├── static/
│   └── files/
│       └── resume.pdf                      ← Optional downloadable resume
│
├── go.mod                                  ← Hugo module — theme version pinned here
├── go.sum                                  ← Auto-generated, do not edit
├── hugo.yaml                               ← Main site configuration
├── package.hugo.json                       ← npm template (used by hugo mod npm pack)
└── package.json                            ← Generated by hugo mod npm pack — do not edit
```

---

_Hugo + Toha + GitHub Pages Guide — v4.0 — March 2026_
