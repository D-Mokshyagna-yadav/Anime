# HiAnime-Like Free Streaming Platform

This document outlines the implementation plan for building a modern anime discovery, tracking, and **streaming** website with a UI/UX similar to HiAnime.

## User Review Required

> [!WARNING]
> **Major Requirement Change: Free Streaming via APIs**
> Based on your latest feedback, I have removed the "legal official links only" constraint. The platform will now use free APIs (like **Consumet API**) to fetch direct video streams (`.m3u8` HLS links), subtitles, and dubs, allowing users to watch anime directly on your website for free. 
> 
> To achieve this, we will implement a custom video player (like `ArtPlayer` or `Plyr`) on the frontend to play the streams.
>
> If this updated plan aligns with your vision, please give the final approval so we can start building!

## Open Questions

> [!NOTE]
> *Assuming default 'yes' unless you specify otherwise:*
> 1. **Video Player:** I plan to use **ArtPlayer** or **Vidstack** for a premium, customizable streaming experience that supports HLS (m3u8), quality switching, and subtitles.
> 2. **UI Library:** Tailwind CSS + **shadcn/ui** + **Framer Motion** for a premium, modern UI.

## Proposed Architecture & Stack

- **Frontend:** React (via Vite), TypeScript, React Router
- **Backend:** Node.js with Express.js, TypeScript
- **Styling:** Tailwind CSS + shadcn/ui + Framer Motion
- **Database (Universal):** Prisma ORM (Supports switching between MongoDB, PostgreSQL/Supabase, MySQL, SQLite)
- **Cache (Resilient):** Redis (`ioredis`) with automatic fallback to local in-memory caching.
- **Authentication:** JWT + Google OAuth (implemented on backend)
- **External APIs:** 
  - **Consumet API** (For streaming links, episodes, sub/dub options)
  - AniList GraphQL API (For robust metadata, trending, details)

## Proposed Changes (Implementation Phases)

### Phase 1: Project Setup & Foundation
- Scaffold Vite + React frontend in `frontend/`.
- Scaffold Node.js backend in `backend/`.
- Setup Prisma ORM on the backend with a universal schema structure.
- Set up the base UI components (Navbar, Footer, Layout) in the frontend using React Router.

### Phase 2: Backend Development (Node.js)
- Configure Express with routing, CORS, and error handling.
- Implement Authentication (JWT login/signup, OAuth logic).
- Implement the `CacheService` (Try Redis -> Fallback to in-memory).
- Create external API services (`AniListService`, `ConsumetService`).
- Build the core endpoints:
  - `GET /api/anime/trending`
  - `GET /api/anime/popular`
  - `GET /api/anime/:id`
  - `GET /api/anime/:id/episodes` (Fetches episodes from Consumet)
  - `GET /api/anime/stream/:episodeId` (Fetches streaming links & subs from Consumet)
  - `GET /api/search`
  - `POST /api/user/watchlist`

### Phase 3: Frontend Core UI & Features
- **Homepage:** Build sections fetching from backend (Trending, Popular, Latest Episodes, Seasonal Calendar).
- **Search Page:** Implement robust search UI with filters.
- **Anime Detail Page:** Build the banner, poster, info panel, and episode list.
- **Streaming Page / Watch Now:** Implement a premium video player (ArtPlayer/Vidstack) to handle HLS streaming, quality selectors (1080p, 720p), and subtitle selection.

### Phase 4: User Features & Engagement
- **Watchlist System:** Integrate frontend with backend `/api/user/watchlist` for adding anime and tracking progress.
- **Reviews & Ratings:** Build the review components.
- **Recommendations & Randomizer:** Add recommendation engine UI and a "Random Anime" button.

### Phase 5: Optimization & Polish
- Update `<title>` and `<meta>` tags dynamically based on the current React route.
- Add skeleton loaders and infinite scrolling.
- Optimize bundle sizes and perform UI polish.

## Verification Plan

### Automated Tests
- Setup unit tests for the `CacheService` to ensure it correctly falls back to local cache when Redis is disconnected.

### Manual Verification
- Test user flows: Sign up/Login, adding an anime to the watchlist.
- Force Redis to fail and verify that the app still caches responses locally without crashing.
- **Test video streaming:** Verify that episodes load correctly, subtitles can be toggled, and quality can be changed.
  