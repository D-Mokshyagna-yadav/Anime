import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AniMedia } from '../api/client';
import { Star, Play } from 'lucide-react';
import { getAiredEpisodeCount } from '../utils/anime';
import { applyImageFallback, buildBackgroundImage, getAnimePosterImage } from '../utils/images';

interface Props {
  anime: AniMedia;
  size?: 'normal' | 'small';
}

export default function AnimeCard({ anime, size = 'normal' }: Props) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const title = anime.title.english || anime.title.romaji;
  const cover = getAnimePosterImage(anime);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const airedEpisodes = getAiredEpisodeCount(anime);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '220px 0px', threshold: 0.1 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <Link ref={cardRef} to={`/anime/${anime.id}`} className={`anime-card card-link ${size}`}>
      <div className="card-poster" style={{ backgroundImage: buildBackgroundImage(cover), backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <img
          src={isVisible ? cover : undefined}
          alt={title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => applyImageFallback(e.currentTarget)}
        />
        <div className="card-overlay">
          <button className="play-btn"><Play size={18} fill="white" /></button>
        </div>
        {anime.status === 'RELEASING' && airedEpisodes && (
          <span className="card-badge new">EP {airedEpisodes}</span>
        )}
        {anime.format && (
          <span className="card-badge format">{anime.format}</span>
        )}
      </div>
      <div className="card-info">
        <p className="card-title">{title}</p>
        {score && (
          <span className="card-score">
            <Star size={11} fill="var(--warning)" color="var(--warning)" />
            {score}
          </span>
        )}
        {anime.genres?.[0] && <span className="card-genre">{anime.genres[0]}</span>}
      </div>
    </Link>
  );
}
