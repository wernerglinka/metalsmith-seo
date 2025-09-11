# metalsmith-seo

Inspired by metalsmith-sitemap, the plugin provides SEO optimization for Metalsmith with metadata generation, social media tags, and structured data including Open Graph tags, Twitter Cards, JSON-LD structured data, and sitemap generation.

[![npm version][npm-badge]][npm-url]
[![metalsmith: plugin][metalsmith-badge]][metalsmith-url]
[![license: MIT][license-badge]][license-url]
[![Test Coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/metalsmith-seo/badge.svg)](https://snyk.io/test/npm/metalsmith-seo)

> This Metalsmith plugin is under active development. The API is stable, but breaking changes may occur before reaching 1.0.0.

## Features

**Core SEO Optimization:**

- **HTML Head Optimization** - Meta tags, canonical URLs, robots directives
- **Open Graph Tags** - Social media sharing with Facebook, LinkedIn, etc.
- **Twitter Cards** - Rich Twitter previews with automatic card type detection
- **JSON-LD Structured Data** - Article, Product, Organization, WebPage schemas
- **Sitemap Generation** - Complete sitemap.xml with auto-calculation of priority, changefreq, and lastmod
- **Robots.txt Management** - robots.txt generation and sitemap coordination

**Smart Automation:**

- **Content Analysis** - Auto-detects content type (article, product, page)
- **Metadata Derivation** - Single source feeds all formats (title → og:title, twitter:title, JSON-LD headline)
- **Fallback Chains** - Defaults from site.json, frontmatter, or content analysis
- **Site.json Integration** - Integration with existing Metalsmith site configuration

**Developer Experience:**

- **ESM/CommonJS Support** - Works in any Node.js environment
- **Minimal Configuration** - Works great with just a hostname
- **Comprehensive Testing** - 94% test coverage with real-world scenarios

## Installation

```bash
npm install metalsmith-seo
```

## Usage

### Quick Start

#### Minimal Setup

**ESM (ES Modules):**

```javascript
import Metalsmith from 'metalsmith';
import seo from 'metalsmith-seo';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(
    seo({
      hostname: 'https://example.com',
    })
  )
  .build();
```

**CommonJS:**

```javascript
const Metalsmith = require('metalsmith');
const seo = require('metalsmith-seo');

Metalsmith(__dirname)
  .use(
    seo({
      hostname: 'https://example.com',
    })
  )
  .build();
```

This simple configuration automatically generates:

- Complete HTML meta tags
- Open Graph tags for social sharing
- Twitter Card tags
- JSON-LD structured data
- sitemap.xml with intelligent priority/changefreq/lastmod values
- robots.txt (with sitemap reference)

#### With site.json Integration (Recommended)

Create `data/site.json`:

```json
{
  "name": "My Awesome Site",
  "title": "My Site - Welcome",
  "description": "The best site on the internet",
  "url": "https://example.com",
  "locale": "en_US",
  "twitter": "@mysite",
  "organization": {
    "name": "My Company",
    "logo": "https://example.com/logo.png"
  }
}
```

Then use the plugin:

```javascript
import Metalsmith from 'metalsmith';
import metadata from '@metalsmith/metadata';
import seo from 'metalsmith-seo';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(metadata({ site: 'data/site.json' }))
  .use(seo()) // Automatically uses site.json values!
  .build();
```

Or if your site metadata is nested differently:

```javascript
import Metalsmith from 'metalsmith';
import metadata from '@metalsmith/metadata';
import seo from 'metalsmith-seo';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// If metadata is at metadata().data.site instead of metadata().site
Metalsmith(__dirname)
  .use(
    metadata({
      data: {
        site: 'data/site.json',
      },
    })
  )
  .use(
    seo({
      metadataPath: 'data.site', // Tell plugin where to find site metadata
    })
  )
  .build();
```

### Frontmatter Integration

Add SEO data to any page. The plugin intelligently extracts metadata from multiple locations:

```yaml
---
title: 'My Blog Post'
date: 2024-01-15
seo:
  title: 'Advanced SEO Techniques - My Blog'
  description: 'Learn how to optimize your site for search engines'
  image: '/images/seo-guide.jpg'
  type: 'article'
---
```

#### Card Object Support

The plugin also extracts metadata from `card` objects (commonly used for blog post listings):

```yaml
---
layout: pages/sections.njk
draft: false

seo:
  title: 'Override Title for SEO' # Highest priority
  description: 'SEO-specific description'

card:
  title: 'Architecture Philosophy' # Used if not in seo object
  date: '2025-06-02'
  author:
    - Albert Einstein
    - Isaac Newton
  image: '/assets/images/sample9.jpg'
  excerpt: 'This starter embodies several key principles...'
---
```

**Metadata Extraction Priority:**

1. `seo` object (highest priority - explicit SEO overrides)
2. `card` object (for blog posts and content cards)
3. Root level properties
4. Configured defaults
5. Site-wide defaults (from site.json)
6. Auto-generated content

**Author Fallback Chain:**
When no author is specified in frontmatter, the plugin uses `siteOwner` from your site.json as a fallback, ensuring all content has proper attribution for SEO and social media.

**Result:** Comprehensive SEO markup automatically generated:

```html
<!-- Basic Meta -->
<title>Advanced SEO Techniques - My Blog</title>
<meta name="description" content="Learn how to optimize your site for search engines" />
<link rel="canonical" href="https://example.com/blog/advanced-seo" />

<!-- Open Graph -->
<meta property="og:title" content="Advanced SEO Techniques - My Blog" />
<meta property="og:type" content="article" />
<meta property="og:image" content="https://example.com/images/seo-guide.jpg" />

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Advanced SEO Techniques - My Blog" />

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Advanced SEO Techniques - My Blog",
    "image": "https://example.com/images/seo-guide.jpg",
    "datePublished": "2024-01-15",
    "author": { "@type": "Person", "name": "Site Author" }
  }
</script>
```

### Site.json Configuration

The plugin integrates seamlessly with your existing `site.json` configuration:

#### Complete site.json Example

```json
{
  "name": "My Awesome Site",
  "title": "My Site - Home Page",
  "description": "The default description for all pages",
  "url": "https://example.com",
  "locale": "en_US",

  "defaultImage": "/images/default-og.jpg",
  "twitter": "@mysite",
  "facebookAppId": "123456789",
  "siteOwner": "Your Name",

  "organization": {
    "name": "My Company",
    "logo": "https://example.com/logo.png",
    "sameAs": [
      "https://twitter.com/mycompany",
      "https://facebook.com/mycompany",
      "https://linkedin.com/company/mycompany"
    ],
    "contactPoint": {
      "telephone": "+1-555-123-4567",
      "contactType": "customer service"
    }
  },

  "social": {
    "twitterCreator": "@author",
    "locale": "en_US"
  },

  "sitemap": {
    "changefreq": "weekly",
    "priority": 0.8
  }
}
```

#### Site.json Property Mapping

| site.json Property | SEO Usage                | Example                     |
| ------------------ | ------------------------ | --------------------------- |
| `url`              | Hostname for all URLs    | `https://example.com`       |
| `name` / `title`   | Site name in Open Graph  | `og:site_name`              |
| `description`      | Default meta description | `<meta name="description">` |
| `defaultImage`     | Default social image     | `og:image`, `twitter:image` |
| `locale`           | Content language         | `og:locale`                 |
| `twitter`          | Twitter site handle      | `twitter:site`              |
| `facebookAppId`    | Facebook integration     | `fb:app_id`                 |
| `siteOwner`        | Default author fallback  | `<meta name="author">`      |
| `organization`     | Company info             | JSON-LD Organization schema |

#### Configuration Precedence

The plugin uses this priority order:

1. **Page frontmatter** (`seo` property) - Highest priority
2. **Plugin options** - Override site defaults
3. **site.json values** - Site-wide defaults
4. **Intelligent fallbacks** - Auto-generated from content

### Plugin Options

#### Basic Configuration

```javascript
.use(seo({
  hostname: 'https://example.com',  // Required if not in site.json

  // Global defaults for all pages
  defaults: {
    title: 'My Site',
    description: 'Default page description',
    socialImage: '/images/default-og.jpg'
  },

  // Social media configuration
  social: {
    siteName: 'My Site',
    twitterSite: '@mysite',
    twitterCreator: '@author',
    facebookAppId: '123456789',
    locale: 'en_US'
  },

  // JSON-LD structured data
  jsonLd: {
    organization: {
      name: 'My Company',
      logo: 'https://example.com/logo.png'
    }
  }
}))
```

#### Advanced Options

```javascript
.use(seo({
  hostname: 'https://example.com',

  // Customize where to find site metadata
  metadataPath: 'site',     // Default: 'site' (can be 'data.site' or any path)

  // Customize frontmatter property name
  seoProperty: 'seo',        // Default: 'seo'

  // Fallback property mappings
  fallbacks: {
    title: 'title',
    description: 'excerpt',
    image: 'featured_image',
    author: 'author.name'
  },

  // Sitemap configuration
  sitemap: {
    output: 'sitemap.xml',
    auto: true,              // Default: true (intelligent auto-calculation)
    changefreq: 'weekly',    // Override auto-calculation
    priority: 0.8,           // Override auto-calculation
    omitIndex: false
  },

  // Robots.txt configuration
  robots: {
    generateRobots: true,      // Generate robots.txt if none exists
    addSitemapReference: true, // Add sitemap reference to existing robots.txt
    disallowPaths: ['/admin/', '/private/'], // Paths to disallow
    userAgent: '*'             // User agent directive
  },

  // Performance options
  batchSize: 10,          // Process files in batches
  enableSitemap: true,    // Generate sitemap.xml
  enableRobots: true      // Generate/update robots.txt
}))
```

### SEO Property Reference

#### Core SEO Properties (Frontmatter)

```yaml
seo:
  # Essential properties (covers 90% of SEO needs)
  title: 'Page-specific title'
  description: 'Page-specific description'
  image: '/images/page-image.jpg'

  # Content type (auto-detected if not specified)
  type: 'article' # article, product, page, local-business

  # URL and indexing
  canonicalURL: 'https://example.com/custom-url'
  robots: 'index,follow' # Default: "index,follow"
  noIndex: false # Exclude from search engines

  # Dates (auto-detected from frontmatter if available)
  publishDate: '2024-01-15'
  modifiedDate: '2024-01-20'

  # Author and content metadata
  author: 'John Doe'
  keywords: ['seo', 'metalsmith', 'optimization']
```

#### Content Type Detection

The plugin automatically detects content type:

- **Article**: Has `date` and `author` or `tags`
- **Product**: Has `price` or `sku` properties
- **Local Business**: Has `address` or `phone`
- **Page**: Default fallback

### Output Examples

#### Blog Article

**Input:**

```yaml
---
title: 'Ultimate SEO Guide'
date: 2024-01-15
author: 'Jane Smith'
tags: ['seo', 'marketing']
seo:
  description: 'Complete guide to SEO optimization'
  image: '/images/seo-guide.jpg'
---
```

**Generated SEO:**

```html
<title>Ultimate SEO Guide</title>
<meta name="description" content="Complete guide to SEO optimization" />
<meta property="og:type" content="article" />
<meta property="og:article:author" content="Jane Smith" />
<meta property="og:article:published_time" content="2024-01-15" />
<meta property="og:article:tag" content="seo" />
<meta property="og:article:tag" content="marketing" />

<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Ultimate SEO Guide",
    "author": { "@type": "Person", "name": "Jane Smith" },
    "datePublished": "2024-01-15",
    "keywords": ["seo", "marketing"]
  }
</script>
```

#### Product Page

**Input:**

```yaml
---
title: 'Amazing Widget'
price: '$99.99'
seo:
  description: 'The best widget money can buy'
  image: '/images/widget.jpg'
  type: 'product'
---
```

**Generated SEO:**

```html
<title>Amazing Widget</title>
<meta property="og:type" content="product" />
<meta property="og:price:amount" content="99.99" />
<meta property="og:price:currency" content="USD" />

<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Amazing Widget",
    "offers": {
      "@type": "Offer",
      "price": "99.99",
      "priceCurrency": "USD"
    }
  }
</script>
```

### Robots.txt Management

The plugin intelligently handles robots.txt files:

#### Automatic Generation

If no robots.txt exists, the plugin generates a basic one:

```txt
User-agent: *
Disallow:

Sitemap: https://example.com/sitemap.xml
```

#### Smart Coordination with Existing Files

If robots.txt already exists, the plugin:

1. **Preserves existing content** - Never overwrites your custom directives
2. **Adds sitemap reference** - Automatically adds sitemap URL if missing
3. **Avoids duplicates** - Won't add multiple sitemap references

**Example - Before:**

```txt
User-agent: *
Disallow: /admin/
Disallow: /private/
```

**Example - After plugin processing:**

```txt
User-agent: *
Disallow: /admin/
Disallow: /private/

Sitemap: https://example.com/sitemap.xml
```

#### Custom Robots.txt Configuration

```javascript
.use(seo({
  hostname: 'https://example.com',
  robots: {
    generateRobots: true,      // Generate if missing (default: true)
    addSitemapReference: true, // Add sitemap to existing (default: true)
    disallowPaths: ['/admin/', '/api/'], // Paths to disallow
    userAgent: 'Googlebot'     // Specific user agent (default: '*')
  }
}))
```

**Generated output:**

```txt
User-agent: Googlebot
Disallow: /admin/
Disallow: /api/

Sitemap: https://example.com/sitemap.xml
```

#### Disabling Robots.txt Processing

```javascript
.use(seo({
  hostname: 'https://example.com',
  enableRobots: false  // Skip robots.txt processing entirely
}))
```

### Sitemap Generation

#### Intelligent Auto-Calculation (Default)

By default, the plugin automatically calculates optimal values for sitemap entries:

```javascript
.use(seo('https://example.com'))  // Auto-calculation enabled by default
```

**What gets auto-calculated:**

- **Priority** (0.1-1.0) based on:
  - File depth (shallower = higher priority)
  - Content type (services/products get higher priority)
  - Content age (recent updates get boost)
  - Content length (substantial content gets boost)

- **Change Frequency** based on:
  - Content type (`/blog/` = weekly, `/about` = yearly)
  - File modification patterns
  - Content freshness analysis

- **Last Modified** using:
  - Accurate file system modification dates
  - Frontmatter `date` or `lastmod` properties
  - Only included when dates are reliable

**Example auto-generated sitemap:**

```xml
<url>
  <loc>https://example.com/index.html</loc>
  <lastmod>2024-01-15</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://example.com/blog/seo-guide/index.html</loc>
  <lastmod>2024-01-10</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.6</priority>
</url>
```

#### Manual Override Options

Disable auto-calculation for minimal sitemaps:

```javascript
.use(seo({
  hostname: 'https://example.com',
  sitemap: {
    auto: false  // Disable auto-calculation (minimal sitemap)
  }
}))
```

Set global defaults (auto-calculation disabled):

```javascript
.use(seo({
  hostname: 'https://example.com',
  sitemap: {
    auto: false,
    changefreq: 'weekly',
    priority: 0.8
  }
}))
```

Per-page overrides in frontmatter:

```yaml
---
title: 'Important Page'
seo:
  priority: 1.0 # Override auto-calculated priority
  changefreq: 'daily' # Override auto-calculated frequency
  lastmod: '2024-01-15' # Override file modification date
---
```

#### Benefits of Auto-Calculation

**Better SEO Performance:**

- ✅ **Accurate lastmod dates** that Google trusts and uses
- ✅ **Realistic priorities** based on actual content importance
- ✅ **Smart change frequencies** based on content type patterns

**Developer Experience:**

- ✅ **Zero configuration** - works perfectly out of the box
- ✅ **No manual maintenance** - adapts as your site grows
- ✅ **Override capability** for special cases

### Migration Guide

#### From metalsmith-sitemap

This plugin includes all metalsmith-sitemap functionality:

**Before:**

```javascript
.use(sitemap({
  hostname: 'https://example.com',
  changefreq: 'weekly',
  priority: 0.8
}))
```

**After:**

```javascript
.use(seo({
  hostname: 'https://example.com',
  sitemap: {
    changefreq: 'weekly',
    priority: 0.8
  }
  // Now you also get SEO optimization!
}))
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## Attribution

The sitemap functionality in this plugin was inspired by and adapted from:

- [metalsmith-sitemap](https://github.com/ExtraHop/metalsmith-sitemap) by ExtraHop (MIT License)

## Related

- [@metalsmith/metadata](https://github.com/metalsmith/metadata) - For loading site.json
- [metalsmith](https://github.com/metalsmith/metalsmith) - The static site generator

---

[npm-badge]: https://img.shields.io/npm/v/metalsmith-seo.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-seo
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-seo
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-94%25-brightgreen
[coverage-url]: #test-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue
