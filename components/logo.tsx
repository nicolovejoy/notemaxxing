export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {/* First X */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}>
        <circle cx="16" cy="16" r="15" fill="#3B82F6" stroke="#2563EB" strokeWidth="1"/>
        <g transform="rotate(45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#FFF"/>
          <rect x="14" y="6" width="4" height="4" fill="#1F2937"/>
        </g>
        <g transform="rotate(-45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#FFF"/>
          <rect x="14" y="6" width="4" height="4" fill="#1F2937"/>
        </g>
        <g transform="rotate(45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#E5E7EB" opacity="0.8"/>
          <rect x="14" y="6" width="4" height="4" fill="#374151"/>
        </g>
        <g transform="rotate(-45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#E5E7EB" opacity="0.8"/>
          <rect x="14" y="6" width="4" height="4" fill="#374151"/>
        </g>
      </svg>
      
      {/* Second X */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}>
        <circle cx="16" cy="16" r="15" fill="#3B82F6" stroke="#2563EB" strokeWidth="1"/>
        <g transform="rotate(45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#FFF"/>
          <rect x="14" y="6" width="4" height="4" fill="#1F2937"/>
        </g>
        <g transform="rotate(-45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#FFF"/>
          <rect x="14" y="6" width="4" height="4" fill="#1F2937"/>
        </g>
        <g transform="rotate(45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#E5E7EB" opacity="0.8"/>
          <rect x="14" y="6" width="4" height="4" fill="#374151"/>
        </g>
        <g transform="rotate(-45 16 16)">
          <rect x="14" y="6" width="4" height="20" rx="2" fill="#E5E7EB" opacity="0.8"/>
          <rect x="14" y="6" width="4" height="4" fill="#374151"/>
        </g>
      </svg>
    </div>
  );
}