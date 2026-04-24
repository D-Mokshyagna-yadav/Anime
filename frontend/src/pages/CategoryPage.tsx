import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import { fetchGenres, fetchSearch, type AniMedia } from '../api/client';
import { setPageMeta } from '../utils/seo';
import './CategoryPage.css';

const SkeletonCard = () => (
  <div style={{ width: 'var(--anime-card-width)' }}>
    <div className="skeleton" style={{ aspectRatio: '2 / 3', borderRadius: 12 }} />
    <div className="skeleton" style={{ height: 14, marginTop: 10, borderRadius: 6, width: '80%' }} />
    <div className="skeleton" style={{ height: 12, marginTop: 6, borderRadius: 6, width: '50%' }} />
  </div>
);

export default function CategoryPage() {
  const { genre: genreParam } = useParams<{ genre?: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const urlPage = Math.max(1, Number(params.get('page') || '1'));
  const routeGenre = genreParam || 'Action';
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>(routeGenre);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [results, setResults] = useState<AniMedia[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => `${selectedGenre} Anime`, [selectedGenre]);

  useEffect(() => {
    setSelectedGenre(routeGenre);
  }, [routeGenre]);

  useEffect(() => {
    setCurrentPage(urlPage);
  }, [urlPage]);

  useEffect(() => {
    setPageMeta(title, `Browse ${selectedGenre} anime on SensuiWatch.`);
  }, [title, selectedGenre]);

  useEffect(() => {
    const cacheKey = 'genre-cache-v1';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { expiresAt: number; data: string[] };
        if (parsed.expiresAt > Date.now()) {
          setGenres(parsed.data);
          return;
        }
      } catch {
        // ignore stale cache
      }
    }

    fetchGenres()
      .then((response) => {
        const nextGenres = response.data.data || [];
        setGenres(nextGenres);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            expiresAt: Date.now() + 1000 * 60 * 60 * 24,
            data: nextGenres,
          })
        );
      })
      .catch(() => setGenres(['Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Romance', 'Sci-Fi']));
  }, []);

  useEffect(() => {
    if (!selectedGenre) return;
    setLoading(true);
    fetchSearch('', currentPage, selectedGenre)
      .then((response) => {
        setResults(response.data.data.media || []);
        setTotalPages(response.data.data.pageInfo?.lastPage || 1);
      })
      .catch(() => {
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [selectedGenre, currentPage]);

  const goPage = (nextPage: number) => {
    setCurrentPage(nextPage);
    const next = new URLSearchParams(params.toString());
    next.set('page', String(nextPage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeGenre = (genre: string) => {
    if (genre === selectedGenre && currentPage === 1) return;

    setSelectedGenre(genre);
    setCurrentPage(1);
    navigate(`/categories/${encodeURIComponent(genre)}?page=1`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page">
      <Navbar />
      <main className="container category-main">
        <header className="category-header">
          <h1>{title}</h1>
          <p>Filtered by genre with consistent cards and pagination</p>
        </header>

        <div className="category-chips" role="tablist" aria-label="Anime genres">
          {genres.map((genre) => (
            <button
              key={genre}
              role="tab"
              aria-selected={genre === selectedGenre}
              className={`category-chip ${genre === selectedGenre ? 'active' : ''}`}
              onClick={() => changeGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="category-grid">
            {Array(18).fill(0).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : (
          <div className="category-grid">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={currentPage <= 1} onClick={() => goPage(currentPage - 1)}>
              <ChevronLeft size={18} />
            </button>
            <span className="page-label">Page {currentPage} / {totalPages}</span>
            <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => goPage(currentPage + 1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
