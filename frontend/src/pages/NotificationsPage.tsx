import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  notificationsClearAll,
  notificationsGet,
  notificationsMarkAllRead,
  notificationsMarkSeen,
  type UserNotification,
} from '../api/client';
import { setPageMeta } from '../utils/seo';
import './NotificationsPage.css';

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(date);
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta('Notifications', 'View anime episode notifications and updates.');
  }, []);

  const refresh = () => {
    setLoading(true);
    notificationsGet(200)
      .then((response) => {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event('notifications:refresh'));
  }, [unreadCount]);

  const openNotification = (notification: UserNotification) => {
    notificationsMarkSeen(notification.id).finally(() => {
      setNotifications((previous) =>
        previous.map((item) => (item.id === notification.id ? { ...item, seen: true } : item))
      );
      if (!notification.seen) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      navigate(`/watch/${notification.animeId}/${encodeURIComponent(notification.episodeId)}?autoplay=1`);
    });
  };

  const markAllRead = () => {
    notificationsMarkAllRead().finally(() => {
      setNotifications((previous) => previous.map((item) => ({ ...item, seen: true })));
      setUnreadCount(0);
    });
  };

  const clearAll = () => {
    notificationsClearAll().finally(() => {
      setNotifications([]);
      setUnreadCount(0);
    });
  };

  return (
    <div className="page">
      <Navbar />
      <main className="container notifications-main">
        <header className="notifications-page-header">
          <div>
            <h1><Bell size={20} /> Notifications</h1>
            <p>{unreadCount} unread</p>
          </div>
          <div className="notifications-page-actions">
            <button className="btn-ghost" onClick={markAllRead}>
              <CheckCheck size={16} /> Mark All Read
            </button>
            <button className="btn-ghost danger" onClick={clearAll}>
              <Trash2 size={16} /> Clear All
            </button>
          </div>
        </header>

        {loading ? (
          <div className="notifications-loading">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty-page">
            <p>No notifications yet.</p>
            <Link to="/" className="btn-primary">Back Home</Link>
          </div>
        ) : (
          <div className="notifications-list-page">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={`notification-row ${notification.seen ? '' : 'unread'}`}
                onClick={() => openNotification(notification)}
              >
                <span className="title">{notification.animeTitle}</span>
                <span className="episode">Episode {notification.episodeNumber} is available</span>
                <span className="time">{formatTime(notification.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
