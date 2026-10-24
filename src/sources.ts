// The news sources a reader can choose. Each one was tested from inside a plugin frame on dailynomie.github.io.
// The feed must send "Access-Control-Allow-Origin: *". Feeds without the header cannot be read from a plugin, so no proxy is used.
export type Source = { id: string; name: string; language: string; url: string };

export const SOURCES: Source[] = [
  { id: 'nyt', name: 'The New York Times', language: 'English', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { id: 'dw', name: 'Deutsche Welle', language: 'English', url: 'https://rss.dw.com/rdf/rss-en-all' },
  { id: 'smh', name: 'Sydney Morning Herald', language: 'English', url: 'https://www.smh.com.au/rss/world.xml' },
  { id: 'heise', name: 'heise online', language: 'Deutsch (technology)', url: 'https://www.heise.de/rss/heise-atom.xml' },
  { id: 'wired', name: 'Wired', language: 'English (technology)', url: 'https://www.wired.com/feed/rss' },
];

export const sourceById = (id: string): Source => SOURCES.find((s) => s.id === id) ?? SOURCES[0];
