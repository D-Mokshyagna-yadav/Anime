/**
 * MegaPlay API Service
 * Provides reliable streaming through hosted embed player
 * Supports Aniwatch episode IDs, MAL IDs, and AniList IDs
 */

import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService';

const MEGAPLAY_BASE = process.env.MEGAPLAY_API_URL || 'https://megaplay.buzz';
const MEGAPLAY_ENABLED = process.env.MEGAPLAY_ENABLED === 'true';

// Cache configuration
const CACHE_TTL = parseInt(process.env.CACHE_TTL_STREAMING || '600'); // 10 minutes

/**
 * Generate MegaPlay embed URL for Aniwatch episode ID
 * @param aniwatchEpisodeId - Episode ID from Aniwatch (e.g., 136197)
 * @param language - 'sub' or 'dub'
 * @returns MegaPlay stream URL
 */
export const getMegaPlayEmbedUrl = (
  aniwatchEpisodeId: string,
  language: 'sub' | 'dub' = 'sub'
): string => {
  if (!MEGAPLAY_ENABLED) {
    throw new Error('MegaPlay API is disabled');
  }
  return `${MEGAPLAY_BASE}/stream/s-2/${aniwatchEpisodeId}/${language}`;
};

/**
 * Generate MegaPlay embed URL for MAL ID + episode number
 * @param malId - MyAnimeList anime ID (e.g., 5114)
 * @param episodeNumber - Episode number (e.g., 1)
 * @param language - 'sub' or 'dub'
 * @returns MegaPlay stream URL
 */
export const getMegaPlayViaMAL = (
  malId: string | number,
  episodeNumber: string | number,
  language: 'sub' | 'dub' = 'sub'
): string => {
  if (!MEGAPLAY_ENABLED) {
    throw new Error('MegaPlay API is disabled');
  }
  return `${MEGAPLAY_BASE}/stream/mal/${malId}/${episodeNumber}/${language}`;
};

/**
 * Generate MegaPlay embed URL for AniList ID + episode number
 * @param anilistId - AniList anime ID (e.g., 12345)
 * @param episodeNumber - Episode number (e.g., 1)
 * @param language - 'sub' or 'dub'
 * @returns MegaPlay stream URL
 */
export const getMegaPlayViaAniList = (
  anilistId: string | number,
  episodeNumber: string | number,
  language: 'sub' | 'dub' = 'sub'
): string => {
  if (!MEGAPLAY_ENABLED) {
    throw new Error('MegaPlay API is disabled');
  }
  return `${MEGAPLAY_BASE}/stream/ani/${anilistId}/${episodeNumber}/${language}`;
};

/**
 * Get MegaPlay streaming info with fallback options
 * Returns iframe embed code and stream information
 */
export const getMegaPlayStreamInfo = async (
  aniwatchEpisodeId: string,
  language: 'sub' | 'dub' = 'sub'
) => {
  if (!MEGAPLAY_ENABLED) {
    throw new Error('MegaPlay streaming is not enabled');
  }

  const cacheKey = `megaplay:${aniwatchEpisodeId}:${language}`;
  const cached = await cacheGet<MegaPlayStreamInfo>(cacheKey);
  if (cached) return cached;

  const embedUrl = getMegaPlayEmbedUrl(aniwatchEpisodeId, language);

  const streamInfo: MegaPlayStreamInfo = {
    provider: 'megaplay',
    embedUrl,
    language,
    type: 'iframe',
    iframeCode: `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>`,
    playbackEvents: {
      tracking: true,
      autoNext: true,
      progressTracking: true,
    },
    description: 'Reliable hosted streaming with event tracking and auto-next support',
  };

  await cacheSet(cacheKey, streamInfo, CACHE_TTL);
  return streamInfo;
};

/**
 * Alternative: Get streaming via MAL ID + episode
 */
export const getMegaPlayStreamViaMAL = async (
  malId: string | number,
  episodeNumber: string | number,
  language: 'sub' | 'dub' = 'sub'
) => {
  if (!MEGAPLAY_ENABLED) {
    throw new Error('MegaPlay streaming is not enabled');
  }

  const cacheKey = `megaplay:mal:${malId}:${episodeNumber}:${language}`;
  const cached = await cacheGet<MegaPlayStreamInfo>(cacheKey);
  if (cached) return cached;

  const embedUrl = getMegaPlayViaMAL(malId, episodeNumber, language);

  const streamInfo: MegaPlayStreamInfo = {
    provider: 'megaplay',
    embedUrl,
    language,
    type: 'iframe',
    iframeCode: `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>`,
    playbackEvents: {
      tracking: true,
      autoNext: true,
      progressTracking: true,
    },
    description: 'MegaPlay streaming via MAL ID (supports full library)',
  };

  await cacheSet(cacheKey, streamInfo, CACHE_TTL);
  return streamInfo;
};

/**
 * Alternative: Get streaming via AniList ID + episode
 */
export const getMegaPlayStreamViaAniList = async (
  anilistId: string | number,
  episodeNumber: string | number,
  language: 'sub' | 'dub' = 'sub'
) => {
  if (!MEGAPLAY_ENABLED) {
    throw new Error('MegaPlay streaming is not enabled');
  }

  const cacheKey = `megaplay:anilist:${anilistId}:${episodeNumber}:${language}`;
  const cached = await cacheGet<MegaPlayStreamInfo>(cacheKey);
  if (cached) return cached;

  const embedUrl = getMegaPlayViaAniList(anilistId, episodeNumber, language);

  const streamInfo: MegaPlayStreamInfo = {
    provider: 'megaplay',
    embedUrl,
    language,
    type: 'iframe',
    iframeCode: `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>`,
    playbackEvents: {
      tracking: true,
      autoNext: true,
      progressTracking: true,
    },
    description: 'MegaPlay streaming via AniList ID (comprehensive coverage)',
  };

  await cacheSet(cacheKey, streamInfo, CACHE_TTL);
  return streamInfo;
};

// ── Type Definitions ────────────────────
export interface MegaPlayStreamInfo {
  provider: 'megaplay';
  embedUrl: string;
  language: 'sub' | 'dub';
  type: 'iframe';
  iframeCode: string;
  playbackEvents: {
    tracking: boolean;
    autoNext: boolean;
    progressTracking: boolean;
  };
  description: string;
}

export interface MegaPlayEvent {
  event?: 'time' | 'complete' | 'error';
  channel?: 'megacloud';
  type?: 'watching-log';
  time?: number;
  duration?: number;
  percent?: number;
  currentTime?: number;
}
