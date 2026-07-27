"use client";

import { useId } from "react";

type BrandIconProps = { className?: string };

const TIKTOK_NOTE =
  "M12.9 2h3.03c.18 1.5 1 2.79 2.2 3.57.72.47 1.57.75 2.47.79v3.06a7.3 7.3 0 0 1-4.4-1.47v6.28a5.79 5.79 0 1 1-5.79-5.79c.31 0 .62.03.92.08v3.2a2.62 2.62 0 1 0 1.84 2.5V2z";

export function TikTokIcon({ className }: BrandIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={TIKTOK_NOTE} fill="#25F4EE" transform="translate(-1 0.7)" />
      <path d={TIKTOK_NOTE} fill="#FE2C55" transform="translate(1 -0.7)" />
      <path d={TIKTOK_NOTE} fill="#ffffff" />
    </svg>
  );
}

export function YouTubeIcon({ className }: BrandIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="1.5" y="5" width="21" height="14" rx="4.2" fill="#FF0000" />
      <path d="M10 8.4 16 12l-6 3.6z" fill="#ffffff" />
    </svg>
  );
}

export function InstagramIcon({ className }: BrandIconProps) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.25" stopColor="#FA7E1E" />
          <stop offset="0.5" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke={`url(#${id})`} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke={`url(#${id})`} strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.15" fill={`url(#${id})`} />
    </svg>
  );
}

export const SOCIAL_ICONS = {
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
} as const;

export const SOCIAL_LABELS = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
} as const;
