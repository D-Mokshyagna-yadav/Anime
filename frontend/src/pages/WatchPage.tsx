import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { ChevronLeft, ChevronRight, List, AlertCircle, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useAdaptive } from '../context/AdaptiveContext';
import type { AniMedia } from '../api/client';
import {
  fetchStream,
  fetchAnimeById,
  fetchEpisodes,
  megaplayGetStreamViaAniList,
  megaplayGetStreamViaMAL,
} from '../api/client';
import { getEpisodeCountLabel, getExpectedEpisodeCount } from '../utils/anime';
import { buildEpisodePlaceholders, getEpisodeLookupParams } from '../utils/episodes';
import { applyImageFallback, getAnimeThumbImage } from '../utils/images';
import { logError } from '../utils/logger';
import { loadStoredUserSettings } from '../utils/userPreferences';
import './WatchPage.css';

interface Episode {
  id: string;
  number: number;
  url: string;
}

interface Source {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface HLSLevel {
  height?: number;
}

type Provider = 'megaplay' | 'direct';
type QualityOption = 'auto' | '1080p' | '720p' | '480p' | '360p';

const QUALITY_OPTIONS: QualityOption[] = ['auto', '1080p', '720p', '480p', '360p'];

const parseEpisodeNumberFromId = (episodeId: string) => {
  const matchedNumber = episodeId.match(/(?:episode-|ep-)(\d+)(?:\D*$|$)/i) || episodeId.match(/(\d+)(?:\D*$|$)/);
  return matchedNumber ? Number(matchedNumber[1]) : undefined;
};

const parseQualityHeight = (quality: string) => {
  const matchedHeight = quality.match(/(\d{3,4})p/i);
  return matchedHeight ? Number(matchedHeight[1]) : undefined;
};

const pickClosestHeight = (availableHeights: number[], targetHeight: number) => {
  const exactHeight = availableHeights.find((height) => height === targetHeight);
  if (exactHeight) return exactHeight;

  const lowerHeights = availableHeights.filter((height) => height <= targetHeight).sort((a, b) => b - a);
  if (lowerHeights.length > 0) return lowerHeights[0];

  const higherHeights = availableHeights.filter((height) => height > targetHeight).sort((a, b) => a - b);
  return higherHeights[0];
};

const getDirectSourceForQuality = (sources: Source[], selectedQuality: QualityOption) => {
  const directSources = sources.filter((source) => !source.isM3U8);
  if (directSources.length === 0) {
    return sources[0];
  }

  const sortedSources = [...directSources].sort((a, b) => (parseQualityHeight(b.quality) || 0) - (parseQualityHeight(a.quality) || 0));
  if (selectedQuality === 'auto') {
    return sortedSources[0];
  }

  const targetHeight = parseQualityHeight(selectedQuality);
  if (!targetHeight) {
    return sortedSources[0];
  }

  const availableHeights = sortedSources
    .map((source) => parseQualityHeight(source.quality))
    .filter((height): height is number => typeof height === 'number');

  if (availableHeights.length === 0) {
    return sortedSources[0];
  }

  const selectedHeight = pickClosestHeight(availableHeights, targetHeight);
  return sortedSources.find((source) => parseQualityHeight(source.quality) === selectedHeight) || sortedSources[0];
};

const applyHlsQualitySelection = (hls: Hls, selectedQuality: QualityOption) => {
  if (selectedQuality === 'auto') {
    hls.currentLevel = -1;
    return;
  }

  const targetHeight = parseQualityHeight(selectedQuality);
  if (!targetHeight || hls.levels.length === 0) {
    hls.currentLevel = -1;
    return;
  }

  const availableHeights = hls.levels
    .map((level) => level.height)
    .filter((height): height is number => typeof height === 'number');

  if (availableHeights.length === 0) {
    hls.currentLevel = -1;
    return;
  }

  const selectedHeight = pickClosestHeight(availableHeights, targetHeight);
  const selectedIndex = hls.levels.findIndex((level) => level.height === selectedHeight);
  hls.currentLevel = selectedIndex >= 0 ? selectedIndex : -1;
};

export default function WatchPage() {
  const { animeId, episodeId } = useParams<{ animeId: string; episodeId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [anime, setAnime] = useState<AniMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [quality, setQuality] = useState<QualityOption>('auto');
  const [hlsLevels, setHlsLevels] = useState<HLSLevel[]>([]);
  const [epPanelOpen, setEpPanelOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('megaplay');
  const [language, setLanguage] = useState<'sub' | 'dub'>('sub');
  const [autoNext, setAutoNext] = useState(() => loadStoredUserSettings().preferences.autoPlayNext);
  const [embedUrl, setEmbedUrl] = useState('');
  const { deviceType, inputType } = useAdaptive();

  const decodedEpId = episodeId ? decodeURIComponent(episodeId) : '';
  const currentEpisode = episodes.find((episode) => episode.id === decodedEpId);
  const currentIdx = currentEpisode ? episodes.findIndex((episode) => episode.id === decodedEpId) : -1;
  const prevEp = currentIdx > 0 ? episodes[currentIdx - 1] : undefined;
  const nextEp = currentIdx >= 0 ? episodes[currentIdx + 1] : undefined;
  const currentEpNum = currentEpisode?.number || parseEpisodeNumberFromId(decodedEpId) || 1;
  const episodeCount = getExpectedEpisodeCount(anime);
  const episodeCountLabel = getEpisodeCountLabel(anime);

  const goEpisode = (episode: Episode) => {
    setEpPanelOpen(false);
    navigate(`/watch/${animeId}/${encodeURIComponent(episode.id)}`);
  };

  const saveWatchHistory = (currentTime: number, duration: number) => {
    if (!animeId || !anime || !episodeId) return;

    try {
      const history = JSON.parse(localStorage.getItem('watchHistory') || '{}');
      history[animeId] = {
        animeId: Number(animeId),
        episodeId: decodedEpId,
        episodeNum: currentEpNum,
        title: anime.title.english || anime.title.romaji,
        thumb: getAnimeThumbImage(anime),
        timestamp: Date.now(),
        duration,
        currentTime,
      };
      localStorage.setItem('watchHistory', JSON.stringify(history));
    } catch (watchHistoryError) {
      console.warn('Failed to save watch history:', watchHistoryError);
    }
  };

  useEffect(() => {
    if (!videoRef.current) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        saveWatchHistory(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [animeId, episodeId, anime, currentEpNum]);

  useEffect(() => {
    if (deviceType !== 'tv' || provider !== 'direct') return;
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      if (document.fullscreenElement) return;
      video.requestFullscreen?.().catch(() => {});
    };

    video.addEventListener('play', onPlay);
    return () => video.removeEventListener('play', onPlay);
  }, [deviceType, provider]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if ((data.channel === 'megacloud' || data.type === 'watching-log') && data.event === 'complete' && autoNext && nextEp) {
        setTimeout(() => goEpisode(nextEp), 2000);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [autoNext, nextEp]);

  useEffect(() => {
    if (!animeId) return;

    setLoading(true);
    setError('');
    setPlayerError('');
    setEpisodes([]);

    fetchAnimeById(Number(animeId))
      .then((response) => {
        const animeData = response.data.data;
        setAnime(animeData);

        const { slug, params } = getEpisodeLookupParams(animeData);
        if (!slug) return;

        fetchEpisodes(slug, params)
          .then((episodeResponse) => {
            const fetchedEpisodes = episodeResponse.data?.data?.episodes || [];
            if (fetchedEpisodes.length === 0 && params.totalEpisodes) {
              setEpisodes(buildEpisodePlaceholders(slug, params.totalEpisodes));
            } else {
              setEpisodes(fetchedEpisodes);
            }
          })
          .catch(() => {
            if (params.totalEpisodes) {
              setEpisodes(buildEpisodePlaceholders(slug, params.totalEpisodes));
            }
          });
      })
      .catch((requestError) => {
        logError('WatchPlayer', requestError, { animeId });
        setError('Failed to load anime details.');
      })
      .finally(() => setLoading(false));
  }, [animeId]);

  useEffect(() => {
    setQuality('auto');
    setEmbedUrl('');
    setSources([]);
    setHlsLevels([]);
    setError('');
    setPlayerError('');
  }, [decodedEpId, provider, language]);

  useEffect(() => {
    if (!anime || !animeId || !decodedEpId || provider !== 'megaplay') return;

    setLoading(true);
    setError('');
    setPlayerError('');

    const streamRequest = anime.idMal
      ? megaplayGetStreamViaMAL(anime.idMal, currentEpNum, language)
      : megaplayGetStreamViaAniList(anime.id, currentEpNum, language);

    streamRequest
      .then((response) => {
        const nextEmbedUrl = response.data?.data?.embedUrl || '';
        if (!nextEmbedUrl) {
          setPlayerError('Embedded player is unavailable for this episode. Try Direct stream.');
          return;
        }

        setEmbedUrl(nextEmbedUrl);
      })
      .catch((requestError) => {
        logError('WatchPlayer', requestError, { provider: 'megaplay', animeId, episode: currentEpNum });
        setPlayerError('Failed to load the embedded player. Try Direct stream.');
      })
      .finally(() => setLoading(false));
  }, [provider, anime, animeId, decodedEpId, currentEpNum, language]);

  useEffect(() => {
    if (!anime || !animeId || !decodedEpId || provider !== 'direct') return;

    setLoading(true);
    setError('');

    fetchStream(decodedEpId, {
      anilistId: anime.id,
      malId: anime.idMal || undefined,
      episodeNum: currentEpNum,
      language,
      provider: 'direct',
      slug: getEpisodeLookupParams(anime).slug,
      english: anime.title.english,
      romaji: anime.title.romaji,
      native: anime.title.native,
    })
      .then((response) => {
        const playableSources: Source[] = response.data?.data?.sources || [];
        setSources(playableSources);

        if (playableSources.length === 0) {
          setError('No playable direct sources were found. Try MegaPlay.');
        }
      })
      .catch((requestError) => {
        logError('WatchPlayer', requestError, { provider: 'direct', animeId, episode: currentEpNum });
        setError('Failed to load the direct stream. Try MegaPlay or another episode.');
      })
      .finally(() => setLoading(false));
  }, [provider, anime, animeId, decodedEpId, currentEpNum, language]);

  useEffect(() => {
    if (provider !== 'direct' || !videoRef.current) return;

    const video = videoRef.current;
    const hlsSource = sources.find((source) => source.isM3U8);
    hlsRef.current?.destroy();
    hlsRef.current = null;
    setHlsLevels([]);

    if (hlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        progressive: true,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxFragLookUpTolerance: 0.25,
        fragLoadingTimeOut: 20000,
        defaultAudioCodec: 'mp4a.40.2',
      });

      hls.loadSource(hlsSource.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHlsLevels(hls.levels || []);
        applyHlsQualitySelection(hls, quality);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError('Direct video playback failed. Try MegaPlay.');
        }
      });

      hlsRef.current = hls;
      return () => {
        hls.destroy();
      };
    }

    const directSource = getDirectSourceForQuality(sources, quality);
    if (!directSource) return;

    if (video.src !== directSource.url) {
      video.src = directSource.url;
      video.load();
    }

    video.play().catch(() => {});
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [provider, sources]);

  useEffect(() => {
    if (provider !== 'direct') return;

    if (hlsRef.current) {
      applyHlsQualitySelection(hlsRef.current, quality);
      return;
    }

    const video = videoRef.current;
    if (!video || sources.length === 0) return;

    const nextSource = getDirectSourceForQuality(sources, quality);
    if (!nextSource || video.src === nextSource.url) return;

    video.src = nextSource.url;
    video.load();
    video.play().catch(() => {});
  }, [provider, quality, sources]);

  const title = anime ? (anime.title.english || anime.title.romaji) : 'Loading...';

  return (
    <div className="watch-page" data-device={deviceType} data-input={inputType}>
      <Navbar />

      <div className="watch-layout container">
        <div className="watch-main">
          <div className="watch-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            {anime && <Link to={`/anime/${animeId}`}>{title}</Link>}
            <span>/</span>
            <span>Episode {currentEpNum}</span>
          </div>

          <div className="player-wrapper" role="region" aria-label="Anime video player">
            {provider === 'megaplay' ? (
              <>
                {loading && !embedUrl && !playerError && (
                  <div className="player-overlay">
                    <Loader2 size={48} className="spin" />
                    <p>Loading player...</p>
                  </div>
                )}

                {playerError && (
                  <div className="player-overlay error">
                    <AlertCircle size={48} />
                    <p>{playerError}</p>
                    <button className="btn-primary" onClick={() => setProvider('direct')} style={{ marginTop: 16 }}>
                      Try Direct Stream
                    </button>
                  </div>
                )}

                {embedUrl && !playerError && (
                  <iframe
                    src={embedUrl}
                    className="player-frame"
                    frameBorder="0"
                    scrolling="no"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    title={`Video player for ${title} episode ${currentEpNum}`}
                    referrerPolicy="origin-when-cross-origin"
                    style={{ display: playerError ? 'none' : 'block' }}
                  />
                )}
              </>
            ) : (
              <>
                {loading && (
                  <div className="player-overlay">
                    <Loader2 size={48} className="spin" />
                    <p>Loading stream...</p>
                  </div>
                )}

                {error && !loading && (
                  <div className="player-overlay error">
                    <AlertCircle size={48} />
                    <p>{error}</p>
                    <button className="btn-primary" onClick={() => setProvider('megaplay')} style={{ marginTop: 16 }}>
                      Try MegaPlay
                    </button>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className="player-video player-frame"
                  controls
                  playsInline
                  muted={deviceType === 'mobile'}
                  autoPlay={deviceType !== 'desktop'}
                  aria-label={`Direct stream player for ${title} episode ${currentEpNum}`}
                  style={{ display: loading || error ? 'none' : 'block' }}
                  onError={() => {
                    logError('WatchPlayer', 'video-playback-failed', { sourceCount: sources.length, quality });
                    setError('Video playback failed. Try MegaPlay.');
                  }}
                />
              </>
            )}
          </div>

          <div className="player-controls-bar">
            <div className="ep-nav-btns">
              <button className="btn-ghost ep-nav-btn" onClick={() => prevEp && goEpisode(prevEp)} disabled={!prevEp}>
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="ep-label">EP {currentEpNum}</span>
              <button className="btn-ghost ep-nav-btn" onClick={() => nextEp && goEpisode(nextEp)} disabled={!nextEp}>
                Next <ChevronRight size={16} />
              </button>
            </div>

            <div className="controls-group" role="group" aria-label="Playback controls">
              <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="control-select">
                <option value="megaplay">Provider: MegaPlay</option>
                <option value="direct">Provider: Direct</option>
              </select>

              <select value={language} onChange={(event) => setLanguage(event.target.value as 'sub' | 'dub')} className="control-select">
                <option value="sub">Subtitle</option>
                <option value="dub">Dubbed</option>
              </select>

              <label className="checkbox-label">
                <input type="checkbox" checked={autoNext} onChange={(event) => setAutoNext(event.target.checked)} />
                Auto Next
              </label>
            </div>

            {provider === 'direct' && sources.length > 0 && (
              <div className="quality-row">
                {QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`quality-btn ${quality === option ? 'active' : ''}`}
                    onClick={() => setQuality(option)}
                    title={option === 'auto' ? 'Automatically select the best quality' : `Prefer ${option}`}
                  >
                    {option === 'auto' ? 'AUTO' : option.toUpperCase()}
                  </button>
                ))}
                {(hlsLevels.length > 0 || sources.length > 0) && <span className="quality-label">Quality</span>}
              </div>
            )}

            <button className="btn-ghost ep-nav-btn" onClick={() => setEpPanelOpen((open) => !open)}>
              <List size={16} /> Episodes
            </button>
          </div>

          {anime && (
            <motion.div className="watch-info-strip" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <img
                src={getAnimeThumbImage(anime)}
                alt={title}
                className="watch-thumb"
                onError={(event) => applyImageFallback(event.currentTarget)}
              />
              <div className="watch-info-text">
                <Link to={`/anime/${animeId}`} className="watch-anime-title">
                  {title}
                </Link>
                <p className="watch-ep-sub">
                  Episode {currentEpNum}
                  {episodeCount ? ` of ${episodeCount}` : ''}
                  {episodeCount ? ` ${episodeCountLabel.toLowerCase()}` : ''}
                </p>
                <div className="watch-genres">
                  {anime.genres?.slice(0, 4).map((genre) => (
                    <span key={genre} className="tag">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className={`watch-sidebar ${epPanelOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>Episodes</h3>
            <button className="icon-btn sidebar-close-btn" onClick={() => setEpPanelOpen(false)} aria-label="Close episode list">
              <X size={18} />
            </button>
          </div>
          <div className="ep-list">
            {episodes.length === 0 ? (
              <p className="ep-empty-msg">No episode list available.</p>
            ) : (
              episodes.map((episode) => (
                <button
                  key={episode.id}
                  className={`ep-item ${episode.id === decodedEpId ? 'active' : ''}`}
                  onClick={() => goEpisode(episode)}
                >
                  <span className="ep-num">EP {episode.number}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
