import type { IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';
import { verifyAuthToken } from '../middleware/authMiddleware';
import type { EpisodeNotificationPayload } from './notificationService';

const userSockets = new Map<string, Set<any>>();

const getTokenFromRequest = (request: IncomingMessage) => {
  const rawUrl = request.url || '';
  const queryIndex = rawUrl.indexOf('?');
  if (queryIndex < 0) return null;

  const query = new URLSearchParams(rawUrl.slice(queryIndex + 1));
  return query.get('token');
};

export const attachNotificationWebSocket = (wss: WebSocketServer) => {
  wss.on('connection', (socket, request) => {
    try {
      const token = getTokenFromRequest(request);
      if (!token) {
        socket.close(1008, 'Missing auth token');
        return;
      }

      const user = verifyAuthToken(token);
      const bucket = userSockets.get(user.id) || new Set<any>();
      bucket.add(socket);
      userSockets.set(user.id, bucket);

      socket.send(JSON.stringify({ type: 'connected', userId: user.id }));

      socket.on('close', () => {
        const set = userSockets.get(user.id);
        if (!set) return;
        set.delete(socket);
        if (set.size === 0) {
          userSockets.delete(user.id);
        }
      });
    } catch {
      socket.close(1008, 'Unauthorized');
    }
  });
};

export const publishNewNotifications = (notifications: EpisodeNotificationPayload[]) => {
  for (const notification of notifications) {
    const sockets = userSockets.get(notification.userId);
    if (!sockets || sockets.size === 0) continue;

    const payload = JSON.stringify({
      type: 'notification:new',
      notification: {
        ...notification,
        episodeId: `${notification.animeId}-episode-${notification.episodeNumber}`,
      },
    });

    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }
};
