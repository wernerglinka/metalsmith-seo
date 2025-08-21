/**
 * @fileoverview Generator for JSON-LD structured data.
 */

/**
 * @typedef {Object} JsonLdResult
 * @property {Array<Object>} schemas - Array of JSON-LD schema objects
 * @property {string} html - HTML script tag containing JSON-LD
 */

/**
 * Generates JSON-LD structured data from extracted metadata
 * @param {Object} metadata - Extracted metadata object
 * @param {Object} siteConfig - Site-wide configuration
 * @param {string} filePath - File path for context
 * @returns {JsonLdResult} Generated JSON-LD schemas
 */
export function generateJsonLd(metadata, siteConfig = {}, filePath = '') {
  const schemas = [];

  // Generate schemas based on content type and configuration
  generateWebSiteSchema(schemas, siteConfig);
  generateContentSchema(schemas, metadata, siteConfig);
  generateBreadcrumbSchema(schemas, filePath, siteConfig);
  generateOrganizationSchema(schemas, siteConfig);

  // Convert schemas to JSON-LD context
  const jsonLdSchemas = schemas.map(schema => ({
    "@context": "https://schema.org",
    ...schema
  }));

  // Generate HTML script tag
  const html = generateJsonLdHtml(jsonLdSchemas);

  return {
    schemas: jsonLdSchemas,
    html
  };
}

/**
 * Generates WebSite schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} siteConfig - Site configuration
 */
function generateWebSiteSchema(schemas, siteConfig) {
  if (!siteConfig.name && !siteConfig.siteName) {
    return;
  }

  const webSiteSchema = {
    "@type": "WebSite",
    "name": siteConfig.siteName || siteConfig.name,
    "url": siteConfig.hostname || siteConfig.url
  };

  // Add search action if configured
  if (siteConfig.searchUrl) {
    webSiteSchema.potentialAction = {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteConfig.searchUrl}?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    };
  }

  // Add alternate name
  if (siteConfig.alternateNames) {
    webSiteSchema.alternateName = Array.isArray(siteConfig.alternateNames) 
      ? siteConfig.alternateNames 
      : [siteConfig.alternateNames];
  }

  schemas.push(webSiteSchema);
}

/**
 * Generates content-specific schema based on type
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateContentSchema(schemas, metadata, siteConfig) {
  switch (metadata.type) {
    case 'article':
      generateArticleSchema(schemas, metadata, siteConfig);
      break;
    case 'product':
      generateProductSchema(schemas, metadata, siteConfig);
      break;
    case 'local-business':
      generateLocalBusinessSchema(schemas, metadata, siteConfig);
      break;
    case 'page':
    default:
      generateWebPageSchema(schemas, metadata, siteConfig);
      break;
  }
}

/**
 * Generates Article schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateArticleSchema(schemas, metadata, siteConfig) {
  const articleSchema = {
    "@type": "Article",
    "headline": metadata.title,
    "url": metadata.canonicalURL
  };

  // Description
  if (metadata.description) {
    articleSchema.description = metadata.description;
  }

  // Image
  if (metadata.image) {
    articleSchema.image = {
      "@type": "ImageObject",
      "url": metadata.image
    };
  }

  // Dates
  if (metadata.publishDate) {
    articleSchema.datePublished = new Date(metadata.publishDate).toISOString();
  }
  
  if (metadata.modifiedDate) {
    articleSchema.dateModified = new Date(metadata.modifiedDate).toISOString();
  }

  // Author
  if (metadata.author) {
    articleSchema.author = {
      "@type": "Person",
      "name": metadata.author
    };
  }

  // Publisher (organization)
  if (siteConfig.organization) {
    articleSchema.publisher = generatePublisherSchema(siteConfig.organization);
  }

  // Article section
  if (metadata.section) {
    articleSchema.articleSection = metadata.section;
  }

  // Keywords
  if (metadata.keywords && metadata.keywords.length > 0) {
    articleSchema.keywords = metadata.keywords;
  }

  // Word count
  if (metadata.wordCount) {
    articleSchema.wordCount = metadata.wordCount;
  }

  // Reading time
  if (metadata.readingTime) {
    articleSchema.timeRequired = metadata.readingTime;
  }

  schemas.push(articleSchema);
}

/**
 * Generates Product schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateProductSchema(schemas, metadata, siteConfig) {
  const productSchema = {
    "@type": "Product",
    "name": metadata.title,
    "description": metadata.description
  };

  // Image
  if (metadata.image) {
    productSchema.image = metadata.image;
  }

  // Brand
  if (metadata.brand) {
    productSchema.brand = {
      "@type": "Brand",
      "name": metadata.brand
    };
  }

  // SKU
  if (metadata.sku) {
    productSchema.sku = metadata.sku;
  }

  // Offers
  if (metadata.price) {
    productSchema.offers = {
      "@type": "Offer",
      "price": metadata.price,
      "priceCurrency": metadata.currency || "USD",
      "availability": `https://schema.org/${metadata.availability || "InStock"}`,
      "condition": `https://schema.org/${metadata.condition || "NewCondition"}`
    };
  }

  // Aggregate rating
  if (metadata.rating) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": metadata.rating,
      "ratingCount": metadata.ratingCount || 1
    };
  }

  schemas.push(productSchema);
}

/**
 * Generates LocalBusiness schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateLocalBusinessSchema(schemas, metadata, siteConfig) {
  const businessSchema = {
    "@type": "LocalBusiness",
    "name": metadata.title || siteConfig.businessName,
    "description": metadata.description
  };

  // Address
  if (metadata.address || siteConfig.address) {
    const address = metadata.address || siteConfig.address;
    businessSchema.address = {
      "@type": "PostalAddress",
      "streetAddress": address.streetAddress,
      "addressLocality": address.city,
      "addressRegion": address.state,
      "postalCode": address.postalCode,
      "addressCountry": address.country
    };
  }

  // Geographic coordinates
  if (metadata.latitude && metadata.longitude) {
    businessSchema.geo = {
      "@type": "GeoCoordinates",
      "latitude": metadata.latitude,
      "longitude": metadata.longitude
    };
  }

  // Contact information
  if (metadata.phone || siteConfig.phone) {
    businessSchema.telephone = metadata.phone || siteConfig.phone;
  }

  if (metadata.email || siteConfig.email) {
    businessSchema.email = metadata.email || siteConfig.email;
  }

  // Opening hours
  if (metadata.openingHours || siteConfig.openingHours) {
    businessSchema.openingHours = metadata.openingHours || siteConfig.openingHours;
  }

  // Image
  if (metadata.image) {
    businessSchema.image = metadata.image;
  }

  schemas.push(businessSchema);
}

/**
 * Generates WebPage schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateWebPageSchema(schemas, metadata, siteConfig) {
  const webPageSchema = {
    "@type": "WebPage",
    "name": metadata.title,
    "url": metadata.canonicalURL
  };

  if (metadata.description) {
    webPageSchema.description = metadata.description;
  }

  if (metadata.image) {
    webPageSchema.image = metadata.image;
  }

  // Part of website
  if (siteConfig.siteName) {
    webPageSchema.isPartOf = {
      "@type": "WebSite",
      "name": siteConfig.siteName,
      "url": siteConfig.hostname
    };
  }

  schemas.push(webPageSchema);
}

/**
 * Generates BreadcrumbList schema
 * @param {Array} schemas - Schemas array to modify
 * @param {string} filePath - File path
 * @param {Object} siteConfig - Site configuration
 */
function generateBreadcrumbSchema(schemas, filePath, siteConfig) {
  if (!filePath || !siteConfig.hostname) {
    return;
  }

  const pathSegments = filePath
    .replace(/\.html?$/, '')
    .replace(/\/index$/, '')
    .split('/')
    .filter(segment => segment.length > 0);

  if (pathSegments.length === 0) {
    return;
  }

  const breadcrumbItems = [];
  let currentPath = '';

  // Add home
  breadcrumbItems.push({
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": siteConfig.hostname
  });

  // Add path segments
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const name = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": index + 2,
      "name": name,
      "item": `${siteConfig.hostname}${currentPath}`
    });
  });

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  };

  schemas.push(breadcrumbSchema);
}

/**
 * Generates Organization schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} siteConfig - Site configuration
 */
function generateOrganizationSchema(schemas, siteConfig) {
  if (!siteConfig.organization) {
    return;
  }

  const org = siteConfig.organization;
  const organizationSchema = {
    "@type": "Organization",
    "name": org.name,
    "url": org.url || siteConfig.hostname
  };

  if (org.logo) {
    organizationSchema.logo = {
      "@type": "ImageObject",
      "url": org.logo
    };
  }

  if (org.description) {
    organizationSchema.description = org.description;
  }

  if (org.sameAs) {
    organizationSchema.sameAs = Array.isArray(org.sameAs) ? org.sameAs : [org.sameAs];
  }

  if (org.contactPoint) {
    organizationSchema.contactPoint = {
      "@type": "ContactPoint",
      "telephone": org.contactPoint.telephone,
      "contactType": org.contactPoint.contactType || "customer service"
    };
  }

  schemas.push(organizationSchema);
}

/**
 * Generates publisher schema for articles
 * @param {Object} organization - Organization configuration
 * @returns {Object} Publisher schema
 */
function generatePublisherSchema(organization) {
  const publisher = {
    "@type": "Organization",
    "name": organization.name
  };

  if (organization.logo) {
    publisher.logo = {
      "@type": "ImageObject",
      "url": organization.logo
    };
  }

  return publisher;
}

/**
 * Converts JSON-LD schemas to HTML script tag
 * @param {Array} schemas - Array of JSON-LD schemas
 * @returns {string} HTML script tag
 */
function generateJsonLdHtml(schemas) {
  if (schemas.length === 0) {
    return '';
  }

  // If multiple schemas, use @graph
  const jsonLd = schemas.length === 1 
    ? schemas[0]
    : {
        "@context": "https://schema.org",
        "@graph": schemas.map(schema => {
          const { "@context": context, ...rest } = schema;
          return rest;
        })
      };

  const jsonString = JSON.stringify(jsonLd, null, 2);
  return `<script type="application/ld+json">\n${jsonString}\n</script>`;
}

/**
 * Validates a JSON-LD schema object
 * @param {Object} schema - Schema to validate
 * @returns {boolean} Whether the schema is valid
 */
export function validateJsonLd(schema) {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Must have @type
  if (!schema['@type']) {
    return false;
  }

  // Basic validation for common required properties
  switch (schema['@type']) {
    case 'Article':
      return !!(schema.headline && schema.author);
    case 'Product':
      return !!(schema.name);
    case 'Organization':
      return !!(schema.name);
    case 'LocalBusiness':
      return !!(schema.name);
    case 'WebSite':
      return !!(schema.name && schema.url);
    case 'WebPage':
      return !!(schema.name && schema.url);
    default:
      return true; // Allow unknown types
  }
}