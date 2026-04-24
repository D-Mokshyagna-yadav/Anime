# AniStream - Manual Testing Guide

## Pre-Testing Checklist

- ✅ Backend running: http://localhost:5000
- ✅ Frontend running: http://localhost:5174
- ✅ Database initialized (SQLite)
- ✅ Environment variables configured

## API Endpoint Testing

### 1. Anime Discovery Endpoints

#### Test: GET /api/anime/trending
**Expected**: Array of trending anime with metadata
```bash
curl http://localhost:5000/api/anime/trending
```

#### Test: GET /api/anime/popular
**Expected**: Array of popular anime
```bash
curl http://localhost:5000/api/anime/popular
```

#### Test: GET /api/anime/seasonal?season=SPRING&year=2024
**Expected**: Array of seasonal anime
```bash
curl "http://localhost:5000/api/anime/seasonal?season=SPRING&year=2024"
```

### 2. Search & Discovery

#### Test: GET /api/anime/search?q=naruto
**Expected**: Search results array
```bash
curl "http://localhost:5000/api/anime/search?q=naruto"
```

#### Test: GET /api/anime/:id
**Expected**: Anime details object
```bash
curl "http://localhost:5000/api/anime/16498" # Naruto Shippuden ID
```

### 3. Authentication Endpoints

#### Test: POST /api/user/signup
**Request Body**:
```json
{
  "email": "testuser@example.com",
  "password": "TestPassword123"
}
```

**Expected Response**:
```json
{
  "success": true,
  "token": "jwt_token_here"
}
```

**Command**:
```bash
curl -X POST http://localhost:5000/api/user/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPassword123"}'
```

#### Test: POST /api/user/login
**Request Body**:
```json
{
  "email": "testuser@example.com",
  "password": "TestPassword123"
}
```

**Expected Response**:
```json
{
  "success": true,
  "token": "jwt_token_here"
}
```

**Command**:
```bash
curl -X POST http://localhost:5000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"TestPassword123"}'
```

### 4. Protected Routes (Requires JWT Token)

#### Test: GET /api/user/me
**Headers**: `Authorization: Bearer <token>`

**Expected**: User profile object

**Command**:
```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/user/me
```

### 5. Watchlist Endpoints (Auth Required)

#### Test: POST /api/user/watchlist
**Request Body**:
```json
{
  "animeId": "16498",
  "status": "WATCHING"
}
```

**Command**:
```bash
curl -X POST http://localhost:5000/api/user/watchlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"animeId":"16498","status":"WATCHING"}'
```

#### Test: GET /api/user/watchlist
**Command**:
```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/user/watchlist
```

#### Test: PUT /api/user/watchlist/:animeId
**Request Body**:
```json
{
  "status": "COMPLETED",
  "progress": 500
}
```

#### Test: DELETE /api/user/watchlist/:animeId
**Command**:
```bash
curl -X DELETE http://localhost:5000/api/user/watchlist/16498 \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 6. Review Endpoints (Auth Required)

#### Test: POST /api/user/reviews
**Request Body**:
```json
{
  "animeId": "16498",
  "rating": 4.5,
  "comment": "Great anime! Loved the story."
}
```

#### Test: GET /api/user/reviews
**Command**:
```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/user/reviews
```

#### Test: DELETE /api/user/reviews/:animeId
**Command**:
```bash
curl -X DELETE http://localhost:5000/api/user/reviews/16498 \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 7. Streaming Endpoints

#### Test: GET /api/anime/:slug/episodes
**Example**: `/api/anime/naruto-shippuden/episodes`

#### Test: GET /api/anime/stream/:episodeId
**Expected**: Streaming links with HLS URL and subtitles

### 8. Profile Endpoints (Auth Required)

#### Test: GET /api/user/profile
**Command**:
```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/user/profile
```

#### Test: PUT /api/user/profile
**Request Body**:
```json
{
  "currentPassword": "TestPassword123",
  "newPassword": "NewPassword123"
}
```

## Frontend Testing Checklist

### Navigation
- [ ] Navbar visible on all pages
- [ ] All navigation links work (Home, Search, Season, Continue Watching, Settings)
- [ ] Logo link returns to home

### Homepage
- [ ] Hero carousel displays and auto-rotates
- [ ] Trending section loads data from API
- [ ] Popular section loads data from API
- [ ] Airing section displays seasonal anime
- [ ] All anime cards are clickable

### Search Page
- [ ] Search input accepts text
- [ ] Search triggers API call
- [ ] Results display in grid
- [ ] Pagination works
- [ ] Filters work (optional)

### Anime Detail Page
- [ ] Banner image displays
- [ ] Anime title and description visible
- [ ] Episode list loads from API
- [ ] Episodes are numbered correctly
- [ ] Click episode loads streaming page

### Watch Page
- [ ] Video player loads
- [ ] Streaming links fetched from API
- [ ] Play/pause controls work
- [ ] Quality selector displays options
- [ ] Subtitles can be toggled
- [ ] Episode list sidebar displays

### Watchlist Page
- [ ] Tabs display (PLAN_TO_WATCH, WATCHING, COMPLETED)
- [ ] Add to watchlist button visible on anime pages
- [ ] Watchlist items appear in correct tab
- [ ] Remove from watchlist works
- [ ] Edit status changes tab

### Authentication
- [ ] Register form works
- [ ] Login form works
- [ ] JWT token stored in localStorage
- [ ] Protected pages redirect to login if not authenticated
- [ ] Logout clears token

### Profile Page
- [ ] User info displays
- [ ] Statistics show (anime watched, hours watched, etc.)
- [ ] Change password form present
- [ ] Profile update works

## Error Scenarios to Test

### Network Errors
- [ ] Disconnect API and verify graceful error handling
- [ ] Verify fallback APIs are used

### Authentication Errors
- [ ] Invalid email format shows error
- [ ] Password too short shows error
- [ ] Duplicate email shows error
- [ ] Wrong password shows error
- [ ] Expired token redirects to login

### API Errors
- [ ] 404 for non-existent anime
- [ ] 500 error shows user-friendly message
- [ ] Timeout shows retry option

## Performance Testing

- [ ] Page load time < 3 seconds
- [ ] Smooth animations (60 FPS)
- [ ] No console errors
- [ ] No memory leaks (DevTools)
- [ ] Responsive on mobile view

## Streaming Quality Testing

- [ ] 480p loads and plays
- [ ] 720p loads and plays
- [ ] 1080p loads and plays (if available)
- [ ] Quality can be switched mid-playback
- [ ] Subtitles sync with video

## Browser Compatibility

- [ ] Chrome/Edge (primary)
- [ ] Firefox
- [ ] Safari (if available)

---

## Testing Results Log

### Date: 2024-04-23

#### Test Session 1: API Endpoints
**Time**: 
**Tester**: 
**Results**: 

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/anime/trending | ✅/❌ | |
| GET /api/anime/popular | ✅/❌ | |
| GET /api/anime/search | ✅/❌ | |
| POST /api/user/signup | ✅/❌ | |
| POST /api/user/login | ✅/❌ | |
| GET /api/user/me | ✅/❌ | |
| POST /api/user/watchlist | ✅/❌ | |
| GET /api/user/watchlist | ✅/❌ | |
| POST /api/user/reviews | ✅/❌ | |

#### Test Session 2: Frontend Pages
**Time**: 
**Tester**: 
**Results**: 

| Page | Status | Notes |
|------|--------|-------|
| Homepage | ✅/❌ | |
| Search Page | ✅/❌ | |
| Anime Detail | ✅/❌ | |
| Watch Page | ✅/❌ | |
| Watchlist | ✅/❌ | |
| Login/Register | ✅/❌ | |
| Profile | ✅/❌ | |

---

## Next Steps After Testing

1. **Document any bugs found**
2. **Fix critical issues**
3. **Optimize performance if needed**
4. **Write automated tests**
5. **Prepare for production deployment**
