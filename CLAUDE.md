# metalsmith-seo - Development Context

This file gives Claude operational context for working in this plugin. Plugin
behavior is documented in [README.md](README.md); don't duplicate it here.

## Project Overview

An all-in-one SEO plugin: XML sitemap, robots.txt, meta descriptions, Open
Graph / Twitter Card / JSON-LD structured data, canonical URLs, reading-time
calculation, and an `llms.txt` generator. Code is organized into
`src/processors/` (sitemap, robots, metadata-extractor, url-builder,
head-optimizer, auto-calculator, llms), `src/generators/` (meta, opengraph,
twitter, jsonld), and `src/utils/` (config-builder, escape, object-utils,
html-injector, xml-generator).

ESM-only Metalsmith plugin, published directly from `src/` (no build step),
targeting Node.js 22+. CommonJS consumers can still load it via Node 22's ESM
interop.

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with `metalsmith-plugin-mcp-server`.
When working on this plugin, AI assistants (Claude) MUST use the MCP server
tools rather than improvising equivalents.

### Essential MCP Commands

```bash
list-templates                          # See what's available
get-template plugin/CLAUDE.md           # Retrieve exact template content
get-template configs/biome.json
get-template configs/release-it.json
validate .                              # Plugin validation + recommendations
diff-template .                         # Drift check vs current scaffold
configs .                               # Generate config files
update-deps .                           # Dependency update
```

### CRITICAL RULES for AI Assistants

1. **Use MCP server templates verbatim** — never paraphrase or "simplify"
2. **Run `list-templates` before guessing** at template names
3. **When `validate` produces a recommendation, copy it exactly** — including
   the exact command suggested
4. **Ask the user** before modifying `.release-it.json`, `package.json`,
   `biome.json`, or any other `.json` / `.yml` / `.config.js` file
5. **Never set `npm.publish` to `true`** in `.release-it.json` — releases
   here are deliberately manual

## Plugin Development Rules

### Use Metalsmith's native methods

```javascript
// ❌                                    // ✅
require('debug')('')                     metalsmith.debug('')
require('minimatch')(file, pattern)      metalsmith.match(pattern, file)
process.env.NODE_ENV                     metalsmith.env('NODE_ENV')
path.join(dir, file)                     metalsmith.path(file)
```

### Never mock Metalsmith in tests

Use a real `Metalsmith` instance against a fixture directory. Metalsmith is in
`devDependencies` for exactly this reason. Mocking `metalsmith()`,
`metalsmith.match`, `metalsmith.debug`, `metalsmith.env`, `metalsmith.path`, or
plugin invocation has repeatedly hidden integration bugs. Pass `files` directly
to the plugin function `(files, metalsmith, done)`; never add files to
`metalsmith.metadata()`.

### Keep tests self-contained

Never export test-only helpers (reset functions, cache-clearers) from the
plugin. Production code exports only the plugin and legitimate public APIs;
tests create fresh plugin and Metalsmith instances instead.

### Metalsmith goes in devDependencies, never peerDependencies

The plugin code never imports Metalsmith — it receives the instance as a
parameter. Tests import Metalsmith directly.

## SEO-specific lessons (from the maintainer code review)

This plugin's original review surfaced domain bugs that general programming
review misses — preserve these fixes:

- **Reading time returns a number, not a string.** Don't return
  `` `${minutes} min read` `` (breaks i18n); return the numeric value and let
  templates format it.
- **Reading speed / description lengths / viewport are options, not
  hardcoded.** Expose `wordsPerMinute` etc. with sensible defaults.
- **Priority is not content length.** Auto-priority by content length made
  privacy policies outrank the homepage; sitemap priority must not use length
  as importance.
- **Hoist constant maps to module scope** (e.g. a type map) — never rebuild
  them per call.
- **Credit adaptations.** The sitemap work adapts an earlier plugin; keep the
  attribution.

## Pre-commit workflow

```bash
npm run lint       # Biome: lint + format with autofix
npm run format     # Format only
npm test           # node:test runner against src/
```

If any step fails, fix the underlying issue and re-run. Don't skip hooks.

## Release commands

```bash
npm run release:patch   # Bug fix (1.2.3 → 1.2.4)
npm run release:minor   # New feature (1.2.3 → 1.3.0)
npm run release:major   # Breaking change (1.2.3 → 2.0.0)
```

Releases use `./scripts/release.sh` (GitHub token via `gh auth token`); npm
publishing is intentionally manual.

## Before releasing: re-read the user-facing docs

Before any `npm run release:*`, read [README.md](README.md) end-to-end and fix
drift from `src/` — option names/defaults, the generated meta/OG/JSON-LD field
lists, and examples. If a release has no user-visible surface, say so rather
than inventing drift.

## File organization

```
/
├── src/
│   ├── index.js
│   ├── processors/           # sitemap, robots, metadata-extractor, url-builder,
│   │                         #   head-optimizer, auto-calculator, llms
│   ├── generators/           # meta, opengraph, twitter, jsonld
│   └── utils/                # config-builder, escape, object-utils,
│                             #   html-injector, xml-generator
├── test/
│   ├── *.test.js             # node:test against src/ (real Metalsmith)
│   └── fixtures/
└── .github/
    ├── workflows/            # test.yml, test-matrix.yml, claude-code.yml
    └── dependabot.yml
```

## Tooling

- **Biome** for lint + format (single tool, single config: `biome.json`)
- **node:test** + `node:assert/strict`; native coverage
- **Node >= 22** required. Published ESM-only directly from `src/` — there is
  **no build step, no `lib/`, no microbundle**. Tests run against `src/`.

## When validation flags something

`validate` returns `failed` (must-fix), `warnings`, and `recommendations`.
Implement recommendations as written. The validator catches real maintainer
feedback patterns (marketing language, hardcoded values that should be options,
CJS examples in ESM-only plugins, performance anti-patterns, English-only
output strings). Run `validate .` and copy the suggested fixes.
