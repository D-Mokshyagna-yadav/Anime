import { Request, Response, Router } from 'express';
import * as anilist from '../services/anilistService';
import * as consumet from '../services/consumetService';
import * as megaplay from '../services/megaplayService';
import * as animekai from '../services/animekaiService';

const router = Router();

interface EpisodeLike {
  id: string;
  number: number;
  url?: string;
  [key: string]: unknown;
}

interface StreamSourceLike {
  url: string;
  quality: string;
  isM3U8: boolean;
}

const hydrateAnime = (anime: anilist.AniListMedia) => {
  const validAnime = anilist.ensureValidCoverImage(anime);
  return {
    ...validAnime,
    airedEpisodes: anilist.calculateAiredEpisodes(validAnime),
  };
};

const parseEpisodeNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.floor(parsed);
};

const buildPlaceholderEpisode = (slug: string, episodeNumber: number): EpisodeLike => ({
  id: `${slug}-episode-${episodeNumber}`,
  number: episodeNumber,
  url: '',
});

const mergeEpisodesWithExpectedCount = (
  episodes: EpisodeLike[],
  slug: string,
  expectedTotal?: number
) => {
  const episodeMap = new Map<number, EpisodeLike>();

  for (const episode of episodes || []) {
    const episodeNumber = parseEpisodeNumber(episode?.number);
    if (!episodeNumber) continue;

    const existing = episodeMap.get(episodeNumber);
    const nextUrl = typeof episode.url === 'string' ? episode.url : '';
    const shouldReplace = !existing || (!existing.url && nextUrl.length > 0);

    if (shouldReplace) {
      episodeMap.set(episodeNumber, {
        ...episode,
        number: episodeNumber,
        url: nextUrl,
      });
    }
  }

  const highestKnownEpisode = episodeMap.size > 0 ? Math.max(...episodeMap.keys()) : 0;
  const targetTotal = Math.max(expectedTotal || 0, highestKnownEpisode);

  for (let episodeNumber = 1; episodeNumber <= targetTotal; episodeNumber += 1) {
    if (!episodeMap.has(episodeNumber)) {
      episodeMap.set(episodeNumber, buildPlaceholderEpisode(slug, episodeNumber));
    }
  }

  return Array.from(episodeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, episode]) => episode);
};

const withEpisodeCoverage = (data: any, slug: string, expectedTotal?: number) => {
  const episodes = mergeEpisodesWithExpectedCount(data?.episodes || [], slug, expectedTotal);

  return {
    ...data,
    episodes,
    totalEpisodes: Math.max(data?.totalEpisodes || 0, expectedTotal || 0, episodes.length),
  };
};

const normalizeQualityLabel = (quality: unknown): string => {
  const value = String(quality || '').trim().toLowerCase();
  if (!value || value === 'default' || value === 'adaptive' || value === 'auto') {
    return 'auto';
  }

  const match = value.match(/(\d{3,4})p/);
  if (match) {
    return `${match[1]}p`;
  }

  return value;
};

const streamSourceRank = (quality: string) => {
  if (quality === 'auto') return Number.MAX_SAFE_INTEGER;
  const parsed = parseInt(quality, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

function isRedirectUrl(url: string): boolean {
  try {
    const redirectPatterns = [
      'redirect',
      'bit.ly',
      'short.link',
      'adf.ly',
      'linkvertise',
      'tinyurl',
      'short.url',
      'url.shortener',
      'link.shrink',
      'ad.doubleclick',
      'google.com/url',
      'paypal.com',
      'ebay.com',
    ];

    return redirectPatterns.some((pattern) => url.toLowerCase().includes(pattern));
  } catch {
    return false;
  }
}

const normalizeStreamPayload = (payload: any, provider: string) => {
  const deduped = new Map<string, StreamSourceLike>();

  for (const source of payload?.sources || []) {
    const sourceUrl = String(source?.url || source?.file || '');
    if (!sourceUrl || isRedirectUrl(sourceUrl)) continue;

    deduped.set(sourceUrl, {
      url: sourceUrl,
      quality: normalizeQualityLabel(source.quality),
      isM3U8: Boolean(source.isM3U8 || source.type === 'hls' || sourceUrl.includes('.m3u8')),
    });
  }

  for (const download of payload?.downloads || []) {
    if (!download?.url || isRedirectUrl(download.url)) continue;

    deduped.set(download.url, {
      url: download.url,
      quality: normalizeQualityLabel(download.quality),
      isM3U8: false,
    });
  }

  if (Array.isArray(payload?.download)) {
    for (const download of payload.download) {
      if (!download?.url || isRedirectUrl(download.url)) continue;

      deduped.set(download.url, {
        url: download.url,
        quality: normalizeQualityLabel(download.quality),
        isM3U8: false,
      });
    }
  }

  if (payload?.download && typeof payload.download === 'string' && !isRedirectUrl(payload.download)) {
    deduped.set(payload.download, {
      url: payload.download,
      quality: 'auto',
      isM3U8: false,
    });
  }

  return {
    ...payload,
    provider,
    sources: Array.from(deduped.values()).sort((a, b) => streamSourceRank(b.quality) - streamSourceRank(a.quality)),
  };
};

const getDirectProviderOrder = (provider: string) => {
  switch (provider) {
    case 'animekai':
      return ['animekai', 'consumet', 'zoro'] as const;
    case 'zoro':
      return ['zoro', 'consumet', 'animekai'] as const;
    case 'consumet':
      return ['consumet', 'animekai', 'zoro'] as const;
    default:
      return ['consumet', 'animekai', 'zoro'] as const;
  }
};

// GET /api/anime/trending
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const data = await anilist.getTrending(page);
    const mediaWithAiredEps = data.Page.media.map(hydrateAnime);
    res.json({ success: true, data: { ...data.Page, media: mediaWithAiredEps } });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/latest
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const data = await anilist.getRecentlyUpdated(page);
    const mediaWithAiredEps = data.Page.media.map(hydrateAnime);
    res.json({ success: true, data: { ...data.Page, media: mediaWithAiredEps } });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/popular
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const data = await anilist.getPopular(page);
    const mediaWithAiredEps = data.Page.media.map(hydrateAnime);
    res.json({ success: true, data: { ...data.Page, media: mediaWithAiredEps } });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/seasonal?season=WINTER&year=2024
router.get('/seasonal', async (req: Request, res: Response) => {
  try {
    const season = String(req.query.season || 'SPRING').toUpperCase();
    const year = Number(req.query.year) || new Date().getFullYear();
    const page = Number(req.query.page) || 1;
    const data = await anilist.getSeasonalAnime(season, year, page);
    const mediaWithAiredEps = data.Page.media.map(hydrateAnime);
    res.json({ success: true, data: { ...data.Page, media: mediaWithAiredEps } });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/search?q=naruto&genre=Action&status=RELEASING
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const page = Number(req.query.page) || 1;
    const genres = req.query.genre ? [String(req.query.genre)] : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const data = await anilist.searchAnime(q, page, genres, status);
    const mediaWithAiredEps = data.Page.media.map(hydrateAnime);
    res.json({ success: true, data: { ...data.Page, media: mediaWithAiredEps } });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/calendar?season=SPRING&year=2026
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const season = String(req.query.season || 'SPRING');
    const year = Number(req.query.year) || new Date().getFullYear();
    const data = await anilist.getSeasonalAnime(season, year, page);

    const calendar: Record<string, any[]> = {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    data.Page.media.forEach((anime) => {
      const validAnime = anilist.ensureValidCoverImage(anime);
      if (validAnime.status !== 'RELEASING') return;

      if (validAnime.airingSchedule?.nodes && validAnime.airingSchedule.nodes.length > 0) {
        const nextAiring = validAnime.airingSchedule.nodes[0];
        if (nextAiring.airingAt) {
          const date = new Date(nextAiring.airingAt * 1000);
          const dayOfWeek = date.getDay();
          calendar[days[dayOfWeek]].push({
            id: validAnime.id,
            title: validAnime.title.english || validAnime.title.romaji,
            romaji: validAnime.title.romaji,
            coverImage: validAnime.coverImage,
            episode: nextAiring.episode,
            airingAt: nextAiring.airingAt,
            dayOfWeek,
            genres: validAnime.genres,
            score: validAnime.averageScore,
          });
        }
      }
    });

    res.json({
      success: true,
      data: {
        calendar,
        season,
        year,
        totalAnime: data.Page.media.length,
        pageInfo: data.Page.pageInfo,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const data = await anilist.getAnimeById(id);
    const media = hydrateAnime(data.Media);

    return res.json({
      success: true,
      data: media,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/:slug/episodes
router.get('/:slug/episodes', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const totalEpisodes = req.query.total ? Number(req.query.total) : undefined;
    const lookup = {
      slug,
      english: req.query.english ? String(req.query.english) : undefined,
      romaji: req.query.romaji ? String(req.query.romaji) : undefined,
      native: req.query.native ? String(req.query.native) : undefined,
    };

    console.log(`[Episodes] Attempt 1: Gogoanime for ${slug}`);
    try {
      const data = await consumet.getEpisodes(slug);
      if (data.episodes && data.episodes.length > 0) {
        console.log(`[Episodes] Success from Gogoanime: ${data.episodes.length} episodes`);
        return res.json({ success: true, data: withEpisodeCoverage(data, slug, totalEpisodes) });
      }
    } catch (e) {
      console.warn(`[Episodes] Attempt 1 failed: ${e}`);
    }

    console.log(`[Episodes] Attempt 2: AnimeKai for ${slug}`);
    try {
      const data = await animekai.getEpisodesWithAnimeKaiFallback(lookup);
      if (data.episodes && data.episodes.length > 0) {
        console.log(`[Episodes] Success from AnimeKai: ${data.episodes.length} episodes`);
        return res.json({ success: true, data: withEpisodeCoverage(data, slug, totalEpisodes) });
      }
    } catch (e) {
      console.warn(`[Episodes] Attempt 2 failed: ${e}`);
    }

    console.log(`[Episodes] Attempt 3: Zoro for ${slug}`);
    try {
      const data = await consumet.getZoroInfo(slug);
      if (data.episodes && data.episodes.length > 0) {
        console.log(`[Episodes] Success from Zoro: ${data.episodes.length} episodes`);
        return res.json({
          success: true,
          data: withEpisodeCoverage(
            {
              id: slug,
              title: data.title || slug,
              totalEpisodes: data.episodes.length,
              episodes: data.episodes.map((episode: any) => ({
                id: episode.id || `episode-${episode.number}`,
                number: episode.number,
                url: episode.url || '',
              })),
            },
            slug,
            totalEpisodes
          ),
        });
      }
    } catch (e) {
      console.warn(`[Episodes] Attempt 3 failed: ${e}`);
    }

    console.log(`[Episodes] Attempt 4: Placeholder generation for ${slug}`);
    if (totalEpisodes && totalEpisodes > 0) {
      const episodes = mergeEpisodesWithExpectedCount([], slug, totalEpisodes);
      console.log(`[Episodes] Generated ${episodes.length} placeholders`);
      return res.json({
        success: true,
        data: { id: slug, title: slug, totalEpisodes: episodes.length, episodes },
      });
    }

    console.log(`[Episodes] All fallbacks exhausted for ${slug}`);
    return res.json({ success: true, data: { id: slug, title: slug, totalEpisodes: 0, episodes: [] } });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/stream/:episodeId
router.get('/stream/:episodeId', async (req: Request, res: Response) => {
  try {
    const episodeId = String(req.params.episodeId);
    const { anilistId, episodeNum, language, malId, provider, slug, english, romaji, native } = req.query as any;
    const selectedProvider = String(provider || 'direct').toLowerCase();
    const animeLookup = {
      slug: String(slug || episodeId.split(/-episode-\d+$/)[0] || episodeId),
      english: english ? String(english) : undefined,
      romaji: romaji ? String(romaji) : undefined,
      native: native ? String(native) : undefined,
    };

    if (selectedProvider === 'megaplay') {
      if (malId && episodeNum) {
        try {
          console.log(`[Stream] MegaPlay MAL ${malId} ep ${episodeNum}`);
          const megaplayUrl = megaplay.getMegaPlayViaMAL(malId, episodeNum, language || 'sub');
          return res.json({
            success: true,
            data: {
              provider: 'megaplay',
              embedUrl: megaplayUrl,
              iframeCode: `<iframe src="${megaplayUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>`,
              sources: [{ url: megaplayUrl, quality: 'auto', isM3U8: false }],
            },
          });
        } catch (e) {
          console.warn(`[Stream] MegaPlay MAL failed: ${e}`);
        }
      }

      if (anilistId && episodeNum) {
        try {
          console.log(`[Stream] MegaPlay AniList ${anilistId} ep ${episodeNum}`);
          const megaplayUrl = megaplay.getMegaPlayViaAniList(anilistId, episodeNum, language || 'sub');
          return res.json({
            success: true,
            data: {
              provider: 'megaplay',
              embedUrl: megaplayUrl,
              iframeCode: `<iframe src="${megaplayUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>`,
              sources: [{ url: megaplayUrl, quality: 'auto', isM3U8: false }],
            },
          });
        } catch (e) {
          console.warn(`[Stream] MegaPlay AniList failed: ${e}`);
        }
      }
    }

    for (const currentProvider of getDirectProviderOrder(selectedProvider)) {
      if (currentProvider === 'consumet') {
        try {
          console.log(`[Stream] Attempt: Consumet for ${episodeId}`);
          const data = await consumet.getStreamingLinks(episodeId);
          const normalized = normalizeStreamPayload(data, 'consumet');
          if (normalized.sources.length > 0) {
            console.log(`[Stream] Success from Consumet: ${normalized.sources.length} sources`);
            return res.json({ success: true, data: normalized });
          }
        } catch (e) {
          console.warn(`[Stream] Consumet failed: ${e}`);
        }
      }

      if (currentProvider === 'animekai') {
        try {
          console.log(`[Stream] Attempt: AnimeKai for ${episodeId}`);
          const data = await animekai.getStreamingWithAnimeKaiFallback({
            ...animeLookup,
            episodeId,
            episodeNumber: Number(episodeNum || 1),
            language: String(language || 'sub') as 'sub' | 'dub',
          });
          if (data) {
            const normalized = normalizeStreamPayload(data, 'animekai');
            if (normalized.sources.length > 0) {
              console.log(`[Stream] Success from AnimeKai: ${normalized.sources.length} sources`);
              return res.json({ success: true, data: normalized });
            }
          }
        } catch (e) {
          console.warn(`[Stream] AnimeKai failed: ${e}`);
        }
      }

      if (currentProvider === 'zoro') {
        try {
          console.log(`[Stream] Attempt: Zoro for ${episodeId}`);
          const data = await consumet.getZoroStreamingLinks(episodeId);
          const normalized = normalizeStreamPayload(data, 'zoro');
          if (normalized.sources.length > 0) {
            console.log(`[Stream] Success from Zoro: ${normalized.sources.length} sources`);
            return res.json({ success: true, data: normalized });
          }
        } catch (e) {
          console.warn(`[Stream] Zoro failed: ${e}`);
        }
      }
    }

    console.warn(`[Stream] All streaming sources failed for ${episodeId}`);
    return res.status(404).json({
      success: false,
      message: 'No streaming sources available. Try using MegaPlay provider instead.',
      data: { sources: [] },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/zoro/:animeId/episodes
router.get('/zoro/:animeId/episodes', async (req: Request, res: Response) => {
  try {
    const data = await consumet.getZoroInfo(String(req.params.animeId));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/zoro/stream/:episodeId
router.get('/zoro/stream/:episodeId', async (req: Request, res: Response) => {
  try {
    const data = await consumet.getZoroStreamingLinks(String(req.params.episodeId));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/megaplay/embed/:episodeId?language=sub
router.get('/megaplay/embed/:episodeId', async (req: Request, res: Response) => {
  try {
    const episodeId = String(req.params.episodeId);
    const language = String(req.query.language || 'sub') as 'sub' | 'dub';
    const data = await megaplay.getMegaPlayStreamInfo(episodeId, language);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/megaplay/mal/:malId/:episode?language=sub
router.get('/megaplay/mal/:malId/:episode', async (req: Request, res: Response) => {
  try {
    const malId = String(req.params.malId);
    const episode = String(req.params.episode);
    const language = String(req.query.language || 'sub') as 'sub' | 'dub';
    const data = await megaplay.getMegaPlayStreamViaMAL(malId, episode, language);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/anime/megaplay/anilist/:anilistId/:episode?language=sub
router.get('/megaplay/anilist/:anilistId/:episode', async (req: Request, res: Response) => {
  try {
    const anilistId = String(req.params.anilistId);
    const episode = String(req.params.episode);
    const language = String(req.query.language || 'sub') as 'sub' | 'dub';
    const data = await megaplay.getMegaPlayStreamViaAniList(anilistId, episode, language);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

export default router;
