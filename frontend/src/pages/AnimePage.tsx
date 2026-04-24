import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Plus, Star, Clock, Tv, Calendar, ChevronRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import type { AniMedia, Watchlist } from '../api/client';
import { fetchAnimeById, fetchEpisodes, watchlistAdd, watchlistGet } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getEpisodeCountLabel, getExpectedEpisodeCount } from '../utils/anime';
import { buildEpisodePlaceholders, getEpisodeLookupParams } from '../utils/episodes';
import {
  applyImageFallback,
  buildBackgroundImage,
  getAnimeBannerImage,
  getAnimePosterImage,
} from '../utils/images';
import './AnimePage.css';

interface Episode {
  id: string;
  number: number;
  url: string;
}

const EPISODES_PER_PAGE = 100;

export default function AnimePage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [anime, setAnime] = useState<AniMedia | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [watchlistItem, setWatchlistItem] = useState<Watchlist | null>(null);
  const [tab, setTab] = useState<'sub' | 'dub'>('sub');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [epLoading, setEpLoading] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    setAnime(null);
    setEpisodes([]);
    setCurrentPage(1);
    setShowFullDesc(false);
    setError('');
    setLoading(true);

    fetchAnimeById(Number(id))
      .then((response) => {
        const animeData = response.data.data;
        setAnime(animeData);

        const { slug, params } = getEpisodeLookupParams(animeData);
        if (!slug) return;

        setEpLoading(true);

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
          })
          .finally(() => setEpLoading(false));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setCurrentPage((page) => {
      const maxPage = Math.max(1, Math.ceil(episodes.length / EPISODES_PER_PAGE));
      return Math.min(page, maxPage);
    });
  }, [episodes.length]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    watchlistGet()
      .then((response) => {
        const item = response.data.watchlist?.find((watchlistEntry) => watchlistEntry.animeId === id);
        setWatchlistItem(item || null);
      })
      .catch(console.error);
  }, [isAuthenticated, id]);

  const handleAddToWatchlist = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to add to watchlist');
      return;
    }

    if (!id) return;

    setAddingToWatchlist(true);
    try {
      await watchlistAdd(id, 'PLAN_TO_WATCH');
      setWatchlistItem({
        id: `${id}-1`,
        userId: '',
        animeId: id,
        status: 'PLAN_TO_WATCH',
        progress: 0,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setError('Failed to add to watchlist');
    } finally {
      setAddingToWatchlist(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Navbar />
        <div className="anime-skeleton container">
          <div className="skeleton" style={{ height: 420, borderRadius: 16, marginTop: 80 }} />
          <div className="skeleton" style={{ height: 24, width: '40%', marginTop: 24, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 16, width: '70%', marginTop: 12, borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="page">
        <Navbar />
        <p style={{ marginTop: 120, textAlign: 'center' }}>Anime not found.</p>
      </div>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const desc = anime.description?.replace(/<[^>]+>/g, '') || 'No description available.';
  const studio = anime.studios?.nodes?.[0]?.name;
  const firstEpisode = episodes[0];
  const posterImage = getAnimePosterImage(anime);
  const bannerImage = getAnimeBannerImage(anime);
  const episodeCount = getExpectedEpisodeCount(anime);
  const episodeLabel = getEpisodeCountLabel(anime);

  return (
    <div className="page">
      <Navbar />

      <div
        className="anime-banner"
        style={{
          backgroundImage: buildBackgroundImage(anime.bannerImage, bannerImage),
        }}
      >
        <div className="anime-banner-overlay" />
      </div>

      <div className="container anime-layout">
        <motion.div
          className="anime-detail-poster-col"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={posterImage}
            alt={title}
            className="anime-detail-poster"
            style={{ width: '100%', height: '340px', objectFit: 'cover', borderRadius: '14px' }}
            onError={(event) => applyImageFallback(event.currentTarget)}
          />
          <div className="anime-detail-poster-actions">
            {firstEpisode ? (
              <Link to={`/watch/${id}/${encodeURIComponent(firstEpisode.id)}`} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Play size={17} fill="white" /> Watch Now
              </Link>
            ) : (
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: 0.5 }} disabled>
                <Play size={17} fill="white" /> No Episodes
              </button>
            )}

            <button
              className={`btn-ghost ${watchlistItem ? 'active' : ''}`}
              onClick={handleAddToWatchlist}
              disabled={addingToWatchlist || !isAuthenticated}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {watchlistItem ? (
                <>
                  <Check size={17} /> In Watchlist
                </>
              ) : (
                <>
                  <Plus size={17} /> Add to Watchlist
                </>
              )}
            </button>

            {!isAuthenticated && (
              <p style={{ fontSize: '0.75rem', opacity: 0.5, margin: '8px 0 0' }}>Sign in to add to watchlist</p>
            )}
            {error && <p style={{ fontSize: '0.8rem', color: 'var(--danger)', margin: '8px 0 0' }}>{error}</p>}
          </div>

          <div className="anime-meta-card">
            <MetaRow label="Status" value={anime.status} />
            <MetaRow label="Format" value={anime.format} />
            {episodeCount && <MetaRow label={episodeLabel} value={String(episodeCount)} />}
            {anime.duration && <MetaRow label="Duration" value={`${anime.duration} min`} />}
            {studio && <MetaRow label="Studio" value={studio} />}
            {anime.seasonYear && <MetaRow label="Year" value={String(anime.seasonYear)} />}
          </div>
        </motion.div>

        <motion.div
          className="anime-info-col"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="anime-badges">
            {anime.season && <span className="tag">{anime.season} {anime.seasonYear}</span>}
            <span className={`status-dot status-${anime.status?.toLowerCase()}`}>{anime.status}</span>
          </div>

          <h1 className="anime-title">{title}</h1>
          {anime.title.native && <p className="anime-native">{anime.title.native}</p>}

          <div className="anime-score-row">
            {score && (
              <div className="score-block">
                <Star size={18} fill="var(--warning)" color="var(--warning)" />
                <span className="score-val">{score}</span>
                <span className="score-label">/ 10</span>
              </div>
            )}
            {anime.popularity && (
              <div className="info-stat">
                <Tv size={15} />
                {anime.popularity.toLocaleString()} fans
              </div>
            )}
            {anime.duration && (
              <div className="info-stat">
                <Clock size={15} />
                {anime.duration} min/ep
              </div>
            )}
            {anime.seasonYear && (
              <div className="info-stat">
                <Calendar size={15} />
                {anime.seasonYear}
              </div>
            )}
          </div>

          <div className="anime-genres">
            {anime.genres?.map((genre) => (
              <span key={genre} className="tag">
                {genre}
              </span>
            ))}
          </div>

          <div className="anime-desc-block">
            <p className="anime-desc">
              {showFullDesc ? desc : desc.slice(0, 350) + (desc.length > 350 ? '...' : '')}
            </p>
            {desc.length > 350 && (
              <button className="read-more" onClick={() => setShowFullDesc(!showFullDesc)}>
                {showFullDesc ? 'Show less' : 'Read more'} <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="episodes-block">
            <div className="ep-header">
              <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Episodes</h2>
              <div className="ep-tabs">
                <button className={`ep-tab ${tab === 'sub' ? 'active' : ''}`} onClick={() => setTab('sub')}>
                  SUB
                </button>
                <button className={`ep-tab ${tab === 'dub' ? 'active' : ''}`} onClick={() => setTab('dub')}>
                  DUB
                </button>
              </div>
            </div>

            {epLoading && (
              <div className="ep-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="skeleton" style={{ height: 42, borderRadius: 8 }} />
                ))}
              </div>
            )}

            {!epLoading && episodes.length === 0 && (
              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                <p style={{ margin: 0, color: 'var(--text)', fontWeight: 500 }}>Episodes Not Available</p>
                <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-faint)' }}>
                  Episode data is currently unavailable for this anime. The streaming providers may not have it indexed yet.
                </p>
                {episodeCount && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-faint)' }}>
                    This anime currently has {episodeCount} {episodeLabel.toLowerCase()} episode{episodeCount !== 1 ? 's' : ''}.
                  </p>
                )}
              </div>
            )}

            {!epLoading && episodes.length > 0 && (
              <>
                <div className="ep-grid">
                  {episodes
                    .slice((currentPage - 1) * EPISODES_PER_PAGE, currentPage * EPISODES_PER_PAGE)
                    .map((episode) => (
                      <Link key={episode.id} to={`/watch/${id}/${encodeURIComponent(episode.id)}`} className="ep-pill">
                        {episode.number}
                      </Link>
                    ))}
                </div>

                {episodes.length > EPISODES_PER_PAGE && (
                  <div className="ep-pagination">
                    <button className="ep-nav-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                      Prev
                    </button>
                    <span className="ep-page-info">
                      Page {currentPage} of {Math.ceil(episodes.length / EPISODES_PER_PAGE)}
                      <br />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                        Episodes {(currentPage - 1) * EPISODES_PER_PAGE + 1} - {Math.min(currentPage * EPISODES_PER_PAGE, episodes.length)}
                      </span>
                    </span>
                    <button
                      className="ep-nav-btn"
                      onClick={() => setCurrentPage((page) => Math.min(Math.ceil(episodes.length / EPISODES_PER_PAGE), page + 1))}
                      disabled={currentPage === Math.ceil(episodes.length / EPISODES_PER_PAGE)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="meta-row">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{value}</span>
    </div>
  );
}
