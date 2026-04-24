import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

interface CreateUserInput {
  email: string;
  password: string;
}

interface UpdateProfileInput {
  currentPassword?: string;
  newPassword?: string;
}

interface UpsertWatchlistInput {
  userId: string;
  animeId: string;
  status?: string;
}

interface UpdateWatchlistInput {
  userId: string;
  animeId: string;
  status?: string;
  progress?: number;
}

interface UpsertReviewInput {
  userId: string;
  animeId: string;
  rating: number;
  comment?: string;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser({ email, password }: CreateUserInput) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

export async function verifyUserCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function getUserWithStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { watchlists: true, reviews: true },
  });

  if (!user) return null;

  const watchingCount = user.watchlists.filter((item) => item.status === 'WATCHING').length;
  const completedCount = user.watchlists.filter((item) => item.status === 'COMPLETED').length;
  const totalWatched = user.watchlists.reduce((sum, item) => sum + (item.progress || 0), 0);

  return {
    user,
    stats: {
      totalWatched,
      watchingCount,
      completedCount,
      reviewsWritten: user.reviews.length,
    },
  };
}

export async function upsertWatchlist({ userId, animeId, status }: UpsertWatchlistInput) {
  const existing = await prisma.watchlist.findFirst({
    where: { userId, animeId },
  });

  if (existing) {
    return prisma.watchlist.update({
      where: { id: existing.id },
      data: { status: status || existing.status, updatedAt: new Date() },
    });
  }

  return prisma.watchlist.create({
    data: {
      userId,
      animeId,
      status: status || 'PLAN_TO_WATCH',
    },
  });
}

export async function listWatchlist(userId: string, status?: string) {
  return prisma.watchlist.findMany({
    where: { userId, ...(status && { status }) },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function deleteWatchlistEntry(userId: string, animeId: string) {
  await prisma.watchlist.deleteMany({
    where: { userId, animeId },
  });
}

export async function patchWatchlist({ userId, animeId, status, progress }: UpdateWatchlistInput) {
  const watchlist = await prisma.watchlist.findFirst({ where: { userId, animeId } });
  if (!watchlist) return null;

  return prisma.watchlist.update({
    where: { id: watchlist.id },
    data: {
      ...(status && { status }),
      ...(progress !== undefined && { progress }),
      updatedAt: new Date(),
    },
  });
}

export async function upsertReview({ userId, animeId, rating, comment }: UpsertReviewInput) {
  const existing = await prisma.review.findFirst({
    where: { userId, animeId },
  });

  if (existing) {
    return prisma.review.update({
      where: { id: existing.id },
      data: { rating, comment: comment || null },
    });
  }

  return prisma.review.create({
    data: { userId, animeId, rating, comment: comment || null },
  });
}

export async function listReviews(userId: string) {
  return prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteReview(userId: string, animeId: string) {
  await prisma.review.deleteMany({
    where: { userId, animeId },
  });
}

export async function updateProfile(userId: string, { currentPassword, newPassword }: UpdateProfileInput) {
  if (!newPassword) {
    return { updated: false, message: 'Profile updated' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    throw new Error('Current password required');
  }

  const isValid = await bcrypt.compare(currentPassword || '', user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid current password');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { updated: true, message: 'Password updated successfully' };
}
