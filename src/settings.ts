// The reader's choices. They are saved in Nomie's storage for this plugin, so they stay after a restart.
import { sourceById } from './sources';

export type TapAction = 'article' | 'note';
export type Settings = {
  source: string;
  headlines: number;
  todayOnly: boolean;
  summaries: boolean;
  showTime: boolean;
  refreshHours: number;
  tapAction: TapAction;
};

export const DEFAULTS: Settings = {
  source: 'nyt',
  headlines: 5,
  todayOnly: true,
  summaries: false,
  showTime: true,
  refreshHours: 3,
  tapAction: 'article',
};

export const CHOICES = {
  headlines: [3, 5, 10],
  refreshHours: [1, 3, 12, 24],
  tapAction: ['article', 'note'] as TapAction[],
};

// Fills in anything missing or unknown, so an older or damaged saved value still works
export const normalise = (saved: Partial<Settings> | undefined): Settings => {
  const s = { ...DEFAULTS, ...(saved ?? {}) };
  s.source = sourceById(s.source).id;
  if (!CHOICES.headlines.includes(s.headlines)) s.headlines = DEFAULTS.headlines;
  if (!CHOICES.refreshHours.includes(s.refreshHours)) s.refreshHours = DEFAULTS.refreshHours;
  if (!CHOICES.tapAction.includes(s.tapAction)) s.tapAction = DEFAULTS.tapAction;
  s.todayOnly = !!s.todayOnly;
  s.summaries = !!s.summaries;
  s.showTime = !!s.showTime;
  return s;
};
