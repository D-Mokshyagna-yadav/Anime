import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService';

// ── Type Definitions ───────────────────────
interface StreamSource {
  url: string;
  quality: string;
  type: string;
}

interface StreamDownload {
  url: string;
  quality: string;
}

interface StreamingResult {
  sources: StreamSource[];
  downloads: StreamDownload[];
}

interface EpisodeData {
  id: string;
  title: string;
  image: string;
  episodes: any[];
}

// ── AnimePahe API Configuration ────────────
const ANIMEPAHE_API = process.env.ANIMEPAHE_API_URL || 'https://animepahe-api.vercel.app/api';
const API_TIMEOUT = parseInt(process.env.STREAMING_API_TIMEOUT || '10000');
const CACHE_STREAMING_TTL = parseInt(process.env.CACHE_TTL_STREAMING || '600');
const CACHE_METADATA_TTL = parseInt(process.env.CACHE_TTL_METADATA || '3600');

// ── Anime Search ───────────────────────────
export const searchAnimeParhe = async (query: string): Promise<any> => {
  const cacheKey = `animepahe:search:${query}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    console.log(`[AnimePahe] Searching: ${query}`);
    const { data } = await axios.get(`${ANIMEPAHE_API}/search`, {
      params: { q: query },
      timeout: API_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    await cacheSet(cacheKey, data, CACHE_METADATA_TTL);
    console.log(`[AnimePahe] ✓ Found ${(data as any).results?.length || 0} results`);
    return data;
  } catch (error) {
    console.warn(`[AnimePahe] Search failed: ${(error as Error).message}`);
    return null;
  }
};

// ── Get Anime Info ─────────────────────────
export const getAnimeParheInfo = async (session: string): Promise<any> => {
  const cacheKey = `animepahe:info:${session}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    console.log(`[AnimePahe] Fetching info for: ${session}`);
    const { data } = await axios.get(`${ANIMEPAHE_API}/${session}`, {
      timeout: API_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    await cacheSet(cacheKey, data, CACHE_METADATA_TTL);
    console.log(`[AnimePahe] ✓ Got info: ${(data as any).title || session}`);
    return data;
  } catch (error) {
    console.warn(`[AnimePahe] Info fetch failed: ${(error as Error).message}`);
    return null;
  }
};

// ── Get Episodes ───────────────────────────
export const getAnimeParheEpisodes = async (session: string, page = 1): Promise<any[]> => {
  const cacheKey = `animepahe:episodes:${session}:${page}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached as any[];

  try {
    console.log(`[AnimePahe] Fetching episodes for: ${session}`);
    const { data } = await axios.get(`${ANIMEPAHE_API}/${session}/releases`, {
      params: { sort: 'episode_desc', page },
      timeout: API_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Convert AnimePahe format to standard format
    const releases = (data as any).releases || [];
    const episodes = releases.map((release: any) => ({
      id: release.session || release.id,
      number: release.episode,
      url: '',
      title: release.title || `Episode ${release.episode}`,
      session: release.session
    }));

    await cacheSet(cacheKey, episodes, CACHE_METADATA_TTL);
    console.log(`[AnimePahe] ✓ Got ${episodes.length} episodes`);
    return episodes;
  } catch (error) {
    console.warn(`[AnimePahe] Episodes fetch failed: ${(error as Error).message}`);
    return [];
  }
};

// ── Get Streaming Links ────────────────────
export const getAnimeParheStreamingLinks = async (session: string, episodeId: string): Promise<StreamingResult> => {
  const cacheKey = `animepahe:stream:${session}:${episodeId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached as StreamingResult;

  try {
    console.log(`[AnimePahe] Fetching stream: ${session} - EP ${episodeId}`);
    const { data } = await axios.get(`${ANIMEPAHE_API}/play/${session}`, {
      params: { episodeId, downloads: true },
      timeout: API_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Convert AnimePahe format to standard format
    const result: StreamingResult = {
      sources: ((data as any).sources || []).map((src: any) => ({
        url: src.url,
        quality: src.quality || '720p',
        type: src.type || 'hls'
      })),
      downloads: ((data as any).downloads || []).map((dl: any) => ({
        url: dl.url,
        quality: dl.quality || '720p'
      }))
    };

    await cacheSet(cacheKey, result, CACHE_STREAMING_TTL);
    console.log(`[AnimePahe] ✓ Got ${result.sources.length} sources, ${result.downloads.length} downloads`);
    return result;
  } catch (error) {
    console.warn(`[AnimePahe] Stream fetch failed: ${(error as Error).message}`);
    return { sources: [], downloads: [] };
  }
};

// ── Multi-Level Fallback Episode Fetcher ──
export const getEpisodesWithParheFallback = async (slug: string, totalEpisodesCount?: number): Promise<EpisodeData> => {
  try {
    // Try 1: Search for anime by title/slug
    const searchResults = await searchAnimeParhe(slug);
    if ((searchResults as any)?.results?.[0]) {
      const animeSession = (searchResults as any).results[0].session;
      const episodes = await getAnimeParheEpisodes(animeSession);
      if (episodes.length > 0) {
        return {
          id: animeSession,
          title: (searchResults as any).results[0].title,
          image: (searchResults as any).results[0].poster,
          episodes
        };
      }
    }

    // Try 2: Generate placeholder episodes from count
    if (totalEpisodesCount && totalEpisodesCount > 0) {
      const eps = Array.from({ length: totalEpisodesCount }, (_, i) => ({
        id: `${slug}-episode-${i + 1}`,
        number: i + 1,
        url: '',
        title: `Episode ${i + 1}`
      }));
      return { id: slug, title: slug, image: '', episodes: eps };
    }

    // Return empty list
    return { id: slug, title: slug, image: '', episodes: [] };
  } catch (error) {
    console.warn(`[AnimePahe] Multi-level fallback failed: ${(error as Error).message}`);
    return { id: slug, title: slug, image: '', episodes: [] };
  }
};

// ── Get Streaming with Fallback ────────────
export const getStreamingWithParheFallback = async (animeSession: string, episodeId: string): Promise<StreamingResult | null> => {
  try {
    const result = await getAnimeParheStreamingLinks(animeSession, episodeId);
    if (result.sources.length > 0 || result.downloads.length > 0) {
      return result;
    }
    return null;
  } catch (error) {
    console.warn(`[AnimePahe] Streaming fallback failed: ${(error as Error).message}`);
    return null;
  }
};
