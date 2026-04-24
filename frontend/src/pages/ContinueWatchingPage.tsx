import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Home } from 'lucide-react';
import { setPageMeta } from '../utils/seo';
import './ContinueWatchingPage.css';

interface ContinueWatchingAnime {
  id: string;
  title: string;
  poster: string;
  currentEpisode: number;
  totalEpisodes: number;
  season: number;
  progress: number; // percentage
  lastWatched: string;
  animeId: string;
}

const ContinueWatchingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<ContinueWatchingAnime[]>([]);
  const [sortBy, setSortBy] = useState('recent');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPageMeta('Continue Watching', 'Resume watching your anime from where you left off.');

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadContinueWatching();
  }, [isAuthenticated, navigate]);

  const loadContinueWatching = async () => {
    try {
      setIsLoading(true);
      // In a real app, fetch from backend
      // const response = await fetchContinueWatching();

      // Mock data
      setAnime([
        {
          id: '1',
          title: 'Jujutsu Kaisen',
          poster: 'https://images.unsplash.com/image-placeholder?w=250&h=350',
          currentEpisode: 12,
          totalEpisodes: 25,
          season: 2,
          progress: 48,
          lastWatched: '2 hours ago',
          animeId: '1',
        },
        {
          id: '2',
          title: 'Chainsaw Man',
          poster: 'https://images.unsplash.com/image-placeholder?w=250&h=350',
          currentEpisode: 8,
          totalEpisodes: 12,
          season: 1,
          progress: 67,
          lastWatched: '1 day ago',
          animeId: '2',
        },
        {
          id: '3',
          title: 'Vinland Saga',
          poster: 'https://images.unsplash.com/image-placeholder?w=250&h=350',
          currentEpisode: 15,
          totalEpisodes: 24,
          season: 2,
          progress: 63,
          lastWatched: '3 days ago',
          animeId: '3',
        },
        {
          id: '4',
          title: "Steins;Gate",
          poster: 'https://images.unsplash.com/image-placeholder?w=250&h=350',
          currentEpisode: 24,
          totalEpisodes: 24,
          season: 1,
          progress: 100,
          lastWatched: '1 week ago',
          animeId: '4',
        },
      ]);
    } catch (err) {
      console.error('Failed to load continue watching:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSortedAnime = () => {
    const sorted = [...anime];
    
    switch (sortBy) {
      case 'progress':
        return sorted.sort((a, b) => b.progress - a.progress);
      case 'alphabetical':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'recent':
      default:
        return sorted; // Already sorted by lastWatched
    }
  };

  const sortedAnime = getSortedAnime();

  if (!isAuthenticated) {
    return null;
  }

  if (anime.length === 0 && !isLoading) {
    return (
      <div className="continue-watching-container">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-section"
        >
          <h1>Continue Watching</h1>
          <p className="hero-subtitle">Resume from where you left off</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
        >
          <div className="empty-icon">📺</div>
          <h2>No Anime in Progress</h2>
          <p>Start watching something to see it here!</p>
          <Link to="/" className="btn-home">
            <Home size={18} />
            Go to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="continue-watching-container">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-section"
      >
        <h1>Continue Watching</h1>
        <p className="hero-subtitle">Resume from where you left off</p>
      </motion.div>

      {/* Sort Options */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sort-section"
      >
        <label>Sort by:</label>
        <div className="sort-buttons">
          <button
            onClick={() => setSortBy('recent')}
            className={`sort-btn ${sortBy === 'recent' ? 'active' : ''}`}
          >
            Recently Watched
          </button>
          <button
            onClick={() => setSortBy('progress')}
            className={`sort-btn ${sortBy === 'progress' ? 'active' : ''}`}
          >
            Most Progress
          </button>
          <button
            onClick={() => setSortBy('alphabetical')}
            className={`sort-btn ${sortBy === 'alphabetical' ? 'active' : ''}`}
          >
            A-Z
          </button>
        </div>
      </motion.div>

      {/* Anime Grid */}
      {isLoading ? (
        <div className="loading-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="anime-grid"
        >
          {sortedAnime.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="continue-card"
            >
              <div className="card-poster">
                <img src={item.poster} alt={item.title} />
                <div className="poster-overlay" />

                {/* Resume Button */}
                <Link
                  to={`/watch/${item.animeId}/${item.currentEpisode}`}
                  className="btn-resume"
                >
                  <Play size={24} fill="currentColor" />
                  <span>Resume</span>
                </Link>

                {/* Episode Badge */}
                <div className="episode-badge">
                  S{item.season} E{item.currentEpisode}
                </div>
              </div>

              <div className="card-info">
                <h3 className="card-title">{item.title}</h3>
                
                <div className="progress-section">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {item.currentEpisode} / {item.totalEpisodes}
                  </span>
                </div>

                <p className="last-watched">
                  Watched {item.lastWatched}
                </p>

                <Link
                  to={`/watch/${item.animeId}/${item.currentEpisode}`}
                  className="btn-resume-text"
                >
                  Resume Watching
                  <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ContinueWatchingPage;
