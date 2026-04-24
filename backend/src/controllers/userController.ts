import { Request, Response } from 'express';
import { generateToken } from '../middleware/authMiddleware';
import {
  createUser,
  deleteReview,
  deleteWatchlistEntry,
  findUserByEmail,
  getUserWithStats,
  listReviews,
  listWatchlist,
  patchWatchlist,
  updateProfile,
  upsertReview,
  upsertWatchlist,
  verifyUserCredentials,
} from '../services/userService';

const getRequiredUserId = (req: Request) => req.userId;

export async function signup(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const user = await createUser({ email, password });
    const token = generateToken(user.id, user.email);
    return res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
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
    return res.json({ success: true, token, user: { id: user.id, email: user.email } });
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
      user: {
        id: result.user.id,
        email: result.user.email,
        createdAt: result.user.createdAt,
      },
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
    const watchlist = await listWatchlist(userId, status);
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
      user: {
        id: result.user.id,
        email: result.user.email,
        createdAt: result.user.createdAt,
      },
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

    const { currentPassword, newPassword } = req.body;

    try {
      const result = await updateProfile(userId, { currentPassword, newPassword });
      return res.json({ success: true, message: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes('Invalid current password') || message.includes('Current password required') ? 401 : 400;
      return res.status(status).json({ success: false, message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: String(error) });
  }
}
