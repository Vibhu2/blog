# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio site for Vibhu Bhatnagar (pwsh.in), built with **Hugo Extended** + **Toha v4 theme**, deployed to GitHub Pages via GitHub Actions.

## Development Commands

```bash
# Full install (run after cloning or after theme update)
mise run install          # hugo mod tidy + hugo mod npm pack + npm install

# Local dev server with live reload — http://localhost:1313
mise run server           # or: hugo server -w

# Production build
mise run build            # or: hugo --minify --gc

# Theme management
mise run update           # update theme to latest release (hugo mod get -u)
mise run update-to-main   # update theme to main branch HEAD
mise run fix-security     # npm audit fix --force
```

All task shortcuts are defined in `mise.toml`. Hugo **must** be the Extended variant (required for SCSS compilation).

Full install sequence after cloning: `hugo mod tidy && hugo mod npm pack && npm install`

## Architecture

### Layout Override System

Hugo merges `layouts/` on top of the theme — any file here shadows its theme counterpart at the same relative path. Current overrides:

| File | What it does |
|------|-------------|
| `layouts/partials/scripts.html` | Injects `window.VBBlogConfig` then loads `dynamic-bg.js` after Toha's script bundle |
| `layouts/partials/extend-head.html` | Canonical URL, Open Graph, Twitter Card, JSON-LD (WebSite + TechArticle) |
| `layouts/partials/sections/about.html` | Renders `.tagline` from `about.yaml` as a styled callout between author name and designation |
| `layouts/posts/list.html` | Replaces Toha's sidebar with a dynamic list built from `site.RegularPages` filtered to the posts section |
| `layouts/robots.txt` | Custom robots file |

### Dynamic Backgrounds (`static/js/dynamic-bg.js`)

Reads `window.VBBlogConfig` (set by `scripts.html`) to determine page context, then applies Picsum Photos images with no API key needed:

- **Homepage** — random pick from a curated list of 25 Picsum IDs → `#homePageBackgroundImageDivStyled`
- **Post pages** — seed derived from URL slug for a consistent per-post image → `#hero-area`
- **Card thumbnails** (listing/tag/taxonomy pages) — slug-seeded thumbnails replacing `img.card-img-top` src

The curated ID list for homepage rotation lives in `dynamic-bg.js`. A post's `hero` frontmatter field bypasses the dynamic background entirely.

### Portfolio Data

All homepage sections are data-driven from `data/en/sections/`:
- `experiences.yaml`, `skills.yaml`, `projects.yaml` — primary career sections
- `about.yaml` — designation, social links, tagline (rendered by the custom `about.html` partial)
- `education.yaml`, `achievements.yaml`, `accomplishments.yaml`, `publications.yaml` — supporting sections
- `author.yaml`, `site.yaml` — global author metadata and site copyright/OG config

### Content Structure

- `content/posts/` — each post is a directory (`post-slug/index.md` + optional images)
- `content/notes/powershell/` — knowledge-base pages by topic
- Post frontmatter: `title`, `date`, `draft`, `description`, `tags`, `categories`, `hero` (optional image path override)

### Theme & Dependencies

- Theme pulled via Go modules (`go.mod`) — pinned to a specific Toha v4 commit
- To develop against a local theme clone, uncomment the `replace` directive in `go.mod`
- npm packages are declared in `package.json` and installed via `hugo mod npm pack` + `npm install` (Hugo mounts `node_modules` into the build)

### Deployment

`.github/workflows/deploy.yml` triggers on push to `main`: installs Hugo Extended 0.146.0, runs the full install + build, then pushes the output to the `gh-pages` branch via `peaceiris/actions-gh-pages`. The live domain `pwsh.in` is configured via `static/CNAME`.

## Notes on Repo State

`Vibhu2/` is an untracked nested Git repository (a local copy of the GitHub profile repo). It is safe to ignore and has no effect on the blog build.
