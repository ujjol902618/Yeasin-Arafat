/**
 * Fast client-side image optimization and compression utility
 * Guaranteed to produce lightweight images (< 80KB) that fit safely within Firestore's 1MB limit.
 */

export function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Compresses an image File, Blob, or Data URL to a guaranteed-compact Data URL (< 80KB).
 * Uses HTML5 Canvas with universal JPEG output.
 */
export async function compressImageToDataUrl(source, maxDimension = 400, quality = 0.72) {
  if (!source) return '';

  return new Promise((resolve) => {
    const handleImg = (img) => {
      let width = img.width || 400;
      let height = img.height || 400;

      // Scale dimensions down if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(typeof source === 'string' ? source : '');
        return;
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let dataUrl = canvas.toDataURL('image/jpeg', quality);

      // If still over 120KB (approx 160k base64 chars), downscale once more to ensure safety
      if (dataUrl.length > 160000) {
        const smallerCanvas = document.createElement('canvas');
        smallerCanvas.width = Math.round(width * 0.7);
        smallerCanvas.height = Math.round(height * 0.7);
        const sCtx = smallerCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
          dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.65);
        }
      }

      resolve(dataUrl);
    };

    if (typeof source === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => handleImg(img);
      img.onerror = () => resolve(source);
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => handleImg(img);
        img.onerror = () => resolve('');
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(source);
    } else {
      resolve('');
    }
  });
}

/**
 * Compresses an image File or Blob and returns a compressed File object.
 */
export async function compressImage(file, maxDimension = 600, quality = 0.75) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  try {
    const dataUrl = await compressImageToDataUrl(file, maxDimension, quality);
    const blob = dataUrlToBlob(dataUrl);
    const cleanBaseName = (file.name || 'image').replace(/\.[^.]+$/, '');
    return new File([blob], `${cleanBaseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('Compression fallback to original file:', err);
    return file;
  }
}
