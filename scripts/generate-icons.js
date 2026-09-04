import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1. Create Authentic, Pristine SDIT Al Hidayah Logam SVG (No dark/black shield, perfect contrast and safe zones)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich Islamic Emerald Gradients -->
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="45%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="innerEmerald" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#065f46" />
      <stop offset="50%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>

    <!-- Radiant Gold Gradients -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="35%" stop-color="#fbbf24" />
      <stop offset="70%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="50%" stop-color="#fef3c7" />
      <stop offset="100%" stop-color="#fde68a" />
    </linearGradient>

    <!-- Soft Drop Shadow for Depth without black box -->
    <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#022c22" flood-opacity="0.35" />
    </filter>
    <filter id="emblemGlow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#064e3b" flood-opacity="0.4" />
    </filter>

    <!-- Circular Path for Curved Text: "SEKOLAH DASAR ISLAM TERPADU" -->
    <path id="topTextArc" d="M 96 256 A 160 160 0 0 1 416 256" fill="none" />
  </defs>

  <!-- Group centered with Safe Zone Margin (Padding for Android Maskable Icons: keeps content within 80% safe circle) -->
  <g id="main-crest" filter="url(#softGlow)">
    <!-- Outer Shield / Circle with Rich Gold Rim -->
    <circle cx="256" cy="256" r="226" fill="url(#emeraldGrad)" stroke="url(#goldGrad)" stroke-width="9" />
    <!-- Secondary Delicate Gold Dashed Ring -->
    <circle cx="256" cy="256" r="214" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" stroke-dasharray="6,4" opacity="0.9" />

    <!-- Arched Text: SEKOLAH DASAR ISLAM TERPADU -->
    <text font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="16.5" fill="#fef08a" letter-spacing="3.5">
      <textPath href="#topTextArc" startOffset="50%" text-anchor="middle">
        SEKOLAH DASAR ISLAM TERPADU
      </textPath>
    </text>

    <!-- Inner Clean Decorative Circle (Warm White / Ivory Backdrop for High Contrast & Crisp Visibility) -->
    <circle cx="256" cy="265" r="142" fill="#ffffff" stroke="url(#goldGrad)" stroke-width="4.5" filter="url(#emblemGlow)" />

    <!-- Inner Soft Sunburst Rays of Knowledge behind Emblem -->
    <g opacity="0.12">
      <circle cx="256" cy="255" r="130" fill="#f59e0b" />
      <path d="M 256 125 L 256 385 M 126 255 L 386 255 M 164 163 L 348 347 M 164 347 L 348 163" stroke="#047857" stroke-width="6" />
    </g>

    <!-- Crescent Moon & Star of Islamic Education -->
    <g transform="translate(256, 175) scale(0.72)">
      <!-- Golden Crescent -->
      <path d="M 0 -38 A 38 38 0 1 0 34 22 A 32 32 0 1 1 -12 -32 A 38 38 0 0 0 0 -38 Z" fill="url(#goldGrad)" stroke="#b45309" stroke-width="1.5" />
      <!-- Star in Center of Crescent -->
      <polygon points="12,-18 16,-6 28,-6 18,2 22,14 12,7 2,14 6,2 -4,-6 8,-6" fill="url(#goldGrad)" stroke="#b45309" stroke-width="1" />
    </g>

    <!-- Student / Figure of Spirit & Achievement (Reaching upward with arms raised) -->
    <g transform="translate(256, 216) scale(0.95)">
      <!-- Head / Light of Wisdom -->
      <circle cx="0" cy="-22" r="11" fill="url(#goldGrad)" stroke="#b45309" stroke-width="1.5" />
      <!-- Stylized dynamic arms reaching upward -->
      <path d="M -22 -10 Q -28 -3 0 14 Q 28 -3 22 -10 Q 32 -18 20 -2 Q 0 18 -20 -2 Q -32 -18 -22 -10 Z" fill="url(#goldGrad)" />
      <!-- Torso blending into the book -->
      <path d="M -8 8 L 8 8 L 5 24 L -5 24 Z" fill="url(#emeraldGrad)" />
    </g>

    <!-- Open Al-Qur'an / Book of Knowledge -->
    <g transform="translate(256, 276) scale(0.96)">
      <!-- Left Page (Emerald Backing) -->
      <path d="M -5 18 C -38 6 -74 12 -88 19 C -90 20 -92 19 -92 16 L -92 -36 C -92 -38 -90 -40 -87 -41 C -74 -46 -38 -50 -5 -36 Z" fill="#047857" />
      <!-- Left Page (White Paper) -->
      <path d="M -5 15 C -36 4 -70 10 -84 16 C -86 17 -87 16 -87 13 L -87 -33 C -87 -35 -85 -37 -82 -38 C -70 -43 -36 -47 -5 -33 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.8" />

      <!-- Right Page (Emerald Backing) -->
      <path d="M 5 18 C 38 6 74 12 88 19 C 90 20 92 19 92 16 L 92 -36 C 92 -38 90 -40 87 -41 C 74 -46 38 -50 5 -36 Z" fill="#047857" />
      <!-- Right Page (White Paper) -->
      <path d="M 5 15 C 36 4 70 10 84 16 C 86 17 87 16 87 13 L 87 -33 C 87 -35 85 -37 82 -38 C 70 -43 36 -47 5 -33 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.8" />

      <!-- Center Spine & Gold Trim -->
      <path d="M -6 -35 Q 0 -40 6 -35 L 6 18 Q 0 14 -6 18 Z" fill="url(#goldGrad)" />

      <!-- Abstract scripture text lines -->
      <line x1="-74" y1="-26" x2="-20" y2="-23" stroke="#059669" stroke-width="2.5" stroke-linecap="round" />
      <line x1="-74" y1="-14" x2="-20" y2="-11" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
      <line x1="-74" y1="-2" x2="-20" y2="1" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
      <line x1="-74" y1="9" x2="-35" y2="11" stroke="#64748b" stroke-width="2" stroke-linecap="round" />

      <line x1="20" y1="-23" x2="74" y2="-26" stroke="#059669" stroke-width="2.5" stroke-linecap="round" />
      <line x1="20" y1="-11" x2="74" y2="-14" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
      <line x1="20" y1="1" x2="74" y2="-2" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
      <line x1="35" y1="11" x2="74" y2="9" stroke="#64748b" stroke-width="2" stroke-linecap="round" />

      <!-- Red Bookmark Ribbon Hanging Down -->
      <path d="M -2.5 15 L 2.5 15 L 5 38 L 0 32 L -5 38 Z" fill="#dc2626" />
    </g>

    <!-- Prominent Bottom Ribbon Banner: "SDIT AL HIDAYAH" -->
    <g transform="translate(256, 372)">
      <!-- Ribbon Back Ends / Tails -->
      <path d="M -158 8 L -120 -12 L 120 -12 L 158 8 L 142 34 L 115 22 L -115 22 L -142 34 Z" fill="#064e3b" stroke="url(#goldGrad)" stroke-width="2" />
      <!-- Main Center Banner Plate -->
      <rect x="-132" y="-12" width="264" height="34" rx="7" fill="url(#goldGrad)" stroke="#78350f" stroke-width="2" />
      <!-- School Initials Banner Text -->
      <text x="0" y="11" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18.5" fill="#064e3b" text-anchor="middle" letter-spacing="2">
        SDIT AL HIDAYAH
      </text>
    </g>

    <!-- Sub-Badge Pill: "LOGAM" -->
    <g transform="translate(256, 422)">
      <rect x="-48" y="-11" width="96" height="22" rx="11" fill="#047857" stroke="url(#goldGrad)" stroke-width="2" />
      <text x="0" y="4" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="12" fill="#fef08a" text-anchor="middle" letter-spacing="2.5">
        LOGAM
      </text>
    </g>

    <!-- Decorative Corner Gold Stars -->
    <g fill="#fbbf24">
      <polygon points="90,200 93,208 101,208 95,213 97,221 90,216 83,221 85,213 79,208 87,208" transform="scale(0.8) translate(25, 50)" />
      <polygon points="422,200 425,208 433,208 427,213 429,221 422,216 415,221 417,213 411,208 419,208" transform="scale(0.8) translate(105, 50)" />
    </g>
  </g>
</svg>`;

// 2. Create Maskable Version (with full emerald solid background to satisfy Android adaptive icon standard without white/black borders)
const svgMaskableContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#047857" />
  <g transform="scale(0.82) translate(56, 56)">
    ${svgContent.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">', '').replace('</svg>', '')}
  </g>
</svg>`;

async function buildIcons() {
  const publicDir = path.resolve('public');

  // 1. Write favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
  console.log('Successfully wrote public/favicon.svg');

  // 2. Generate icon-192.png (transparent background)
  await sharp(Buffer.from(svgContent))
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Successfully generated public/icon-192.png');

  // 3. Generate icon-512.png (transparent background)
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Successfully generated public/icon-512.png');

  // 4. Generate icon-maskable-192.png (with safe margin for Android adaptive icons)
  await sharp(Buffer.from(svgMaskableContent))
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-maskable-192.png'));
  console.log('Successfully generated public/icon-maskable-192.png');

  // 5. Generate icon-maskable-512.png (with safe margin for Android adaptive icons)
  await sharp(Buffer.from(svgMaskableContent))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('Successfully generated public/icon-maskable-512.png');

  // 6. Generate apple-touch-icon.png (180x180)
  await sharp(Buffer.from(svgMaskableContent))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Successfully generated public/apple-touch-icon.png');
}

buildIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
