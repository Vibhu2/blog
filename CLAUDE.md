# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio site for Vibhu Bhatnagar (pwsh.in), built with **Hugo Extended** + **Toha v4 theme**, deployed to GitHub Pages via GitHub Actions.

## Development Commands

```bash
# Install dependencies (run after cloning or updating theme)
hugo mod tidy && npm install

# Local dev server with live reload
hugo server -w                     # http://localhost:1313

# Production build
hugo --minify --gc

# Theme management
hugo mod get -u                    # Update theme to latest release
mise run update                    # mise shorthand for theme update
```

The `mise.toml` file defines all task shortcuts (`mise run build`, `mise run server`, etc.). Hugo requires the "Extended" variant for SCSS compilation.

## Architecture

### Content

- `content/posts/` — Blog articles. Each post is a directory with `index.md` + optional images.
- `content/notes/powershell/` — Knowledge base organized by topic (basics, active-directory, networking, etc.).
- Frontmatter fields used: `title`, `date`, `draft`, `description`, `tags`, `hero` (background image path).

### Portfolio Data

All portfolio/homepage sections are driven by YAML files in `data/en/sections/`:
- `experiences.yaml`, `skills.yaml`, `projects.yaml` — primary career data
- `about.yaml`, `education.yaml`, `achievements.yaml`, `accomplishments.yaml` — supporting sections
- `author.yaml`, `site.yaml` — global author and site metadata

### Theme Customization

The Toha theme is pulled via Go modules (`go.mod`). Overrides live in:
- `layouts/partials/scripts.html` — injects `VBBlogConfig` global and loads `dynamic-bg.js`
- `static/js/dynamic-bg.js` — custom dynamic background logic (daily-rotating Picsum photos, seed-based per-post images)

Hugo merges `layouts/` on top of the theme, so any file placed here overrides its theme counterpart at the same relative path.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on push to `main` and deploys to the `gh-pages` branch. The live site is served from that branch at `pwsh.in` (CNAME in `static/CNAME`).

## Dynamic Backgrounds

Posts get a consistent background derived from their slug (seed-based), homepage rotates daily. See `dynamic-backgrounds.md` for the full implementation notes and the list of curated Picsum image IDs.

## Notes on Repo State

`Vibhu2/` is an untracked nested Git repository (a local copy of the GitHub profile repo) that was never added as a submodule. It is safe to ignore; it has no effect on the blog build.
