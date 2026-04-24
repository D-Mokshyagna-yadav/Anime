import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService';

const ANILIST_URL = 'https://graphql.anilist.co';
const DEFAULT_ANIME_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1b1630"/>
        <stop offset="100%" stop-color="#6d28d9"/>
      </linearGradient>
    </defs>
    <rect width="600" height="900" fill="#131318"/>
    <rect x="48" y="48" width="504" height="804" rx="28" fill="url(#bg)"/>
    <circle cx="300" cy="310" r="92" fill="#f5f3ff" fill-opacity="0.18"/>
    <path d="M232 430h136c35.346 0 64 28.654 64 64v58H168v-58c0-35.346 28.654-64 64-64Z" fill="#f5f3ff" fill-opacity="0.18"/>
    <text x="300" y="660" text-anchor="middle" fill="#f5f3ff" font-family="Arial, sans-serif" font-size="42" font-weight="700">AniStream</text>
    <text x="300" y="710" text-anchor="middle" fill="#e9d5ff" font-family="Arial, sans-serif" font-size="28">Image unavailable</text>
  </svg>`
)}`;

const firstAvailableImage = (...images: Array<string | null | undefined>) =>
  images.find((image): image is string => typeof image === 'string' && image.trim().length > 0)?.trim() || DEFAULT_ANIME_IMAGE;

const query = async <T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> => {
  const key = `anilist:${Buffer.from(JSON.stringify({ gql, variables })).toString('base64')}`;
  const cached = await cacheGet<T>(key);
  if (cached) return cached;

  try {
    const { data } = await axios.post(ANILIST_URL, { query: gql, variables }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 8000, // 8 second timeout
    });

    if (data.errors && data.errors.length > 0) {
      throw new Error(`AniList GraphQL Error: ${data.errors.map((e: any) => e.message).join(', ')}`);
    }

    const result = data.data as T;
    await cacheSet(key, result, 600);
    return result;
  } catch (error: any) {
    console.error(`[AniList] Error: ${error.message}`);
    throw error;
  }
};

const MEDIA_FIELDS = `
  id idMal title { romaji english native }
  coverImage { extraLarge large medium color }
  bannerImage description(asHtml: false)
  genres averageScore popularity
  status season seasonYear episodes duration
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode timeUntilAiring }
  format
`;

// Full media fields including airingSchedule for episode counting
const MEDIA_FIELDS_WITH_SCHEDULE = `
  id idMal title { romaji english native }
  coverImage { extraLarge large medium color }
  bannerImage description(asHtml: false)
  genres averageScore popularity
  status season seasonYear episodes duration
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode timeUntilAiring }
  format
  airingSchedule(perPage: 500) {
    nodes { episode airingAt }
    pageInfo { hasNextPage }
  }
`;

export const getTrending = async (page = 1, perPage = 20) =>
  query<AniListPage>(`query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:TRENDING_DESC,type:ANIME){${MEDIA_FIELDS}}pageInfo{total currentPage lastPage hasNextPage perPage}}}`, { page, perPage });

export const getPopular = async (page = 1, perPage = 20) =>
  query<AniListPage>(`query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(sort:POPULARITY_DESC,type:ANIME){${MEDIA_FIELDS}}pageInfo{total currentPage lastPage hasNextPage perPage}}}`, { page, perPage });

export const getSeasonalAnime = async (season: string, year: number, page = 1) =>
  query<AniListPage>(`query($season:MediaSeason,$year:Int,$page:Int){Page(page:$page,perPage:20){media(season:$season,seasonYear:$year,type:ANIME,sort:POPULARITY_DESC){${MEDIA_FIELDS_WITH_SCHEDULE}}pageInfo{total currentPage lastPage hasNextPage perPage}}}`, { season, year, page });

export const getAnimeById = async (id: number) =>
  query<{ Media: AniListMedia }>(`query($id:Int){Media(id:$id,type:ANIME){${MEDIA_FIELDS_WITH_SCHEDULE} characters(role:MAIN,perPage:8){nodes{id name{full}image{medium}}} relations{edges{relationType node{id title{romaji}coverImage{medium}type}}}}}`, { id });

export const searchAnime = async (search: string, page = 1, genres?: string[], status?: string) =>
  query<AniListPage>(`query($search:String,$page:Int,$genres:[String],$status:MediaStatus){Page(page:$page,perPage:24){media(search:$search,type:ANIME,genre_in:$genres,status:$status){${MEDIA_FIELDS}}pageInfo{total currentPage lastPage hasNextPage perPage}}}`, { search, page, genres, status });

export const getRecentlyUpdated = async (page = 1, perPage = 20) =>
  query<AniListPage>(`query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(type:ANIME,sort:UPDATED_AT_DESC,status:RELEASING){${MEDIA_FIELDS}}pageInfo{total currentPage lastPage hasNextPage perPage}}}`, { page, perPage });

export interface AniListMedia {
  id: number;
  idMal?: number | null;
  title: { romaji: string; english: string; native: string };
  coverImage: { extraLarge: string; large: string; medium: string; color: string };
  bannerImage: string;
  description: string;
  genres: string[];
  averageScore: number;
  popularity: number;
  status: string;
  season: string;
  seasonYear: number;
  episodes: number;
  duration: number;
  studios: { nodes: { name: string }[] };
  nextAiringEpisode: { episode: number; timeUntilAiring: number } | null;
  format: string;
  airingSchedule?: {
    nodes: { episode: number; airingAt: number }[];
    pageInfo: { hasNextPage: boolean };
  };
}

/**
 * Ensure coverImage has valid fallback sources
 * Uses extraLarge > large > medium > bannerImage > default placeholder
 */
export const ensureValidCoverImage = (media: AniListMedia): AniListMedia => {
  const validImage = firstAvailableImage(
    media.coverImage?.extraLarge,
    media.coverImage?.large,
    media.coverImage?.medium,
    media.bannerImage
  );
  const validBanner = firstAvailableImage(media.bannerImage, validImage);
  
  return {
    ...media,
    bannerImage: validBanner,
    coverImage: {
      ...(media.coverImage || {}),
      // Ensure all fields point to a valid image or fall through to next option
      extraLarge: validImage,
      large: validImage,
      medium: validImage,
      color: media.coverImage?.color || '#a060a0'
    }
  };
};

/**
 * Calculate the number of aired episodes based on AniList airingSchedule
 * Primary: Count episodes where airingAt <= current_time
 * Fallback: Use nextAiringEpisode.episode - 1 for RELEASING status
 * Fallback: Use episodes count for FINISHED status
 */
export const calculateAiredEpisodes = (media: AniListMedia): number => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  let scheduleCount = 0;

  // Primary: Use airingSchedule if available
  if (media.airingSchedule?.nodes && media.airingSchedule.nodes.length > 0) {
    const airedEpisodes = media.airingSchedule.nodes
      .filter(ep => ep.airingAt && ep.airingAt <= now)
      .map(ep => ep.episode)
      .sort((a, b) => a - b);

    if (airedEpisodes.length > 0) {
      scheduleCount = airedEpisodes[airedEpisodes.length - 1];
    }
  }

  // Fallback 1: For RELEASING status, use nextAiringEpisode - 1
  let nextAiringCount = 0;
  if (media.status === 'RELEASING' && media.nextAiringEpisode?.episode) {
    nextAiringCount = Math.max(0, media.nextAiringEpisode.episode - 1);
  }

  // Fallback 2: For FINISHED status, use full episode count
  let completedCount = 0;
  if (media.status === 'FINISHED' && media.episodes) {
    completedCount = media.episodes;
  }

  // Prefer the freshest available count from the schedule or next-airing metadata.
  return Math.max(scheduleCount, nextAiringCount, completedCount, 0);
};

export interface AniListPage {
  Page: {
    media: AniListMedia[];
    pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean; perPage: number };
  };
}
