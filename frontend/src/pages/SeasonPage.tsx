import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { List, Grid3x3, Loader2 } from 'lucide-react';
import { setPageMeta } from '../utils/seo';
import { fetchCalendar } from '../api/client';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { applyImageFallback, getAnimePosterImage } from '../utils/images';
import './SeasonPage.css';

interface CalendarAnime {
  id: string;
  title: string;
  romaji: string;
  coverImage: { medium: string; extraLarge?: string };
  episode: number;
  airingAt: number;
  dayOfWeek: number;
  genres?: string[];
  score?: number;
}

const SeasonPage: React.FC = () => {
  const [season, setSeason] = useState('SPRING');
  const [year, setYear] = useState(2026); // Current year
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendar, setCalendar] = useState<Record<string, CalendarAnime[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const seasons = ['SPRING', 'SUMMER', 'FALL', 'WINTER'];
  const years = [2024, 2025, 2026];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    setPageMeta('Anime Calendar', 'Browse anime by season and release schedule on AniStream.');
    loadCalendar();
  }, [season, year]);

  const loadCalendar = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetchCalendar(season, year);
      setCalendar(response.data.data.calendar);
    } catch (err) {
      console.error('Failed to load calendar:', err);
      setError('Failed to load anime calendar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAllAnime = (): CalendarAnime[] => {
    return Object.values(calendar).flat();
  };

  const getAnimeByDay = (dayIndex: number) => {
    return calendar[days[dayIndex]] || [];
  };

  return (
    <div className="page">
      <Navbar />
      <div className="season-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="season-header"
      >
        <h1>Anime Calendar</h1>
        <p className="subtitle">Browse anime scheduled by season and release date</p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="controls-section"
      >
        {/* Selectors */}
        <div className="selector-group">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="selector"
          >
            {seasons.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="selector"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="view-toggle">
          <button
            onClick={() => setViewMode('calendar')}
            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          >
            <Grid3x3 size={18} />
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          >
            <List size={18} />
            List
          </button>
        </div>
      </motion.div>

      {/* Filters - Removed in favor of live calendar API */}

      {/* Content */}
      {isLoading ? (
        <div className="loading-container">
          <Loader2 className="spin" size={48} />
          <p>Loading calendar...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button onClick={loadCalendar} className="btn-primary">Retry</button>
        </div>
      ) : viewMode === 'calendar' ? (
        // Calendar View
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="calendar-view"
        >
          {days.map((day, dayIndex) => {
            const dayAnime = getAnimeByDay(dayIndex);
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.05 }}
                className="day-section"
              >
                <h3 className="day-title">{day}</h3>
                <div className="day-anime">
                  {dayAnime.length > 0 ? (
                    dayAnime.map(a => (
                      <motion.div
                        key={a.id}
                        whileHover={{ y: -4 }}
                        className="anime-card-season"
                      >
                        <Link to={`/anime/${a.id}`}>
                          <img 
                            src={getAnimePosterImage(a)} 
                            alt={a.title} 
                            className="anime-poster"
                            onError={(e) => applyImageFallback(e.currentTarget)}
                          />
                          <div className="anime-info">
                            <h4>{a.title}</h4>
                            <p className="episode-info">Ep {a.episode}</p>
                            <p className="rating-info">⭐ {(a.score || 0) / 10}</p>
                          </div>
                        </Link>
                      </motion.div>
                    ))
                  ) : (
                    <p className="no-anime">No anime airing on {day}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        // List View
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="list-view"
        >
          {getAllAnime().length > 0 ? (
            getAllAnime().map((item, idx) => (
              <motion.div
                key={`${item.id}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="list-item"
              >
                <Link to={`/anime/${item.id}`} className="list-link">
                  <img 
                    src={getAnimePosterImage(item)} 
                    alt={item.title} 
                    className="list-poster"
                    onError={(e) => applyImageFallback(e.currentTarget)}
                  />
                  <div className="list-info">
                    <h3>{item.title}</h3>
                    <div className="meta-info">
                      <span className="day-label">{days[item.dayOfWeek]}</span>
                      <span className="episode-label">Ep {item.episode}</span>
                      <span className="rating-label">⭐ {(item.score || 0) / 10}</span>
                    </div>
                    <div className="genres">
                      {item.genres?.slice(0, 3).map(genre => (
                        <span key={genre} className="genre-tag">{genre}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <p className="no-anime-found">No anime scheduled for {season} {year}</p>
          )}
        </motion.div>
      )}
      </div>
    </div>
  );
};

export default SeasonPage;
