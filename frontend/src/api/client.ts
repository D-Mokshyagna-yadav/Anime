import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 12000,
});

// Add token to requests if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;

// ── Type helpers ──────────────────────────────────────────
export interface AniMedia {
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
  episodes: number | null;
  airedEpisodes?: number; // Number of episodes that have aired (calculated from airingSchedule)
  duration: number;
  studios: { nodes: { name: string }[] };
  nextAiringEpisode: { episode: number; timeUntilAiring: number } | null;
  format: string;
}

export interface PageInfo {
  total: number; currentPage: number; lastPage: number;
  hasNextPage: boolean; perPage: number;
}

export interface AniPage { media: AniMedia[]; pageInfo: PageInfo; }

export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  animeId: string;
  status: 'PLAN_TO_WATCH' | 'WATCHING' | 'COMPLETED' | 'DROPPED' | 'ON_HOLD';
  progress: number;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  animeId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
}

export interface UserStats {
  totalWatched: number;
  watchingCount: number;
  completedCount: number;
  reviewsWritten: number;
}

// ── Anime API ─────────────────────────────────────────────
export const fetchTrending   = (page = 1) => client.get<{ data: AniPage }>('/anime/trending', { params: { page } });
export const fetchPopular    = (page = 1) => client.get<{ data: AniPage }>('/anime/popular',  { params: { page } });
export const fetchSeasonal   = (season: string, year: number) => client.get<{ data: AniPage }>('/anime/seasonal', { params: { season, year } });
export const fetchCalendar   = (season: string, year: number, page = 1) => 
  client.get<{ data: { calendar: Record<string, any[]>; season: string; year: number; totalAnime: number; pageInfo: PageInfo } }>
  ('/anime/calendar', { params: { season, year, page } });
export const fetchAnimeById  = (id: number) => client.get<{ data: AniMedia }>(`/anime/${id}`);
export const fetchSearch     = (q: string, page = 1, genre?: string, status?: string) =>
  client.get<{ data: AniPage }>('/anime/search', { params: { q, page, genre, status } });
export const fetchEpisodes = (
  slug: string,
  options: {
    totalEpisodes?: number;
    english?: string;
    romaji?: string;
    native?: string;
  } = {}
) =>
  client.get(`/anime/${slug}/episodes`, {
    params: {
      ...(options.totalEpisodes && { total: options.totalEpisodes }),
      ...(options.english && { english: options.english }),
      ...(options.romaji && { romaji: options.romaji }),
      ...(options.native && { native: options.native }),
    },
  });
export const fetchStream = (
  episodeId: string,
  options: {
    anilistId?: number;
    malId?: number;
    episodeNum?: number;
    language?: string;
    provider?: string;
    slug?: string;
    english?: string;
    romaji?: string;
    native?: string;
  } = {}
) =>
  client.get(`/anime/stream/${encodeURIComponent(episodeId)}`, {
    params: {
      ...(options.anilistId && { anilistId: options.anilistId }),
      ...(options.malId && { malId: options.malId }),
      ...(options.episodeNum && { episodeNum: options.episodeNum }),
      ...(options.language && { language: options.language }),
      ...(options.provider && { provider: options.provider }),
      ...(options.slug && { slug: options.slug }),
      ...(options.english && { english: options.english }),
      ...(options.romaji && { romaji: options.romaji }),
      ...(options.native && { native: options.native }),
    },
  });
export const fetchZoroStream = (episodeId: string) => client.get(`/anime/zoro/stream/${encodeURIComponent(episodeId)}`);

// ── Auth API ──────────────────────────────────────────────
export const authSignup = (email: string, password: string) =>
  client.post<{ success: boolean; token: string; user: User }>('/user/signup', { email, password });

export const authLogin = (email: string, password: string) =>
  client.post<{ success: boolean; token: string; user: User }>('/user/login', { email, password });

export const authGetMe = () =>
  client.get<{ success: boolean; user: User; watchlistCount: number; reviewCount: number }>('/user/me');

// ── Watchlist API ─────────────────────────────────────────
export const watchlistAdd = (animeId: string, status = 'PLAN_TO_WATCH') =>
  client.post<{ success: boolean; watchlist: Watchlist }>('/user/watchlist', { animeId, status });

export const watchlistGet = (status?: string) =>
  client.get<{ success: boolean; watchlist: Watchlist[] }>('/user/watchlist', { params: { ...(status && { status }) } });

export const watchlistUpdate = (animeId: string, status?: string, progress?: number) =>
  client.patch<{ success: boolean; watchlist: Watchlist }>(`/user/watchlist/${animeId}`, { status, progress });

export const watchlistRemove = (animeId: string) =>
  client.delete<{ success: boolean; message: string }>(`/user/watchlist/${animeId}`);

// ── Review API ────────────────────────────────────────────
export const reviewCreate = (animeId: string, rating: number, comment?: string) =>
  client.post<{ success: boolean; review: Review }>('/user/reviews', { animeId, rating, comment });

export const reviewGet = () =>
  client.get<{ success: boolean; reviews: Review[] }>('/user/reviews');

export const reviewDelete = (animeId: string) =>
  client.delete<{ success: boolean; message: string }>(`/user/reviews/${animeId}`);

// ── User Profile API ──────────────────────────────────────
export const profileGet = () =>
  client.get<{ success: boolean; user: UserProfile; stats: UserStats }>('/user/profile');

export const profileUpdate = (currentPassword?: string, newPassword?: string) =>
  client.put<{ success: boolean; message: string }>('/user/profile', { currentPassword, newPassword });

// ── MegaPlay Streaming API (Reliable hosted player) ──────
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

// Get stream via Aniwatch episode ID
export const megaplayGetStream = (episodeId: string, language: 'sub' | 'dub' = 'sub') =>
  client.get<{ success: boolean; data: MegaPlayStreamInfo }>(
    `/anime/megaplay/embed/${encodeURIComponent(episodeId)}`,
    { params: { language } }
  );

// Get stream via MAL ID + episode number
export const megaplayGetStreamViaMAL = (malId: number | string, episode: number | string, language: 'sub' | 'dub' = 'sub') =>
  client.get<{ success: boolean; data: MegaPlayStreamInfo }>(
    `/anime/megaplay/mal/${malId}/${episode}`,
    { params: { language } }
  );

// Get stream via AniList ID + episode number
export const megaplayGetStreamViaAniList = (anilistId: number | string, episode: number | string, language: 'sub' | 'dub' = 'sub') =>
  client.get<{ success: boolean; data: MegaPlayStreamInfo }>(
    `/anime/megaplay/anilist/${anilistId}/${episode}`,
    { params: { language } }
  );
