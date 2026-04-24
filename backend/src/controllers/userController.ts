import { Request, Response } from 'express';
import { generateToken } from '../middleware/authMiddleware';
import {
  createUser,
  deleteReview,
  deleteWatchlistEntry,
  findUserByEmail,
  getUserWithStats,
  listAvatarOptions,
  listReviews,
  listWatchlist,
  listWatchlistWithAnime,
  patchWatchlist,
  serializeUser,
  updateProfile,
  upsertReview,
  upsertWatchlist,
  verifyUserCredentials,
} from '../services/userService';
import {
  clearAllNotifications,
  listNotificationsForUser,
  markAllNotificationsSeen,
  markNotificationSeen,
} from '../services/notificationService';

const getRequiredUserId = (req: Request) => req.userId;

export async function signup(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const user = await createUser({ email: normalizedEmail, password });
    const token = generateToken(user.id, user.email);
    return res.json({ success: true, token, user: serializeUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error('[auth] signup failed:', message);

    if (message.includes('P2002') || message.toLowerCase().includes('unique constraint') || message.toLowerCase().includes('duplicate')) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    if (message.toLowerCase().includes('empty database name not allowed')) {
      return res.status(503).json({
        success: false,
        message: 'Service is temporarily unavailable due to database configuration. Please try again shortly.',
      });
    }

    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await verifyUserCredentials(email, password);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email);
    return res.json({ success: true, token, user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await getUserWithStats(userId);
    if (!result) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      user: serializeUser(result.user),
      watchlistCount: result.user.watchlists.length,
      reviewCount: result.user.reviews.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function addOrUpdateWatchlist(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { animeId, status } = req.body;
    if (!animeId) return res.status(400).json({ success: false, message: 'animeId required' });

    const watchlist = await upsertWatchlist({ userId, animeId, status });
    return res.json({ success: true, watchlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function getWatchlist(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const status = req.query.status ? String(req.query.status) : undefined;
    const includeAnime = req.query.includeAnime !== '0';
    const watchlist = includeAnime ? await listWatchlistWithAnime(userId, status) : await listWatchlist(userId, status);
    return res.json({ success: true, watchlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function removeWatchlist(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const animeId = String(req.params.animeId);
    await deleteWatchlistEntry(userId, animeId);
    return res.json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function updateWatchlist(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const animeId = String(req.params.animeId);
    const { status, progress } = req.body;

    const watchlist = await patchWatchlist({ userId, animeId, status, progress });
    if (!watchlist) return res.status(404).json({ success: false, message: 'Not in watchlist' });

    return res.json({ success: true, watchlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function addOrUpdateReview(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { animeId, rating, comment } = req.body;
    if (!animeId || !rating) {
      return res.status(400).json({ success: false, message: 'animeId and rating required' });
    }

    if (rating < 1 || rating > 10) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 10' });
    }

    const review = await upsertReview({ userId, animeId, rating, comment });
    return res.json({ success: true, review });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function getReviews(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const reviews = await listReviews(userId);
    return res.json({ success: true, reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function removeReview(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const animeId = String(req.params.animeId);
    await deleteReview(userId, animeId);
    return res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function profile(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await getUserWithStats(userId);
    if (!result) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      user: serializeUser(result.user),
      stats: result.stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { currentPassword, newPassword, avatarUrl, settings } = req.body;

    try {
      const result = await updateProfile(userId, { currentPassword, newPassword, avatarUrl, settings });
      return res.json({ success: true, message: result.message, user: result.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes('Invalid current password') || message.includes('Current password required') ? 401 : 400;
      return res.status(status).json({ success: false, message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function listNotifications(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const result = await listNotificationsForUser(userId, limit);

    return res.json({
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function setNotificationSeen(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const notificationId = String(req.params.notificationId || '');
    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'notificationId required' });
    }

    const updated = await markNotificationSeen(userId, notificationId);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, notification: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function setAllNotificationsSeen(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await markAllNotificationsSeen(userId);
    return res.json({ success: true, updated: result.updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function removeAllNotifications(req: Request, res: Response) {
  try {
    const userId = getRequiredUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await clearAllNotifications(userId);
    return res.json({ success: true, removed: result.removed });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}

export async function getAvatarOptions(req: Request, res: Response) {
  try {
    const amount = req.query.amount ? Number(req.query.amount) : 24;
    const options = await listAvatarOptions(amount);
    return res.json({ success: true, options });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}
