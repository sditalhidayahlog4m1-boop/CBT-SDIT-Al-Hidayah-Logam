/**
 * Utility for synchronizing School Logo across Web Browser (Favicon, Apple Touch Icon, Meta Tags)
 * and Application UI (Header, Sidebar, Login Modal, Profile).
 */

export const DEFAULT_SCHOOL_LOGO = '/favicon.svg';

/**
 * Validates if the given string looks like a usable image source (HTTP URL, relative path, or Base64 data URI).
 */
export function isValidLogoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  );
}

/**
 * Tests if an external image URL can be successfully loaded in the browser.
 */
export function testImageLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || !isValidLogoUrl(url)) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Dynamically updates the HTML <head> elements (Favicon, Shortcut Icon, Apple Touch Icon, and OpenGraph Image)
 * so that the school's logo is immediately reflected in the browser tab, mobile home screen icon, and preview.
 */
export function syncWebFaviconAndLogo(logoUrl?: string | null, schoolName?: string): void {
  if (typeof document === 'undefined') return;

  const targetLogo = logoUrl && isValidLogoUrl(logoUrl) ? logoUrl.trim() : DEFAULT_SCHOOL_LOGO;
  const isSvg = targetLogo.includes('.svg') || targetLogo.startsWith('data:image/svg+xml');
  const mimeType = isSvg ? 'image/svg+xml' : 'image/png';

  // 1. Update or create primary Favicon
  let favLink = document.getElementById('app-favicon') as HTMLLinkElement | null;
  if (!favLink) {
    favLink = document.querySelector("link[rel*='icon']");
  }

  if (favLink) {
    favLink.id = 'app-favicon';
    favLink.type = mimeType;
    favLink.href = targetLogo;
  } else {
    favLink = document.createElement('link');
    favLink.id = 'app-favicon';
    favLink.rel = 'icon';
    favLink.type = mimeType;
    favLink.href = targetLogo;
    document.head.appendChild(favLink);
  }

  // 2. Update or create Shortcut Icon
  let shortcutLink = document.getElementById('app-shortcut-icon') as HTMLLinkElement | null;
  if (!shortcutLink) {
    shortcutLink = document.querySelector("link[rel='shortcut icon']");
  }
  if (shortcutLink) {
    shortcutLink.id = 'app-shortcut-icon';
    shortcutLink.type = mimeType;
    shortcutLink.href = targetLogo;
  } else {
    shortcutLink = document.createElement('link');
    shortcutLink.id = 'app-shortcut-icon';
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = mimeType;
    shortcutLink.href = targetLogo;
    document.head.appendChild(shortcutLink);
  }

  // 3. Update or create Apple Touch Icon
  let appleLink = document.getElementById('app-apple-icon') as HTMLLinkElement | null;
  if (!appleLink) {
    appleLink = document.querySelector("link[rel='apple-touch-icon']");
  }
  if (appleLink) {
    appleLink.id = 'app-apple-icon';
    appleLink.href = targetLogo;
  } else {
    appleLink = document.createElement('link');
    appleLink.id = 'app-apple-icon';
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = targetLogo;
    document.head.appendChild(appleLink);
  }

  // 4. Update Web App Manifest dynamically for Android / Mobile PWA installation
  try {
    const appTitle = schoolName || 'CBT_SDIT Al Hidayah Logam';
    const shortTitle = schoolName ? schoolName.slice(0, 20) : 'SDIT Al Hidayah';
    
    // Choose primary icons for manifest
    const iconList = targetLogo === DEFAULT_SCHOOL_LOGO
      ? [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ]
      : [
          { src: targetLogo, sizes: '512x512', type: mimeType, purpose: 'any' },
          { src: targetLogo, sizes: '192x192', type: mimeType, purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ];

    const dynamicManifest = {
      name: appTitle,
      short_name: shortTitle,
      description: 'Sistem CBT (Computer-Based Test) modern berbasis web dengan dukungan online/offline.',
      start_url: '/',
      display: 'standalone',
      background_color: '#020617',
      theme_color: '#047857',
      icons: iconList,
    };

    const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: 'application/manifest+json',
    });
    const manifestBlobUrl = URL.createObjectURL(manifestBlob);

    let manifestLink = (document.getElementById('app-manifest') ||
      document.querySelector("link[rel='manifest']")) as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.id = 'app-manifest';
      manifestLink.href = manifestBlobUrl;
    } else {
      manifestLink = document.createElement('link');
      manifestLink.id = 'app-manifest';
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestBlobUrl;
      document.head.appendChild(manifestLink);
    }
  } catch (manifestErr) {
    console.warn('Could not dynamically update webmanifest:', manifestErr);
  }

  // 5. Update or create OpenGraph Image Meta Tag
  let ogImageMeta = document.querySelector("meta[property='og:image']") as HTMLMetaElement | null;
  if (!ogImageMeta) {
    ogImageMeta = document.createElement('meta');
    ogImageMeta.setAttribute('property', 'og:image');
    document.head.appendChild(ogImageMeta);
  }
  ogImageMeta.content = targetLogo === DEFAULT_SCHOOL_LOGO ? '/icon-512.png' : targetLogo;

  // 6. Update or create Twitter Image Meta Tag
  let twImageMeta = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement | null;
  if (!twImageMeta) {
    twImageMeta = document.createElement('meta');
    twImageMeta.setAttribute('name', 'twitter:image');
    document.head.appendChild(twImageMeta);
  }
  twImageMeta.content = targetLogo === DEFAULT_SCHOOL_LOGO ? '/icon-512.png' : targetLogo;
}
