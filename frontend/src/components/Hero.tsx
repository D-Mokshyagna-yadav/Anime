import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Star, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AniMedia } from '../api/client';
import { getEpisodeCountLabel, getExpectedEpisodeCount } from '../utils/anime';
import { buildBackgroundImage, getAnimeBannerImage } from '../utils/images';
import './Hero.css';

interface Props {
  featured: AniMedia[];
}

export default function Hero({ featured }: Props) {
  const [index, setIndex] = useState(0);
  const anime = featured[index];

  useEffect(() => {
    if (featured.length <= 1) return;

    const timer = setInterval(() => setIndex((currentIndex) => (currentIndex + 1) % featured.length), 7000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!anime) return null;

  const title = anime.title.english || anime.title.romaji;
  const desc = `${anime.description?.replace(/<[^>]+>/g, '').slice(0, 220) || ''}...`;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const bannerImage = getAnimeBannerImage(anime);
  const episodeCount = getExpectedEpisodeCount(anime);
  const episodeLabel = getEpisodeCountLabel(anime);

  return (
    <div className="hero-wrapper">
      <AnimatePresence mode="wait">
        <motion.div
          key={anime.id}
          className="hero-bg"
          style={{ backgroundImage: buildBackgroundImage(anime.bannerImage, bannerImage) }}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>

      <div className="hero-overlay" />

      <div className="container hero-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${anime.id}-text`}
            className="hero-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="hero-meta">
              {anime.season && (
                <span className="tag">
                  {anime.season} {anime.seasonYear}
                </span>
              )}
              {score && (
                <span className="rating-badge">
                  <Star size={12} fill="var(--warning)" color="var(--warning)" /> {score}
                </span>
              )}
              {anime.genres?.slice(0, 3).map((genre) => (
                <span key={genre} className="tag">
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="hero-title">{title}</h1>
            <p className="hero-desc">{desc}</p>

            <div className="hero-actions">
              <Link to={`/anime/${anime.id}`} className="btn-primary hero-btn">
                <Play size={18} fill="white" /> Watch Now
              </Link>
              <button className="btn-ghost hero-btn">
                <Plus size={18} /> Watchlist
              </button>
            </div>

            <div className="hero-info-row">
              {episodeCount && (
                <span>
                  <strong>{episodeCount}</strong> {episodeLabel}
                </span>
              )}
              {anime.studios?.nodes?.[0] && <span>{anime.studios.nodes[0].name}</span>}
              <span className={`status-dot status-${anime.status?.toLowerCase()}`}>{anime.status}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {featured.length > 1 && (
          <div className="hero-dots">
            {featured.map((_, heroIndex) => (
              <button
                key={heroIndex}
                className={`hero-dot ${heroIndex === index ? 'active' : ''}`}
                onClick={() => setIndex(heroIndex)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hero-scroll-hint">
        <ChevronDown size={24} />
      </div>
    </div>
  );
}
