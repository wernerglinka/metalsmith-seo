import Metalsmith from 'metalsmith';
import seo from '../src/index.js';
import assert from 'assert';

/**
 * Build a minimal Metalsmith files-plugin that injects in-memory HTML pages
 * before metalsmith-seo runs. Keeps tests hermetic without needing on-disk
 * fixtures, matching the pattern used in robots.test.js.
 * @param {Object<string,Object>} pages - file path -> partial file object
 *   (contents may be a string; it is converted to a Buffer)
 * @returns {Function} Metalsmith plugin
 */
function inject(pages) {
  return function(files, metalsmith, done) {
    for (const [file, data] of Object.entries(pages)) {
      const { contents, ...rest } = data;
      files[file] = {
        ...rest,
        contents: Buffer.isBuffer(contents)
          ? contents
          : Buffer.from(contents || '', 'utf-8')
      };
    }
    done();
  };
}

describe('metalsmith-seo llms.txt functionality', function() {
  this.timeout(5000);

  it('should not emit llms.txt by default', function(done) {
    Metalsmith('test/fixtures/html')
      .use(seo({ hostname: 'https://example.com' }))
      .build(function(err, files) {
        if (err) {return done(err);}
        assert(!files['llms.txt'], 'should not emit llms.txt without opt-in');
        assert(!files['llms-full.txt'], 'should not emit llms-full.txt without opt-in');
        done();
      });
  });

  it('should emit llms.txt when enabled', function(done) {
    Metalsmith('test/fixtures/html')
      .use(inject({
        'writing/post-one.html': {
          title: 'Post One',
          date: new Date('2026-01-15'),
          seo: { description: 'First post description.' },
          contents: '<p>First body.</p>'
        },
        'writing/post-two.html': {
          title: 'Post Two',
          date: new Date('2026-02-20'),
          seo: { description: 'Second post description.' },
          contents: '<p>Second body.</p>'
        }
      }))
      .use(seo({
        hostname: 'https://example.com',
        llms: { enabled: true, title: 'My Site', description: 'A test site.' }
      }))
      .build(function(err, files) {
        if (err) {return done(err);}
        assert(files['llms.txt'], 'should emit llms.txt');
        const content = files['llms.txt'].contents.toString();
        assert(content.startsWith('# My Site'), 'should have h1 title');
        assert(content.includes('> A test site.'), 'should have blockquote description');
        assert(content.includes('[Post One](https://example.com/writing/post-one.html)'), 'should include post one link');
        assert(content.includes('[Post Two](https://example.com/writing/post-two.html)'), 'should include post two link');
        assert(content.includes(': First post description.'), 'should include description suffix');
        // Newest first by default
        const idxOne = content.indexOf('Post One');
        const idxTwo = content.indexOf('Post Two');
        assert(idxTwo < idxOne, 'newer post should appear first (date-desc)');
        done();
      });
  });

  it('should also emit llms-full.txt when fullText:true', function(done) {
    Metalsmith('test/fixtures/html')
      .use(inject({
        'writing/post.html': {
          title: 'A Post',
          date: new Date('2026-03-01'),
          seo: { description: 'desc.' },
          contents: '<h1>A Post</h1><p>Hello world.</p>'
        }
      }))
      .use(seo({
        hostname: 'https://example.com',
        llms: { enabled: true, fullText: true, title: 'Site' }
      }))
      .build(function(err, files) {
        if (err) {return done(err);}
        assert(files['llms.txt'], 'index file exists');
        assert(files['llms-full.txt'], 'full-text file exists');
        const full = files['llms-full.txt'].contents.toString();
        assert(full.includes('### A Post'), 'full text has page heading');
        assert(full.includes('Hello world.'), 'full text has plaintext body');
        assert(!full.includes('<p>'), 'full text is plain (no HTML tags)');
        done();
      });
  });

  it('should skip files with private:true', function(done) {
    Metalsmith('test/fixtures/html')
      .use(inject({
        'writing/public.html': {
          title: 'Public',
          date: new Date('2026-01-01'),
          contents: '<p>Public body.</p>'
        },
        'writing/draft.html': {
          title: 'Draft',
          date: new Date('2026-01-02'),
          private: true,
          contents: '<p>Draft body.</p>'
        }
      }))
      .use(seo({
        hostname: 'https://example.com',
        llms: { enabled: true, title: 'Site' }
      }))
      .build(function(err, files) {
        if (err) {return done(err);}
        const content = files['llms.txt'].contents.toString();
        assert(content.includes('Public'), 'public post is listed');
        assert(!content.includes('Draft'), 'private post is excluded');
        done();
      });
  });

  it('should honor explicit groups option', function(done) {
    Metalsmith('test/fixtures/html')
      .use(inject({
        'writing/a.html': { title: 'A', date: new Date('2026-01-01'), contents: '<p>a</p>' },
        'art/b.html':     { title: 'B', date: new Date('2026-01-02'), contents: '<p>b</p>' }
      }))
      .use(seo({
        hostname: 'https://example.com',
        llms: {
          enabled: true,
          title: 'Site',
          groups: {
            'Writing': 'writing/**/*.html',
            'Art':     'art/**/*.html'
          }
        }
      }))
      .build(function(err, files) {
        try {
          if (err) {return done(err);}
          const content = files['llms.txt'].contents.toString();
          assert(content.includes('## Writing'), 'has Writing section');
          assert(content.includes('## Art'), 'has Art section');
          const writingIdx = content.indexOf('## Writing');
          const artIdx = content.indexOf('## Art');
          const aLine = '[A](https://example.com/writing/a.html)';
          const bLine = '[B](https://example.com/art/b.html)';
          assert(content.includes(aLine), 'A link present');
          assert(content.includes(bLine), 'B link present');
          // Each entry should appear under its group. If Writing comes first in
          // the document, A should appear between Writing and Art; else between
          // Art heading end and end of document.
          const writingRegion =
            artIdx > writingIdx
              ? content.slice(writingIdx, artIdx)
              : content.slice(writingIdx);
          const artRegion =
            writingIdx > artIdx
              ? content.slice(artIdx, writingIdx)
              : content.slice(artIdx);
          assert(writingRegion.includes(aLine), 'A under Writing');
          assert(artRegion.includes(bLine), 'B under Art');
          done();
        } catch (e) {
          done(e);
        }
      });
  });

  it('should emit per-locale files under prefixes when defaultLocale is empty', function(done) {
    Metalsmith('test/fixtures/html')
      .use(inject({
        'writing/en-post.html': {
          title: 'EN Post',
          locale: 'en_US',
          date: new Date('2026-01-01'),
          contents: '<p>en</p>'
        },
        'de/texte/de-post.html': {
          title: 'DE Post',
          locale: 'de_DE',
          date: new Date('2026-01-02'),
          contents: '<p>de</p>'
        }
      }))
      .use(seo({
        hostname: 'https://example.com',
        llms: {
          enabled: true, perLocale: true, defaultLocale: '', title: 'Site'
        }
      }))
      .build(function(err, files) {
        try {
          if (err) {return done(err);}
          assert(files['en_US/llms.txt'], 'emits en_US/llms.txt');
          assert(files['de_DE/llms.txt'], 'emits de_DE/llms.txt');
          assert(!files['llms.txt'], 'no root llms.txt when defaultLocale empty');
          assert(files['en_US/llms.txt'].contents.toString().includes('EN Post'));
          assert(files['de_DE/llms.txt'].contents.toString().includes('DE Post'));
          done();
        } catch (e) {
          done(e);
        }
      });
  });

  it('should emit default-locale files at root and others under prefix', function(done) {
    Metalsmith('test/fixtures/html')
      .metadata({
        site: { url: 'https://example.com', title: 'Site', social: { locale: 'en_US' } }
      })
      .use(inject({
        'writing/en-post.html': {
          title: 'EN Post',
          locale: 'en',
          date: new Date('2026-01-01'),
          contents: '<p>en</p>'
        },
        'de/texte/de-post.html': {
          title: 'DE Post',
          locale: 'de',
          date: new Date('2026-01-02'),
          contents: '<p>de</p>'
        }
      }))
      .use(seo({ llms: { enabled: true, perLocale: true } }))
      .build(function(err, files) {
        try {
          if (err) {return done(err);}
          assert(files['llms.txt'], 'emits root llms.txt for default locale');
          assert(files['de/llms.txt'], 'emits de/llms.txt for non-default locale');
          assert(!files['en/llms.txt'], 'should not also emit en/llms.txt');
          assert(files['llms.txt'].contents.toString().includes('EN Post'));
          assert(files['de/llms.txt'].contents.toString().includes('DE Post'));
          done();
        } catch (e) {
          done(e);
        }
      });
  });

  it('should default header title and description from site metadata', function(done) {
    Metalsmith('test/fixtures/html')
      .metadata({
        site: {
          url: 'https://example.com',
          title: 'Meta Title',
          description: 'Meta description.'
        }
      })
      .use(inject({
        'post.html': {
          title: 'Only Post',
          date: new Date('2026-01-01'),
          contents: '<p>body</p>'
        }
      }))
      .use(seo({ llms: { enabled: true } }))
      .build(function(err, files) {
        if (err) {return done(err);}
        const content = files['llms.txt'].contents.toString();
        assert(content.includes('# Meta Title'), 'title falls back to site.title');
        assert(content.includes('> Meta description.'), 'description falls back to site.description');
        done();
      });
  });

  it('should fall back to excerpt when seo.description missing', function(done) {
    Metalsmith('test/fixtures/html')
      .use(inject({
        'post.html': {
          title: 'Post',
          excerpt: 'Excerpt text.',
          date: new Date('2026-01-01'),
          contents: '<p>body</p>'
        }
      }))
      .use(seo({
        hostname: 'https://example.com',
        llms: { enabled: true, title: 'Site' }
      }))
      .build(function(err, files) {
        if (err) {return done(err);}
        const content = files['llms.txt'].contents.toString();
        assert(content.includes(': Excerpt text.'), 'description pulled from excerpt');
        done();
      });
  });
});
