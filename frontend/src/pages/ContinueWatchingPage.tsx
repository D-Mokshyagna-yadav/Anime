import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, BookmarkPlus, Clock3, ListChecks, Play, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { fetchAnimeBatch, watchlistAdd, watchlistGet, watchlistRemove, watchlistUpdate, type AniMedia, type Watchlist } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { applyImageFallback, getAnimePosterImage } from '../utils/images';
import { setPageMeta } from '../utils/seo';
import './ContinueWatchingPage.css';

type LibraryTab = 'CONTINUE' | 'WATCHING' | 'COMPLETED' | 'PLAN_TO_WATCH' | 'ON_HOLD' | 'DROPPED';
type SortMode = 'recent' | 'progress' | 'alphabetical';

interface WatchHistoryItem {
  animeId: number;
  episodeId: string;
  episodeNum: number;
  title: string;
  thumb: string;
  timestamp: number;
  duration: number;
  currentTime: number;
}

interface ContinueItem extends WatchHistoryItem {
  anime?: AniMedia | null;
  watchlist?: Watchlist | null;
}

const STATUS_OPTIONS: Array<{ value: Exclude<LibraryTab, 'CONTINUE'>; label: string }> = [
  { value: 'WATCHING', label: 'Watching' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PLAN_TO_WATCH', label: 'Plan to Watch' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'DROPPED', label: 'Dropped' },
];

const TAB_LABELS: Record<LibraryTab, string> = {
  CONTINUE: 'Continue Watching',
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  PLAN_TO_WATCH: 'Plan to Watch',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
};

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Recently Watched',
  progress: 'Most Progress',
  alphabetical: 'A-Z',
};

const readWatchHistory = (): WatchHistoryItem[] => {
  try {
    const raw = JSON.parse(localStorage.getItem('watchHistory') || '{}');
    return (Object.values(raw) as unknown[])
      .filter(
        (item): item is WatchHistoryItem =>
          typeof item === 'object' && item !== null && 'animeId' in item && 'episodeId' in item && 'timestamp' in item
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

const formatRelativeTime = (timestamp: number) => {
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.round(diffDays / 7);
  return `${diffWeeks}w ago`;
};

const getDisplayTitle = (animeId: string | number, anime?: AniMedia | null, fallbackTitle?: string) =>
  fallbackTitle || anime?.title.english || anime?.title.romaji || `Anime #${animeId}`;

const sortWatchlistItems = (items: Watchlist[], sortBy: SortMode) => {
  return [...items].sort((left, right) => {
    if (sortBy === 'alphabetical') {
      return getDisplayTitle(left.animeId, left.anime).localeCompare(getDisplayTitle(right.animeId, right.anime));
    }

    if (sortBy === 'progress') {
      return (right.progress || 0) - (left.progress || 0);
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
};

const sortContinueItems = (items: ContinueItem[], sortBy: SortMode) => {
  return [...items].sort((left, right) => {
    if (sortBy === 'alphabetical') {
      return getDisplayTitle(left.animeId, left.anime, left.title).localeCompare(getDisplayTitle(right.animeId, right.anime, right.title));
    }

    if (sortBy === 'progress') {
      const leftProgress = left.duration > 0 ? left.currentTime / left.duration : 0;
      const rightProgress = right.duration > 0 ? right.currentTime / right.duration : 0;
      return rightProgress - leftProgress;
    }

    return right.timestamp - left.timestamp;
  });
};

export default function ContinueWatchingPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryTab>('CONTINUE');
  const [sortBy, setSortBy] = useState<SortMode>('recent');
  const [watchlist, setWatchlist] = useState<Watchlist[]>([]);
  const [history, setHistory] = useState<ContinueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAnimeId, setBusyAnimeId] = useState<string>('');
  const [error, setError] = useState('');

  const loadLibrary = async () => {
    setIsLoading(true);
    setError('');

    try {
      const historyItems = readWatchHistory();
      const uniqueHistoryIds = Array.from(new Set(historyItems.map((item) => item.animeId)));
      const [watchlistResponse, animeBatchResponse] = await Promise.all([
        watchlistGet(),
        uniqueHistoryIds.length > 0 ? fetchAnimeBatch(uniqueHistoryIds) : Promise.resolve({ data: { data: [] as AniMedia[] } }),
      ]);

      const nextWatchlist = watchlistResponse.data.watchlist || [];
      const animeMap = new Map<string, AniMedia>();

      for (const item of nextWatchlist) {
        if (item.anime) {
          animeMap.set(String(item.animeId), item.anime);
        }
      }

      for (const anime of animeBatchResponse.data.data || []) {
        animeMap.set(String(anime.id), anime);
      }

      const watchlistMap = new Map(nextWatchlist.map((item) => [String(item.animeId), item]));
      const nextHistory = historyItems.map((item) => ({
        ...item,
        anime: animeMap.get(String(item.animeId)) || null,
        watchlist: watchlistMap.get(String(item.animeId)) || null,
      }));

      setWatchlist(nextWatchlist);
      setHistory(nextHistory);
    } catch (libraryError) {
      console.error(libraryError);
      setError('Failed to load your library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPageMeta('Continue Watching', 'Resume episodes, manage watchlist statuses, and keep your anime library organized.');
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    void loadLibrary();
  }, [authLoading, isAuthenticated, navigate]);

  const continueItems = useMemo(() => sortContinueItems(history, sortBy), [history, sortBy]);
  const filteredWatchlist = useMemo(() => {
    if (activeTab === 'CONTINUE') return [];
    return sortWatchlistItems(
      watchlist.filter((item) => item.status === activeTab),
      sortBy
    );
  }, [activeTab, sortBy, watchlist]);

  const tabCounts = useMemo(
    () => ({
      CONTINUE: history.length,
      WATCHING: watchlist.filter((item) => item.status === 'WATCHING').length,
      COMPLETED: watchlist.filter((item) => item.status === 'COMPLETED').length,
      PLAN_TO_WATCH: watchlist.filter((item) => item.status === 'PLAN_TO_WATCH').length,
      ON_HOLD: watchlist.filter((item) => item.status === 'ON_HOLD').length,
      DROPPED: watchlist.filter((item) => item.status === 'DROPPED').length,
    }),
    [history.length, watchlist]
  );

  const handleStatusChange = async (animeId: string, nextStatus: Exclude<LibraryTab, 'CONTINUE'>) => {
    const existing = watchlist.find((item) => item.animeId === animeId);
    setBusyAnimeId(animeId);
    setError('');

    try {
      if (existing) {
        await watchlistUpdate(animeId, nextStatus);
      } else {
        await watchlistAdd(animeId, nextStatus);
      }
      await loadLibrary();
    } catch {
      setError('Failed to update your anime status.');
    } finally {
      setBusyAnimeId('');
    }
  };

  const handleRemove = async (animeId: string) => {
    setBusyAnimeId(animeId);
    setError('');

    try {
      await watchlistRemove(animeId);
      await loadLibrary();
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
    <div className="library-page">
      <Navbar />

      <section className="library-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="library-hero-copy">
            <p className="library-eyebrow">My Library</p>
            <h1>Continue Watching</h1>
            <p>Pick up right where you left off, move shows between lists, and keep your library tidy on every screen size.</p>
          </motion.div>
        </div>
      </section>

      <main className="container library-main">
        <div className="library-toolbar">
          <div className="library-tabs" role="tablist" aria-label="Library tabs">
            {(Object.keys(TAB_LABELS) as LibraryTab[]).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`library-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span>{TAB_LABELS[tab]}</span>
                <strong>{tabCounts[tab]}</strong>
              </button>
            ))}
          </div>

          <div className="library-sort">
            <span>Sort by:</span>
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <button
                key={mode}
                className={`sort-chip ${sortBy === mode ? 'active' : ''}`}
                onClick={() => setSortBy(mode)}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="library-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="library-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="library-skeleton" />
            ))}
          </div>
        ) : activeTab === 'CONTINUE' ? (
          continueItems.length > 0 ? (
            <div className="library-grid">
              {continueItems.map((item, index) => {
                const animeId = String(item.animeId);
                const displayTitle = getDisplayTitle(animeId, item.anime, item.title);
                const poster = item.anime ? getAnimePosterImage(item.anime) : item.thumb;
                const progress = item.duration > 0 ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0;

                return (
                  <motion.article
                    key={`${animeId}-${item.episodeId}`}
                    className="library-card"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link to={`/watch/${animeId}/${encodeURIComponent(item.episodeId)}`} className="library-poster">
                      <img src={poster} alt={displayTitle} onError={(event) => applyImageFallback(event.currentTarget)} />
                      <span className="library-badge">
                        <Play size={14} fill="currentColor" />
                        Episode {item.episodeNum}
                      </span>
                    </Link>

                    <div className="library-card-body">
                      <div className="library-card-heading">
                        <div>
                          <h2>{displayTitle}</h2>
                          <p className="library-meta-line">
                            <Clock3 size={14} />
                            Watched {formatRelativeTime(item.timestamp)}
                          </p>
                        </div>
                        {item.watchlist && (
                          <span className="status-pill">{TAB_LABELS[item.watchlist.status as Exclude<LibraryTab, 'CONTINUE'>]}</span>
                        )}
                      </div>

                      <div className="library-progress">
                        <div className="library-progress-bar">
                          <div className="library-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="library-progress-copy">
                          <span>{progress}% watched</span>
                          <span>{Math.max(1, Math.round(item.currentTime / 60))}m in</span>
                        </div>
                      </div>

                      <div className="library-card-actions">
                        <select
                          className="library-select"
                          value={item.watchlist?.status || 'WATCHING'}
                          disabled={busyAnimeId === animeId}
                          onChange={(event) => handleStatusChange(animeId, event.target.value as Exclude<LibraryTab, 'CONTINUE'>)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <Link to={`/watch/${animeId}/${encodeURIComponent(item.episodeId)}`} className="btn-primary library-link-btn">
                          Resume
                        </Link>

                        {item.watchlist ? (
                          <button className="icon-action danger" onClick={() => handleRemove(animeId)} disabled={busyAnimeId === animeId}>
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            className="icon-action"
                            onClick={() => handleStatusChange(animeId, 'WATCHING')}
                            disabled={busyAnimeId === animeId}
                            title="Add to watchlist"
                          >
                            <BookmarkPlus size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="library-empty">
              <ListChecks size={44} />
              <h2>No recent episodes yet</h2>
              <p>Start an anime and your resume cards will show up here automatically.</p>
              <Link to="/" className="btn-primary">
                Browse Anime
              </Link>
            </div>
          )
        ) : filteredWatchlist.length > 0 ? (
          <div className="library-grid">
            {filteredWatchlist.map((item, index) => {
              const animeId = String(item.animeId);
              const displayTitle = getDisplayTitle(animeId, item.anime);
              const historyItem = history.find((entry) => String(entry.animeId) === animeId);
              const poster = item.anime ? getAnimePosterImage(item.anime) : historyItem?.thumb || '';

              return (
                <motion.article
                  key={item.id}
                  className="library-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    to={historyItem ? `/watch/${animeId}/${encodeURIComponent(historyItem.episodeId)}` : `/anime/${animeId}`}
                    className="library-poster"
                  >
                    <img src={poster} alt={displayTitle} onError={(event) => applyImageFallback(event.currentTarget)} />
                    <span className="library-badge">{TAB_LABELS[item.status as Exclude<LibraryTab, 'CONTINUE'>]}</span>
                  </Link>

                  <div className="library-card-body">
                    <div className="library-card-heading">
                      <div>
                        <h2>{displayTitle}</h2>
                        <p className="library-meta-line">
                          Updated {formatRelativeTime(new Date(item.updatedAt).getTime())}
                        </p>
                      </div>
                      {item.anime?.averageScore ? <span className="score-pill">{(item.anime.averageScore / 10).toFixed(1)}</span> : null}
                    </div>

                    <div className="library-chip-row">
                      {item.anime?.genres?.slice(0, 3).map((genre) => (
                        <span key={genre} className="mini-tag">
                          {genre}
                        </span>
                      ))}
                    </div>

                    <div className="library-progress-copy standalone">
                      <span>Progress: Episode {Math.max(0, item.progress || 0)}</span>
                      {item.anime?.episodes ? <span>{item.anime.episodes} total</span> : null}
                    </div>

                    <div className="library-card-actions">
                      <select
                        className="library-select"
                        value={item.status}
                        disabled={busyAnimeId === animeId}
                        onChange={(event) => handleStatusChange(animeId, event.target.value as Exclude<LibraryTab, 'CONTINUE'>)}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <Link
                        to={historyItem ? `/watch/${animeId}/${encodeURIComponent(historyItem.episodeId)}` : `/anime/${animeId}`}
                        className="btn-ghost library-link-btn"
                      >
                        {historyItem ? 'Resume' : 'View'}
                      </Link>

                      <button className="icon-action danger" onClick={() => handleRemove(animeId)} disabled={busyAnimeId === animeId}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="library-empty">
            <ListChecks size={44} />
            <h2>No anime in {TAB_LABELS[activeTab]}</h2>
            <p>Move a show into this status from another tab or add one from any anime page.</p>
            <Link to="/watchlist" className="btn-ghost">
              Open Watchlist
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
