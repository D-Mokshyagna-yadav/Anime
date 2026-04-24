import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, generateToken } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Handle Prisma disconnection on process exit
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// POST /api/user/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    const token = generateToken(user.id, user.email);
    res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// POST /api/user/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email);
    res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/user/me - Get current user profile
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { watchlists: true, reviews: true },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      watchlistCount: user.watchlists.length,
      reviewCount: user.reviews.length,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// POST /api/user/watchlist - Add to watchlist
router.post('/watchlist', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { animeId, status } = req.body;
    if (!animeId) return res.status(400).json({ success: false, message: 'animeId required' });

    const existing = await prisma.watchlist.findFirst({
      where: { userId: req.userId, animeId },
    });

    if (existing) {
      const updated = await prisma.watchlist.update({
        where: { id: existing.id },
        data: { status: status || existing.status, updatedAt: new Date() },
      });
      return res.json({ success: true, watchlist: updated });
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        userId: req.userId,
        animeId,
        status: status || 'PLAN_TO_WATCH',
      },
    });

    res.json({ success: true, watchlist });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/user/watchlist - Get user's watchlist
router.get('/watchlist', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const status = req.query.status ? String(req.query.status) : undefined;
    const watchlist = await prisma.watchlist.findMany({
      where: { userId: req.userId, ...(status && { status }) },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, watchlist });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// DELETE /api/user/watchlist/:animeId - Remove from watchlist
router.delete('/watchlist/:animeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const animeId = String(req.params.animeId);
    await prisma.watchlist.deleteMany({
      where: { userId: req.userId, animeId },
    });

    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});
// POST /api/user/reviews - Add or update a review
router.post('/reviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { animeId, rating, comment } = req.body;
    if (!animeId || !rating) {
      return res.status(400).json({ success: false, message: 'animeId and rating required' });
    }

    if (rating < 1 || rating > 10) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 10' });
    }

    const existing = await prisma.review.findFirst({
      where: { userId: req.userId, animeId },
    });

    if (existing) {
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: { rating, comment: comment || null },
      });
      return res.json({ success: true, review: updated });
    }

    const review = await prisma.review.create({
      data: { userId: req.userId, animeId, rating, comment: comment || null },
    });

    res.json({ success: true, review });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/user/reviews - Get user's reviews
router.get('/reviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const reviews = await prisma.review.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, reviews });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// DELETE /api/user/reviews/:animeId - Delete a review
router.delete('/reviews/:animeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const animeId = String(req.params.animeId);
    await prisma.review.deleteMany({
      where: { userId: req.userId, animeId },
    });

    res.json({ success: true, message: 'Review deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// GET /api/user/profile - Get full user profile with stats
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { watchlists: true, reviews: true },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const watchingCount = user.watchlists.filter((w: { status: string }) => w.status === 'WATCHING').length;
    const completedCount = user.watchlists.filter((w: { status: string }) => w.status === 'COMPLETED').length;
    const totalWatched = user.watchlists.reduce((sum: number, w: { progress: number }) => sum + (w.progress || 0), 0);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      stats: {
        totalWatched,
        watchingCount,
        completedCount,
        reviewsWritten: user.reviews.length,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;

    if (newPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ success: false, message: 'Current password required' });
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid current password' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.userId },
        data: { passwordHash: newHash },
      });

      return res.json({ success: true, message: 'Password updated successfully' });
    }

    res.json({ success: true, message: 'Profile updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});
// PATCH /api/user/watchlist/:animeId - Update watchlist progress
router.patch('/watchlist/:animeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const animeId = String(req.params.animeId);
    const { status, progress } = req.body;

    const watchlist = await prisma.watchlist.findFirst({
      where: { userId: req.userId, animeId },
    });

    if (!watchlist) return res.status(404).json({ success: false, message: 'Not in watchlist' });

    const updated = await prisma.watchlist.update({
      where: { id: watchlist.id },
      data: {
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, watchlist: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

export default router;
