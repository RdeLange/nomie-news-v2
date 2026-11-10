<script lang="ts">
  import { onMount } from 'svelte';
  import { SOURCES, sourceById } from './sources';
  import { fetchFeed, todaysHeadlines, type Headline } from './feed';
  import { CHOICES, normalise, type Settings, type TapAction } from './settings';
  import { paletteFrom, glassFrom, tintTextFrom, dangerTextFrom, type Palette, type Glass } from './palette';
  import { t, setLanguage } from './i18n/index.svelte';
  import { onPrefsChange } from './prefs-live';

  type Cache = { source: string; at: number; items: Array<Omit<Headline, 'date'> & { date: string | null }> };

  let plugin: any;
  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let glass = $state<Glass>(glassFrom(undefined));
  let tintText = $state(tintTextFrom(undefined));
  let dangerText = $state(dangerTextFrom(undefined));
  let scale = $state(1);
  let settings = $state<Settings>(normalise({}));
  let items = $state<Headline[]>([]);
  let usedToday = $state(false);
  let fetchedAt = $state<number | null>(null);
  let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let message = $state('');

  const source = $derived(sourceById(settings.source));
  const shown = $derived(items.slice(0, settings.headlines));

  const applyNomieValues = () => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    setLanguage(plugin.prefs?.language);
    glass = glassFrom(plugin.prefs);
    tintText = tintTextFrom(plugin.prefs);
    dangerText = dangerTextFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  const save = () => plugin?.storage.setItem('settings', $state.snapshot(settings));

  const isFresh = (cache: Cache | undefined) => {
    if (!cache || cache.source !== settings.source || !cache.at) return false;
    return (Date.now() - cache.at) / (1000 * 60 * 60) < settings.refreshHours;
  };

  const revive = (list: Cache['items']): Headline[] => list.map((i) => ({ ...i, date: i.date ? new Date(i.date) : null }));

  const showItems = (list: Headline[], at: number) => {
    const result = todaysHeadlines(list, new Date());
    items = settings.todayOnly ? result.items : list;
    usedToday = settings.todayOnly && result.usedToday;
    fetchedAt = at;
    status = 'ready';
  };

  // A fetched list is kept in storage, so the widget does not fetch on every dashboard load
  const load = async (force = false) => {
    if (!plugin) return;
    const cache = plugin.storage.getItem('cache') as Cache | undefined;
    if (!force && isFresh(cache)) return showItems(revive(cache!.items), cache!.at);
    status = 'loading';
    message = '';
    try {
      const list = await fetchFeed(source.url);
      const at = Date.now();
      await plugin.storage.setItem('cache', { source: settings.source, at, items: list.slice(0, 30) });
      showItems(list, at);
    } catch (error) {
      status = 'error';
      // the browser's own error text is English, so only the translated line is shown
      message = t('feedUnavailable', { name: source.name });
    }
  };

  const changeSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    settings = normalise({ ...settings, [key]: value });
    await save();
    await load(key === 'source');
  };

  // Reading an article opens it in Nomie's browser; the note option writes the headline into a note
  const tap = (item: Headline) => {
    if (settings.tapAction === 'note') {
      plugin.openNoteEditor(`${item.title}\n${item.link}\n`);
    } else {
      plugin.openURL(item.link, item.title);
    }
  };

  const when = (date: Date | null) => (date ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '');

  onMount(() => {
    plugin = new NomiePlugin({
      name: 'Nomie News',
      emoji: '📰',
      description: "The news of today from a choice of sources, shown as headlines. Read an article, or write the headline into a note.",
      uses: ['openNoteEditor', 'openURL', 'getStorageItem', 'setStorageItem'],
      version: '2.0',
      addToCaptureMenu: true,
      addToMoreMenu: true,
      addToWidgets: true,
    });
    onPrefsChange(plugin, () => applyNomieValues());
  plugin.onRegistered(async () => {
      applyNomieValues();
      await plugin.storage.init();
      settings = normalise(plugin.storage.getItem('settings'));
      await load();
    });
    plugin.onWidget(async () => {
      view = 'widget';
      applyNomieValues();
      await load();
    });
    plugin.onUIOpened(async () => {
      view = 'modal';
      applyNomieValues();
      await load();
    });
  });
</script>

<div class="card" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --fill: {palette.fill}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --tint-text: {tintText}; --danger: {dangerText}; --glass-fill: {glass.fill}; --glass-edge: {glass.edge}; --glass-blur: {glass.blur}; --glass-shadow: {glass.shadow}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="head"><span>📰</span> <span class="meta">{source.name}</span></div>
    {#if status === 'error'}
      <p class="muted">{message}</p>
    {:else}
      <ul class="compact">
        {#each shown.slice(0, 3) as item (item.link)}
          <li><button class="link" onclick={() => tap(item)}>{item.title}</button></li>
        {:else}
          <li class="muted">{status === 'loading' ? t('loading') : t('noHeadlinesYet')}</li>
        {/each}
      </ul>
    {/if}
  {:else}
    <header class="top"><h1>News</h1></header>
    <p class="muted">{source.name} · {source.language}</p>

    {#if status === 'loading'}<p class="muted">{t('loading')}</p>{/if}
    {#if status === 'error'}<section class="panel error">{message}</section>{/if}
    {#if status === 'ready' && !usedToday && settings.todayOnly}
      <p class="muted">{t('noToday')}</p>
    {/if}

    <section class="panel list">
      {#each shown as item (item.link)}
        <button class="row" onclick={() => tap(item)}>
          <span class="title">{item.title}</span>
          {#if settings.showTime && item.date}<span class="muted">{when(item.date)}</span>{/if}
          {#if settings.summaries && item.summary}<span class="summary">{item.summary}</span>{/if}
        </button>
      {/each}
    </section>
    {#if fetchedAt}<p class="muted">{t('updated', { when: when(new Date(fetchedAt)) })}</p>{/if}
    <button class="ghost" onclick={() => load(true)}>{t('refresh')}</button>

    <h2>{t('sourceHead')}</h2>
    <div class="chips">
      {#each SOURCES as s (s.id)}
        <button class:active={settings.source === s.id} onclick={() => changeSetting('source', s.id)}>{s.name}</button>
      {/each}
    </div>

    <h2>{t('headlinesHead')}</h2>
    <div class="chips">
      {#each CHOICES.headlines as n (n)}
        <button class:active={settings.headlines === n} onclick={() => changeSetting('headlines', n)}>{n}</button>
      {/each}
    </div>

    <h2>{t('tapHead')}</h2>
    <div class="chips">
      <button class:active={settings.tapAction === 'article'} onclick={() => changeSetting('tapAction', 'article' as TapAction)}>{t('readArticle')}</button>
      <button class:active={settings.tapAction === 'note'} onclick={() => changeSetting('tapAction', 'note' as TapAction)}>{t('writeNote')}</button>
    </div>

    <h2>{t('showHead')}</h2>
    <div class="chips">
      <button class:active={settings.todayOnly} onclick={() => changeSetting('todayOnly', !settings.todayOnly)}>{t('todayOnly')}</button>
      <button class:active={settings.summaries} onclick={() => changeSetting('summaries', !settings.summaries)}>{t('summaries')}</button>
      <button class:active={settings.showTime} onclick={() => changeSetting('showTime', !settings.showTime)}>{t('times')}</button>
    </div>
  {/if}
</div>

<style>
  /* the app's text: its iOS font stack (PLG-LF-07) */
  :global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; -webkit-font-smoothing: antialiased; --ios-font-rounded: ui-rounded, -apple-system, system-ui, sans-serif; }
  /* the header is a Liquid Glass bar (D-glass): the title stays at the top, and the content scrolls under it */
  .top { position: sticky; top: 0; z-index: 2; margin: -16px -16px 8px; padding: 16px 16px 10px; background: var(--glass-fill); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-edge); }
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  .card.widget { min-height: 0; padding: 12px; font-size: calc(14px * var(--scale)); }
  h1 { margin: 0; font-size: calc(26px * var(--scale)); font-weight: 700; }
  h2 { margin: 20px 0 6px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { margin: 4px 0; color: var(--muted); }
  .panel { padding: 8px 16px; border-radius: 16px; background: var(--card); margin-bottom: 8px; }
  .error { color: var(--text); }
  .row { display: flex; flex-direction: column; width: 100%; padding: 10px 0; border: 0; border-top: 1px solid var(--line); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .row:first-child { border-top: 0; }
  .title { font-weight: 600; }
  .summary { font-size: calc(14px * var(--scale)); color: var(--muted); }
  .head { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .meta { margin-left: auto; color: var(--muted); font-weight: 400; }
  .compact { list-style: none; margin: 8px 0 0; padding: 0; }
  .compact li { padding: 4px 0; }
  .link { border: 0; background: transparent; color: var(--tint); font: inherit; text-align: left; cursor: pointer; padding: 0; }
  .ghost { padding: 10px 14px; border-radius: 12px; border: 0; background: var(--fill); color: var(--text); font: inherit; font-weight: 600; cursor: pointer; margin-top: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { padding: 8px 12px; border: 0; border-radius: 10px; background: var(--fill); color: var(--text); font: inherit; cursor: pointer; }
  .chips button.active { background: var(--tint-soft); color: var(--tint); font-weight: 600; }
</style>
