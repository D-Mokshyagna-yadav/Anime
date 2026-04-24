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
  const title = anime.title.english || anime.title.romaji;
  const cover = getAnimePosterImage(anime);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const airedEpisodes = getAiredEpisodeCount(anime);

  return (
    <Link to={`/anime/${anime.id}`} className={`anime-card card-link ${size}`} style={{ width: size === 'small' ? 140 : 175 }}>
      <div className="card-poster" style={{ height: size === 'small' ? 200 : 250, backgroundImage: buildBackgroundImage(cover), backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <img src={cover} alt={title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => applyImageFallback(e.currentTarget)} />
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
