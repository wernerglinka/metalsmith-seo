# Theory of Operations

This document explains how `metalsmith-seo` functions and why it is built this way.

Read this once before making non-trivial changes to the plugin.

---

## 1. The job

A Metalsmith build hands us a `files` object — a dictionary of paths to
in-memory file records, each with `contents` (a Buffer) and arbitrary
frontmatter properties. Our job is to:

1. Read each HTML file's frontmatter and infer SEO metadata.
2. Inject `<title>`, `<meta>`, `<link rel="canonical">`, Open Graph,
   Twitter Card, and JSON-LD tags into the file's `<head>`.
3. Emit a `sitemap.xml`.
4. Emit or augment a `robots.txt`.
5. Optionally emit `llms.txt` and `llms-full.txt`.

We do all of this without making network requests, without mutating files
outside the build, and without requiring the user to write SEO-specific
code in their templates.

## 2. Architecture: three layers

```
src/
├── index.js              ← entry: orchestrates the pipeline
├── processors/           ← do work on the files object (side-effecting)
│   ├── head-optimizer.js     applies generated tags to each HTML file
│   ├── metadata-extractor.js reads frontmatter + HTML into a normalized form
│   ├── sitemap.js            builds & emits sitemap.xml
│   ├── robots.js             builds, augments, or emits robots.txt
│   ├── llms.js               builds & emits llms.txt / llms-full.txt
│   ├── url-builder.js        canonical URL construction
│   └── auto-calculator.js    sitemap priority/changefreq heuristics
├── generators/           ← pure functions: metadata → tag definitions
│   ├── meta-generator.js     <title>, description, robots, canonical
│   ├── opengraph-generator.js Open Graph
│   ├── twitter-generator.js  Twitter Card
│   └── jsonld-generator.js   schema.org JSON-LD
├── utils/                ← cross-cutting helpers, no SEO knowledge
│   ├── config-builder.js     merges plugin opts + site metadata + defaults
│   ├── html-injector.js      cheerio-backed <head> manipulation
│   ├── xml-generator.js      XML escaping/serialization for sitemap
│   ├── escape.js             HTML attribute escaping
│   └── object-utils.js       safe nested property access (`get`)
└── schemas/              ← schema.org type catalog used by jsonld-generator
```

The split is deliberate:

- **Generators are pure.** They take a metadata object and return tag
  descriptors (`{ name, content }` records for meta tags; JSON-LD returns
  `{ json, html }` — see 4.2). They don't read frontmatter, don't touch
  the `files` object, don't know about cheerio. This means we can
  unit-test every output variant without spinning up a Metalsmith build.

- **Processors are the side-effecting layer.** They read frontmatter, call
  generators, and write tags into HTML or new files. Each processor is
  responsible for one output artifact (the `<head>` of HTML files,
  `sitemap.xml`, `robots.txt`, `llms.txt`).

- **Utils are SEO-agnostic.** `html-injector.js` doesn't know what an Open
  Graph tag is — it just knows how to put a `<meta>` into a `<head>`. This
  keeps the cheerio dependency walled off to one module.

Layer-mixing is the main source of regressions in this codebase. If you
find yourself wanting a generator to read from `files`, that's a sign
the metadata extraction step needs to do more work upstream.

## 3. Data flow

For a single HTML file, the pipeline is:

```
file.contents (HTML buffer)
    │
    ▼
metadata-extractor.extractMetadata(file)
    │   reads frontmatter, parses <head> with cheerio,
    │   normalizes dates, resolves canonical URL,
    │   computes the SEO record for this file.
    ▼
{ title, description, canonical, image, locale, ... }
    │
    ├──► meta-generator           ─┐
    ├──► opengraph-generator       │  pure functions —
    ├──► twitter-generator         │  metadata in, tag descriptors out
    └──► jsonld-generator         ─┘
    │
    ▼
head-optimizer.injectSeoContent(html, metadata, generated)
    │   parses HTML once with cheerio, applies all tag descriptors,
    │   serializes back to a buffer.
    ▼
file.contents (HTML buffer with <head> rewritten)
```

In parallel with the per-file head pass:

```
processSitemap(files, ...) ─► sitemap.xml in files
processRobots(files, ...)  ─► robots.txt in files (or augments existing)
processLlms(files, ...)    ─► llms.txt / llms-full.txt in files
```

The orchestration in `index.js` runs head + sitemap together, then robots,
then llms, because robots needs to know the sitemap filename and llms
honors locale settings inherited from the site.

## 4. Design invariants

### 4.1 Cheerio over regex

Earlier versions used regex to find and rewrite `<head>` and `<script>`
tags. This worked for clean, well-formed HTML, but failed for the kind of
input static site generators actually produce: missing closing tags,
self-closing `<svg>`, `<script>` content with `</script>` substrings,
mixed-case tags. The `cheerio` parser is permissive in the same ways
browsers are, so we never need to reason about backtracking or partial
matches. The cost is one parse + serialize per file, which is small enough
relative to the rest of a Metalsmith build that we don't optimize it.

The contract: HTML transformations go through `utils/html-injector.js`. If
you find yourself reaching for a regex over file contents, stop and add a
helper to the injector instead.

### 4.2 JSON-LD escape safety

`JSON.stringify` does not escape `<`. A frontmatter value containing
`</script>` will, when serialized into a `<script type="application/ld+json">`
block, terminate the script element early — the classic XSS-via-JSON-LD
vector, where everything after the injected `</script>` is re-parsed by
the browser as HTML and can include attacker-controlled markup or
script. We guard against this in `jsonld-generator.js` by replacing `<`
with `\u003c` (and `-->` with `--\u003e` for the comment-close case)
after stringification. The JSON is semantically identical; the HTML is
safe.

This is why the generator returns both `{ json, html }`. Consumers that
need just the escaped JSON (e.g. the head injector wrapping it in its own
`<script>` element) take `json`; consumers that want the full tag take
`html`. The previous design returned only `html`, then the head optimizer
stripped the script tags and re-wrapped them — a useless round trip that
also coupled the generator's tag formatting to the injector.

### 4.3 Configuration merge order

There are four sources of configuration, in priority order:

```
plugin options  >  site metadata  >  deduced (from index.html)  >  defaults
```

`utils/config-builder.js` is the only place this merge happens. The
`buildConfig` function returns a single, fully-resolved config object that
the rest of the pipeline reads from. No processor should reach back into
`pluginOptions` or `metalsmith.metadata()` directly — if it needs a value,
it goes through the merged config.

The "deduced" tier exists for the common case of a small site with no
explicit metadata: we look at `index.html`'s frontmatter for a title and
description so that single-page sites work without any configuration
beyond a hostname.

### 4.4 Locale handling

`metalsmith-seo` doesn't translate anything. What it does do:

- Tag pages with the right `og:locale` and `<html lang>` hints.
- For `llms.txt`, emit one file per locale by default, with the site's
  _primary_ locale at the root and others under a `<locale>/` prefix.
  The locale-prefix decision flows from `social.locale` (single source
  of truth) so multilingual sites don't need to re-declare their primary
  language for each output type. Setting `defaultLocale: ''` disables
  root emission entirely (every locale gets a prefix).
- The locale matcher tolerates short and long forms (`en` vs `en_US`)
  because real-world frontmatter is inconsistent.

### 4.5 Error aggregation

`batchOptimizeHeads` processes files in parallel batches. When a single
file fails (malformed HTML the parser can't recover from, a missing
required field, etc.), the previous behavior was to `console.error` the
failure and continue — producing a build that _looked_ successful but had
broken or missing SEO output for some files.

The current behavior collects per-file errors across the entire pass and
throws once at the end. If exactly one file failed, we throw a plain
`Error` with `.cause` set to the original; if more than one failed, we
throw an `AggregateError`. This means CI catches problems on the first
build, and the user sees every failing file at once instead of fixing one
and discovering the next on rebuild.

`extractAllMetadata` follows the same pattern.

## 5. Deliberate non-features

These have come up and been declined. If you're tempted to add them,
re-read the reasoning first.

### 5.1 No content-length scoring

An earlier sitemap heuristic boosted priority based on word count. This
meant privacy policies and terms-of-service pages — which tend to be long
— scored higher than the homepage. The current `auto-calculator.js`
scores purely on URL hierarchy: `index.html` is 1.0, top-level pages are
0.8, each level of nesting drops the score, and section index pages get a
small boost. This is dumber but correct.

Documented in `auto-calculator.js` and the README's "What gets
auto-calculated" section.

### 5.2 No client-side runtime

`metalsmith-seo` ships zero JavaScript to the browser. The output is
plain HTML with static tags. This is non-negotiable: SEO that depends on
client-side execution is partially or fully invisible to crawlers that
don't run JS.

### 5.3 No markdown parsing

We assume HTML input. Plugins like `metalsmith-markdown` or
`@metalsmith/markdown` should run _before_ `metalsmith-seo`. Adding
markdown handling here would duplicate that ecosystem and force a parser
choice on users.

For `llms-full.txt` we _do_ extract plaintext from HTML — but with
cheerio (the same parser as everything else), not a markdown converter.

### 5.4 No mutation outside `<head>`

The head optimizer touches the `<head>` element only. It does not rewrite
links in the body, inject schema markup mid-page, or modify image tags.
Body content is the user's domain.

### 5.5 No fetching, no network

We never resolve external URLs, fetch og:image dimensions, or validate
sitemap entries against a live server. Builds are hermetic and run
offline. Users who want image dimensions in og:image:width tags pass them
in via frontmatter.

## 6. Testing notes

Tests live in `test/` and use the native `node:test` runner. The
philosophy:

- **Hermetic.** Most tests inject in-memory file objects rather than
  reading fixture directories on disk. The `inject(pages)` helper in
  `test/llms.test.js` is the pattern — copy it for new test files.
- **Real Metalsmith instances.** We never mock Metalsmith. The plugin's
  contract is with the real framework, and mocks have a way of agreeing
  with broken code.
- **Public surface.** Tests exercise the plugin's options and outputs,
  not internal helpers. Internal helpers get covered transitively.

The fixture-based tests in `test/index.test.js` exist for whole-build
regression checks. They are sensitive to whitespace in the generated
HTML; if you change the head injector's output format, expect to update
those fixtures.

## 7. Known sharp edges

- **Cheerio whitespace.** Cheerio preserves text-node whitespace, so a
  `<script>${json}</script>` with a leading newline in the JSON content
  produces `<script>\n{...}\n</script>` in the output. The head injector
  deliberately wraps JSON-LD with surrounding newlines to keep the
  rendered HTML readable in the browser source view.
- **Parallel head pass + sitemap.** The head optimizer mutates `files`
  while the sitemap processor reads from it. This is safe because the
  sitemap reads only frontmatter (which the head pass doesn't touch),
  but a future change that has the head pass write back into frontmatter
  would break that assumption. Keep them independent.
- **Locale defaulting from `social.locale`.** This is convenient but
  means changing `social.locale` retroactively changes which locale gets
  the root `llms.txt`. Document this loudly if you ever expose
  `defaultLocale` more prominently.
