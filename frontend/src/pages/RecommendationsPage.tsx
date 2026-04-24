import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Plus,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { setPageMeta } from '../utils/seo';
import './RecommendationsPage.css';

interface RecommendedAnime {
  id: string;
  title: string;
  poster: string;
  rating: number;
  similarity: number;
}

interface RecommendationSection {
  id: string;
  title: string;
  description?: string;
  anime: RecommendedAnime[];
}

const RecommendationsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const genres = ['All Genres', 'Action', 'Romance', 'Sci-Fi', 'Comedy', 'Drama', 'Thriller'];

  useEffect(() => {
    setPageMeta('Recommendations', 'Get personalized anime recommendations based on your watchlist on SensuiWatch.');

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadRecommendations();
  }, [isAuthenticated, navigate]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      // In a real app, fetch from backend
      // const response = await fetchRecommendations(selectedGenres);

      // Mock data
      const mockAnime = (count: number): RecommendedAnime[] =>
        Array.from({ length: count }, (_, i) => ({
          id: `anime-${i}`,
          title: ['Jujutsu Kaisen', 'Chainsaw Man', 'Vinland Saga', "Steins;Gate", 'Attack on Titan'][i % 5],
          poster: 'https://images.unsplash.com/image-placeholder?w=200&h=300',
          rating: 4 + Math.random(),
          similarity: 75 + Math.random() * 25,
        }));

      setSections([
        {
          id: 'based-on-watchlist',
          title: 'Based on Your Watchlist',
          description: 'Anime similar to what you are watching',
          anime: mockAnime(8),
        },
        {
          id: 'trending-week',
          title: 'Trending This Week',
          description: 'Most popular anime in the community',
          anime: mockAnime(8),
        },
        {
          id: 'hidden-gems',
          title: 'Hidden Gems You Missed',
          description: 'Underrated anime with excellent ratings',
          anime: mockAnime(8),
        },
      ]);

      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreFilter = (genre: string) => {
    if (genre === 'All Genres') {
      setSelectedGenres([]);
    } else {
      setSelectedGenres(prev =>
        prev.includes(genre)
          ? prev.filter(g => g !== genre)
          : [...prev, genre]
      );
    }
  };

  const scroll = (sectionId: string, direction: 'left' | 'right') => {
    const ref = scrollRefs.current[sectionId];
    if (ref) {
      const scrollAmount = 300;
      if (direction === 'left') {
        ref.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        ref.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const handleAddToWatchlist = (animeId: string) => {
    console.log('Adding to watchlist:', animeId);
    // TODO: Implement add to watchlist
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="recommendations-container">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="recommendations-hero"
      >
        <div className="hero-content">
          <h1 className="hero-title">Recommended For You</h1>
          <p className="hero-subtitle">
            Personalized recommendations based on your watchlist and preferences
          </p>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="error-alert"
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Filter Chips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="filter-section"
      >
        <div className="filter-chips">
          {genres.map(genre => (
            <motion.button
              key={genre}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleGenreFilter(genre)}
              className={`chip ${
                selectedGenres.length === 0 && genre === 'All Genres' ? 'active' : ''
              } ${selectedGenres.includes(genre) ? 'active' : ''}`}
            >
              {genre}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-personalize"
        >
          <Settings size={18} />
          Personalize
        </motion.button>
      </motion.div>

      {/* Recommendation Sections */}
      <div className="recommendations-content">
        {isLoading ? (
          <div className="loading-sections">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-section" />
            ))}
          </div>
        ) : (
          sections.map((section, sectionIdx) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIdx * 0.1 }}
              className="recommendation-section"
            >
              <div className="section-header">
                <div>
                  <h2 className="section-title">{section.title}</h2>
                  {section.description && (
                    <p className="section-description">{section.description}</p>
                  )}
                </div>
              </div>

              {/* Carousel */}
              <div className="carousel-container">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => scroll(section.id, 'left')}
                  className="carousel-button left"
                >
                  <ChevronLeft size={24} />
                </motion.button>

                <div
                  ref={el => { scrollRefs.current[section.id] = el; }}
                  className="carousel"
                >
                  {section.anime.map((anime, idx) => (
                    <motion.div
                      key={anime.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="anime-card-recommendation"
                    >
                      <div className="card-poster">
                        <img src={anime.poster} alt={anime.title} />
                        <div className="poster-overlay" />

                        {/* Rating Badge */}
                        <div className="rating-badge">
                          <Star size={16} fill="currentColor" />
                          <span>{anime.rating.toFixed(1)}</span>
                        </div>

                        {/* Similarity Badge */}
                        <div className="similarity-badge">
                          {Math.round(anime.similarity)}% match
                        </div>

                        {/* Add Button */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAddToWatchlist(anime.id)}
                          className="btn-add-card"
                        >
                          <Plus size={20} />
                          Add
                        </motion.button>
                      </div>

                      <div className="card-info">
                        <h3 className="card-title">{anime.title}</h3>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => scroll(section.id, 'right')}
                  className="carousel-button right"
                >
                  <ChevronRight size={24} />
                </motion.button>
              </div>
            </motion.section>
          ))
        )}
      </div>
    </div>
  );
};

export default RecommendationsPage;
