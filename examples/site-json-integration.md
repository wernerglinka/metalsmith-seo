# Site.json Integration

The metalsmith-seo plugin seamlessly integrates with your existing `site.json` configuration, eliminating the need for duplicate configuration.

## How It Works

The plugin automatically reads SEO-related values from Metalsmith's metadata (typically loaded from `data/site.json`) and uses them as defaults, which can be overridden by plugin options.

## Example site.json

```json
// data/site.json
{
  "name": "My Awesome Site",
  "title": "My Awesome Site - Home",
  "description": "The default site description for all pages",
  "url": "https://example.com",
  "locale": "en_US",
  
  // Social media handles
  "twitter": "@mysite",
  "facebookAppId": "123456789",
  
  // Default images
  "defaultImage": "/images/default-og.jpg",
  "logo": "/images/logo.png",
  
  // Organization info for JSON-LD
  "organization": {
    "name": "My Company",
    "logo": "https://example.com/logo.png",
    "sameAs": [
      "https://twitter.com/mycompany",
      "https://facebook.com/mycompany",
      "https://linkedin.com/company/mycompany"
    ]
  },
  
  // Optional: Nested SEO configuration
  "social": {
    "twitterCreator": "@author"
  },
  
  // Optional: Sitemap defaults
  "sitemap": {
    "changefreq": "weekly",
    "priority": 0.8
  }
}
```

## Metalsmith Configuration

### Minimal Configuration

If your site.json contains the URL, the plugin needs minimal configuration:

```javascript
// metalsmith.js
import Metalsmith from 'metalsmith';
import collections from '@metalsmith/collections';
import metadata from '@metalsmith/metadata';
import seo from 'metalsmith-seo';

Metalsmith(__dirname)
  .metadata({
    site: require('./data/site.json')  // Load site configuration
  })
  // Or using @metalsmith/metadata plugin
  .use(metadata({
    site: 'data/site.json'
  }))
  .use(seo())  // That's it! URL comes from site.json
  .build();
```

### With Overrides

You can override any site.json values:

```javascript
.use(seo({
  // Override specific values from site.json
  defaults: {
    description: 'A different default description'
  },
  social: {
    twitterSite: '@different_handle'
  }
}))
```

## Configuration Precedence

The plugin uses this precedence order (highest to lowest):

1. **Page frontmatter** - Most specific
   ```yaml
   seo:
     title: "Page-specific title"
   ```

2. **Plugin options** - Overrides site defaults
   ```javascript
   .use(seo({
     defaults: { title: 'Override title' }
   }))
   ```

3. **site.json values** - Site-wide defaults
   ```json
   {
     "title": "Site default title"
   }
   ```

4. **Built-in defaults** - Fallback values

## Mapping Reference

Here's how site.json properties map to SEO features:

| site.json Property | SEO Usage |
|-------------------|-----------|
| `url` | hostname for all URLs |
| `name` or `title` | og:site_name |
| `description` | Default meta description |
| `locale` | og:locale |
| `twitter` | twitter:site |
| `defaultImage` or `socialImage` | Default og:image |
| `organization` | JSON-LD Organization schema |
| `organization.logo` | Logo in structured data |
| `facebookAppId` | fb:app_id |

## Benefits

1. **Single Source of Truth** - No duplicate configuration
2. **Automatic Integration** - Works with existing Metalsmith sites
3. **Override Flexibility** - Can override any value when needed
4. **Clean Configuration** - Plugin configuration stays minimal

## Advanced Example

For complex sites with multiple environments:

```javascript
// metalsmith.js
const env = process.env.NODE_ENV || 'development';
const siteConfig = require(`./data/site.${env}.json`);

Metalsmith(__dirname)
  .metadata({ site: siteConfig })
  .use(seo({
    // Only override what's specific to SEO
    enableSitemap: env === 'production',
    social: {
      // Add creator that might not be in site.json
      twitterCreator: '@content_author'
    }
  }))
  .build();
```

## Migration from Separate Config

If you previously had SEO configuration separate from site.json:

**Before:**
```javascript
.use(seo({
  hostname: 'https://example.com',
  defaults: {
    title: 'My Site',
    description: 'Site description'
  },
  social: {
    siteName: 'My Site',
    twitterSite: '@mysite'
  }
}))
```

**After:**
1. Move shared values to site.json
2. Simplify plugin configuration:

```javascript
.use(seo())  // Everything comes from site.json!
```

## Tips

1. **Keep SEO-specific options in the plugin** - Things like `enableHeadOptimization`, `batchSize`, etc.
2. **Put site-wide values in site.json** - URL, site name, social handles, etc.
3. **Use frontmatter for page-specific SEO** - The `seo` property in each page's frontmatter
4. **Validate with environment** - Different configurations for dev/staging/production