import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, Palette, RefreshCw, Save, Shield, Sparkles, UserCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { avatarOptionsGet, profileUpdate, type AvatarOption, type UserSettings } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PROFILE_AVATAR } from '../utils/images';
import { setPageMeta } from '../utils/seo';
import { mergeUserSettings } from '../utils/userPreferences';
import './SettingsPage.css';

type SettingsTab = 'profile' | 'playback' | 'appearance' | 'notifications' | 'privacy';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: typeof UserCircle2 }> = [
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
  { id: 'playback', label: 'Playback', icon: Sparkles },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

export default function SettingsPage() {
  const { user, isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [draftSettings, setDraftSettings] = useState<UserSettings>(mergeUserSettings(user?.settings));
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([]);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return 'Recently joined';
    return new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [user?.createdAt]);

  const loadAvatarOptions = async () => {
    setAvatarLoading(true);
    try {
      const response = await avatarOptionsGet(24);
      setAvatarOptions(response.data.options || []);
      setError('');
    } catch {
      setError('Avatar suggestions are unavailable right now, but you can still save your other settings.');
    } finally {
      setAvatarLoading(false);
    }
  };

  useEffect(() => {
    setPageMeta('Settings', 'Update your account, anime avatar, playback preferences, and privacy settings.');
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    void loadAvatarOptions();
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    setDraftSettings(mergeUserSettings(user?.settings));
    setSelectedAvatar(user?.avatarUrl || null);
  }, [user?.avatarUrl, user?.settings]);

  const updateSection = <K extends keyof UserSettings>(section: K, value: UserSettings[K]) => {
    setDraftSettings((previous) => ({
      ...previous,
      [section]: value,
    }));
  };

  const resetDraft = () => {
    setDraftSettings(mergeUserSettings(user?.settings));
    setSelectedAvatar(user?.avatarUrl || null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setMessage('');
  };

  const handleSave = async () => {
    setError('');
    setMessage('');

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setError('Enter your current password before setting a new one.');
        return;
      }

      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('New password and confirmation do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await profileUpdate({
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
        avatarUrl: selectedAvatar,
        settings: draftSettings,
      });

      setMessage(response.data.message || 'Settings saved successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || 'Failed to save your settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  return (
    <div className="settings-page">
      <Navbar />

      <main className="settings-shell container">
        <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="settings-hero">
          <div>
            <p className="settings-kicker">Account Control</p>
            <h1>Settings</h1>
            <p>Personalize your avatar, playback defaults, display feel, and privacy preferences from one clean responsive panel.</p>
          </div>
        </motion.header>

        {message && <div className="settings-alert success">{message}</div>}
        {error && (
          <div className="settings-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="settings-layout">
          <aside className="settings-sidebar">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`settings-sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          <motion.section key={activeTab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="settings-panel">
            {activeTab === 'profile' && (
              <div className="settings-section-stack">
                <div className="settings-profile-card">
                  <img
                    src={selectedAvatar || user?.avatarUrl || DEFAULT_PROFILE_AVATAR}
                    alt={user?.email || 'Avatar'}
                    className="settings-avatar-preview"
                  />
                  <div>
                    <h2>{user?.email?.split('@')[0] || 'Anime Fan'}</h2>
                    <p>{user?.email}</p>
                    <span>Member since {memberSince}</span>
                  </div>
                </div>

                <div className="settings-block">
                  <div className="settings-block-header">
                    <div>
                      <h3>Choose an anime avatar</h3>
                      <p>Suggestions are fetched from a safe-for-work anime image source.</p>
                    </div>
                    <button className="btn-ghost settings-inline-btn" onClick={() => void loadAvatarOptions()} disabled={avatarLoading}>
                      <RefreshCw size={16} className={avatarLoading ? 'spin' : ''} />
                      Refresh
                    </button>
                  </div>

                  <div className="avatar-grid">
                    <button
                      className={`avatar-option default ${selectedAvatar === null ? 'selected' : ''}`}
                      onClick={() => setSelectedAvatar(null)}
                    >
                      <span>Auto</span>
                    </button>
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar.id}
                        className={`avatar-option ${selectedAvatar === avatar.url ? 'selected' : ''}`}
                        onClick={() => setSelectedAvatar(avatar.url)}
                        title={avatar.animeName || avatar.artistName || 'Anime avatar'}
                      >
                        <img src={avatar.url} alt={avatar.animeName || 'Anime avatar'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-block">
                  <h3>Password</h3>
                  <div className="settings-field-grid">
                    <label className="settings-field">
                      <span>Current password</span>
                      <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                    </label>
                    <label className="settings-field">
                      <span>New password</span>
                      <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                    </label>
                    <label className="settings-field">
                      <span>Confirm password</span>
                      <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'playback' && (
              <div className="settings-section-stack">
                <div className="settings-block">
                  <h3>Playback defaults</h3>
                  <div className="settings-field-grid">
                    <label className="settings-field">
                      <span>Language</span>
                      <select
                        value={draftSettings.preferences.language}
                        onChange={(event) =>
                          updateSection('preferences', { ...draftSettings.preferences, language: event.target.value })
                        }
                      >
                        <option value="en">English</option>
                        <option value="jp">Japanese</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </label>

                    <label className="settings-field">
                      <span>Default anime order</span>
                      <select
                        value={draftSettings.preferences.animeOrder}
                        onChange={(event) =>
                          updateSection('preferences', { ...draftSettings.preferences, animeOrder: event.target.value })
                        }
                      >
                        <option value="latest">Latest First</option>
                        <option value="alphabetical">Alphabetical</option>
                        <option value="rating">Highest Rated</option>
                      </select>
                    </label>
                  </div>

                  <label className="toggle-card">
                    <div>
                      <strong>Auto-play next episode</strong>
                      <p>Uses your saved preference as the default in the player.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftSettings.preferences.autoPlayNext}
                      onChange={(event) =>
                        updateSection('preferences', { ...draftSettings.preferences, autoPlayNext: event.target.checked })
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-section-stack">
                <div className="settings-block">
                  <h3>Accent theme</h3>
                  <div className="choice-grid">
                    {[
                      { key: 'violet', label: 'Violet Pulse' },
                      { key: 'cyan', label: 'Cyan Drift' },
                      { key: 'sunset', label: 'Sunset Burst' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        className={`choice-card ${draftSettings.display.accentTheme === option.key ? 'active' : ''}`}
                        onClick={() =>
                          updateSection('display', {
                            ...draftSettings.display,
                            accentTheme: option.key as UserSettings['display']['accentTheme'],
                          })
                        }
                      >
                        <strong>{option.label}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-block">
                  <h3>Reading comfort</h3>
                  <div className="choice-grid compact">
                    {[
                      { key: 'small', label: 'Compact' },
                      { key: 'medium', label: 'Balanced' },
                      { key: 'large', label: 'Large' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        className={`choice-card ${draftSettings.display.fontSize === option.key ? 'active' : ''}`}
                        onClick={() =>
                          updateSection('display', {
                            ...draftSettings.display,
                            fontSize: option.key as UserSettings['display']['fontSize'],
                          })
                        }
                      >
                        <strong>{option.label}</strong>
                      </button>
                    ))}
                  </div>

                  <label className="toggle-card">
                    <div>
                      <strong>Reduced motion</strong>
                      <p>Softens animations and transitions across the site.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftSettings.display.reducedMotion}
                      onChange={(event) =>
                        updateSection('display', { ...draftSettings.display, reducedMotion: event.target.checked })
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-section-stack">
                <div className="settings-block">
                  <h3>Notifications</h3>
                  {[
                    ['newReleases', 'New release alerts', 'Be notified when a followed anime gets a fresh episode.'],
                    ['watchlistUpdates', 'Watchlist updates', 'Keep reminders and status updates for items in your library.'],
                    ['communityPosts', 'Community posts', 'Receive highlights from future community features.'],
                    ['recommendations', 'Recommendations', 'Get personalized picks based on your library and activity.'],
                  ].map(([key, title, description]) => (
                    <label key={key} className="toggle-card">
                      <div>
                        <strong>{title}</strong>
                        <p>{description}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={draftSettings.notifications[key as keyof UserSettings['notifications']]}
                        onChange={(event) =>
                          updateSection('notifications', {
                            ...draftSettings.notifications,
                            [key]: event.target.checked,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="settings-section-stack">
                <div className="settings-block">
                  <h3>Privacy</h3>
                  <label className="toggle-card">
                    <div>
                      <strong>Public profile</strong>
                      <p>Allow your account profile to be shown if social/profile features are enabled.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftSettings.privacy.publicProfile}
                      onChange={(event) =>
                        updateSection('privacy', { ...draftSettings.privacy, publicProfile: event.target.checked })
                      }
                    />
                  </label>

                  <label className="toggle-card">
                    <div>
                      <strong>Use my activity for recommendations</strong>
                      <p>Improves personalized suggestions based on your watchlist and viewing patterns.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftSettings.privacy.allowRecommendations}
                      onChange={(event) =>
                        updateSection('privacy', { ...draftSettings.privacy, allowRecommendations: event.target.checked })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
          </motion.section>
        </div>

        <div className="settings-footer">
          <button className="btn-ghost" onClick={resetDraft} disabled={saving}>
            Reset
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>
    </div>
  );
}
