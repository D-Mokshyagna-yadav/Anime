import type { AniMedia } from '../api/client';
import { getExpectedEpisodeCount } from './anime';

export interface EpisodeListItem {
  id: string;
  number: number;
  url: string;
}

export interface EpisodeLookupParams {
  totalEpisodes?: number;
  english?: string;
  romaji?: string;
  native?: string;
}

const cleanTitle = (value?: string | null) => value?.trim() || '';

export const slugifyAnimeTitle = (value?: string | null) =>
  cleanTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getEpisodeLookupParams = (
  anime: Pick<AniMedia, 'title' | 'episodes' | 'airedEpisodes' | 'status' | 'nextAiringEpisode'>
) => {
  const romaji = cleanTitle(anime.title?.romaji);
  const english = cleanTitle(anime.title?.english);
  const native = cleanTitle(anime.title?.native);
  const slug = slugifyAnimeTitle(romaji || english || native);

  return {
    slug,
    params: {
      totalEpisodes: getExpectedEpisodeCount(anime),
      english: english || undefined,
      romaji: romaji || undefined,
      native: native || undefined,
    } satisfies EpisodeLookupParams,
  };
};

export const buildEpisodePlaceholders = (slug: string, totalEpisodes?: number): EpisodeListItem[] => {
  if (!slug || !totalEpisodes || totalEpisodes < 1) {
    return [];
  }

  return Array.from({ length: totalEpisodes }, (_, index) => ({
    id: `${slug}-episode-${index + 1}`,
    number: index + 1,
    url: '',
  }));
};
