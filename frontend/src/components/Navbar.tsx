import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  Home,
  ListVideo,
  LogIn,
  LogOut,
  Menu,
  PlayCircle,
  Search,
  Settings,
  Tv2,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchGenres, notificationsGet, notificationsMarkSeen, type UserNotification } from '../api/client';
import { logError, logEvent } from '../utils/logger';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [genres, setGenres] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
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
    { to: '/search?sort=trending', label: 'Trending', icon: ListVideo },
    { to: '/search?sort=latest', label: 'Latest', icon: ListVideo },
    { to: '/season', label: 'Season', icon: CalendarDays },
    { to: '/categories/Action', label: 'Categories', icon: ListVideo },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/search', label: 'Search', icon: Search },
  ];

  const shortcutItems = [
    { to: '/', label: 'Home' },
    { to: '/search?sort=trending', label: 'Trending' },
    { to: '/search?sort=latest', label: 'Latest' },
    { to: '/season', label: 'Season' },
    { to: '/categories/Action', label: 'Categories' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setDrawerOpen(false);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

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
        // ignore cache parse failures
      }
    }

    fetchGenres()
      .then((response) => {
        const nextGenres = response.data.data || [];
        setGenres(nextGenres);
        localStorage.setItem(cacheKey, JSON.stringify({ data: nextGenres, expiresAt: Date.now() + 1000 * 60 * 60 * 24 }));
      })
      .catch(() => setGenres(['Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Romance', 'Sci-Fi']));
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = () => {
      notificationsGet(20)
        .then((response) => {
          setNotifications(response.data.notifications || []);
          setUnreadCount(response.data.unreadCount || 0);
        })
        .catch((error) => {
          logError('Notifications', error);
        });
    };

    fetchNotifications();

    const onRefresh = () => fetchNotifications();
    window.addEventListener('notifications:refresh', onRefresh);

    const token = localStorage.getItem('authToken');
    let ws: WebSocket | null = null;
    let intervalId: number | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = window.setInterval(fetchNotifications, 45000);
    };

    if (!token) {
      startPolling();
      return () => {
        if (intervalId) {
          window.clearInterval(intervalId);
        }
      };
    }

    const envApiBase = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
    const apiUrl = new URL(envApiBase, window.location.origin);
    const socketProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${socketProtocol}//${apiUrl.host}/api/user/notifications/ws?token=${encodeURIComponent(token)}`;

    try {
      ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        logEvent('Notifications', 'ws-connected');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'notification:new' && payload.notification) {
            setNotifications((previous) => [payload.notification, ...previous].slice(0, 20));
            setUnreadCount((count) => count + 1);
          }
        } catch (error) {
          logError('Notifications', error);
        }
      };

      ws.onerror = () => {
        startPolling();
      };

      ws.onclose = () => {
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      window.removeEventListener('notifications:refresh', onRefresh);

      if (ws && ws.readyState <= WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user]);

  const openNotification = (notification: UserNotification) => {
    notificationsMarkSeen(notification.id)
      .catch((error) => {
        logError('Notifications', error, { notificationId: notification.id });
      })
      .finally(() => {
        setNotifications((previous) =>
          previous.map((item) => (item.id === notification.id ? { ...item, seen: true } : item))
        );
        setUnreadCount((count) => Math.max(0, count - (notification.seen ? 0 : 1)));
      });

    setNotificationsOpen(false);
    window.dispatchEvent(new Event('notifications:refresh'));
    navigate(`/watch/${notification.animeId}/${encodeURIComponent(notification.episodeId)}?autoplay=1`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debouncedQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      setSearchOpen(false);
      setQuery('');
      setDebouncedQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileMenuOpen(false);
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && event.target instanceof Node && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }

      if (notificationsRef.current && event.target instanceof Node && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }

      if (drawerRef.current && event.target instanceof Node && !drawerRef.current.contains(event.target)) {
        setDrawerOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        setNotificationsOpen(false);
        setDrawerOpen(false);
      }
    };

    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <>
      <nav className={`navbar glass ${scrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-inner">
          <button
            className="icon-btn mobile-menu-btn"
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="navbar-logo" aria-label="SensuiWatch Home">
            <Tv2 size={26} color="var(--primary)" strokeWidth={2.5} />
            <span>Ani<strong>Stream</strong></span>
          </Link>

          <div className="navbar-shortcuts" aria-label="Primary shortcuts">
            {shortcutItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `shortcut-link ${isActive ? 'active' : ''}`}>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="navbar-actions">
            {searchOpen && (
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
              <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Open search">
                <Search size={20} />
              </button>
            )}

            {user ? (
              <>
                <div className="notifications-wrap" ref={notificationsRef}>
                  <button
                    className="icon-btn notifications-btn"
                    aria-label="Open notifications"
                    aria-expanded={notificationsOpen}
                    aria-haspopup="menu"
                    onClick={() => setNotificationsOpen((open) => !open)}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="notifications-count">{Math.min(unreadCount, 99)}</span>}
                  </button>

                  <div className={`notifications-dropdown ${notificationsOpen ? 'open' : ''}`} role="menu" aria-label="Notifications">
                    <div className="notifications-header">Notifications</div>
                    {notifications.length === 0 ? (
                      <p className="notifications-empty">No episode updates yet.</p>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <button
                          key={notification.id}
                          className={`notification-item ${notification.seen ? '' : 'unread'}`}
                          onClick={() => openNotification(notification)}
                        >
                          <span className="notification-title">{notification.animeTitle}</span>
                          <span className="notification-meta">Episode {notification.episodeNumber} is available</span>
                          <span className="notification-time">{new Date(notification.createdAt).toLocaleString()}</span>
                        </button>
                      ))
                    )}
                    <button className="view-all-notifications" onClick={() => navigate('/notifications')}>
                      View All
                    </button>
                  </div>
                </div>

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
              </>
            ) : (
              <Link to="/login" className="btn-ghost navbar-auth-link" aria-label="Login">
                <LogIn size={16} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Close menu overlay"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="left-rail mobile-drawer" aria-label="Sidebar navigation" ref={drawerRef}>
          <button
            type="button"
            className="drawer-close-link"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={16} />
            <span>Close menu</span>
          </button>

          <div className="left-rail-brand">
            <Tv2 size={20} color="var(--primary-dim)" />
            <span>Browse</span>
          </div>

          <div className="left-rail-links">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`} onClick={() => setDrawerOpen(false)}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div className="drawer-categories">
              <h4>Categories</h4>
              <div className="drawer-categories-list">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    className="drawer-category-btn"
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate(`/categories/${encodeURIComponent(genre)}`);
                    }}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {!user ? (
              <div className="mobile-auth-links">
                <Link to="/login" className="btn-ghost mobile-auth-link" onClick={() => setDrawerOpen(false)}>
                  <User size={15} /> <span>Sign In</span>
                </Link>
                <Link to="/register" className="btn-primary mobile-auth-link" onClick={() => setDrawerOpen(false)}>
                  Register
                </Link>
              </div>
            ) : null}
          </div>
          </aside>
        </>
      )}
    </>
  );
}
