const KILOBYTE = 1024;
export const MAX_IMAGE_BYTES = 500 * KILOBYTE;
const TARGET_BYTES = 350 * KILOBYTE;

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

const toDataUrl = (blob: Blob): Promise<string> =>
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
  let low = 0.3;
  let high = 0.95;
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
    const smallest = await toWebP(canvas, 0.3);
    if (smallest.size > MAX_IMAGE_BYTES) {
      scale *= 0.85;
      continue;
    }
    result = await bestQuality(canvas);
    break;
  }

  if (!result || result.size > MAX_IMAGE_BYTES) {
    throw new Error('Foto tidak dapat diperkecil hingga maksimal 500 KB.');
  }
  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || `foto-${Date.now()}`;
  return {
    dataUrl: await toDataUrl(result),
    fileName: `${baseName}.webp`,
    size: result.size,
  };
};

export const formatImageSize = (bytes: number) =>
  `${Math.round(bytes / KILOBYTE)} KB`;
