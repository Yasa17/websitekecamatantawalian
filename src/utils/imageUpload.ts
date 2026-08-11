const KILOBYTE = 1024;
export const MAX_IMAGE_BYTES = 500 * KILOBYTE;
const TARGET_BYTES = 350 * KILOBYTE;
const MIN_WEBP_QUALITY = 0.3;
const MAX_WEBP_QUALITY = 0.95;

export class ImageTooLargeError extends Error {
  constructor() {
    super('Foto tidak dapat diperkecil hingga maksimal 500 KB.');
    this.name = 'ImageTooLargeError';
  }
}

export interface ProcessedImage {
  dataUrl: string;
  fileName: string;
  size: number;
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Format foto tidak dapat dibaca oleh browser.'));
    };
    image.src = objectUrl;
  });

const toWebP = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== 'image/webp') {
          reject(new Error('Browser belum mendukung konversi WebP.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality,
    );
  });

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Hasil foto tidak dapat dibaca.'));
    reader.readAsDataURL(blob);
  });

const render = (image: HTMLImageElement, scale: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Foto tidak dapat diproses oleh browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const bestQuality = async (canvas: HTMLCanvasElement) => {
  let low = MIN_WEBP_QUALITY;
  let high = MAX_WEBP_QUALITY;
  let closest = await toWebP(canvas, high);
  for (let attempt = 0; attempt < 9; attempt += 1) {
    const quality = (low + high) / 2;
    const blob = await toWebP(canvas, quality);
    if (Math.abs(blob.size - TARGET_BYTES) < Math.abs(closest.size - TARGET_BYTES)) {
      closest = blob;
    }
    if (blob.size > TARGET_BYTES) high = quality;
    else low = quality;
  }
  return closest;
};

/**
 * Mengubah isi canvas menjadi WebP berukuran aman untuk Supabase Storage.
 *
 * Helper ini sengaja diekspor agar frame dari video dan foto biasa memakai
 * aturan ukuran/kualitas yang sama. Caller tetap bertanggung jawab mengecilkan
 * dimensi canvas terlebih dahulu bila encode gagal karena gambarnya terlalu
 * besar.
 */
export const encodeCanvasToWebP = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  if (canvas.width < 1 || canvas.height < 1) {
    throw new Error('Gambar tidak memiliki ukuran yang dapat diproses.');
  }

  const smallest = await toWebP(canvas, MIN_WEBP_QUALITY);
  if (smallest.size > MAX_IMAGE_BYTES) {
    throw new ImageTooLargeError();
  }

  const result = await bestQuality(canvas);
  if (result.size > MAX_IMAGE_BYTES) {
    return smallest;
  }
  return result;
};

export const processImageToWebP = async (file: File): Promise<ProcessedImage> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Berkas yang dipilih harus berupa foto.');
  }

  const image = await loadImage(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  let scale = Math.min(1, 2560 / longestSide);
  let result: Blob | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const canvas = render(image, scale);
    try {
      result = await encodeCanvasToWebP(canvas);
      break;
    } catch (error) {
      if (!(error instanceof ImageTooLargeError)) {
        throw error;
      }
      scale *= 0.85;
    }
  }

  if (!result || result.size > MAX_IMAGE_BYTES) {
    throw new ImageTooLargeError();
  }
  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || `foto-${Date.now()}`;
  return {
    dataUrl: await blobToDataUrl(result),
    fileName: `${baseName}.webp`,
    size: result.size,
  };
};

export const formatImageSize = (bytes: number) =>
  `${Math.round(bytes / KILOBYTE)} KB`;
