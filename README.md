# Oktoberfest 2026 Trip Guide

A single-page itinerary, tent guide, and know-before-you-go site for a three-day
Oktoberfest trip to Munich. All content lives in [`content.md`](content.md) —
edit that file, not the generated HTML.

## Editing the content

Open [`content.md`](content.md). Every `[PLACEHOLDER]` marker is mock data —
replace it once the real details (guest names, addresses, confirmation numbers,
photos) are confirmed. The comment block near the top of the file explains the
heading rules the build script relies on:

- `## ` starts a new top-level section (becomes a nav item).
- `### ` starts a card within that section (a guest, a tent, a tip category…).
- A bullet list where every line looks like `**Label:** value` becomes a neat
  label/value grid on the card.
- A lone `![alt](images/file.svg)` image becomes the card's photo.
- Everything else is normal Markdown and renders as prose.

To add a real photo: drop the file into `assets/images/` and reference it as
`images/your-file.jpg` from `content.md`.

## Local development

```bash
npm install
npm run build   # generates dist/ from content.md + assets/
npm run serve   # serves dist/ locally so you can preview it
```

Re-run `npm run build` after every edit to `content.md` or `assets/`.

## Deploying to GitHub Pages

The included workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
builds and deploys automatically on every push to `main`. One-time setup:

1. Push this repo to GitHub.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab) —
   the site will be published at `https://<user>.github.io/<repo>/`.

## Notes on the map

The site links to the City of Munich's official, annually updated grounds map
(Übersichtsplan) rather than embedding a copy of it, since that map is
copyrighted and re-issued each year. Swap the link in the "Festival Grounds
Map" section of `content.md` for the direct 2026 PDF once it's released, and
feel free to drop a screenshot into `assets/images/` if you'd rather show it
inline.

## Progressive / offline support

The site is installable (Add to Home Screen) and caches its own shell via a
service worker ([`assets/sw.js`](assets/sw.js)), so the itinerary, tent info,
and tips still load with spotty signal inside a tent. Bump `CACHE_NAME` in
`sw.js` if you make a content change you want guests' phones to pick up
immediately rather than on the next online visit.
