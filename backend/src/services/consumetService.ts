import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService';

// ── Multi-API Fallback Configuration ────────
// Primary API only - fast and reliable
const PRIMARY_API = process.env.CONSUMET_API_URL || 'https://api.consumet.org';
const FALLBACK_APIS = [
  'https://api.consumet.org'
  // Note: Removed Vercel deployments for faster, direct access
];

const JIKAN_API = process.env.JIKAN_API_URL || 'https://api.jikan.moe/v4';
const ANILIST_API = process.env.ANILIST_API_URL || 'https://graphql.anilist.co';

// ── API Configuration ──────────────────────
const API_TIMEOUT = parseInt(process.env.STREAMING_API_TIMEOUT || '10000');
const CACHE_STREAMING_TTL = parseInt(process.env.CACHE_TTL_STREAMING || '600');
const CACHE_METADATA_TTL = parseInt(process.env.CACHE_TTL_METADATA || '3600');

// ── Request with Fallback Logic ────────────
const getWithFallback = async <T>(
  path: string,
  providers: string[],
  ttl = CACHE_STREAMING_TTL,
  serviceName = 'API'
): Promise<T> => {
  const key = `${serviceName}:${path}`;
  const cached = await cacheGet<T>(key);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const url = `${provider}${path}`;
      console.log(`[${serviceName}] Attempting: ${url}`);
      
      const { data } = await axios.get(url, { 
        timeout: API_TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      await cacheSet(key, data, ttl);
      console.log(`[${serviceName}] ✓ Success from: ${provider}`);
      return data as T;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[${serviceName}] ✗ Failed from ${provider}: ${lastError.message}`);
      continue;
    }
  }

  throw new Error(
    `All ${serviceName} providers failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
};

// ── Gogoanime Provider (Most Reliable) ──────
export const getEpisodes = async (animeId: string) => {
  const providers = [PRIMARY_API, ...FALLBACK_APIS];
  return getWithFallback<ConsumetEpisodeList>(
    `/anime/gogoanime/info/${animeId}`,
    providers,
    CACHE_STREAMING_TTL,
    'Gogoanime'
  );
};

// ── Episodes with Multiple Fallbacks ────────
export const getEpisodesWithFallback = async (slug: string, totalEpisodesCount?: number) => {
  try {
    // Try 1: Gogoanime with slug
    console.log(`[Episodes] Attempt 1: Gogoanime with slug "${slug}"`);
    try {
      const result = await getEpisodes(slug);
      if (result.episodes && result.episodes.length > 0) {
        console.log(`[Episodes] ✓ Success: Found ${result.episodes.length} episodes`);
        return result;
      }
    } catch (e) {
      console.warn(`[Episodes] Attempt 1 failed: ${e}`);
    }

    // Try 2: Zoro provider
    console.log(`[Episodes] Attempt 2: Zoro provider with slug "${slug}"`);
    try {
      const zoroResult = await getZoroInfo(slug);
      if (zoroResult.episodes && zoroResult.episodes.length > 0) {
        console.log(`[Episodes] ✓ Success from Zoro: Found ${zoroResult.episodes.length} episodes`);
        return {
          id: slug,
          title: zoroResult.title || 'Unknown',
          url: '',
          genres: [],
          totalEpisodes: zoroResult.episodes.length,
          episodes: zoroResult.episodes.map((ep: any) => ({
            id: ep.id || `episode-${ep.number}`,
            number: ep.number,
            url: ep.url || ''
          }))
        } as ConsumetEpisodeList;
      }
    } catch (e) {
      console.warn(`[Episodes] Attempt 2 failed: ${e}`);
    }

    // Try 3: Generate placeholder episodes from episode count
    if (totalEpisodesCount && totalEpisodesCount > 0) {
      console.log(`[Episodes] Attempt 3: Generating ${totalEpisodesCount} placeholder episodes`);
      const eps = Array.from({ length: totalEpisodesCount }, (_, i) => ({
        id: `${slug}-episode-${i + 1}`,
        number: i + 1,
        url: ''
      }));
      return {
        id: slug,
        title: slug,
        url: '',
        genres: [],
        totalEpisodes: totalEpisodesCount,
        episodes: eps
      } as ConsumetEpisodeList;
    }

    throw new Error('No episodes found from any provider');
  } catch (error) {
    console.error(`[Episodes] All fallbacks exhausted: ${error}`);
    // Return empty episode list instead of throwing
    return {
      id: slug,
      title: slug,
      url: '',
      genres: [],
      totalEpisodes: 0,
      episodes: []
    } as ConsumetEpisodeList;
  }
};

export const getStreamingLinks = async (episodeId: string) => {
  const providers = [PRIMARY_API, ...FALLBACK_APIS];
  return getWithFallback<ConsumetStreamResponse>(
    `/anime/gogoanime/watch/${episodeId}`,
    providers,
    60,
    'Gogoanime-Streaming'
  );
};

// ── Zoro Provider (Sub/Dub Support) ────────
export const getZoroInfo = async (animeId: string) => {
  const providers = [PRIMARY_API, ...FALLBACK_APIS];
  return getWithFallback<ConsumetZoroInfo>(
    `/anime/zoro/info?id=${animeId}`,
    providers,
    CACHE_STREAMING_TTL,
    'Zoro'
  );
};

export const getZoroStreamingLinks = async (episodeId: string) => {
  const providers = [PRIMARY_API, ...FALLBACK_APIS];
  return getWithFallback<ConsumetStreamResponse>(
    `/anime/zoro/watch?episodeId=${episodeId}`,
    providers,
    60,
    'Zoro-Streaming'
  );
};

// ── Search Providers ───────────────────────
export const searchGogoanime = async (query: string) => {
  const providers = [PRIMARY_API, ...FALLBACK_APIS];
  return getWithFallback<ConsumetSearchResult>(
    `/anime/gogoanime/${encodeURIComponent(query)}`,
    providers,
    CACHE_METADATA_TTL,
    'Search-Gogoanime'
  );
};

// ── Jikan API Fallback (For Metadata) ──────
export const searchJikan = async (query: string) => {
  try {
    const { data } = await axios.get(
      `${JIKAN_API}/anime?query=${encodeURIComponent(query)}&limit=25`,
      { timeout: API_TIMEOUT }
    );
    return data;
  } catch (error) {
    console.warn('Jikan API fallback failed:', error);
    throw error;
  }
};

// ── AniList GraphQL Fallback ───────────────
export const searchAniList = async (query: string) => {
  try {
    const gqlQuery = `
      query {
        Page(perPage: 25) {
          media(search: "${query}", type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
            }
            status
            episodes
            genres
          }
        }
      }
    `;

    const { data } = await axios.post(
      ANILIST_API,
      { query: gqlQuery },
      { timeout: API_TIMEOUT }
    );
    return data;
  } catch (error) {
    console.warn('AniList API fallback failed:', error);
    throw error;
  }
};

export interface ConsumetEpisode {
  id: string;
  number: number;
  url: string;
}

export interface ConsumetEpisodeList {
  id: string;
  title: string;
  url: string;
  genres: string[];
  totalEpisodes: number;
  episodes: ConsumetEpisode[];
}

export interface ConsumetSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface ConsumetSubtitle {
  url: string;
  lang: string;
}

export interface ConsumetStreamResponse {
  headers: { Referer: string };
  sources: ConsumetSource[];
  subtitles?: ConsumetSubtitle[];
  download?: string;
}

export interface ConsumetZoroEpisode {
  id: string;
  number: number;
  title: string;
  isFiller: boolean;
  isSubbed: boolean;
  isDubbed: boolean;
}

export interface ConsumetZoroInfo {
  id: string;
  title: string;
  episodes: ConsumetZoroEpisode[];
}

export interface ConsumetSearchResult {
  currentPage: number;
  hasNextPage: boolean;
  results: { id: string; title: string; url: string; image: string; releaseDate: string; subOrDub: string }[];
}

