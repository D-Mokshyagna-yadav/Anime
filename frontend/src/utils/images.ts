interface AnimeCoverImageLike {
  extraLarge?: string | null;
  large?: string | null;
  medium?: string | null;
}

import { logWarn } from './logger';

interface AnimeImageLike {
  bannerImage?: string | null;
  coverImage?: AnimeCoverImageLike | null;
}

const DEFAULT_ANIME_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b1630"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>
  <rect width="600" height="900" fill="#131318"/>
  <rect x="48" y="48" width="504" height="804" rx="28" fill="url(#bg)"/>
  <circle cx="300" cy="310" r="92" fill="#f5f3ff" fill-opacity="0.18"/>
  <path d="M232 430h136c35.346 0 64 28.654 64 64v58H168v-58c0-35.346 28.654-64 64-64Z" fill="#f5f3ff" fill-opacity="0.18"/>
  <text x="300" y="660" text-anchor="middle" fill="#f5f3ff" font-family="Arial, sans-serif" font-size="42" font-weight="700">SensuiWatch</text>
  <text x="300" y="710" text-anchor="middle" fill="#e9d5ff" font-family="Arial, sans-serif" font-size="28">Image unavailable</text>
</svg>`;

export const DEFAULT_ANIME_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DEFAULT_ANIME_IMAGE_SVG)}`;

const firstImage = (...images: Array<string | null | undefined>) =>
  images.find((image): image is string => typeof image === 'string' && image.trim().length > 0)?.trim() || DEFAULT_ANIME_IMAGE;

export const getAnimePosterImage = (anime?: AnimeImageLike | null) =>
  firstImage(
    anime?.coverImage?.extraLarge,
    anime?.coverImage?.large,
    anime?.coverImage?.medium,
    anime?.bannerImage
  );

export const getAnimeThumbImage = (anime?: AnimeImageLike | null) =>
  firstImage(
    anime?.coverImage?.medium,
    anime?.coverImage?.large,
    anime?.coverImage?.extraLarge,
    anime?.bannerImage
  );

export const getAnimeBannerImage = (anime?: AnimeImageLike | null) =>
  firstImage(
    anime?.bannerImage,
    anime?.coverImage?.extraLarge,
    anime?.coverImage?.large,
    anime?.coverImage?.medium
  );

export const buildBackgroundImage = (primary?: string | null, fallback = DEFAULT_ANIME_IMAGE) => {
  const safePrimary = typeof primary === 'string' && primary.trim().length > 0 ? primary.trim() : fallback;
  return safePrimary === fallback ? `url("${fallback}")` : `url("${safePrimary}"), url("${fallback}")`;
};

export const applyImageFallback = (image: HTMLImageElement, fallback = DEFAULT_ANIME_IMAGE) => {
  if (image.dataset.fallbackApplied === 'true') return;
  logWarn('Image', 'fallback-applied', { src: image.src, alt: image.alt });
  image.dataset.fallbackApplied = 'true';
  image.src = fallback;
};
