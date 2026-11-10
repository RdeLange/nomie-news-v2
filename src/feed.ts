import { t } from './i18n/index.svelte';
// Reads a feed (RSS 2.0, RSS 1.0 or Atom) into headlines, and picks the ones of today.
export type Headline = { title: string; link: string; summary: string; date: Date | null };

const textOf = (node: Element, names: string[]): string => {
  for (const name of names) {
    const el = node.getElementsByTagName(name)[0];
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return '';
};

// Summaries can contain HTML. Keep only the text.
const plainText = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

export const parseFeed = (xml: string): Headline[] => {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(t('notReadable'));
  return [...doc.getElementsByTagName('item'), ...doc.getElementsByTagName('entry')]
    .map((node) => {
      const linkEl = node.getElementsByTagName('link')[0];
      const link = (linkEl && (linkEl.getAttribute('href') || linkEl.textContent)) || '';
      const dateText = textOf(node, ['pubDate', 'published', 'updated', 'dc:date']);
      const date = dateText ? new Date(dateText) : null;
      return {
        title: textOf(node, ['title']),
        link: link.trim(),
        summary: plainText(textOf(node, ['description', 'summary', 'content'])),
        date: date && !isNaN(date.getTime()) ? date : null,
      };
    })
    .filter((item) => item.title && item.link);
};

// Fetches a source with a time limit. The browser only allows this when the source sends the CORS header.
export const fetchFeed = async (url: string): Promise<Headline[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`The source answered ${response.status}.`);
    return parseFeed(await response.text());
  } finally {
    clearTimeout(timer);
  }
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Today's headlines first. When the feed has none from today, the newest ones are shown and labelled as such.
export const todaysHeadlines = (items: Headline[], today = new Date()) => {
  const todays = items.filter((item) => item.date && sameDay(item.date, today));
  return { items: todays.length ? todays : items, usedToday: todays.length > 0 };
};
