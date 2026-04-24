import axios from 'axios';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { cacheGet, cacheSet } from './cacheService';
import {
  calculateAiredEpisodes,
  ensureValidCoverImage,
  getAnimeByIds,
  isSafeAnime,
} from './anilistService';

interface CreateUserInput {
  email: string;
  password: string;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface UserSettings {
  preferences: {
    language: string;
    animeOrder: string;
    autoPlayNext: boolean;
  };
  display: {
    accentTheme: string;
    fontSize: string;
    reducedMotion: boolean;
  };
  notifications: {
    newReleases: boolean;
    watchlistUpdates: boolean;
    communityPosts: boolean;
    recommendations: boolean;
  };
  privacy: {
    publicProfile: boolean;
    allowRecommendations: boolean;
  };
}

interface UpdateProfileInput {
  currentPassword?: string;
  newPassword?: string;
  avatarUrl?: string | null;
  settings?: DeepPartial<UserSettings>;
}

interface UpsertWatchlistInput {
  userId: string;
  animeId: string;
  status?: string;
}

interface UpdateWatchlistInput {
  userId: string;
  animeId: string;
  status?: string;
  progress?: number;
}

interface UpsertReviewInput {
  userId: string;
  animeId: string;
  rating: number;
  comment?: string;
}

export interface AvatarOption {
  id: string;
  url: string;
  animeName?: string;
  artistName?: string;
  artistHref?: string;
  sourceUrl?: string;
}

const DEFAULT_USER_SETTINGS: UserSettings = {
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

const VALID_WATCHLIST_STATUSES = new Set(['PLAN_TO_WATCH', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED']);
const VALID_FONT_SIZES = new Set(['small', 'medium', 'large']);
const VALID_ACCENT_THEMES = new Set(['violet', 'cyan', 'sunset']);
const AVATAR_API_ENDPOINT = 'https://nekos.best/api/v2/neko';
const APP_USER_AGENT = 'SensuiWatch/1.0 (https://anistream.local)';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const toBoolean = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

const sanitizeWatchlistStatus = (status?: string) => {
  const normalized = String(status || '').trim().toUpperCase();
  return VALID_WATCHLIST_STATUSES.has(normalized) ? normalized : undefined;
};

const sanitizeFontSize = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_FONT_SIZES.has(normalized) ? normalized : DEFAULT_USER_SETTINGS.display.fontSize;
};

const sanitizeAccentTheme = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_ACCENT_THEMES.has(normalized) ? normalized : DEFAULT_USER_SETTINGS.display.accentTheme;
};

const sanitizeProgress = (progress?: number) => {
  if (progress === undefined || progress === null) return undefined;
  const parsed = Number(progress);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.floor(parsed));
};

const sanitizeAvatarUrl = (avatarUrl?: string | null) => {
  if (avatarUrl === null) return null;
  if (avatarUrl === undefined) return undefined;

  const trimmed = String(avatarUrl).trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:image/')) {
    throw new Error('Avatar URL must be a valid image URL');
  }

  return trimmed;
};

const mergeUserSettings = (base: UserSettings, patch?: DeepPartial<UserSettings>): UserSettings => ({
  preferences: {
    language: patch?.preferences?.language?.trim() || base.preferences.language,
    animeOrder: patch?.preferences?.animeOrder?.trim() || base.preferences.animeOrder,
    autoPlayNext: toBoolean(patch?.preferences?.autoPlayNext, base.preferences.autoPlayNext),
  },
  display: {
    accentTheme: sanitizeAccentTheme(patch?.display?.accentTheme || base.display.accentTheme),
    fontSize: sanitizeFontSize(patch?.display?.fontSize || base.display.fontSize),
    reducedMotion: toBoolean(patch?.display?.reducedMotion, base.display.reducedMotion),
  },
  notifications: {
    newReleases: toBoolean(patch?.notifications?.newReleases, base.notifications.newReleases),
    watchlistUpdates: toBoolean(patch?.notifications?.watchlistUpdates, base.notifications.watchlistUpdates),
    communityPosts: toBoolean(patch?.notifications?.communityPosts, base.notifications.communityPosts),
    recommendations: toBoolean(patch?.notifications?.recommendations, base.notifications.recommendations),
  },
  privacy: {
    publicProfile: toBoolean(patch?.privacy?.publicProfile, base.privacy.publicProfile),
    allowRecommendations: toBoolean(patch?.privacy?.allowRecommendations, base.privacy.allowRecommendations),
  },
});

const flattenUserSettings = (settings: UserSettings) => ({
  language: settings.preferences.language,
  animeOrder: settings.preferences.animeOrder,
  autoPlayNext: settings.preferences.autoPlayNext,
  accentTheme: sanitizeAccentTheme(settings.display.accentTheme),
  fontSize: sanitizeFontSize(settings.display.fontSize),
  reducedMotion: settings.display.reducedMotion,
  notifyNewReleases: settings.notifications.newReleases,
  notifyWatchlistUpdates: settings.notifications.watchlistUpdates,
  notifyCommunityPosts: settings.notifications.communityPosts,
  notifyRecommendations: settings.notifications.recommendations,
  publicProfile: settings.privacy.publicProfile,
  allowRecommendations: settings.privacy.allowRecommendations,
});

export const buildUserSettings = (user: any): UserSettings => ({
  preferences: {
    language: user?.language || DEFAULT_USER_SETTINGS.preferences.language,
    animeOrder: user?.animeOrder || DEFAULT_USER_SETTINGS.preferences.animeOrder,
    autoPlayNext: typeof user?.autoPlayNext === 'boolean' ? user.autoPlayNext : DEFAULT_USER_SETTINGS.preferences.autoPlayNext,
  },
  display: {
    accentTheme: sanitizeAccentTheme(user?.accentTheme),
    fontSize: sanitizeFontSize(user?.fontSize),
    reducedMotion: typeof user?.reducedMotion === 'boolean' ? user.reducedMotion : DEFAULT_USER_SETTINGS.display.reducedMotion,
  },
  notifications: {
    newReleases: typeof user?.notifyNewReleases === 'boolean' ? user.notifyNewReleases : DEFAULT_USER_SETTINGS.notifications.newReleases,
    watchlistUpdates:
      typeof user?.notifyWatchlistUpdates === 'boolean'
        ? user.notifyWatchlistUpdates
        : DEFAULT_USER_SETTINGS.notifications.watchlistUpdates,
    communityPosts:
      typeof user?.notifyCommunityPosts === 'boolean'
        ? user.notifyCommunityPosts
        : DEFAULT_USER_SETTINGS.notifications.communityPosts,
    recommendations:
      typeof user?.notifyRecommendations === 'boolean'
        ? user.notifyRecommendations
        : DEFAULT_USER_SETTINGS.notifications.recommendations,
  },
  privacy: {
    publicProfile: typeof user?.publicProfile === 'boolean' ? user.publicProfile : DEFAULT_USER_SETTINGS.privacy.publicProfile,
    allowRecommendations:
      typeof user?.allowRecommendations === 'boolean'
        ? user.allowRecommendations
        : DEFAULT_USER_SETTINGS.privacy.allowRecommendations,
  },
});

export const serializeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  createdAt: user.createdAt,
  avatarUrl: user.avatarUrl || null,
  settings: buildUserSettings(user),
});

const hydrateAnime = (anime: any) => {
  if (!anime || !isSafeAnime(anime)) {
    return null;
  }

  const safeAnime = ensureValidCoverImage(anime);
  return {
    ...safeAnime,
    airedEpisodes: calculateAiredEpisodes(safeAnime),
  };
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
}

export async function createUser({ email, password }: CreateUserInput) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email: normalizeEmail(email), passwordHash },
  });
}

export async function verifyUserCredentials(email: string, password: string) {
  const user = await findUserByEmail(normalizeEmail(email));
  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function getUserWithStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { watchlists: true, reviews: true },
  });

  if (!user) return null;

  const watchingCount = user.watchlists.filter((item) => item.status === 'WATCHING').length;
  const completedCount = user.watchlists.filter((item) => item.status === 'COMPLETED').length;
  const totalWatched = user.watchlists.reduce((sum, item) => sum + (item.progress || 0), 0);

  return {
    user,
    stats: {
      totalWatched,
      watchingCount,
      completedCount,
      reviewsWritten: user.reviews.length,
    },
  };
}

export async function upsertWatchlist({ userId, animeId, status }: UpsertWatchlistInput) {
  const normalizedStatus = sanitizeWatchlistStatus(status) || 'PLAN_TO_WATCH';
  const existing = await prisma.watchlist.findFirst({
    where: { userId, animeId },
  });

  if (existing) {
    return prisma.watchlist.update({
      where: { id: existing.id },
      data: { status: normalizedStatus, updatedAt: new Date() },
    });
  }

  return prisma.watchlist.create({
    data: {
      userId,
      animeId,
      status: normalizedStatus,
    },
  });
}

export async function listWatchlist(userId: string, status?: string) {
  const normalizedStatus = sanitizeWatchlistStatus(status);
  return prisma.watchlist.findMany({
    where: { userId, ...(normalizedStatus && { status: normalizedStatus }) },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function listWatchlistWithAnime(userId: string, status?: string) {
  const watchlist = await listWatchlist(userId, status);
  const animeIds = watchlist
    .map((item) => Number(item.animeId))
    .filter((value) => Number.isFinite(value) && value > 0);

  const animeList = await getAnimeByIds(animeIds);
  const animeMap = new Map(
    animeList
      .map((anime) => hydrateAnime(anime))
      .filter((anime): anime is NonNullable<ReturnType<typeof hydrateAnime>> => Boolean(anime))
      .map((anime) => [anime.id, anime])
  );

  return watchlist.map((item) => ({
    ...item,
    anime: animeMap.get(Number(item.animeId)) || null,
  }));
}

export async function deleteWatchlistEntry(userId: string, animeId: string) {
  await prisma.watchlist.deleteMany({
    where: { userId, animeId },
  });
}

export async function patchWatchlist({ userId, animeId, status, progress }: UpdateWatchlistInput) {
  const watchlist = await prisma.watchlist.findFirst({ where: { userId, animeId } });
  if (!watchlist) return null;

  const normalizedStatus = sanitizeWatchlistStatus(status);
  const normalizedProgress = sanitizeProgress(progress);

  return prisma.watchlist.update({
    where: { id: watchlist.id },
    data: {
      ...(normalizedStatus && { status: normalizedStatus }),
      ...(normalizedProgress !== undefined && { progress: normalizedProgress }),
      updatedAt: new Date(),
    },
  });
}

export async function upsertReview({ userId, animeId, rating, comment }: UpsertReviewInput) {
  const existing = await prisma.review.findFirst({
    where: { userId, animeId },
  });

  if (existing) {
    return prisma.review.update({
      where: { id: existing.id },
      data: { rating, comment: comment || null },
    });
  }

  return prisma.review.create({
    data: { userId, animeId, rating, comment: comment || null },
  });
}

export async function listReviews(userId: string) {
  return prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteReview(userId: string, animeId: string) {
  await prisma.review.deleteMany({
    where: { userId, animeId },
  });
}

export async function updateProfile(
  userId: string,
  { currentPassword, newPassword, avatarUrl, settings }: UpdateProfileInput
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const data: Record<string, unknown> = {};
  const trimmedPassword = String(newPassword || '').trim();

  if (trimmedPassword) {
    if (!currentPassword) {
      throw new Error('Current password required');
    }

    if (!user.passwordHash) {
      throw new Error('Current password required');
    }

    if (trimmedPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    data.passwordHash = await bcrypt.hash(trimmedPassword, 10);
  }

  if (avatarUrl !== undefined) {
    data.avatarUrl = sanitizeAvatarUrl(avatarUrl);
  }

  if (settings) {
    const mergedSettings = mergeUserSettings(buildUserSettings(user), settings);
    Object.assign(data, flattenUserSettings(mergedSettings));
  }

  if (Object.keys(data).length === 0) {
    return {
      updated: false,
      message: 'No changes to save',
      user: serializeUser(user),
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
  });

  const passwordUpdated = Boolean(data.passwordHash);
  const settingsUpdated = Boolean(settings) || avatarUrl !== undefined;

  let message = 'Profile updated successfully';
  if (passwordUpdated && settingsUpdated) {
    message = 'Profile and password updated successfully';
  } else if (passwordUpdated) {
    message = 'Password updated successfully';
  }

  return {
    updated: true,
    message,
    user: serializeUser(updatedUser),
  };
}

export async function listAvatarOptions(amount = 24): Promise<AvatarOption[]> {
  const safeAmount = Math.min(24, Math.max(6, Math.floor(Number(amount) || 24)));
  const cacheKey = `avatar-options:${safeAmount}`;
  const cached = await cacheGet<AvatarOption[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const response = await axios.get<{ results?: Array<Record<string, unknown>> }>(AVATAR_API_ENDPOINT, {
    params: { amount: safeAmount },
    headers: {
      'User-Agent': APP_USER_AGENT,
      Accept: 'application/json',
    },
    timeout: 8000,
  });

  const options = (response.data.results || [])
    .map((item, index) => {
      const url = String(item.url || '').trim();
      if (!url) return null;

      return {
        id: String(item.source_url || item.artist_href || `${index}-${url}`),
        url,
        animeName: item.anime_name ? String(item.anime_name) : undefined,
        artistName: item.artist_name ? String(item.artist_name) : undefined,
        artistHref: item.artist_href ? String(item.artist_href) : undefined,
        sourceUrl: item.source_url ? String(item.source_url) : undefined,
      };
    })
    .filter((item) => Boolean(item)) as AvatarOption[];

  if (options.length > 0) {
    await cacheSet(cacheKey, options, 60 * 60);
  }

  return options;
}
