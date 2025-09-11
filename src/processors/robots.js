/**
 * @fileoverview Robots.txt generation and coordination for Metalsmith SEO
 * Handles existing robots.txt files intelligently and generates basic ones when needed
 */

/**
 * @typedef {Object} RobotsOptions
 * @property {string} hostname - Base hostname for sitemap URL
 * @property {string} [sitemapFile='sitemap.xml'] - Name of the sitemap file to reference
 * @property {boolean} [generateRobots=true] - Whether to generate robots.txt if none exists
 * @property {boolean} [addSitemapReference=true] - Whether to add sitemap reference to existing robots.txt
 * @property {Array<string>} [disallowPaths=[]] - Additional paths to disallow
 * @property {string} [userAgent='*'] - User agent for robots directives
 */

/**
 * Processes robots.txt file - generates if missing, updates if needed
 * @param {Object} files - Metalsmith files object
 * @param {Object} metalsmith - Metalsmith instance
 * @param {RobotsOptions} options - Configuration options
 * @returns {void}
 */
export function processRobots(files, metalsmith, options) {
  const {
    hostname,
    sitemapFile = "sitemap.xml",
    generateRobots = true,
    addSitemapReference = true,
    disallowPaths = [],
    userAgent = "*",
  } = options;

  const robotsFile = "robots.txt";
  const existingRobots = files[robotsFile];
  // Ensure hostname is a string
  const hostnameStr = String(hostname || "");
  const sitemapUrl = `${hostnameStr.replace(/\/$/, "")}/${sitemapFile}`;

  if (existingRobots) {
    // Handle existing robots.txt file
    if (addSitemapReference) {
      const content = existingRobots.contents.toString();

      // Check if sitemap is already referenced
      if (!content.includes("Sitemap:") && !content.includes("sitemap:")) {
        // Add sitemap reference
        const updatedContent = `${content.trim()}\n\nSitemap: ${sitemapUrl}\n`;
        existingRobots.contents = Buffer.from(updatedContent);

        // Only log in non-test environments
        const isTest =
          process.env.NODE_ENV === "test" ||
          process.env.METALSMITH_ENV === "test";
        if (!isTest) {
          console.warn(
            "[metalsmith-seo] Added sitemap reference to existing robots.txt",
          );
        }
      }
    }
  } else if (generateRobots) {
    // Generate basic robots.txt file
    const robotsContent = generateBasicRobots({
      userAgent,
      disallowPaths,
      sitemapUrl,
    });

    files[robotsFile] = {
      contents: Buffer.from(robotsContent),
      mode: "0644",
    };

    // Only log in non-test environments
    const isTest =
      process.env.NODE_ENV === "test" || process.env.METALSMITH_ENV === "test";
    if (!isTest) {
      console.warn(
        "[metalsmith-seo] Generated robots.txt with sitemap reference",
      );
    }
  }
}

/**
 * Generates basic robots.txt content using a simple template
 * @param {Object} options - Generation options
 * @param {string} options.userAgent - User agent directive
 * @param {Array<string>} options.disallowPaths - Paths to disallow
 * @param {string} options.sitemapUrl - Full URL to sitemap
 * @returns {string} Robots.txt content
 */
function generateBasicRobots({ userAgent, disallowPaths, sitemapUrl }) {
  const disallowDirectives =
    disallowPaths.length > 0
      ? disallowPaths.map((path) => `Disallow: ${path}`).join("\n")
      : "Disallow:";

  return `User-agent: ${userAgent}
${disallowDirectives}

Sitemap: ${sitemapUrl}
`;
}
