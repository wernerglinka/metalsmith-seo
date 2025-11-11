# metalsmith-seo - Development Context

## Project Overview

This is a Metalsmith plugin generated using the enhanced standards from `metalsmith-plugin-mcp-server`. It follows modern JavaScript patterns with dual ESM/CommonJS support and comprehensive testing.

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with `metalsmith-plugin-mcp-server`. When working on this plugin, AI assistants (Claude) MUST use the MCP server tools rather than creating their own implementations.

### Essential MCP Commands

```bash
# List all available templates
list-templates

# Get specific template content (use these exactly as provided)
get-template plugin/CLAUDE.md
get-template configs/release-it.json
get-template configs/eslint.config.js

# Validate plugin and get actionable recommendations
validate .

# Generate configuration files
configs .

# Show recommended configuration templates
show-template release-it
show-template eslint

# Update dependencies
update-deps .
```

### CRITICAL RULES for AI Assistants

1. **ALWAYS use MCP server templates verbatim** - Never create simplified versions
2. **ALWAYS use `list-templates` first** to see what's available
3. **ALWAYS use `get-template`** to retrieve exact template content
4. **NEVER improvise or create custom implementations** when MCP server provides templates
5. **When validation recommends templates**, use the exact commands provided
6. **If a command seems unclear**, ask the user for clarification rather than improvising

### Common Mistakes to AVOID

**❌ Wrong Approach:**
- Creating custom CLAUDE.md content instead of using `get-template plugin/CLAUDE.md`
- Scaffolding entire new plugins when you just need a template
- Making up template content or "simplifying" official templates
- Ignoring validation recommendations
- Using commands like `npx metalsmith-plugin-mcp-server scaffold ./ CLAUDE.md claude-context`

**✅ Correct Approach:**
- Use `list-templates` to see what's available
- Use `get-template <template-name>` to get exact content
- Follow validation recommendations exactly as provided
- Ask for clarification when commands seem confusing
- Always use official templates verbatim

### Quick Commands

**Quality & Validation:**
```bash
npx metalsmith-plugin-mcp-server validate . --functional  # Validate with MCP server
npm test                                                   # Run tests with coverage
npm run lint                                              # Lint and fix code
```

**Release Process:**
```bash
npm run release:patch   # Bug fixes (1.5.4 → 1.5.5)
npm run release:minor   # New features (1.5.4 → 1.6.0)  
npm run release:major   # Breaking changes (1.5.4 → 2.0.0)
```

**Development:**
```bash
npm run build          # Build ESM/CJS versions
npm run test:coverage  # Run tests with detailed coverage
```


## Pre-Commit and Release Workflow

### CRITICAL: Always Run Pre-Commit Validation

**Before ANY commit or release, ALWAYS run these commands in order:**

```bash
npm run lint          # Fix linting issues
npm run format        # Format code consistently
npm test              # Ensure all tests pass
```

**If any of these commands fail, you MUST fix the issues before proceeding with commits or releases.**

### Common Development Commands

```bash
# Build the plugin (required before testing)
npm run build

# Run tests for both ESM and CommonJS
npm test

# Run tests with coverage
npm run test:coverage

# Run linting and auto-fix issues
npm run lint

# Format code
npm run format

# Check formatting without making changes
npm run format:check
```

### Release Commands

Only after successful pre-commit validation:

```bash
npm run release:patch  # For bug fixes (0.0.X)
npm run release:minor  # For new features (0.X.0)
npm run release:major  # For breaking changes (X.0.0)
```

## Development Architecture

### Dual Module Support

This plugin supports both ESM and CommonJS:

- **Source**: Write in ESM in `src/index.js`
- **Build**: Creates both `lib/index.js` (ESM) and `lib/index.cjs` (CommonJS)
- **Testing**: Tests run against built files for both formats

### File Organization

```
metalsmith-seo/
├── src/
│   ├── index.js              # Main plugin entry point
│   └── utils/                # Utility functions
├── test/
│   ├── index.test.js         # ESM tests
│   ├── index.test.cjs        # CommonJS tests
│   └── fixtures/             # Test data
└── lib/                      # Built files (auto-generated)
```

### Plugin Features

This plugin uses standard synchronous processing patterns with the following SEO capabilities:

- **Sitemap Generation**: XML sitemap with configurable priority and change frequency
- **Meta Tags**: Open Graph and Twitter Card meta tags
- **Robots.txt**: Configurable robots.txt generation
- **Reading Time**: Calculate estimated reading time for content
- **Meta Descriptions**: Auto-generate or use provided descriptions

## Testing Strategy

### Test Structure

- **ESM Tests**: `test/index.test.js` - Tests the built ESM version
- **CommonJS Tests**: `test/index.test.cjs` - Tests the built CommonJS version
- **Fixtures**: `test/fixtures/` - Sample files for testing transformations

### Running Tests

```bash
# Build first (required!)
npm run build

# Run all tests
npm test

# Run specific test format
npm run test:esm
npm run test:cjs

# Coverage reporting
npm run test:coverage
```

### Important: Build Before Testing

**Always run `npm run build` before running tests** - the tests execute against the built files in `lib/`, not the source files in `src/`.

## CRITICAL TESTING RULES

### 1. NEVER mock Metalsmith instances

**Always use real Metalsmith instances in tests:**

```js
// ✅ CORRECT - Real Metalsmith instance
const metalsmith = Metalsmith(fixture('test-directory'));

// ❌ WRONG - Never create mock objects
const mockMetalsmith = { directory: () => '/fake/path' };
```

### 2. Use proper plugin function signature

**Plugins receive (files, metalsmith, done) - pass files directly:**

```js
// ✅ CORRECT - Proper plugin usage
function runPlugin(files, options = {}) {
  return new Promise((resolve, reject) => {
    const metalsmith = Metalsmith(fixture('validation'));
    const plugin = bundledComponents(options);

    // Plugin receives files directly - this is the standard pattern
    plugin(files, metalsmith, (error) => {
      if (error) reject(error);
      else resolve(files);
    });
  });
}

// ❌ WRONG - Don't add files to metadata
Object.keys(files).forEach((filename) => {
  metalsmith.metadata()[filename] = files[filename]; // This is wrong!
});
```

### 3. Keep tests self-contained - NO test utilities in production code

**NEVER export test-related functions from the plugin:**

```js
// ❌ WRONG - Never export test utilities from production code
export { resetCache };  // This pollutes the production API

// ✅ CORRECT - Tests should be self-contained
// If tests need to reset state, they should:
// 1. Create new plugin instances for each test
// 2. Use fresh Metalsmith instances
// 3. Work around caching by using different options/data
```

Production code should only export the plugin function and any legitimate public APIs that users need. Test-specific utilities, reset functions, or debugging helpers should never be part of the production code.

## Code Quality Standards

### ESLint Configuration

- Uses ESLint 9.x flat configuration (`eslint.config.js`)
- Automatically fixes common issues with `npm run lint`
- Modern JavaScript patterns enforced

### Formatting

- Prettier configuration for consistent code style
- Auto-format with `npm run format`
- Check formatting with `npm run format:check`

### Documentation

- JSDoc comments for all public functions
- README with comprehensive usage examples

## Plugin Development Patterns

### Basic Plugin Structure

```javascript
/**
 * A metalsmith plugin for SEO optimization.
 * @param {Object} options - Plugin configuration
 * @returns {Function} Metalsmith plugin function
 */
function seo(options = {}) {
  return function (files, metalsmith, callback) {
    // Plugin logic here
    callback();
  };
}

export default seo;
```

### Error Handling

```javascript
function seo(options = {}) {
  return function (files, metalsmith, callback) {
    try {
      // Plugin processing
      callback();
    } catch (error) {
      callback(error);
    }
  };
}
```

## Release Process

### Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- All tests passing
- Code properly linted and formatted

### Automated Release

The release process is fully automated:

```bash
# Patch release (bug fixes)
npm run release:patch

# Minor release (new features)
npm run release:minor

# Major release (breaking changes)
npm run release:major
```

This automatically:

- Updates version in package.json
- Generates changelog
- Creates git tag
- Pushes to GitHub
- Creates GitHub release

## Common Development Tasks

### Adding New Features

1. Write feature in `src/index.js`
2. Add comprehensive tests in `test/`
3. Update JSDoc documentation
4. Run pre-commit validation
5. Test with real Metalsmith projects

### Debugging

```javascript
// Add debug logging
import { debuglog } from 'util';
const debug = debuglog('metalsmith-seo');

function seo(options = {}) {
  return function (files, metalsmith, callback) {
    debug('Processing %d files', Object.keys(files).length);
    // ... plugin logic
  };
}
```

### Performance Optimization

- Use `metalsmith.match()` for file filtering
- Avoid unnecessary file system operations
- Process files in batches for large sites
- Cache expensive computations

## Integration Testing

Test your plugin with real Metalsmith projects:

```javascript
import Metalsmith from 'metalsmith';
import seo from 'metalsmith-seo';

const metalsmith = Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(
    seo({
      // your options
    })
  )
  .build((err) => {
    if (err) throw err;
    console.log('Build complete!');
  });
```

## Communication Style

### When Working on This Plugin

- **Be specific** - Include exact error messages and file paths
- **Test thoroughly** - Both ESM and CommonJS formats
- **Follow patterns** - Use existing utilities and conventions
- **Document changes** - Update JSDoc and README as needed

This plugin follows the enhanced standards from `metalsmith-plugin-mcp-server` and is designed for modern Metalsmith development workflows.
