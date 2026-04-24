import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Bookmark, Clock3, LogOut, Settings, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { fetchAnimeBatch, profileGet, type AniMedia, type UserStats } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { applyImageFallback, DEFAULT_PROFILE_AVATAR, getAnimePosterImage } from '../utils/images';
import { setPageMeta } from '../utils/seo';
import './ProfilePage.css';

interface WatchHistoryItem {
  animeId: number;
  episodeId: string;
  episodeNum: number;
  title: string;
  thumb: string;
  timestamp: number;
}

const readHistory = (): WatchHistoryItem[] => {
  try {
    const raw = JSON.parse(localStorage.getItem('watchHistory') || '{}');
    return (Object.values(raw) as WatchHistoryItem[]).sort((left, right) => right.timestamp - left.timestamp).slice(0, 6);
  } catch {
    return [];
  }
};

const relativeTime = (timestamp: number) => {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({
    totalWatched: 0,
    watchingCount: 0,
    completedCount: 0,
    reviewsWritten: 0,
  });
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [animeMap, setAnimeMap] = useState<Record<string, AniMedia>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return 'Recently joined';
    return new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [user?.createdAt]);

  useEffect(() => {
    setPageMeta('Profile', 'View your account summary, recent anime activity, and quick library shortcuts.');
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const nextHistory = readHistory();
        const [profileResponse, animeResponse] = await Promise.all([
          profileGet(),
          nextHistory.length > 0 ? fetchAnimeBatch(nextHistory.map((item) => item.animeId)) : Promise.resolve({ data: { data: [] as AniMedia[] } }),
        ]);

        setStats(profileResponse.data.stats);
        setHistory(nextHistory);
        setAnimeMap(
          Object.fromEntries((animeResponse.data.data || []).map((anime) => [String(anime.id), anime]))
        );
      } catch (profileError) {
        console.error(profileError);
        setError('Failed to load your profile summary.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  return (
    <div className="profile-page">
      <Navbar />

      <main className="container profile-shell">
        <motion.section initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="profile-hero-card">
          <div className="profile-avatar-wrap">
            <img src={user?.avatarUrl || DEFAULT_PROFILE_AVATAR} alt={user?.email || 'Profile avatar'} className="profile-avatar" />
            <div>
              <p className="profile-kicker">Account Overview</p>
              <h1>{user?.email?.split('@')[0] || 'Anime Fan'}</h1>
              <p className="profile-email">{user?.email}</p>
              <span className="profile-member">Member since {memberSince}</span>
            </div>
          </div>

          <div className="profile-hero-actions">
            <Link to="/settings" className="btn-primary">
              <Settings size={16} />
              Settings
            </Link>
            <button className="btn-ghost" onClick={handleLogout}>
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </motion.section>

        {error && (
          <div className="profile-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <section className="profile-stats-grid">
          <div className="profile-stat-card">
            <strong>{stats.totalWatched}</strong>
            <span>Episodes tracked</span>
          </div>
          <div className="profile-stat-card">
            <strong>{stats.watchingCount}</strong>
            <span>Currently watching</span>
          </div>
          <div className="profile-stat-card">
            <strong>{stats.completedCount}</strong>
            <span>Completed series</span>
          </div>
          <div className="profile-stat-card">
            <strong>{stats.reviewsWritten}</strong>
            <span>Reviews written</span>
          </div>
        </section>

        <section className="profile-panels">
          <div className="profile-panel">
            <div className="profile-panel-header">
              <div>
                <p className="profile-panel-kicker">Resume Queue</p>
                <h2>Recent activity</h2>
              </div>
              <Link to="/continue-watching" className="btn-ghost">
                View Library
              </Link>
            </div>

            {loading ? (
              <div className="profile-history-grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="profile-skeleton" />
                ))}
              </div>
            ) : history.length > 0 ? (
              <div className="profile-history-grid">
                {history.map((item) => {
                  const anime = animeMap[String(item.animeId)];
                  const poster = anime ? getAnimePosterImage(anime) : item.thumb;

                  return (
                    <Link
                      key={`${item.animeId}-${item.episodeId}`}
                      to={`/watch/${item.animeId}/${encodeURIComponent(item.episodeId)}`}
                      className="profile-history-card"
                    >
                      <img src={poster} alt={item.title} onError={(event) => applyImageFallback(event.currentTarget)} />
                      <div className="profile-history-copy">
                        <h3>{anime?.title.english || anime?.title.romaji || item.title}</h3>
                        <p>
                          Episode {item.episodeNum}
                          <span>
                            <Clock3 size={14} />
                            {relativeTime(item.timestamp)}
                          </span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="profile-empty">
                <Sparkles size={30} />
                <p>Your recent episodes will show up here after you start watching.</p>
              </div>
            )}
          </div>

          <div className="profile-panel sidebar">
            <div className="profile-panel-header">
              <div>
                <p className="profile-panel-kicker">Quick Actions</p>
                <h2>Shortcuts</h2>
              </div>
            </div>

            <div className="profile-shortcuts">
              <Link to="/continue-watching" className="profile-shortcut">
                <Clock3 size={18} />
                <div>
                  <strong>Continue Watching</strong>
                  <span>Resume your latest episodes instantly.</span>
                </div>
              </Link>

              <Link to="/watchlist" className="profile-shortcut">
                <Bookmark size={18} />
                <div>
                  <strong>Watchlist</strong>
                  <span>Move anime between watching, completed, and more.</span>
                </div>
              </Link>

              <Link to="/settings" className="profile-shortcut">
                <Settings size={18} />
                <div>
                  <strong>Appearance & Avatar</strong>
                  <span>Change your anime avatar and playback defaults.</span>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
