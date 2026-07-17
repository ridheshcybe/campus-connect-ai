// apps/web-admin/src/components/Logo.tsx
// CampusConnect AI's own mark: a voice/speech bubble with a sound waveform —
// evoking a multilingual voice help desk. Unique to this project.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="CampusConnect AI logo"
    >
      <defs>
        <linearGradient id="cc-logo-grad" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#cc-logo-grad)" />
      {/* speech bubble */}
      <rect x="8" y="10" width="24" height="15" rx="4" fill="#ffffff" />
      <path d="M13 24 L13 31 L21 24 Z" fill="#ffffff" />
      {/* voice waveform */}
      <g stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round">
        <line x1="15" y1="14" x2="15" y2="21" />
        <line x1="20" y1="12" x2="20" y2="23" />
        <line x1="25" y1="15" x2="25" y2="20" />
      </g>
    </svg>
  );
}
