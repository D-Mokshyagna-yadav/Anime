import { PrismaClient } from '@prisma/client';
import { getDetectedDatabaseConfig, normalizeDbType } from './database';

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
  prismaConnected?: boolean;
};

const config = getDetectedDatabaseConfig();

if (process.env.DB_TYPE && !normalizeDbType(process.env.DB_TYPE)) {
  console.warn(`[database] Unsupported DB_TYPE "${process.env.DB_TYPE}". Falling back to URL detection.`);
}

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let connectPromise: Promise<void> | null = null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectPrismaWithRetry(maxRetries = 5, initialDelayMs = 400): Promise<void> {
  if (globalForPrisma.prismaConnected) {
    return;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await prisma.$connect();
        globalForPrisma.prismaConnected = true;

        const providerLabel = config.isSupabase ? 'supabase-postgresql' : config.dbType;
        console.log(`[database] Connected using provider: ${providerLabel}`);
        return;
      } catch (error) {
        attempt += 1;
        const isLastAttempt = attempt >= maxRetries;
        const message = error instanceof Error ? error.message : String(error);

        if (isLastAttempt) {
          connectPromise = null;
          throw new Error(
            `[database] Failed to connect after ${maxRetries} attempts using ${config.dbType}: ${message}`
          );
        }

        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[database] Connection attempt ${attempt} failed. Retrying in ${delay}ms.`);
        await wait(delay);
      }
    }
  })();

  return connectPromise;
}

export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
  } finally {
    globalForPrisma.prismaConnected = false;
    connectPromise = null;
  }
}

let shutdownHooksRegistered = false;

export function registerPrismaShutdownHooks() {
  if (shutdownHooksRegistered) {
    return;
  }

  shutdownHooksRegistered = true;
  const shutdown = async (signal: string) => {
    try {
      await disconnectPrisma();
      console.log(`[database] Prisma disconnected on ${signal}`);
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

export default prisma;
