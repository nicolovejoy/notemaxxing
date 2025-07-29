export const SORT_OPTIONS = {
  RECENT: 'recent',
  ALPHABETICAL: 'alphabetical',
  CREATED: 'created',
} as const;

export const AUTO_SAVE_DELAY_MS = 500;

export const TITLE_FROM_CONTENT_WORD_COUNT = 3;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];