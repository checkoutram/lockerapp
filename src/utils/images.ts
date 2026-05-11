// Image compression - resize large photos before storing in localStorage
// Phone photos are 2-5MB but localStorage only holds ~5MB total

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const JPEG_QUALITY = 0.7;

/**
 * Compress an image file using HTML5 Canvas
 * Resizes to max 800px dimension, converts to JPEG at 70% quality
 * A 3MB phone photo becomes ~100-200KB
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Step 1: Read file as Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) { reject(new Error('Failed to read file')); return; }

      // Step 2: Load image
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;

        // Scale down if larger than max
        if (w > MAX_WIDTH || h > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        // Step 3: Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not available')); return; }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        // Step 4: Export as compressed JPEG
        try {
          const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve(compressed);
        } catch {
          // If compression fails, return raw data URL
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Estimate compressed size before saving
 */
export function estimateSizeKB(dataUrl: string): number {
  if (!dataUrl.startsWith('data:')) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}
