import type { UserSettings } from '../api/client';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  preferences: {
    language: 'en',
    animeOrder: 'latest',
    autoPlayNext: true,
  },
  display: {
    accentTheme: 'violet',
    fontSize: 'medium',
    reducedMotion: false,
  },
  notifications: {
    newReleases: true,
    watchlistUpdates: true,
    communityPosts: false,
    recommendations: true,
  },
  privacy: {
    publicProfile: false,
    allowRecommendations: true,
  },
};

const STORAGE_KEY = 'user-settings-v1';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const mergeUserSettings = (settings?: Partial<UserSettings> | null): UserSettings => {
  const merged = {
    ...DEFAULT_USER_SETTINGS,
    preferences: {
      ...DEFAULT_USER_SETTINGS.preferences,
      ...(isObject(settings?.preferences) ? settings?.preferences : {}),
    },
    display: {
      ...DEFAULT_USER_SETTINGS.display,
      ...(isObject(settings?.display) ? settings?.display : {}),
    },
    notifications: {
      ...DEFAULT_USER_SETTINGS.notifications,
      ...(isObject(settings?.notifications) ? settings?.notifications : {}),
    },
    privacy: {
      ...DEFAULT_USER_SETTINGS.privacy,
      ...(isObject(settings?.privacy) ? settings?.privacy : {}),
    },
  } as UserSettings;

  if (!['small', 'medium', 'large'].includes(merged.display.fontSize)) {
    merged.display.fontSize = DEFAULT_USER_SETTINGS.display.fontSize;
  }

  if (!['violet', 'cyan', 'sunset'].includes(merged.display.accentTheme)) {
    merged.display.accentTheme = DEFAULT_USER_SETTINGS.display.accentTheme;
  }

  return merged;
};

export const loadStoredUserSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_USER_SETTINGS;
    return mergeUserSettings(JSON.parse(stored));
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
};

export const persistUserSettings = (settings: UserSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const applyUserSettingsToDocument = (settings?: Partial<UserSettings> | null) => {
  const merged = mergeUserSettings(settings);
  const root = document.documentElement;
  const fontScale = merged.display.fontSize === 'small' ? '0.94' : merged.display.fontSize === 'large' ? '1.08' : '1';

  root.setAttribute('data-accent-theme', merged.display.accentTheme);
  root.setAttribute('data-motion-preference', merged.display.reducedMotion ? 'reduced' : 'full');
  root.style.setProperty('--user-font-scale', fontScale);

  persistUserSettings(merged);
  return merged;
};
