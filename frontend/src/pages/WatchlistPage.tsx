import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import type { Watchlist } from '../api/client';
import { watchlistGet, watchlistRemove } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './WatchlistPage.css';

const STATUS_LABELS: Record<string, string> = {
  PLAN_TO_WATCH: '📋 Planning',
  WATCHING: '▶️ Watching',
  COMPLETED: '✅ Completed',
  ON_HOLD: '⏸️ On Hold',
  DROPPED: '❌ Dropped',
};

export default function WatchlistPage() {
  const { isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    watchlistGet(filter || undefined)
      .then(r => setWatchlist(r.data.watchlist || []))
      .catch(() => setError('Failed to load watchlist'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, filter]);

  const handleRemove = async (animeId: string) => {
    try {
      await watchlistRemove(animeId);
      setWatchlist(w => w.filter(item => item.animeId !== animeId));
    } catch {
      setError('Failed to remove from watchlist');
    }
  };

  const grouped = watchlist.reduce((acc, item) => {
    if (!acc[item.status]) acc[item.status] = [];
    acc[item.status].push(item);
    return acc;
  }, {} as Record<string, Watchlist[]>);

  if (!isAuthenticated) {
    return (
      <div className="page">
        <Navbar />
        <div className="container" style={{ marginTop: 80, textAlign: 'center', padding: '40px 20px' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.6 }} />
          <h2>Sign in required</h2>
          <p style={{ marginBottom: 24 }}>You need to be logged in to view your watchlist.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <div className="container watchlist-container">
        <div className="watchlist-header">
          <h1>My Watchlist</h1>
          <p>{watchlist.length} anime</p>
        </div>

        {error && (
          <div className="watchlist-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="watchlist-filters">
          {['', 'PLAN_TO_WATCH', 'WATCHING', 'COMPLETED'].map(status => (
            <button
              key={status}
              className={`filter-btn ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status ? STATUS_LABELS[status] : 'All'}
              {!status ? ` (${watchlist.length})` : ` (${(grouped[status] || []).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p>Loading watchlist...</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6 }}>
            <Bookmark size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <p>Your watchlist is empty</p>
            <Link to="/search" className="btn-ghost" style={{ marginTop: 16, display: 'inline-block' }}>
              Explore Anime <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          Object.entries(grouped).map(([status, items]) => (
            <div key={status} className="watchlist-group">
              <h2 className="group-title">{STATUS_LABELS[status]}</h2>
              <div className="watchlist-grid">
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    className="watchlist-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="item-header">
                      <h3>{item.animeId}</h3>
                      <button
                        className="remove-btn"
                        onClick={() => handleRemove(item.animeId)}
                        title="Remove from watchlist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {item.progress > 0 && (
                      <div className="item-progress">
                        <span>{item.progress} episodes watched</span>
                      </div>
                    )}
                    <div className="item-footer">
                      <Link to={`/anime/${item.animeId}`} className="btn-ghost">
                        View <ChevronRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
