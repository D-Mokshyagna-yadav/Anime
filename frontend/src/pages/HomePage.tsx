import { useEffect, useState } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import AnimeCard from '../components/AnimeCard';
import '../components/AnimeCard.css';
import { fetchTrending, fetchPopular, fetchSeasonal } from '../api/client';
import type { AniMedia } from '../api/client';
import { DEFAULT_ANIME_IMAGE, applyImageFallback } from '../utils/images';
import { setPageMeta } from '../utils/seo';
import './HomePage.css';

interface WatchHistoryItem { animeId: number; episodeId: string; episodeNum: number; title: string; thumb: string; timestamp: number; duration: number; currentTime: number; }

const SkeletonCard = () => (
  <div style={{ width: 175, flexShrink: 0 }}>
    <div className="skeleton" style={{ height: 250, borderRadius: 12 }} />
    <div className="skeleton" style={{ height: 14, marginTop: 10, borderRadius: 6, width: '80%' }} />
    <div className="skeleton" style={{ height: 12, marginTop: 6, borderRadius: 6, width: '50%' }} />
  </div>
);

export default function HomePage() {
  const [trending, setTrending] = useState<AniMedia[]>([]);
  const [popular, setPopular] = useState<AniMedia[]>([]);
  const [airing, setAiring] = useState<AniMedia[]>([]);
  const [recommended, setRecommended] = useState<AniMedia[]>([]);
  const [topAiring, setTopAiring] = useState<AniMedia[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta(
      'Home - Discover Anime',
      'Watch anime for free with AniStream. Discover trending, popular, and seasonal anime.'
    );
  }, []);

  // Load watch history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('watchHistory') || '{}');
    const items: WatchHistoryItem[] = (Object.values(history) as unknown[])
      .filter((item: unknown): item is WatchHistoryItem => 
        typeof item === 'object' && item !== null && 'animeId' in item && 'episodeId' in item
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
    setWatchHistory(items);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchTrending(),
      fetchPopular(),
      fetchSeasonal('SPRING', new Date().getFullYear())
    ])
      .then(([t, p, a]) => {
        const trendingData = t.data.data.media || [];
        const popularData = p.data.data.media || [];
        const airingData = a.data.data.media || [];
        
        setTrending(trendingData);
        setPopular(popularData);
        setAiring(airingData);
        
        // Recommended: Top rated from trending
        const recommended = [...trendingData]
          .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
          .slice(0, 12);
        setRecommended(recommended);
        
        // Top Airing: Highest rated currently airing anime
        const topAir = [...airingData]
          .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
          .slice(0, 12);
        setTopAiring(topAir);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const heroItems = trending.slice(0, 5);

  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      {loading
        ? <div style={{ height: '92vh', background: 'var(--bg-low)' }} className="skeleton" />
        : <Hero featured={heroItems} />
      }

      <main className="home-main container">

        {/* Continue Watching Section */}
        {watchHistory.length > 0 && (
          <section className="home-section">
            <div className="section-header">
              <h2 className="section-title">Continue Watching</h2>
              <a href="/" className="see-all">View All <ChevronRight size={16} /></a>
            </div>
            <div className="h-scroll">
              {watchHistory.map((item, i) => (
                <motion.div 
                  key={item.animeId} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }}
                  className="continue-card-wrapper"
                >
                  <Link to={`/watch/${item.animeId}/${encodeURIComponent(item.episodeId)}`} className="continue-card">
                    <div className="continue-card-thumb">
                      <img
                        src={item.thumb || DEFAULT_ANIME_IMAGE}
                        alt={item.title}
                        onError={(e) => applyImageFallback(e.currentTarget)}
                      />
                      <div className="progress-bar" style={{ width: `${(item.currentTime / item.duration) * 100}%` }} />
                    </div>
                    <div className="continue-card-info">
                      <h4>{item.title}</h4>
                      <p>Episode {item.episodeNum}</p>
                      <p className="continue-time">{Math.round(item.currentTime / 60)}m watched</p>
                    </div>
                    <Play size={20} className="continue-play-btn" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">Trending Now</h2>
            <a href="/search?sort=trending" className="see-all">See All <ChevronRight size={16} /></a>
          </div>
          <div className="h-scroll">
            {loading
              ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : trending.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnimeCard anime={a} />
                </motion.div>
              ))
            }
          </div>
        </section>

        {/* Popular This Season */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">Popular This Season</h2>
            <a href="/search?sort=popular" className="see-all">See All <ChevronRight size={16} /></a>
          </div>
          <div className="popular-grid">
            {loading
              ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : popular.slice(0, 12).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                  <AnimeCard anime={a} />
                </motion.div>
              ))
            }
          </div>
        </section>

        {/* Latest / Airing */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">Currently Airing</h2>
            <a href="/season" className="see-all">See All <ChevronRight size={16} /></a>
          </div>
          <div className="h-scroll">
            {loading
              ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : airing.slice(0, 12).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnimeCard anime={a} />
                </motion.div>
              ))
            }
          </div>
        </section>

        {/* Recommended (Top Rated) */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">Recommended For You</h2>
            <a href="/search?sort=trending" className="see-all">See All <ChevronRight size={16} /></a>
          </div>
          <div className="popular-grid">
            {loading
              ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : recommended.slice(0, 12).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                  <AnimeCard anime={a} />
                </motion.div>
              ))
            }
          </div>
        </section>

        {/* Top Airing Anime */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">Top Airing Anime</h2>
            <a href="/season" className="see-all">See All <ChevronRight size={16} /></a>
          </div>
          <div className="h-scroll">
            {loading
              ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : topAiring.slice(0, 12).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <AnimeCard anime={a} />
                </motion.div>
              ))
            }
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <span>© 2025 AniStream — Anime Streaming Platform</span>
          <div className="footer-links">
            <a href="#">About</a>
            <a href="#">Contact</a>
            <a href="#">DMCA</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
