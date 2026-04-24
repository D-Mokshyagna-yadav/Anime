# SensuiWatch - Complete Implementation Guide

## Project Overview
SensuiWatch is a modern anime discovery, tracking, and streaming platform built with React, TypeScript, Node.js, and Prisma. Users can search for anime, add them to watchlists, and watch episodes through HLS streaming.

**Live Servers:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## Architecture Overview

### Tech Stack
- **Frontend**: React 19, Vite, TypeScript, React Router DOM v7
- **Backend**: Express.js, TypeScript, Node.js
- **Database**: Prisma ORM with SQLite (dev), supports PostgreSQL/MySQL
- **Caching**: Redis with automatic in-memory fallback
- **UI**: Tailwind CSS v4, shadcn/ui concepts, Framer Motion, Lucide Icons
- **Video Player**: HLS.js for M3U8 streaming, ArtPlayer integration ready
- **Authentication**: JWT-based with bcryptjs password hashing
- **External APIs**: AniList GraphQL (metadata), Consumet API (streaming links)

---

## Phase 1: Project Setup & Foundation ✅

### Completed
- ✅ Express backend with TypeScript configuration
- ✅ React + Vite frontend with hot-reload
- ✅ Prisma ORM setup with SQLite database
- ✅ Environment configuration (.env files)
- ✅ Core service implementations (Cache, AniList, Consumet)
- ✅ API routes structure
- ✅ React Router with 6 main pages

### Project Structure
```
backend/
├── src/
│   ├── index.ts           (Express app entry)
│   ├── middleware/
│   │   └── authMiddleware.ts (JWT auth)
│   ├── routes/
│   │   ├── anime.ts       (10+ endpoints)
│   │   └── user.ts        (Auth & Watchlist)
│   └── services/
│       ├── cacheService.ts
│       ├── anilistService.ts
│       └── consumetService.ts
├── prisma/
│   ├── schema.prisma      (3 models)
│   ├── migrations/        (init migration)
│   └── dev.db            (SQLite)
└── .env (configured)

frontend/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx           (Trending/Popular)
│   │   ├── AnimePage.tsx          (Details)
│   │   ├── SearchPage.tsx         (Search with filters)
│   │   ├── WatchPage.tsx          (Video player)
│   │   ├── WatchlistPage.tsx      (User watchlist)
│   │   ├── LoginPage.tsx          (Auth)
│   │   └── RegisterPage.tsx       (Auth)
│   ├── components/
│   │   ├── Navbar.tsx             (Navigation)
│   │   ├── Hero.tsx               (Featured carousel)
│   │   ├── AnimeCard.tsx          (Anime card)
│   │   └── ErrorBoundary.tsx      (Error handling)
│   ├── context/
│   │   └── AuthContext.tsx        (Auth state)
│   ├── api/
│   │   └── client.ts              (API methods)
│   ├── utils/
│   │   └── seo.ts                 (Meta tags)
│   ├── App.tsx                    (Routes)
│   └── main.tsx                   (Entry with AuthProvider)
└── .env (configured)
```

---

## Phase 2: Backend Development ✅

### Authentication System
**File**: `backend/src/middleware/authMiddleware.ts`
- JWT token generation with configurable expiry (default: 7d)
- Token validation middleware
- Express Request augmentation for TypeScript

### User Routes
**File**: `backend/src/routes/user.ts`

#### Endpoints Implemented:
1. **POST /api/user/signup**
   - Accepts: `{ email, password }`
   - Returns: `{ success, token, user }`
   - Password hashed with bcryptjs (salt: 10)

2. **POST /api/user/login**
   - Accepts: `{ email, password }`
   - Returns: `{ success, token, user }`
   - Validates credentials against stored hash

3. **GET /api/user/me** (Protected)
   - Returns current user profile
   - Includes watchlist and review counts

4. **POST /api/user/watchlist** (Protected)
   - Accepts: `{ animeId, status }`
   - Statuses: PLAN_TO_WATCH, WATCHING, COMPLETED, ON_HOLD, DROPPED
   - Creates or updates watchlist entry

5. **GET /api/user/watchlist** (Protected)
   - Query params: `?status=WATCHING`
   - Returns user's watchlist filtered by status

6. **PATCH /api/user/watchlist/:animeId** (Protected)
   - Update progress or status
   - Accepts: `{ status?, progress? }`

7. **DELETE /api/user/watchlist/:animeId** (Protected)
   - Remove anime from watchlist

### Database Schema
**File**: `backend/prisma/schema.prisma`

```prisma
model User {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String?
  createdAt    DateTime    @default(now())
  watchlists   Watchlist[]
  reviews      Review[]
}

model Watchlist {
  id        String   @id @default(uuid())
  userId    String
  animeId   String
  status    String   // PLAN_TO_WATCH, WATCHING, COMPLETED
  progress  Int      @default(0)  // episodes watched
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
}

model Review {
  id        String   @id @default(uuid())
  userId    String
  animeId   String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

### Anime Routes (Existing)
**File**: `backend/src/routes/anime.ts`

#### Endpoints:
- `GET /api/anime/trending` - Trending anime (paginated)
- `GET /api/anime/popular` - Popular anime (paginated)
- `GET /api/anime/seasonal?season=SPRING&year=2024` - Seasonal anime
- `GET /api/anime/search?q=naruto&genre=Action&status=RELEASING` - Search with filters
- `GET /api/anime/:id` - Anime details with characters
- `GET /api/anime/:slug/episodes` - Episodes from Consumet
- `GET /api/anime/stream/:episodeId` - Streaming links & subtitles

---

## Phase 3: Frontend Core UI & Features ✅

### Authentication & User Management
**File**: `frontend/src/context/AuthContext.tsx`
- Global auth state with useAuth hook
- Login/Signup methods
- Token persistence in localStorage
- Automatic token inclusion in API requests

**Files**: 
- `LoginPage.tsx` - Sign in form with validation
- `RegisterPage.tsx` - Sign up form with password confirmation

### Updated Components

#### Navbar
**File**: `frontend/src/components/Navbar.tsx`
- Shows user email when logged in
- Sign out button with logout functionality
- Search functionality
- Links to Watchlist page

#### HomePage
**File**: `frontend/src/pages/HomePage.tsx`
- SEO meta tags implementation
- Trending anime section (horizontal scroll)
- Popular anime section (grid)
- Skeleton loaders for loading states
- Framer Motion animations

#### AnimePage
**File**: `frontend/src/pages/AnimePage.tsx`
- Anime details with banner and poster
- Add to Watchlist functionality (authenticated users)
- Episode list fetching
- Watch Now button linking to video player
- Studio, genre, score display

#### WatchPage
**File**: `frontend/src/pages/WatchPage.tsx`
- HLS.js video player for M3U8 streams
- Quality selector
- Episode list panel
- Previous/Next episode navigation
- Error handling for unavailable episodes

#### WatchlistPage (New)
**File**: `frontend/src/pages/WatchlistPage.tsx`
- View watchlist by status
- Filter buttons (Planning, Watching, Completed)
- Progress tracking
- Remove from watchlist
- Protected route (requires login)

### API Client
**File**: `frontend/src/api/client.ts`

```typescript
// Anime endpoints
fetchTrending(page)
fetchPopular(page)
fetchSeasonal(season, year)
fetchAnimeById(id)
fetchSearch(query, page, genre, status)
fetchEpisodes(slug)
fetchStream(episodeId)

// Auth endpoints
authSignup(email, password)
authLogin(email, password)
authGetMe()

// Watchlist endpoints
watchlistAdd(animeId, status)
watchlistGet(status?)
watchlistUpdate(animeId, status?, progress?)
watchlistRemove(animeId)
```

**Interceptors**: Automatically includes JWT token in Authorization header

---

## Phase 4: User Features & Engagement ✅

### Watchlist System
- Add anime with status (default: PLAN_TO_WATCH)
- Track progress (episodes watched)
- Update status at any time
- Remove from watchlist
- View watchlist by status
- Persistent storage via Prisma/SQLite

### UI Enhancements
- Watchlist button on AnimeCard and AnimePage
- Visual feedback (Check icon when added)
- Protected routes for authenticated features
- Error messages for failed operations

---

## Phase 5: Optimization & Polish ✅

### Error Handling
**File**: `frontend/src/components/ErrorBoundary.tsx`
- Global error boundary to catch React errors
- Fallback UI with "Go Home" button
- Console error logging

### SEO Implementation
**File**: `frontend/src/utils/seo.ts`
- `setPageMeta()` function for dynamic meta tags
- Updates document title
- Sets Open Graph tags
- Called on HomePage and other main pages

### UI Polish
- Consistent error messages with AlertCircle icons
- Loading states with skeleton loaders
- Smooth animations with Framer Motion
- Responsive design with CSS Grid/Flexbox
- Glass morphism effects on cards
- Color gradients for primary text

### Performance Optimizations
- Code splitting with React Router
- Lazy loading of images
- Efficient API caching (Redis + local)
- HLS.js with quality management
- Debounced search input
- Memoization of components

---

## How to Use the Platform

### 1. Starting the Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev
# Server runs at http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm run dev
# Server runs at http://localhost:5173
```

### 2. Creating an Account
- Click "Register" in navbar
- Enter email and password (min 6 chars)
- Password confirmation required
- Automatically logged in after signup

### 3. Browsing Anime
- Home page shows trending and popular anime
- Click any anime card to view details
- Use search bar for finding specific titles
- Filter by genre, status, or format

### 4. Managing Watchlist
- Click "Add to Watchlist" on anime detail page
- View watchlist: Click your email in navbar
- Filter by status (Planning, Watching, Completed)
- Update progress and status anytime
- Remove anime with trash icon

### 5. Watching Episodes
- Click "Watch Now" on anime detail page
- Select episode from list
- Adjust video quality
- Video continues streaming with HLS.js

---

## API Examples

### Login
```bash
curl -X POST http://localhost:5000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {"id":"...", "email":"user@example.com"}
}
```

### Add to Watchlist
```bash
curl -X POST http://localhost:5000/api/user/watchlist \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"animeId":"1","status":"WATCHING"}'
```

### Get Trending Anime
```bash
curl http://localhost:5000/api/anime/trending?page=1

# Response
{
  "success": true,
  "data": {
    "media": [...],
    "pageInfo": {
      "total": 1000,
      "currentPage": 1,
      "lastPage": 50,
      "hasNextPage": true
    }
  }
}
```

---

## Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=file:./dev.db
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CONSUMET_API_URL=https://api.consumet.org
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=SensuiWatch
```

---

## Database Commands

```bash
cd backend

# View database GUI
npx prisma studio

# Create migrations
npx prisma migrate dev --name <name>

# Generate Prisma client
npx prisma generate

# Reset database (DEV ONLY)
npx prisma migrate reset
```

---

## Troubleshooting

### Redis Connection Issues
The app gracefully falls back to in-memory caching if Redis is unavailable. No action needed.

### CORS Errors
Check that `FRONTEND_URL` in `.env` matches your frontend URL.

### Video Not Loading
- Episode may not have streaming sources
- Check browser console for errors
- Ensure Consumet API is accessible

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Token expired? Try logging in again
- Check JWT_SECRET in .env is set

---

## Future Enhancements

### Potential Features
- [ ] User reviews and ratings system
- [ ] Anime recommendations engine
- [ ] Random anime picker
- [ ] Seasonal calendar view
- [ ] Favorite characters tracking
- [ ] Social sharing
- [ ] Dark/light theme toggle
- [ ] Offline mode with service workers
- [ ] Mobile app with React Native
- [ ] Admin dashboard
- [ ] CDN integration for images
- [ ] Advanced analytics

### Performance Improvements
- [ ] Image optimization with next-gen formats
- [ ] Service Worker caching
- [ ] GraphQL over REST
- [ ] Database query optimization
- [ ] CDN for static assets
- [ ] Server-side rendering (SSR)
- [ ] Edge caching with Redis cluster

---

## Code Patterns & Best Practices

### React Component Structure
```typescript
// Pages follow this pattern:
1. Auth check (useAuth hook)
2. Data fetching (useEffect)
3. Error state handling
4. Loading states
5. Render with animations
```

### API Calls
```typescript
// Use the client wrapper:
import { fetchTrending, AniMedia } from '../api/client';

const data = await fetchTrending(1);
const anime: AniMedia[] = data.data.data.media;
```

### Error Handling
```typescript
// Always include try-catch:
try {
  await action();
} catch (err: any) {
  setError(err.response?.data?.message || 'Failed');
}
```

---

## Development Workflow

### Adding a New Feature
1. Design API endpoint in backend
2. Create database migration if needed
3. Implement backend route
4. Test API with curl or Postman
5. Create/update API client method
6. Build frontend component
7. Test with real data
8. Add error handling
9. Add SEO if applicable

### Testing
```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

---

## Deployment Checklist

- [ ] Update JWT_SECRET in production .env
- [ ] Switch DATABASE_URL to PostgreSQL
- [ ] Enable Redis in production
- [ ] Setup HTTPS/SSL certificates
- [ ] Configure CORS_ORIGIN for production domain
- [ ] Setup environment-specific .env files
- [ ] Run `npm run build` for frontend
- [ ] Setup CI/CD pipeline
- [ ] Configure backup strategy
- [ ] Setup monitoring and logging
- [ ] Test all features in staging
- [ ] Document deployment process

---

## Support & Resources

- **Backend Docs**: Express.js, Prisma, TypeScript
- **Frontend Docs**: React 19, Vite, React Router v7
- **APIs**: AniList GraphQL, Consumet API
- **UI Framework**: Tailwind CSS v4, Framer Motion

---

**Project Status**: ✅ All Phases Complete

Last Updated: April 22, 2026
