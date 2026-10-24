import { describe, expect, it } from 'vitest';
import { parseFeed, todaysHeadlines } from '../feed';
import { normalise, DEFAULTS } from '../settings';
import { sourceById, SOURCES } from '../sources';

const rss = `<?xml version="1.0"?><rss><channel>
  <item><title>Storm hits coast</title><link>https://ex.com/a</link><pubDate>${new Date().toUTCString()}</pubDate><description>&lt;p&gt;Wind and rain.&lt;/p&gt;</description></item>
  <item><title>Old story</title><link>https://ex.com/b</link><pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate></item>
  <item><title></title><link>https://ex.com/c</link></item>
</channel></rss>`;

const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
  <entry><title>Atom story</title><link href="https://ex.com/d"/><updated>2024-05-02T08:00:00Z</updated><summary>Short.</summary></entry>
</feed>`;

describe('reading a feed', () => {
  it('reads RSS items, keeps the text of the summary and drops items without a title', () => {
    const items = parseFeed(rss);
    expect(items).toHaveLength(2);
    expect(items[0].summary).toBe('Wind and rain.');
    expect(items[0].date).toBeInstanceOf(Date);
  });

  it('reads Atom entries, with the link in the href', () => {
    const items = parseFeed(atom);
    expect(items[0]).toMatchObject({ title: 'Atom story', link: 'https://ex.com/d', summary: 'Short.' });
  });

  it('refuses a page that is not a feed', () => {
    expect(() => parseFeed('<html><body>no')).toThrow();
  });
});

describe("today's headlines", () => {
  it('shows today first, and says so', () => {
    const result = todaysHeadlines(parseFeed(rss), new Date());
    expect(result.usedToday).toBe(true);
    expect(result.items.map((i) => i.title)).toEqual(['Storm hits coast']);
  });

  it('falls back to the newest items, and says it did not use today', () => {
    const result = todaysHeadlines(parseFeed(atom), new Date(2026, 9, 24));
    expect(result.usedToday).toBe(false);
    expect(result.items).toHaveLength(1);
  });
});

describe('the settings', () => {
  it('fills in unknown or missing values with the defaults', () => {
    const s = normalise({ source: 'nope', headlines: 7, tapAction: 'x' as any });
    expect(s.source).toBe('nyt');
    expect(s.headlines).toBe(DEFAULTS.headlines);
    expect(s.tapAction).toBe(DEFAULTS.tapAction);
  });

  it('knows the five sources', () => {
    expect(SOURCES).toHaveLength(5);
    expect(sourceById('dw').name).toBe('Deutsche Welle');
  });
});
