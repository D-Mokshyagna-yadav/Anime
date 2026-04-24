import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdaptiveProvider } from './context/AdaptiveContext';
import './index.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const AnimePage = lazy(() => import('./pages/AnimePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const WatchPage = lazy(() => import('./pages/WatchPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ContinueWatchingPage = lazy(() => import('./pages/ContinueWatchingPage'));
const SeasonPage = lazy(() => import('./pages/SeasonPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

export default function App() {
  return (
    <AdaptiveProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="route-loader" aria-live="polite">Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/anime/:id" element={<AnimePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/watch/:animeId/:episodeId" element={<WatchPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/continue-watching" element={<ContinueWatchingPage />} />
            <Route path="/season" element={<SeasonPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/categories/:genre" element={<CategoryPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AdaptiveProvider>
  );
}
