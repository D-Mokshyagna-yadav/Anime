import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Tv2, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`navbar glass ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <Tv2 size={26} color="var(--primary)" strokeWidth={2.5} />
          <span>Ani<strong>Stream</strong></span>
        </Link>

        {/* Desktop Links */}
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/season" className="nav-link">Season</Link>
          <Link to="/recommendations" className="nav-link">Recommendations</Link>
          <Link to="/continue-watching" className="nav-link">Continue</Link>
          <Link to="/search?type=tv" className="nav-link">TV Series</Link>
          <Link to="/search?type=movie" className="nav-link">Movies</Link>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="search-form">
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search anime..."
                className="search-input"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="icon-btn">
                <X size={18} />
              </button>
            </form>
          ) : (
            <button className="icon-btn" onClick={() => setSearchOpen(true)}>
              <Search size={20} />
            </button>
          )}
          
          {user ? (
            <>
              <Link to="/profile" className="nav-link" style={{ fontSize: '0.875rem' }}>
                <User size={15} /> Profile
              </Link>
              <Link to="/settings" className="nav-link" style={{ fontSize: '0.875rem' }}>
                ⚙️ Settings
              </Link>
              <button onClick={handleLogout} className="btn-ghost" style={{ padding: '8px 12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                <User size={15} /> Sign In
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                Register
              </Link>
            </>
          )}
          
          <button className="icon-btn mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/season" onClick={() => setMenuOpen(false)}>Season</Link>
          <Link to="/recommendations" onClick={() => setMenuOpen(false)}>Recommendations</Link>
          <Link to="/continue-watching" onClick={() => setMenuOpen(false)}>Continue Watching</Link>
          <Link to="/search?type=tv" onClick={() => setMenuOpen(false)}>TV Series</Link>
          <Link to="/search?type=movie" onClick={() => setMenuOpen(false)}>Movies</Link>
          <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
          <Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
        </div>
      )}
    </nav>
  );
}
