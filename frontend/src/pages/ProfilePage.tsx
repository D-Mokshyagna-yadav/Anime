import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Edit2,
  LogOut,
  BookOpen,
  MessageSquare,
  Bookmark,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { setPageMeta } from '../utils/seo';
import './ProfilePage.css';

interface ProfileStats {
  totalWatched: number;
  reviewsWritten: number;
  watchlistCount: number;
}

interface RecentAnime {
  id: string;
  title: string;
  poster: string;
  lastWatched: string;
}

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [stats, setStats] = useState<ProfileStats>({
    totalWatched: 0,
    reviewsWritten: 0,
    watchlistCount: 0,
  });
  const [recentAnime, setRecentAnime] = useState<RecentAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPageMeta('Profile', 'View and manage your AniStream profile, watchlist, and reviews.');
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Simulate loading user stats and recent activity
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        // In a real app, fetch from backend
        // const response = await fetchUserStats(user?.id);
        
        // Mock data for now
        setStats({
          totalWatched: 245,
          reviewsWritten: 18,
          watchlistCount: 42,
        });

        setRecentAnime([
          {
            id: '1',
            title: 'Jujutsu Kaisen',
            poster: 'https://images.unsplash.com/image-placeholder?w=200&h=300',
            lastWatched: '2 hours ago',
          },
          {
            id: '2',
            title: 'Chainsaw Man',
            poster: 'https://images.unsplash.com/image-placeholder?w=200&h=300',
            lastWatched: '1 day ago',
          },
          {
            id: '3',
            title: 'Vinland Saga',
            poster: 'https://images.unsplash.com/image-placeholder?w=200&h=300',
            lastWatched: '3 days ago',
          },
          {
            id: '4',
            title: "Steins;Gate",
            poster: 'https://images.unsplash.com/image-placeholder?w=200&h=300',
            lastWatched: '1 week ago',
          },
        ]);

        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, navigate, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditProfile = () => {
    // TODO: Navigate to edit profile page
    console.log('Edit profile');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="profile-container">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="profile-banner"
      >
        <div className="banner-gradient" />
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=300&fit=crop"
          alt="Banner"
          className="banner-image"
        />
      </motion.div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="profile-header"
      >
        <div className="header-content">
          <div className="profile-avatar-section">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt="Profile Avatar"
              className="profile-avatar"
            />
            <div className="profile-info">
              <h1 className="profile-username">{user?.email?.split('@')[0] || 'User'}</h1>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-member-since">Member since Jan 2023</p>
            </div>
          </div>

          <div className="header-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEditProfile}
              className="btn-edit-profile"
            >
              <Edit2 size={18} />
              Edit Profile
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="stats-section"
      >
        <div className="stat-card">
          <div className="stat-number">{stats.totalWatched}</div>
          <div className="stat-label">Total Anime Watched</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.reviewsWritten}</div>
          <div className="stat-label">Reviews Written</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.watchlistCount}</div>
          <div className="stat-label">Watchlist Count</div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="tab-navigation"
      >
        <nav className="tabs">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <BookOpen size={18} />
            Profile Info
          </button>
          <button
            className={`tab-button ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            <Bookmark size={18} />
            Watchlist
          </button>
          <button
            className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <MessageSquare size={18} />
            Reviews
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            Settings
          </button>
        </nav>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="profile-content"
      >
        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2 className="section-title">Recent Activity</h2>
            {isLoading ? (
              <div className="loading-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton-card" />
                ))}
              </div>
            ) : (
              <div className="anime-grid">
                {recentAnime.map((anime) => (
                  <motion.div
                    key={anime.id}
                    whileHover={{ y: -8 }}
                    className="anime-card-profile"
                  >
                    <div className="anime-poster">
                      <img src={anime.poster} alt={anime.title} />
                      <div className="poster-overlay" />
                    </div>
                    <h3 className="anime-title">{anime.title}</h3>
                    <p className="anime-timestamp">{anime.lastWatched}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="tab-content">
            <h2 className="section-title">My Watchlist</h2>
            <p className="empty-state">
              Navigate to the Watchlist page to manage your anime.
            </p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="tab-content">
            <h2 className="section-title">My Reviews</h2>
            <p className="empty-state">
              You haven't written any reviews yet.
            </p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content">
            <h2 className="section-title">Account Settings</h2>
            <div className="settings-section">
              <h3>Danger Zone</h3>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="btn-logout"
              >
                <LogOut size={18} />
                Sign Out
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfilePage;
