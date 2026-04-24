import type { AniMedia } from '../api/client';

type EpisodeCountAnime = Pick<AniMedia, 'status' | 'episodes' | 'airedEpisodes' | 'nextAiringEpisode'>;

export const getAiredEpisodeCount = (anime?: EpisodeCountAnime | null) => {
  if (!anime) return undefined;

  const nextAiringCount = anime.nextAiringEpisode?.episode
    ? Math.max(0, anime.nextAiringEpisode.episode - 1)
    : 0;
  const airedEpisodes = anime.airedEpisodes || 0;
  const currentAiredEpisodes = Math.max(airedEpisodes, nextAiringCount);

  return currentAiredEpisodes > 0 ? currentAiredEpisodes : undefined;
};

export const getExpectedEpisodeCount = (anime?: EpisodeCountAnime | null) => {
  if (!anime) return undefined;

  if (anime.status === 'RELEASING') {
    return getAiredEpisodeCount(anime) ?? anime.episodes ?? undefined;
  }

  return anime.episodes ?? getAiredEpisodeCount(anime) ?? undefined;
};

export const getEpisodeCountLabel = (anime?: EpisodeCountAnime | null) =>
  anime?.status === 'RELEASING' ? 'Aired' : 'Episodes';
