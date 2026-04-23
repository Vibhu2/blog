---
Title:       "Dynamic Backgrounds — Implementation Notes"
Version:     "1.2"
Date:        "2026-04-23"
Author:      "VB + Claude"
Doc_status:  "Final"
Environment: "Hugo + Toha v4 — pwsh.in"
---

# Dynamic Backgrounds — Implementation Notes

Replaces the static dark-green site background and default post hero images with dynamic photos from [Picsum Photos](https://picsum.photos) — no API key, no attribution required.

---

## Behaviour

| Location | Behaviour | Source |
| :--- | :--- | :--- |
| Homepage | Rotates daily through a curated list of photo IDs | Picsum `/id/{ID}/1920/1080` |
| Post hero | Same unique photo per post on every visit | Picsum `/seed/{slug}/1920/1080` |
| Post listing cards | Same unique thumbnail per post on every visit | Picsum `/seed/{slug}/800/450` |

---

## Files Changed

| File | Type | Purpose |
| :--- | :---: | :--- |
| `layouts/partials/scripts.html` | New | Injects `VBBlogConfig` and loads `dynamic-bg.js` on every page |
| `static/js/dynamic-bg.js` | New | All background replacement logic |

### `layouts/partials/scripts.html`

Overrides Toha's own `scripts.html` via Hugo's theme override system. Runs on every page.

```html
{{- partial "helpers/script-bundle.html" -}}

<script>
window.VBBlogConfig = {
  isHome: {{ .IsHome }},
  isPost: {{ eq .Type "posts" | safeJS }}
};
</script>
<script src="/js/dynamic-bg.js" defer></script>
```

> **[i] INFO:** `| safeJS` is required — without it Hugo's contextual JS escaper double-encodes values inside `<script>` blocks.

---

## How to Change Homepage Images

All homepage image control lives in one place inside `static/js/dynamic-bg.js`.

Find this block:

```javascript
var curatedIds = [
  10,   /* dark forest          */
  26,   /* moody mountain       */
  42,   /* dark abstract        */
  64,   /* night cityscape      */
  103,  /* atmospheric nature   */
  110,  /* architectural detail */
  127,  /* dark minimal         */
  143,  /* misty landscape      */
  164,  /* dark moody           */
  177,  /* urban geometry       */
  200,  /* abstract dark        */
  240,  /* geometric structure  */
  338,  /* dark corridor        */
  381,  /* industrial           */
  447   /* night architecture   */
];
```

### Preview any image before adding it

Paste this into your browser — swap the number to any ID you want to try:

```
https://picsum.photos/id/10/1920/1080
```

Browse the full Picsum library at **https://picsum.photos/images** — each entry shows its ID.

### Add or remove images

Just edit the array — add IDs, remove IDs, reorder freely. The rotation picks up automatically.

```javascript
var curatedIds = [10, 26, 42, 500, 600, 700]; /* add or remove any IDs */
```

### Change the rotation mode

The current line controlling rotation:

```javascript
var dayIndex = Math.floor(Date.now() / 86400000) % curatedIds.length;
```

**To rotate daily** *(current — same image all day, new one at midnight UTC):*
```javascript
var dayIndex = Math.floor(Date.now() / 86400000) % curatedIds.length;
var homeUrl  = PICSUM + '/id/' + curatedIds[dayIndex] + '/1920/1080';
```

**To pick a random image on every page load:**
```javascript
var dayIndex = Math.floor(Math.random() * curatedIds.length);
var homeUrl  = PICSUM + '/id/' + curatedIds[dayIndex] + '/1920/1080';
```

**To rotate weekly** *(same image for 7 days):*
```javascript
var dayIndex = Math.floor(Date.now() / (86400000 * 7)) % curatedIds.length;
var homeUrl  = PICSUM + '/id/' + curatedIds[dayIndex] + '/1920/1080';
```

> **[i] INFO:** `86400000` = milliseconds in one day. Multiply it to slow the rotation.

---

## Post Hero Background

Each blog post gets a unique, consistent hero image driven by its URL slug as the Picsum seed. The same post always shows the same photo — it won't change on refresh.

**How it works:** The script reads `window.location.pathname`, strips the trailing slash, and takes the last segment as the seed:

```
/posts/enable-vbpsremoting/  →  seed: enable-vbpsremoting
URL: https://picsum.photos/seed/enable-vbpsremoting/1920/1080
```

**Target element:** `#hero-area` — Toha renders this as a `<div>` with an inline `style='background-image: url(...)'`. The JS overrides it directly.

**To change the image size** (default `1920/1080`), find this line in `dynamic-bg.js`:

```javascript
var postUrl = PICSUM + '/seed/' + slug + '/1920/1080';
```

Swap `1920/1080` for any `{width}/{height}` Picsum supports.

**To use a fixed image for a specific post** instead of the auto-generated one, add a `hero` field to that post's frontmatter — Toha will use it and the JS won't override it (the element will still exist but the frontmatter hero takes visual priority via build-time rendering):

```yaml
hero: hero.jpg   # place hero.jpg in the same folder as index.md
```

---

## Post Listing Card Thumbnails

The posts listing page (`/posts/`) shows preview cards. Each card thumbnail was previously a static default illustration. The script replaces every `img.card-img-top` with a seeded Picsum image using the post slug — so each card gets its own unique photo, consistent across visits.

**How it works:** The script finds all card thumbnail `<img>` elements, reads the slug from the parent `<a href>` link, and swaps the `src`:

```javascript
/* HTML structure Toha generates for each card: */
<a href="/posts/enable-vbpsremoting/" class="post-card-link">
  <img class="card-img-top" src="/images/default-hero.jpg">
</a>

/* JS extracts slug from href, builds Picsum URL: */
img.src = 'https://picsum.photos/seed/enable-vbpsremoting/800/450';
```

**Page detection:** The script uses the body class `kind-section` which Hugo automatically sets on all list/section pages — no Hugo template change needed.

**To change thumbnail dimensions** (default `800/450`), find this line in `dynamic-bg.js`:

```javascript
img.src = PICSUM + '/seed/' + cardSlug + '/800/450';
```

---

## DOM Targets — Quick Reference

| Element | Selector | Set by Toha via | JS override method |
| :--- | :--- | :--- | :--- |
| Site background | `#homePageBackgroundImageDivStyled` | `<style>` block | `el.style.backgroundImage` |
| Post hero | `#hero-area` | inline `style` attribute | `el.style.backgroundImage` |
| Card thumbnails | `img.card-img-top` | `<img src>` attribute | `img.src` |

---

## How Theme Override Works

Hugo resolves partials in this order:

1. Site `layouts/partials/` ← our override lives here
2. Theme module `layouts/partials/`

By creating `layouts/partials/scripts.html`, Hugo uses ours instead of Toha's. Our version still calls `{{ partial "helpers/script-bundle.html" }}` (not overridden), so the theme's JS bundle loads normally — we just append our script after it.

---

## Troubleshooting

**Background not changing — check console first:**

Open browser DevTools → Console. The script logs `[dynamic-bg]` warnings if any element is not found or an image fails to load.

Verify `VBBlogConfig` is being injected:
```javascript
/* Run in browser console */
console.log(window.VBBlogConfig);
/* Expected: { isHome: true/false, isPost: true/false } */
```

**Hugo server not picking up JS changes:**

`hugo server -w` watches for file changes but the browser may cache the old JS. Hard-refresh with `Ctrl+Shift+R`.

---

## Change History

| Version | Date | Change |
| :---: | :--- | :--- |
| v1.0 | 2026-04-23 | Initial implementation — Unsplash API (abandoned due to contextual escaping bug and attribution requirements) |
| v1.1 | 2026-04-23 | Switched to Picsum Photos. Homepage: curated ID list with daily rotation. Posts: seed-based. Cards: seed-based thumbnails on listing page |
| v1.2 | 2026-04-23 | Added full documentation for post hero and card thumbnail sections — how they work, how to customise dimensions, and how to override per-post with frontmatter |

---

*dynamic-backgrounds.md v1.2 — 2026-04-23*
