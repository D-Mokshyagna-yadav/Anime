import axios from 'axios';
import { load } from 'cheerio';
import { ANIME, StreamingServers, SubOrSub, type IAnimeInfo, type IAnimeResult, type ISource } from '@consumet/extensions';
import { cacheGet, cacheSet } from './cacheService';

const animeKai = new ANIME.AnimeKai();
const CACHE_STREAMING_TTL = parseInt(process.env.CACHE_TTL_STREAMING || '600', 10);
const CACHE_METADATA_TTL = parseInt(process.env.CACHE_TTL_METADATA || '3600', 10);
const ANIMEKAI_BASE_URL = 'https://anikai.to';
const ANIMEKAI_SERVERS_URL = `${ANIMEKAI_BASE_URL}/ajax/links/list`;
const ANIMEKAI_LINK_VIEW_URL = `${ANIMEKAI_BASE_URL}/ajax/links/view`;
const ENCDEC_URL = 'https://enc-dec.app/api/enc-kai';
const ENCDEC_DEC_KAI = 'https://enc-dec.app/api/dec-kai';
const ENCDEC_DEC_MEGA = 'https://enc-dec.app/api/dec-mega';
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  Accept: 'text/html, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${ANIMEKAI_BASE_URL}/`,
};
const AJAX_HEADERS = {
  ...REQUEST_HEADERS,
  'X-Requested-With': 'XMLHttpRequest',
};

export interface AnimeKaiLookupOptions {
  slug: string;
  english?: string;
  romaji?: string;
  native?: string;
  episodeId?: string;
}

const normalizeText = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const buildSearchQueries = ({ slug, english, romaji, native }: AnimeKaiLookupOptions) => {
  const rawQueries = [english, romaji, native, slug?.replace(/-/g, ' ')].filter(Boolean) as string[];

  return Array.from(
    new Set(
      rawQueries
        .map((query) => query.trim())
        .filter((query) => query.length > 1)
    )
  );
};

const getResultTitles = (result: IAnimeResult) => {
  const values = [result.id];

  if (typeof result.title === 'string') {
    values.push(result.title);
  } else if (result.title && typeof result.title === 'object') {
    values.push(...Object.values(result.title).filter(Boolean));
  }

  if (typeof result.japaneseTitle === 'string') {
    values.push(result.japaneseTitle);
  }

  return values.filter(Boolean) as string[];
};

const scoreAnimeKaiResult = (result: IAnimeResult, queries: string[]) => {
  const candidateStrings = getResultTitles(result).map(normalizeText).filter(Boolean);
  let bestScore = 0;

  for (const query of queries.map(normalizeText).filter(Boolean)) {
    for (const candidate of candidateStrings) {
      if (!candidate) continue;

      if (candidate === query) {
        bestScore = Math.max(bestScore, 100);
        continue;
      }

      if (candidate.startsWith(query) || query.startsWith(candidate)) {
        bestScore = Math.max(bestScore, 88);
        continue;
      }

      if (candidate.includes(query) || query.includes(candidate)) {
        bestScore = Math.max(bestScore, 76);
      }
    }
  }

  return bestScore;
};

const findAnimeKaiMatch = async (lookup: AnimeKaiLookupOptions) => {
  const queries = buildSearchQueries(lookup);
  const candidates = new Map<string, { score: number; result: IAnimeResult }>();

  for (const query of queries) {
    try {
      const suggestionResponse = await animeKai.fetchSearchSuggestions(query).catch(() => ({ results: [] as IAnimeResult[] }));
      const browserResponse =
        suggestionResponse.results?.length > 0
          ? { results: [] as IAnimeResult[] }
          : await animeKai.search(query).catch(() => ({ results: [] as IAnimeResult[] }));

      for (const result of [...(suggestionResponse.results || []), ...(browserResponse.results || [])]) {
        const score = scoreAnimeKaiResult(result, queries);
        const previous = candidates.get(result.id);
        if (!previous || score > previous.score) {
          candidates.set(result.id, { score, result });
        }
      }
    } catch (error) {
      console.warn(`[AnimeKai] Search failed for "${query}": ${String(error)}`);
    }
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.result)[0] || null;
};

const getAnimeKaiInfo = async (lookup: AnimeKaiLookupOptions): Promise<IAnimeInfo | null> => {
  const cacheKey = `animekai:info:${JSON.stringify(lookup)}`;
  const cached = await cacheGet<IAnimeInfo>(cacheKey);
  if (cached) return cached;

  try {
    const bestMatch = await findAnimeKaiMatch(lookup);
    const animeId = bestMatch?.id || lookup.slug;
    const info = await animeKai.fetchAnimeInfo(animeId);

    if (info) {
      await cacheSet(cacheKey, info, CACHE_METADATA_TTL);
      return info;
    }
  } catch (error) {
    console.warn(`[AnimeKai] Info lookup failed for ${lookup.slug}: ${String(error)}`);
  }

  return null;
};

export const getEpisodesWithAnimeKaiFallback = async (
  lookup: AnimeKaiLookupOptions
) => {
  const info = await getAnimeKaiInfo(lookup);
  if (!info?.episodes?.length) {
    return null;
  }

  return {
    id: info.id || lookup.slug,
    title: typeof info.title === 'string' ? info.title : info.title?.english || info.title?.romaji || lookup.english || lookup.romaji || lookup.slug,
    image: info.image || '',
    totalEpisodes: info.totalEpisodes || info.episodes.length,
    episodes: info.episodes.map((episode) => ({
      id: String(episode.id),
      number: Number(episode.number),
      url: typeof episode.url === 'string' ? episode.url : '',
      title: typeof episode.title === 'string' ? episode.title : `Episode ${episode.number}`,
    })),
  };
};

const normalizeAnimeKaiSource = (source: any) => {
  const url = String(source?.url || source?.file || '');
  return {
    url,
    quality: String(source?.quality || source?.label || 'auto'),
    isM3U8: Boolean(source?.isM3U8 || source?.type === 'hls' || url.includes('.m3u8')),
  };
};

const normalizeAnimeKaiDownload = (download: any) => {
  if (!download) return [];
  if (Array.isArray(download)) {
    return download
      .map((item) => ({
        url: String(item?.url || ''),
        quality: String(item?.quality || 'auto'),
      }))
      .filter((item) => item.url);
  }

  if (typeof download === 'string') {
    return [{ url: download, quality: 'auto' }];
  }

  if (download?.url) {
    return [{ url: String(download.url), quality: String(download.quality || 'auto') }];
  }

  return [];
};

const encodeToken = async (text: string) => {
  const response = await axios.get(ENCDEC_URL, {
    params: { text },
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });

  if (response.data?.status === 200 && response.data?.result) {
    return String(response.data.result);
  }

  return null;
};

const decodeKai = async (text: string) => {
  const response = await axios.post(
    ENCDEC_DEC_KAI,
    { text },
    {
      headers: { 'Content-Type': 'application/json', ...REQUEST_HEADERS },
      timeout: 15000,
    }
  );

  if (response.data?.status === 200 && response.data?.result) {
    return response.data.result;
  }

  return null;
};

const decodeMega = async (text: string) => {
  const response = await axios.post(
    ENCDEC_DEC_MEGA,
    { text, agent: REQUEST_HEADERS['User-Agent'] },
    {
      headers: { 'Content-Type': 'application/json', ...REQUEST_HEADERS },
      timeout: 15000,
    }
  );

  if (response.data?.status === 200 && response.data?.result) {
    return response.data.result;
  }

  return null;
};

const parseAnimeKaiServerGroups = (html: string) => {
  const $ = load(html);
  const groups = new Map<string, Array<{ name: string; linkId: string }>>();

  $('.server-items').each((_, element) => {
    const group = $(element);
    const language = String(group.attr('data-id') || 'unknown');
    const servers = group
      .find('.server')
      .map((__, server) => ({
        name: $(server).text().trim(),
        linkId: String($(server).attr('data-lid') || ''),
      }))
      .get()
      .filter((server) => server.linkId);

    if (servers.length > 0) {
      groups.set(language, servers);
    }
  });

  return groups;
};

const buildIntroOutro = (value: any) => {
  if (!Array.isArray(value) || value.length < 2) return undefined;

  return {
    start: Number(value[0]) || 0,
    end: Number(value[1]) || 0,
  };
};

const normalizeAnimeKaiTracks = (tracks: any[]) =>
  (tracks || [])
    .map((track) => ({
      url: String(track?.file || track?.url || ''),
      lang: String(track?.label || track?.lang || 'Unknown'),
    }))
    .filter((track) => track.url);

const resolveAnimeKaiSourceFromEpisodeId = async (
  episodeId: string,
  language: 'sub' | 'dub' = 'sub'
) => {
  const episodeToken = episodeId.includes('$token=') ? episodeId.split('$token=')[1] : episodeId;
  if (!episodeToken) {
    return null;
  }

  const serverToken = await encodeToken(episodeToken);
  if (!serverToken) {
    throw new Error('AnimeKai token encryption failed');
  }

  const serverResponse = await axios.get(ANIMEKAI_SERVERS_URL, {
    params: { token: episodeToken, _: serverToken },
    headers: AJAX_HEADERS,
    timeout: 15000,
  });

  const serverGroups = parseAnimeKaiServerGroups(serverResponse.data?.result || '');
  const preferredGroups = language === 'dub' ? ['dub', 'softsub', 'sub'] : ['softsub', 'sub', 'dub'];
  const selectedServer = preferredGroups
    .flatMap((group) => serverGroups.get(group) || [])
    .find((server) => server.linkId);

  if (!selectedServer?.linkId) {
    return null;
  }

  const linkToken = await encodeToken(selectedServer.linkId);
  if (!linkToken) {
    throw new Error('AnimeKai link token encryption failed');
  }

  const linkResponse = await axios.get(ANIMEKAI_LINK_VIEW_URL, {
    params: { id: selectedServer.linkId, _: linkToken },
    headers: AJAX_HEADERS,
    timeout: 15000,
  });

  const embedData = await decodeKai(String(linkResponse.data?.result || ''));
  const embedUrl = String(embedData?.url || '');
  if (!embedUrl) {
    return null;
  }

  const videoId = embedUrl.replace(/\/$/, '').split('/').pop();
  if (!videoId) {
    return null;
  }

  const embedBase = embedUrl.includes('/e/') ? embedUrl.split('/e/')[0] : embedUrl.substring(0, embedUrl.lastIndexOf('/'));
  const mediaResponse = await axios.get(`${embedBase}/media/${videoId}`, {
    headers: { ...REQUEST_HEADERS, Referer: embedUrl },
    timeout: 15000,
  });

  const finalData = await decodeMega(String(mediaResponse.data?.result || ''));
  if (!finalData) {
    return null;
  }

  return {
    headers: { Referer: embedUrl },
    embedURL: embedUrl,
    subtitles: normalizeAnimeKaiTracks(finalData.tracks || []),
    intro: buildIntroOutro(embedData?.skip?.intro),
    outro: buildIntroOutro(embedData?.skip?.outro),
    sources: (finalData.sources || []).map(normalizeAnimeKaiSource).filter((item: any) => item.url),
    downloads: normalizeAnimeKaiDownload(finalData.download),
  };
};

export const getStreamingWithAnimeKaiFallback = async (
  lookup: AnimeKaiLookupOptions & { episodeNumber: number; language?: 'sub' | 'dub' }
) => {
  const cacheKey = `animekai:stream:${JSON.stringify(lookup)}`;
  const cached = await cacheGet<any>(cacheKey);
  if (cached) return cached;

  const preferredLanguage = lookup.language === 'dub' ? SubOrSub.DUB : SubOrSub.SUB;
  let resolvedEpisodeId = lookup.episodeId;

  if (!resolvedEpisodeId) {
    const info = await getAnimeKaiInfo(lookup);
    const episode = info?.episodes?.find((item) => Number(item.number) === Number(lookup.episodeNumber));
    resolvedEpisodeId = String(episode?.id || '');
  }

  if (!resolvedEpisodeId) {
    return null;
  }

  const sourceAttempts = [preferredLanguage, SubOrSub.SUB, SubOrSub.DUB].filter(
    (value, index, list) => list.indexOf(value) === index
  );

  for (const sourceLanguage of sourceAttempts) {
    try {
      const directResolution = await resolveAnimeKaiSourceFromEpisodeId(
        resolvedEpisodeId,
        sourceLanguage === SubOrSub.DUB ? 'dub' : 'sub'
      );

      const sourceData: ISource | null =
        directResolution ||
        (await animeKai.fetchEpisodeSources(
          String(resolvedEpisodeId),
          StreamingServers.MegaUp,
          sourceLanguage
        ));

      const normalized = directResolution
        ? directResolution
        : {
            headers: sourceData?.headers,
            subtitles: sourceData?.subtitles,
            intro: sourceData?.intro,
            outro: sourceData?.outro,
            embedURL: sourceData?.embedURL,
            sources: (sourceData?.sources || []).map(normalizeAnimeKaiSource).filter((item) => item.url),
            downloads: normalizeAnimeKaiDownload(sourceData?.download),
          };

      if (normalized.sources.length > 0) {
        await cacheSet(cacheKey, normalized, CACHE_STREAMING_TTL);
        return normalized;
      }
    } catch (error) {
      console.warn(`[AnimeKai] Stream lookup failed for ${lookup.slug} ep ${lookup.episodeNumber}: ${String(error)}`);
    }
  }

  return null;
};
