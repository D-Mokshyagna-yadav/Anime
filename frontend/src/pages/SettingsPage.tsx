import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  Moon,
  Bell,
  Shield,
  ChevronRight,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { setPageMeta } from '../utils/seo';
import './SettingsPage.css';

interface SettingsState {
  account: {
    email: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  preferences: {
    language: string;
    animeOrder: string;
    autoPlayNext: boolean;
  };
  display: {
    theme: 'dark' | 'light';
    fontSize: string;
    showNSFW: boolean;
  };
  notifications: {
    newReleases: boolean;
    watchlistUpdates: boolean;
    communityPosts: boolean;
    recommendations: boolean;
  };
  privacy: {
    publicProfile: boolean;
    allowRecommendations: boolean;
  };
}

const SettingsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState<SettingsState>({
    account: {
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    preferences: {
      language: 'en',
      animeOrder: 'latest',
      autoPlayNext: true,
    },
    display: {
      theme: 'dark',
      fontSize: 'medium',
      showNSFW: false,
    },
    notifications: {
      newReleases: true,
      watchlistUpdates: true,
      communityPosts: false,
      recommendations: true,
    },
    privacy: {
      publicProfile: false,
      allowRecommendations: true,
    },
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    setPageMeta('Settings', 'Manage your AniStream account settings and preferences.');

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const handleSave = async () => {
    try {
      // In a real app, send to backend
      console.log('Saving settings:', settings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  const handlePasswordChange = async () => {
    if (settings.account.newPassword !== settings.account.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      // TODO: Call backend password change endpoint
      setMessage('Password changed successfully!');
      setSettings(prev => ({
        ...prev,
        account: {
          ...prev.account,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        },
      }));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to change password');
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Eye },
    { id: 'display', label: 'Display', icon: Moon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="settings-header"
      >
        <h1>Settings</h1>
        <p className="breadcrumb">Profile → Settings</p>
      </motion.div>

      {/* Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="success-alert"
        >
          {message}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="error-alert"
        >
          <AlertTriangle size={18} />
          {error}
        </motion.div>
      )}

      <div className="settings-layout">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="settings-sidebar"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`sidebar-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
                {activeTab === tab.id && <ChevronRight size={18} />}
              </button>
            );
          })}
        </motion.div>

        {/* Main Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="settings-content"
        >
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div>
              <h2 className="tab-title">Account Settings</h2>

              <div className="settings-group">
                <label>Email Address</label>
                <div className="static-field">{settings.account.email}</div>
                <p className="field-hint">Email address cannot be changed</p>
              </div>

              <div className="divider" />

              <h3 className="subsection-title">Change Password</h3>

              <div className="settings-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={settings.account.currentPassword}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      account: { ...prev.account, currentPassword: e.target.value },
                    }))
                  }
                  placeholder="Enter current password"
                  className="settings-input"
                />
              </div>

              <div className="settings-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={settings.account.newPassword}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      account: { ...prev.account, newPassword: e.target.value },
                    }))
                  }
                  placeholder="Enter new password"
                  className="settings-input"
                />
              </div>

              <div className="settings-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={settings.account.confirmPassword}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      account: { ...prev.account, confirmPassword: e.target.value },
                    }))
                  }
                  placeholder="Confirm new password"
                  className="settings-input"
                />
              </div>

              <button onClick={handlePasswordChange} className="btn-change-password">
                <Lock size={18} />
                Update Password
              </button>

              <div className="divider" />

              <h3 className="subsection-title danger">Danger Zone</h3>
              <button className="btn-delete-account">
                <AlertTriangle size={18} />
                Delete Account
              </button>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div>
              <h2 className="tab-title">Preferences</h2>

              <div className="settings-group">
                <label>Language</label>
                <select
                  value={settings.preferences.language}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, language: e.target.value },
                    }))
                  }
                  className="settings-input"
                >
                  <option value="en">English</option>
                  <option value="jp">Japanese</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              <div className="settings-group">
                <label>Anime Order</label>
                <select
                  value={settings.preferences.animeOrder}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, animeOrder: e.target.value },
                    }))
                  }
                  className="settings-input"
                >
                  <option value="latest">Latest First</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              <div className="settings-group toggle">
                <div>
                  <label>Auto-play Next Episode</label>
                  <p className="field-hint">Automatically play next episode when finished</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.preferences.autoPlayNext}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, autoPlayNext: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div>
              <h2 className="tab-title">Display Settings</h2>

              <div className="settings-group">
                <label>Theme</label>
                <div className="theme-selector">
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, theme: 'dark' },
                      }))
                    }
                    className={`theme-btn ${settings.display.theme === 'dark' ? 'active' : ''}`}
                  >
                    🌙 Dark
                  </button>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, theme: 'light' },
                      }))
                    }
                    className={`theme-btn ${settings.display.theme === 'light' ? 'active' : ''}`}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>

              <div className="settings-group">
                <label>Font Size</label>
                <div className="font-size-selector">
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, fontSize: 'small' },
                      }))
                    }
                    className={`size-btn ${settings.display.fontSize === 'small' ? 'active' : ''}`}
                  >
                    A
                  </button>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, fontSize: 'medium' },
                      }))
                    }
                    className={`size-btn ${settings.display.fontSize === 'medium' ? 'active' : ''}`}
                  >
                    <strong>A</strong>
                  </button>
                  <button
                    onClick={() =>
                      setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, fontSize: 'large' },
                      }))
                    }
                    className={`size-btn ${settings.display.fontSize === 'large' ? 'active' : ''}`}
                  >
                    <strong style={{ fontSize: '1.2em' }}>A</strong>
                  </button>
                </div>
              </div>

              <div className="settings-group toggle">
                <div>
                  <label>Show NSFW Content</label>
                  <p className="field-hint">Display anime with adult content</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.display.showNSFW}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      display: { ...prev.display, showNSFW: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="tab-title">Notification Preferences</h2>

              <div className="settings-group toggle">
                <div>
                  <label>New Release Notifications</label>
                  <p className="field-hint">Get notified when new episodes air</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.newReleases}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, newReleases: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>

              <div className="settings-group toggle">
                <div>
                  <label>Watchlist Updates</label>
                  <p className="field-hint">Notifications about anime on your watchlist</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.watchlistUpdates}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, watchlistUpdates: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>

              <div className="settings-group toggle">
                <div>
                  <label>Community Posts</label>
                  <p className="field-hint">Updates about community discussions</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.communityPosts}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, communityPosts: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>

              <div className="settings-group toggle">
                <div>
                  <label>Recommendations</label>
                  <p className="field-hint">Get personalized anime recommendations</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.recommendations}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, recommendations: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div>
              <h2 className="tab-title">Privacy Settings</h2>

              <div className="settings-group toggle">
                <div>
                  <label>Public Profile</label>
                  <p className="field-hint">Allow others to view your profile</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.publicProfile}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, publicProfile: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>

              <div className="settings-group toggle">
                <div>
                  <label>Allow Recommendations</label>
                  <p className="field-hint">Let us use your data to improve recommendations</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.allowRecommendations}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, allowRecommendations: e.target.checked },
                    }))
                  }
                  className="toggle-checkbox"
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="btn-save"
        >
          <Save size={18} />
          Save Changes
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/profile')}
          className="btn-cancel"
        >
          Cancel
        </motion.button>
      </div>
    </div>
  );
};

export default SettingsPage;
