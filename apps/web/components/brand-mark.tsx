export function BrandMark({
  className = "",
  gradientId = "crosspost-mark-gradient",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f487b7" />
          <stop offset="0.55" stopColor="#e1757b" />
          <stop offset="1" stopColor="#c28e2e" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="34" height="34" rx="10" fill={`url(#${gradientId})`} />
      {/* Crossing arrows — cross-posting */}
      <path
        d="M10.5 25.5L25.5 10.5"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 10.5H25.5V16.5"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 10.5L25.5 25.5"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <path
        d="M25.5 19.5V25.5H19.5"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  );
}
