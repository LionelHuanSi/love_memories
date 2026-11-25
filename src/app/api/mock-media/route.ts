import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get('path') || 'memory';
  const label = filePath.split('/').pop()?.split('.')[0] || 'Khoảnh khắc kỷ niệm';

  // Return a stylish cosmic SVG placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <radialGradient id="cosmicGrad" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#232946" />
        <stop offset="60%" stop-color="#121833" />
        <stop offset="100%" stop-color="#090E20" />
      </radialGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#A78BFA" />
        <stop offset="100%" stop-color="#F2A7C4" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#cosmicGrad)" />
    <!-- Decorative Stars -->
    <circle cx="150" cy="120" r="2.5" fill="#F8EBDD" opacity="0.8" />
    <circle cx="680" cy="180" r="2" fill="#F8EBDD" opacity="0.7" />
    <circle cx="340" cy="80" r="1.5" fill="#A78BFA" opacity="0.9" />
    <circle cx="220" cy="480" r="2.5" fill="#F2A7C4" opacity="0.6" />
    <circle cx="620" cy="420" r="3" fill="#F8EBDD" opacity="0.8" />
    <!-- Icon Container -->
    <rect x="350" y="220" width="100" height="100" rx="24" fill="#121833" stroke="#A78BFA" stroke-width="2" stroke-opacity="0.4" />
    <path d="M375 285 L395 255 L415 280 L425 268 L445 285 Z" fill="url(#glowGrad)" opacity="0.85" />
    <circle cx="385" cy="250" r="6" fill="#F8EBDD" opacity="0.9" />
    <!-- Title Text -->
    <text x="400" y="370" font-family="-apple-system, sans-serif" font-size="18" font-weight="600" fill="#F8EBDD" text-anchor="middle" letter-spacing="0.5">
      ${label.slice(0, 35)}
    </text>
    <text x="400" y="400" font-family="-apple-system, sans-serif" font-size="12" fill="#A78BFA" text-anchor="middle">
      Our Little Universe ✨
    </text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
