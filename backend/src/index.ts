import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';
import animeRouter from './routes/anime';
import userRouter from './routes/user';
import { connectPrismaWithRetry, registerPrismaShutdownHooks } from './lib/prisma';
import { runNotificationSweep } from './services/notificationService';
import { attachNotificationWebSocket, publishNewNotifications } from './services/realtimeNotificationService';

const app = express();
const PORT = process.env.PORT || 5000;
const NOTIFICATION_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const frontendBuildExists = fs.existsSync(frontendIndexPath);

if (frontendBuildExists) {
  app.use(express.static(frontendDistPath));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint - test AniList connection
app.get('/api/debug/anilist', async (_req, res) => {
  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { Page(perPage: 1) { media(type: ANIME) { id title { romaji } } } }`
      })
    });
    const data = await response.json();
    res.json({ success: true, status: response.status, data });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

// Routes
app.use('/api/anime', animeRouter);
app.use('/api/user', userRouter);

if (frontendBuildExists) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || !req.accepts('html')) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
}

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

async function bootstrap() {
  try {
    await connectPrismaWithRetry();
    registerPrismaShutdownHooks();

    const server = http.createServer(app);
    const wss = new WebSocketServer({ server, path: '/api/user/notifications/ws' });
    attachNotificationWebSocket(wss);

    server.listen(PORT, () => {
      console.log(`🚀 SensuiWatch backend running at http://localhost:${PORT}`);
    });

    const sweepNotifications = async () => {
      try {
        const result = await runNotificationSweep();
        if (result.created > 0) {
          publishNewNotifications(result.createdNotifications);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[notifications] Sweep failed: ${message}`);
      }
    };

    void sweepNotifications();
    setInterval(() => {
      void sweepNotifications();
    }, NOTIFICATION_SWEEP_INTERVAL_MS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[startup] Failed to initialize backend: ${message}`);
    process.exit(1);
  }
}

void bootstrap();

export default app;
