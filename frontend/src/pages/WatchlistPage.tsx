import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Bookmark, Play, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { watchlistGet, watchlistRemove, watchlistUpdate, type Watchlist } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { applyImageFallback, getAnimePosterImage } from '../utils/images';
import { setPageMeta } from '../utils/seo';
import './WatchlistPage.css';

type WatchlistFilter = '' | 'PLAN_TO_WATCH' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED';

interface WatchHistoryLookup {
  [animeId: string]: {
    episodeId: string;
  };
}

const STATUS_LABELS: Record<Exclude<WatchlistFilter, ''>, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as Array<[Exclude<WatchlistFilter, ''>, string]>;

const readWatchHistoryLookup = (): WatchHistoryLookup => {
  try {
    const raw = JSON.parse(localStorage.getItem('watchHistory') || '{}');
    return (Object.values(raw) as unknown[]).reduce<WatchHistoryLookup>((acc, item) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        'animeId' in item &&
        'episodeId' in item &&
        typeof item.animeId !== 'undefined' &&
        typeof item.episodeId === 'string'
      ) {
        acc[String(item.animeId)] = { episodeId: item.episodeId };
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const getAnimeTitle = (item: Watchlist) => item.anime?.title.english || item.anime?.title.romaji || `Anime #${item.animeId}`;

export default function WatchlistPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<Watchlist[]>([]);
  const [historyLookup, setHistoryLookup] = useState<WatchHistoryLookup>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WatchlistFilter>('');
  const [query, setQuery] = useState('');
  const [busyAnimeId, setBusyAnimeId] = useState('');
  const [error, setError] = useState('');

  const loadWatchlist = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await watchlistGet(filter || undefined);
      setWatchlist(response.data.watchlist || []);
      setHistoryLookup(readWatchHistoryLookup());
    } catch {
      setError('Failed to load your watchlist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPageMeta('Watchlist', 'Track anime by status, edit entries quickly, and jump back into the next episode.');
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    void loadWatchlist();
  }, [authLoading, filter, isAuthenticated, navigate]);

  const counts = useMemo(
    () => ({
      all: watchlist.length,
      PLAN_TO_WATCH: watchlist.filter((item) => item.status === 'PLAN_TO_WATCH').length,
      WATCHING: watchlist.filter((item) => item.status === 'WATCHING').length,
      COMPLETED: watchlist.filter((item) => item.status === 'COMPLETED').length,
      ON_HOLD: watchlist.filter((item) => item.status === 'ON_HOLD').length,
      DROPPED: watchlist.filter((item) => item.status === 'DROPPED').length,
    }),
    [watchlist]
  );

  const filteredWatchlist = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return watchlist.filter((item) => {
      if (!normalizedQuery) return true;

      const title = getAnimeTitle(item).toLowerCase();
      const genres = item.anime?.genres?.join(' ').toLowerCase() || '';
      return title.includes(normalizedQuery) || genres.includes(normalizedQuery);
    });
  }, [query, watchlist]);

  const handleStatusChange = async (animeId: string, nextStatus: Exclude<WatchlistFilter, ''>) => {
    setBusyAnimeId(animeId);
    setError('');

    try {
      await watchlistUpdate(animeId, nextStatus);
      await loadWatchlist();
    } catch {
      setError('Failed to update the watchlist status.');
    } finally {
      setBusyAnimeId('');
    }
  };

  const handleRemove = async (animeId: string) => {
    setBusyAnimeId(animeId);
    setError('');

    try {
      await watchlistRemove(animeId);
      await loadWatchlist();
    } catch {
      setError('Failed to remove the anime from your watchlist.');
    } finally {
      setBusyAnimeId('');
    }
  };

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  return (
    <div className="watchlist-page">
      <Navbar />

      <section className="watchlist-shell container">
        <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="watchlist-header">
          <div>
            <p className="watchlist-kicker">Organized Anime</p>
            <h1>Watchlist</h1>
            <p>Edit statuses instantly, keep everything grouped, and jump straight back into the last episode you opened.</p>
          </div>
          <Link to="/continue-watching" className="btn-ghost">
            Continue Watching
          </Link>
        </motion.header>

        <div className="watchlist-toolbar">
          <div className="watchlist-filters" role="tablist" aria-label="Watchlist filters">
            <button className={`filter-pill ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>
              All <strong>{counts.all}</strong>
            </button>
            {STATUS_OPTIONS.map(([status, label]) => (
              <button key={status} className={`filter-pill ${filter === status ? 'active' : ''}`} onClick={() => setFilter(status)}>
                {label} <strong>{counts[status]}</strong>
              </button>
            ))}
          </div>

          <label className="watchlist-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or genre" />
          </label>
        </div>

        {error && (
          <div className="watchlist-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="watchlist-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="watchlist-skeleton" />
            ))}
          </div>
        ) : filteredWatchlist.length > 0 ? (
          <div className="watchlist-grid">
            {filteredWatchlist.map((item, index) => {
              const animeId = String(item.animeId);
              const title = getAnimeTitle(item);
              const historyItem = historyLookup[animeId];
              const href = historyItem ? `/watch/${animeId}/${encodeURIComponent(historyItem.episodeId)}` : `/anime/${animeId}`;

              return (
                <motion.article
                  key={item.id}
                  className="watchlist-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link to={href} className="watchlist-poster">
                    <img
                      src={item.anime ? getAnimePosterImage(item.anime) : ''}
                      alt={title}
                      onError={(event) => applyImageFallback(event.currentTarget)}
                    />
                    <span className="watchlist-status-badge">{STATUS_LABELS[item.status as Exclude<WatchlistFilter, ''>]}</span>
                  </Link>

                  <div className="watchlist-card-body">
                    <div className="watchlist-title-row">
                      <div>
                        <h2>{title}</h2>
                        <p>Updated {new Date(item.updatedAt).toLocaleDateString()}</p>
                      </div>
                      {item.anime?.averageScore ? <span className="watchlist-score">{(item.anime.averageScore / 10).toFixed(1)}</span> : null}
                    </div>

                    <div className="watchlist-genres">
                      {item.anime?.genres?.slice(0, 3).map((genre) => (
                        <span key={genre}>{genre}</span>
                      ))}
                    </div>

                    <div className="watchlist-meta">
                      <span>{item.progress || 0} episodes tracked</span>
                      {item.anime?.episodes ? <span>{item.anime.episodes} total episodes</span> : null}
                    </div>

                    <div className="watchlist-actions">
                      <select
                        className="watchlist-select"
                        value={item.status}
                        disabled={busyAnimeId === animeId}
                        onChange={(event) => handleStatusChange(animeId, event.target.value as Exclude<WatchlistFilter, ''>)}
                      >
                        {STATUS_OPTIONS.map(([status, label]) => (
                          <option key={status} value={status}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <Link to={href} className="btn-primary watchlist-link-btn">
                        {historyItem ? (
                          <>
                            <Play size={16} fill="currentColor" /> Resume
                          </>
                        ) : (
                          'View'
                        )}
                      </Link>

                      <button className="watchlist-icon-btn" onClick={() => handleRemove(animeId)} disabled={busyAnimeId === animeId}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="watchlist-empty">
            <Bookmark size={42} />
            <h2>Your watchlist is quiet right now</h2>
            <p>Add anime from any detail page, then come back here to move them between statuses.</p>
            <Link to="/search" className="btn-primary">
              Explore Anime
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
