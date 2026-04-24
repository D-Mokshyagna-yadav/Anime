import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, X, Tv2, User, LogOut, ListVideo, Film, Bookmark, Settings, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdaptive } from '../context/AdaptiveContext';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { deviceType, isRemoteLike } = useAdaptive();

  const isMobile = deviceType === 'mobile';
  const hasLeftRail = deviceType === 'desktop' || deviceType === 'tv';
  const optionalAvatarUser = user as (typeof user & { avatarUrl?: string; image?: string }) | null;
  const avatarUrl = optionalAvatarUser?.avatarUrl || optionalAvatarUser?.image || '';
  const avatarInitials = user?.email
    ? user.email
        .split('@')[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'U'
    : 'U';

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/season', label: 'Season', icon: ListVideo },
    { to: '/recommendations', label: 'Recommended', icon: Film },
    { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
  ];

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
    setProfileMenuOpen(false);
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (event.target instanceof Node && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const renderLinks = (className = 'navbar-links') => (
    <div className={className} role="navigation" aria-label="Primary">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <item.icon size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );

  return (
    <>
      <nav className={`navbar glass ${scrolled ? 'scrolled' : ''} ${hasLeftRail ? 'with-rail' : ''}`}>
        <div className="container navbar-inner">
          <Link to="/" className="navbar-logo" aria-label="AniStream Home">
            <Tv2 size={26} color="var(--primary)" strokeWidth={2.5} />
            <span>Ani<strong>Stream</strong></span>
          </Link>

          {!isMobile && renderLinks()}

          <div className="navbar-actions">
            {(searchOpen || !isMobile) && (
              <form onSubmit={handleSearch} className="search-form" role="search">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search anime..."
                  className="search-input"
                  aria-label="Search anime"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="icon-btn" aria-label="Close search">
                  <X size={18} />
                </button>
              </form>
            )}

            {!searchOpen && (
              <button
                className="icon-btn"
                onClick={() => (isMobile ? navigate('/search') : setSearchOpen(true))}
                aria-label="Open search"
              >
                <Search size={20} />
              </button>
            )}

            {user ? (
              <div className="profile-menu-wrap" ref={profileMenuRef}>
                <button
                  className="profile-icon-btn"
                  aria-label="Open account menu"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((open) => !open)}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="profile-avatar-img" />
                  ) : (
                    <span className="profile-avatar-initials">{avatarInitials}</span>
                  )}
                </button>

                <div
                  className={`profile-dropdown ${profileMenuOpen ? 'open' : ''}`}
                  role="menu"
                  aria-label="Account menu"
                  aria-hidden={!profileMenuOpen}
                >
                    <NavLink to="/continue-watching" onClick={() => setProfileMenuOpen(false)}>
                      <PlayCircle size={16} /> Continue Watching
                    </NavLink>
                    <NavLink to="/settings" onClick={() => setProfileMenuOpen(false)}>
                      <Settings size={16} /> Settings
                    </NavLink>
                    <button onClick={handleLogout} className="profile-logout-btn">
                      <LogOut size={16} /> Logout
                    </button>
                </div>
              </div>
            ) : (
              !isMobile && (
                <>
                  <Link to="/login" className="btn-ghost compact-btn">
                    <User size={15} /> <span>Sign In</span>
                  </Link>
                  <Link to="/register" className="btn-primary compact-btn">
                    Register
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {hasLeftRail && (
        <aside className={`left-rail ${isRemoteLike ? 'remote-nav' : ''}`} aria-label="Sidebar navigation">
          <div className="left-rail-brand">
            <Tv2 size={24} color="var(--primary-dim)" />
            <span>Browse</span>
          </div>

          <div className="left-rail-links">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <NavLink to="/search" className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}>
              <Search size={18} />
              <span>Search</span>
            </NavLink>
          </div>
        </aside>
      )}

      {isMobile && (
        <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
