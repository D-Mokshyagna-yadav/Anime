import prisma from '../lib/prisma';
import { calculateAiredEpisodes, ensureValidCoverImage, getAnimeById, isSafeAnime } from './anilistService';

export interface EpisodeNotificationPayload {
  id: string;
  userId: string;
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
  createdAt: Date;
  seen: boolean;
}

const toEpisodeId = (animeId: string, episodeNumber: number) => `${animeId}-episode-${episodeNumber}`;

const parseNumericAnimeId = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function listNotificationsForUser(userId: string, limit = 25) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, seen: false },
  });

  return {
    notifications: notifications.map((notification) => ({
      ...notification,
      episodeId: toEpisodeId(notification.animeId, notification.episodeNumber),
    })),
    unreadCount,
  };
}

export async function markNotificationSeen(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.notification.update({
    where: { id: existing.id },
    data: { seen: true },
  });
}

export async function markAllNotificationsSeen(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, seen: false },
    data: { seen: true },
  });

  return { updated: result.count };
}

export async function clearAllNotifications(userId: string) {
  const result = await prisma.notification.deleteMany({
    where: { userId },
  });

  return { removed: result.count };
}

export async function runNotificationSweep() {
  const watchEntries = await prisma.watchlist.findMany({
    where: {
      OR: [{ status: 'WATCHING' }, { progress: { gt: 0 } }],
    },
    select: {
      userId: true,
      animeId: true,
      progress: true,
    },
  });

  if (watchEntries.length === 0) {
    return { created: 0, createdNotifications: [] as EpisodeNotificationPayload[] };
  }

  const uniqueAnimeIds = Array.from(new Set(watchEntries.map((entry) => entry.animeId)));
  const animeEpisodeMap = new Map<string, { title: string; airedEpisodes: number }>();

  for (const animeId of uniqueAnimeIds) {
    const parsedId = parseNumericAnimeId(animeId);
    if (!parsedId) continue;

    try {
      const response = await getAnimeById(parsedId);
      const media = response.Media;
      if (!media || !isSafeAnime(media)) continue;

      const hydrated = ensureValidCoverImage(media);
      const airedEpisodes = calculateAiredEpisodes(hydrated);
      if (airedEpisodes < 1) continue;

      animeEpisodeMap.set(animeId, {
        airedEpisodes,
        title: hydrated.title.english || hydrated.title.romaji || `Anime ${animeId}`,
      });
    } catch {
      continue;
    }
  }

  const createdNotifications: EpisodeNotificationPayload[] = [];

  for (const entry of watchEntries) {
    const release = animeEpisodeMap.get(entry.animeId);
    if (!release) continue;

    const lastWatched = Number(entry.progress || 0);
    if (release.airedEpisodes <= lastWatched) continue;

    const nextEpisode = lastWatched + 1;

    try {
      const created = await prisma.notification.create({
        data: {
          userId: entry.userId,
          animeId: entry.animeId,
          animeTitle: release.title,
          episodeNumber: nextEpisode,
        },
      });

      createdNotifications.push(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Unique constraint')) {
        continue;
      }
      throw error;
    }
  }

  return {
    created: createdNotifications.length,
    createdNotifications,
  };
}
