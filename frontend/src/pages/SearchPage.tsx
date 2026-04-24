import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import type { AniMedia } from '../api/client';
import { fetchLatest, fetchSearch, fetchTrending } from '../api/client';
import './SearchPage.css';

const GENRES = ['Action','Adventure','Comedy','Drama','Ecchi','Fantasy','Horror','Mahou Shoujo','Mecha','Music','Mystery','Psychological','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller'];
const STATUSES = [{ label: 'All', value: '' }, { label: 'Airing', value: 'RELEASING' }, { label: 'Finished', value: 'FINISHED' }, { label: 'Upcoming', value: 'NOT_YET_RELEASED' }];
const FORMATS  = [{ label: 'All', value: '' }, { label: 'TV', value: 'TV' }, { label: 'Movie', value: 'MOVIE' }, { label: 'OVA', value: 'OVA' }, { label: 'ONA', value: 'ONA' }, { label: 'Special', value: 'SPECIAL' }];

const SkeletonCard = () => (
  <div style={{ width: 'var(--anime-card-width)' }}>
    <div className="skeleton" style={{ aspectRatio: '2 / 3', borderRadius: 12 }} />
    <div className="skeleton" style={{ height: 14, marginTop: 10, borderRadius: 6, width: '80%' }} />
    <div className="skeleton" style={{ height: 12, marginTop: 6, borderRadius: 6, width: '50%' }} />
  </div>
);

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [results, setResults] = useState<AniMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q      = params.get('q') || '';
  const genre  = params.get('genre') || '';
  const status = params.get('status') || '';
  const page   = Number(params.get('page') || 1);
  const sort   = params.get('sort') || '';

  const [inputVal, setInputVal] = useState(q);

  const doSearch = useCallback(() => {
    setLoading(true);
    const request = sort === 'trending'
      ? fetchTrending(page)
      : sort === 'latest'
      ? fetchLatest(page)
      : fetchSearch(q, page, genre || undefined, status || undefined);

    request
      .then(r => {
        setResults(r.data.data?.media || []);
        setTotalPages(r.data.data?.pageInfo?.lastPage || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, page, genre, status, sort]);

  useEffect(() => { doSearch(); }, [doSearch]);
  useEffect(() => { setInputVal(q); }, [q]);

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(params.toString());
    if (val) next.set(key, val); else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam('q', inputVal);
  };

  const goPage = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set('page', String(p));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilters = [
    genre  && { label: genre,  key: 'genre' },
    status && { label: STATUSES.find(s => s.value === status)?.label || status, key: 'status' },
  ].filter(Boolean) as { label: string; key: string }[];

  return (
    <div className="page">
      <Navbar />
      <div className="search-hero">
        <div className="container search-hero-inner">
          <h1 className="search-hero-title">Discover Anime</h1>
          <p className="search-hero-sub">Search across 10,000+ titles</p>
          <form onSubmit={handleSearch} className="search-bar-big">
            <Search size={20} className="search-bar-icon" />
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Search by title, genre, studio..."
              className="search-bar-input"
            />
            <button type="submit" className="btn-primary search-bar-btn">Search</button>
          </form>
        </div>
      </div>

      <div className="container search-body">
        {/* Filter bar */}
        <div className="filter-bar">
          <button className={`filter-toggle ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(f => !f)}>
            <Filter size={16} /> Filters {activeFilters.length > 0 && <span className="filter-badge">{activeFilters.length}</span>}
          </button>

          {/* Active filter chips */}
          {activeFilters.map(f => (
            <span key={f.key} className="filter-chip">
              {f.label}
              <button onClick={() => setParam(f.key, '')}><X size={12} /></button>
            </span>
          ))}

          <span className="results-count">
            {loading ? '…' : `${results.length} results`}
          </span>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              className="filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="filter-group">
                <span className="filter-label">Status</span>
                <div className="filter-pills">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      className={`filter-pill ${status === s.value ? 'active' : ''}`}
                      onClick={() => setParam('status', s.value)}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Format</span>
                <div className="filter-pills">
                  {FORMATS.map(f => (
                    <button
                      key={f.value}
                      className={`filter-pill ${params.get('format') === f.value ? 'active' : ''}`}
                      onClick={() => setParam('format', f.value)}
                    >{f.label}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Genre</span>
                <div className="filter-pills filter-pills--wrap">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      className={`filter-pill ${genre === g ? 'active' : ''}`}
                      onClick={() => setParam('genre', genre === g ? '' : g)}
                    >{g}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results grid */}
        {loading ? (
          <div className="search-grid">
            {Array(24).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h2>No results found</h2>
            <p>Try a different keyword or adjust your filters</p>
            <Link to="/" className="btn-primary" style={{ marginTop: 16 }}>Back to Home</Link>
          </div>
        ) : (
          <motion.div
            className="search-grid"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {results.map(a => (
              <motion.div
                key={a.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              >
                <AnimeCard anime={a} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1 : page - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => goPage(p)}
                >{p}</button>
              );
            })}

            <button
              className="page-btn"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="container footer-inner">
          <span>© 2025 SensuiWatch — Anime Streaming Platform</span>
          <div className="footer-links">
            <a href="#">About</a><a href="#">Contact</a><a href="#">DMCA</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
