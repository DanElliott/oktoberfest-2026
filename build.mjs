// Reads content.md and renders it into dist/index.html, using the static
// assets in assets/ (styles.css, app.js, manifest.json, sw.js, images/).
//
// Content model (see content.md for the authoring rules):
//   H1              -> page title
//   text before H2  -> hero tagline
//   "## "           -> a top-level section (nav item)
//   "### "          -> a card within that section (guest, tent, tip group...)
// Within a card, a bullet list where every item looks like "**Label:** value"
// is pulled out as a labelled meta grid; a lone image paragraph becomes the
// card's photo. Everything else renders as normal prose.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, "dist");

marked.setOptions({ gfm: true });

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function extractCard(tokens, titleFallback) {
  let image = null;
  let meta = null;
  const bodyTokens = [];

  for (const tok of tokens) {
    if (!image && tok.type === "paragraph" && tok.tokens?.length === 1 && tok.tokens[0].type === "image") {
      const img = tok.tokens[0];
      image = { src: img.href, alt: img.text || titleFallback };
      continue;
    }
    if (!meta && tok.type === "list" && tok.items.length) {
      const candidate = tok.items.map((item) => {
        const m = item.text.match(/^\*\*([^*:]+):\*\*\s*([\s\S]*)$/);
        return m ? { label: m[1].trim(), value: marked.parseInline(m[2].trim()) } : null;
      });
      if (candidate.every(Boolean)) {
        meta = candidate;
        continue;
      }
    }
    bodyTokens.push(tok);
  }

  return { image, meta, bodyHtml: marked.parser(bodyTokens) };
}

function renderCard(sub) {
  const { image, meta, bodyHtml } = extractCard(sub.tokens, sub.title);
  const imgHtml = image
    ? `<img class="card__photo" src="${image.src}" alt="${image.alt}" loading="lazy">`
    : "";
  const metaHtml = meta
    ? `<dl class="card__meta">${meta
        .map((m) => `<div class="card__meta-row"><dt>${m.label}</dt><dd>${m.value}</dd></div>`)
        .join("")}</dl>`
    : "";
  return `<article class="card">
    ${imgHtml}
    <div class="card__body">
      <h3 class="card__title">${sub.title}</h3>
      ${metaHtml}
      <div class="card__prose">${bodyHtml}</div>
    </div>
  </article>`;
}

function buildPage() {
  const raw = fs.readFileSync(path.join(root, "content.md"), "utf8");
  const tokens = marked.lexer(raw);

  let title = "Oktoberfest";
  let sawH1 = false;
  const introTokens = [];
  const sections = [];
  let currentSection = null;
  let currentSub = null;

  for (const tok of tokens) {
    if (tok.type === "heading" && tok.depth === 1 && !sawH1) {
      title = tok.text;
      sawH1 = true;
      continue;
    }
    if (tok.type === "heading" && tok.depth === 2) {
      currentSection = { name: tok.text, id: slugify(tok.text), subs: [], tokens: [] };
      sections.push(currentSection);
      currentSub = null;
      continue;
    }
    if (tok.type === "heading" && tok.depth === 3 && currentSection) {
      currentSub = { title: tok.text, tokens: [] };
      currentSection.subs.push(currentSub);
      continue;
    }
    if (!currentSection) {
      introTokens.push(tok);
    } else if (currentSub) {
      currentSub.tokens.push(tok);
    } else {
      currentSection.tokens.push(tok);
    }
  }

  const taglineHtml = marked.parser(introTokens.filter((t) => t.type !== "html"));

  const mapEmbed = `<p class="map-embed-label">Where Theresienwiese sits in the city:</p>
  <div class="map-embed">
    <iframe
      src="https://www.google.com/maps?q=Theresienwiese+Munich&output=embed"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      title="Map of Theresienwiese, Munich">
    </iframe>
  </div>`;

  const nav = sections
    .map((s) => `<a href="#${s.id}" class="nav__link">${s.name}</a>`)
    .join("\n");

  const sectionsHtml = sections
    .map((section) => {
      let inner;
      if (section.subs.length) {
        const introHtml = section.tokens.length ? marked.parser(section.tokens) : "";
        inner = `${introHtml}<div class="grid">${section.subs.map(renderCard).join("\n")}</div>`;
      } else {
        inner = marked.parser(section.tokens);
        inner = inner.replace("<!-- MAP_EMBED -->", mapEmbed);
      }
      return `<section id="${section.id}" class="section">
        <div class="section__inner">
          <h2 class="section__title">${section.name}</h2>
          ${inner}
        </div>
      </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="Itinerary, tent reservations, and know-before-you-go guide for our Oktoberfest 2026 trip to Munich.">
<meta name="theme-color" content="#12192c">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="images/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="images/icon.svg">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="header">
  <div class="header__inner">
    <a class="brand" href="#top">🍺 Wiesn 2026</a>
    <button class="nav__toggle" id="navToggle" aria-expanded="false" aria-controls="primaryNav" aria-label="Toggle navigation">
      <span></span><span></span><span></span>
    </button>
    <nav class="nav" id="primaryNav">
      ${nav}
    </nav>
  </div>
</header>

<main id="main">
  <section id="top" class="hero">
    <div class="hero__inner">
      <p class="hero__eyebrow">Munich &middot; September 23&ndash;25, 2026</p>
      <h1 class="hero__title">${title}</h1>
      <div class="hero__tagline">${taglineHtml}</div>
      <div class="hero__chips">
        <span class="chip">Sept 23 &mdash; Pschorr-Bräurosl</span>
        <span class="chip">Sept 24 &mdash; Hofbräu-Festzelt</span>
        <span class="chip">Sept 25 &mdash; Fischer-Vroni</span>
      </div>
    </div>
  </section>

  ${sectionsHtml}
</main>

<footer class="footer">
  <div class="footer__inner">
    <p>Made for the crew &middot; content lives in <code>content.md</code> &middot; Prost! 🍻</p>
    <p class="footer__offline" id="offlineNote" hidden>You're offline &mdash; showing the last saved version of this page.</p>
  </div>
</footer>

<script src="app.js"></script>
</body>
</html>`;
}

function main() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  fs.writeFileSync(path.join(distDir, "index.html"), buildPage());

  const assetsDir = path.join(root, "assets");
  for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
    const src = path.join(assetsDir, entry.name);
    const dest = path.join(distDir, entry.name);
    fs.cpSync(src, dest, { recursive: true });
  }

  console.log("Built dist/index.html");
}

main();
