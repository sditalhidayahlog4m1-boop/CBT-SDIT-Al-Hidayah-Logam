/**
 * Image compressor utility with full alpha-transparency preservation.
 * This ensures that Firestore documents stay compact while transparent PNGs/SVGs
 * never convert transparent areas into black backgrounds.
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth: number = 320,
  maxHeight: number = 320,
  quality: number = 0.85,
  forceTransparency: boolean = true
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const isExplicitPngOrSvg =
      (typeof fileOrBase64 !== 'string' &&
        (fileOrBase64.type === 'image/png' ||
          fileOrBase64.type === 'image/svg+xml' ||
          fileOrBase64.type === 'image/webp' ||
          fileOrBase64.name?.toLowerCase().endsWith('.png') ||
          fileOrBase64.name?.toLowerCase().endsWith('.svg'))) ||
      (typeof fileOrBase64 === 'string' &&
        (fileOrBase64.startsWith('data:image/png') ||
          fileOrBase64.startsWith('data:image/svg') ||
          fileOrBase64.startsWith('data:image/webp')));

    const processImage = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
          return;
        }

        // Always clear to transparent before drawing
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Check if image has any transparent pixels
        let hasTransparentPixels = false;
        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 250) {
              hasTransparentPixels = true;
              break;
            }
          }
        } catch {
          // If security prevents getImageData, fall back to checking MIME type
          hasTransparentPixels = isExplicitPngOrSvg;
        }

        // If forceTransparency is set, or the source is PNG/SVG, or has alpha pixels:
        // EXPORT AS PNG to strictly avoid black background artifacts from JPEG!
        if (forceTransparency || isExplicitPngOrSvg || hasTransparentPixels) {
          const compressedDataUrl = canvas.toDataURL('image/png');
          resolve(compressedDataUrl);
        } else {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        }
      } catch (err) {
        console.warn('[ImageCompressor] Fallback to raw image:', err);
        if (typeof fileOrBase64 === 'string') {
          resolve(fileOrBase64);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => reject(new Error('Gagal membaca gambar.'));
          reader.readAsDataURL(fileOrBase64);
        }
      }
    };

    img.onload = processImage;
    img.onerror = () => {
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => reject(new Error('Gagal memuat gambar'));
        reader.readAsDataURL(fileOrBase64);
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => reject(new Error('Gagal membaca file foto'));
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * Detects whether an image has an opaque black background by sampling its 4 outer corners and edges.
 */
export function detectBlackBackground(imageSrc: string, tolerance: number = 35): Promise<boolean> {
  return new Promise((resolve) => {
    if (!imageSrc) return resolve(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Check the 4 outer corner pixels
        const cornerIndices = [
          0, // top-left
          (size - 1) * 4, // top-right
          ((size - 1) * size + 0) * 4, // bottom-left
          ((size - 1) * size + (size - 1)) * 4, // bottom-right
        ];

        let opaqueBlackCorners = 0;
        for (const idx of cornerIndices) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          // If pixel is fully opaque and dark/black
          if (a > 200 && r <= tolerance && g <= tolerance && b <= tolerance) {
            opaqueBlackCorners++;
          }
        }

        // Also check if edge pixels are dark
        resolve(opaqueBlackCorners >= 3);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = imageSrc;
  });
}

/**
 * Removes solid/near-black background from an image starting from the outer borders inward
 * using a BFS flood-fill algorithm, exporting the result as a transparent PNG.
 */
export async function makeImageTransparent(
  imageSrc: string,
  tolerance: number = 38
): Promise<string> {
  return new Promise((resolve) => {
    if (!imageSrc) return resolve(imageSrc);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(imageSrc);

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;

        const isDark = (r: number, g: number, b: number) => {
          return r <= tolerance && g <= tolerance && b <= tolerance;
        };

        // Flood fill from all 4 borders
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];

        // Check top and bottom rows
        for (let x = 0; x < w; x++) {
          // Top row
          const topIdx = (0 * w + x) * 4;
          if (isDark(data[topIdx], data[topIdx + 1], data[topIdx + 2])) {
            queue.push(x, 0);
            visited[0 * w + x] = 1;
          }
          // Bottom row
          const botIdx = ((h - 1) * w + x) * 4;
          if (isDark(data[botIdx], data[botIdx + 1], data[botIdx + 2])) {
            queue.push(x, h - 1);
            visited[(h - 1) * w + x] = 1;
          }
        }

        // Check left and right columns
        for (let y = 0; y < h; y++) {
          const leftIdx = (y * w + 0) * 4;
          if (isDark(data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]) && !visited[y * w + 0]) {
            queue.push(0, y);
            visited[y * w + 0] = 1;
          }
          const rightIdx = (y * w + (w - 1)) * 4;
          if (isDark(data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]) && !visited[y * w + (w - 1)]) {
            queue.push(w - 1, y);
            visited[y * w + (w - 1)] = 1;
          }
        }

        // Run BFS
        let head = 0;
        while (head < queue.length) {
          const cx = queue[head++];
          const cy = queue[head++];
          const idx = (cy * w + cx) * 4;

          // Set alpha to 0 (completely transparent)
          data[idx + 3] = 0;

          // Check 4-connected neighbors
          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const pos = ny * w + nx;
              if (!visited[pos]) {
                visited[pos] = 1;
                const nIdx = pos * 4;
                if (isDark(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
                  queue.push(nx, ny);
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('[makeImageTransparent] Error:', err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

