/**
 * Image compressor utility to resize photos down to a compact base64 format (~15KB - 30KB).
 * This ensures that Firestore documents stay well within the 1MB limit and sync across devices instantly.
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth: number = 320,
  maxHeight: number = 320,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

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
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
          return;
        }

        // Fill background with white/transparent if needed
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG or PNG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
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
