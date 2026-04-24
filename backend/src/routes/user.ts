import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  addOrUpdateReview,
  addOrUpdateWatchlist,
  getReviews,
  getWatchlist,
  login,
  me,
  profile,
  removeReview,
  removeWatchlist,
  signup,
  updateUserProfile,
  updateWatchlist,
} from '../controllers/userController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

router.get('/me', authMiddleware, me);

router.post('/watchlist', authMiddleware, addOrUpdateWatchlist);
router.get('/watchlist', authMiddleware, getWatchlist);
router.delete('/watchlist/:animeId', authMiddleware, removeWatchlist);
router.patch('/watchlist/:animeId', authMiddleware, updateWatchlist);

router.post('/reviews', authMiddleware, addOrUpdateReview);
router.get('/reviews', authMiddleware, getReviews);
router.delete('/reviews/:animeId', authMiddleware, removeReview);

router.get('/profile', authMiddleware, profile);
router.put('/profile', authMiddleware, updateUserProfile);

export default router;
