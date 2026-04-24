# AniStream - Setup & Startup Guide

## Quick Start

### Start Development Environment (Concurrent)
```bash
# From project root directory
npm run dev
```

This starts both servers simultaneously:
- **Backend API**: http://localhost:5000 (Express.js + Prisma)
- **Frontend UI**: http://localhost:5174 (Vite + React)

### Build for Production
```bash
npm run build
```

Compiles TypeScript and optimizes both backend and frontend.

## Architecture Overview

### Backend Stack
- **Framework**: Express.js 5.2.1 (Node.js REST API)
- **ORM**: Prisma 5.22.0 (SQLite database)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Security**: bcryptjs 2.4.3
- **Caching**: ioredis with in-memory fallback
- **Port**: 5000

**Key Endpoints:**
```
GET    /api/anime/trending          - Trending anime
GET    /api/anime/popular           - Popular anime
GET    /api/anime/seasonal          - Seasonal releases
GET    /api/anime/search?q=query    - Search anime
GET    /api/anime/:id               - Anime details
GET    /api/anime/:slug/episodes    - Episode list
GET    /api/anime/stream/:id        - Streaming links
POST   /api/user/signup             - User registration
POST   /api/user/login              - User login
GET    /api/user/me                 - User profile (auth required)
POST   /api/user/watchlist          - Add to watchlist (auth required)
POST   /api/user/reviews            - Write review (auth required)
```

### Frontend Stack
- **Framework**: React 19.2.5 with TypeScript
- **Build Tool**: Vite 8.0.9
- **Styling**: Tailwind CSS 4.2.4 + custom CSS
- **State**: React Context + Hooks
- **HTTP**: Axios 1.15.2
- **Animations**: Framer Motion 12.38.0
- **Port**: 5173 (or 5174+ if occupied)

**Pages Implemented:**
- HomePage - Hero carousel, trending/popular sections
- AnimePage - Anime details, episode list
- SearchPage - Search & filtering
- WatchPage - Video player with streaming
- WatchlistPage - User's watchlist management
- LoginPage - User authentication
- RegisterPage - New account registration
- ProfilePage - User profile & stats
- SettingsPage - Preferences & account settings
- RecommendationsPage - Personalized anime suggestions
- ContinueWatchingPage - Resume progress tracking
- SeasonPage - Seasonal anime calendar

## Environment Configuration

### Backend (.env)
Key variables for streaming APIs:

```env
# Primary API
CONSUMET_API_URL=https://api.consumet.org

# Fallback APIs
JIKAN_API_URL=https://api.jikan.moe/v4
ANILIST_API_URL=https://graphql.anilist.co
CONSUMET_MIRROR_URL=https://api.consumet.org

# Streaming Providers (Priority)
PRIMARY_PROVIDER=gogoanime
FALLBACK_PROVIDER=zoro
TERTIARY_PROVIDER=9anime

# Timeouts (milliseconds)
STREAMING_API_TIMEOUT=10000
CACHE_TTL_STREAMING=600
CACHE_TTL_METADATA=3600

# Server
PORT=5000
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRY=7d
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_STREAMING_PROVIDER_PRIMARY=gogoanime
VITE_STREAMING_PROVIDER_FALLBACK=zoro
VITE_VIDEO_QUALITY_DEFAULT=720
VITE_CACHE_ENABLED=true
VITE_ANIMATIONS_ENABLED=true
```

## Database

### Current Setup
- **Type**: SQLite
- **Location**: `backend/dev.db`
- **Size**: ~40KB

**Tables:**
- `User` - User accounts with email/password
- `Watchlist` - Anime watchlist items per user
- `Review` - User reviews and ratings

### Reset Database
```bash
cd backend
npx prisma migrate reset
npx prisma db push
```

## API Integration Features

### Multi-Provider Fallback System
The backend implements automatic failover across multiple APIs:

1. **Primary**: Consumet API (gogoanime provider)
2. **Fallback 1**: Consumet Mirror
3. **Fallback 2**: Jikan API (metadata only)
4. **Fallback 3**: AniList GraphQL

If one API fails, the system automatically tries the next provider. All requests are cached.

### Request/Response Flow
```
Frontend Request
    ↓
Axios Client (with JWT token)
    ↓
Backend Express Route
    ↓
Consume Service (with fallback logic)
    ↓
Cache Check (Redis or in-memory)
    ↓
Streaming API (with retries)
    ↓
Response cached and returned
    ↓
Frontend displays data
```

## Authentication Flow

### Login/Register
1. User submits email + password
2. Backend hashes password with bcryptjs
3. JWT token generated (7-day expiry)
4. Token stored in localStorage (frontend)
5. Token sent in Authorization header for protected routes

### Protected Routes
- Add to watchlist: `POST /api/user/watchlist`
- Get watchlist: `GET /api/user/watchlist`
- Write review: `POST /api/user/reviews`
- Update profile: `PUT /api/user/profile`

## Caching Strategy

### Streaming Data (10 minutes)
- Episode lists
- Direct streaming links
- Video source URLs

### Metadata (1 hour)
- Anime information
- Search results
- User data

### Browser Cache (LocalStorage)
- User authentication token
- Recent searches
- User preferences

## Troubleshooting

### Port Already in Use
If port 5173 is taken, Vite automatically uses 5174+. Check terminal output for actual port.

### TypeScript Errors on Build
Run from project root:
```bash
npm run build
```

If backend build fails:
```bash
cd backend
npm run build
```

### API Connection Failed
1. Verify backend is running: `http://localhost:5000`
2. Check `.env` files are configured
3. Verify network connectivity to streaming APIs
4. Check browser console for CORS errors

### Database Issues
```bash
cd backend
npx prisma generate
npx prisma db push
```

## Performance Optimization

### Frontend
- Code splitting via Vite
- Lazy loading for pages/components
- Image optimization with blur placeholders
- CSS-in-JS with Tailwind (purged unused styles)
- Framer Motion for smooth 60fps animations

### Backend
- Response caching (Redis or in-memory)
- Connection pooling (Prisma)
- Gzip compression (Express middleware)
- API request batching where possible
- Database indexing on frequently queried fields

## Security Features

- JWT token-based authentication
- Password hashing with bcryptjs
- CORS configuration
- Environment variables for secrets
- SQL injection protection via Prisma ORM
- Input validation on all endpoints

## Next Steps

1. **Test Login/Register**: Create account at http://localhost:5174/register
2. **Browse Anime**: Search and discover anime on homepage
3. **Manage Watchlist**: Add anime to your watchlist (logged in)
4. **Write Reviews**: Rate and review watched anime
5. **Check Profile**: View your stats and activity

## Development Commands

### Backend Only
```bash
cd backend
npm run dev        # TypeScript watch mode
npm run build      # Compile to JavaScript
npm start          # Run compiled version
```

### Frontend Only
```bash
cd frontend
npm run dev        # Vite dev server with HMR
npm run build      # Production build
npm run preview    # Preview production build
```

### Database
```bash
cd backend
npx prisma studio # Visual database editor (http://localhost:5555)
```

## Design System (Stitch)

All UI pages follow the **"Neon Shogun"** design system:
- **Primary Color**: #de8eff (Electric Purple)
- **Secondary**: #00e3fd (Cyan)
- **Background**: #0c0e17 (Dark Navy)
- **Typography**: Plus Jakarta Sans (headlines), Inter (body)
- **Effects**: Glassmorphism with 20px backdrop blur

## License

MIT - Free for educational and personal use

## Support

For issues:
1. Check error message in browser console or terminal
2. Review `.env` configuration
3. Verify all services are running: Backend (5000), Frontend (5173+)
4. Check API status at https://api.consumet.org

---

**Happy Streaming! 🎬📺**
