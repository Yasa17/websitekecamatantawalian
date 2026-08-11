import {
  blobToDataUrl,
  encodeCanvasToWebP,
  ImageTooLargeError,
  type ProcessedImage,
} from './imageUpload';

export const SUPPORTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export type SupportedVideoMimeType = (typeof SUPPORTED_VIDEO_MIME_TYPES)[number];

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_FRAME_SIDE = 1280;
const MIN_CAPTURE_FRACTION = 0.1;
const CAPTURE_FRACTION_RANGE = 0.8;
const FRAME_DOWNSCALE_FACTOR = 0.85;
const MAX_FRAME_ENCODE_ATTEMPTS = 8;

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface VideoThumbnailDependencies {
  createVideo: () => HTMLVideoElement;
  createCanvas: () => HTMLCanvasElement;
  createObjectUrl: (file: File) => string;
  revokeObjectUrl: (url: string) => void;
  encodeCanvas: (canvas: HTMLCanvasElement) => Promise<Blob>;
  readBlob: (blob: Blob) => Promise<string>;
  setTimer: (callback: () => void, timeoutMs: number) => TimerHandle;
  clearTimer: (handle: TimerHandle) => void;
}

export interface VideoThumbnailOptions {
  /** Dapat disuntikkan pada pengujian agar pemilihan frame selalu konsisten. */
  random?: () => number;
  timeoutMs?: number;
  maxFrameSide?: number;
  dependencies?: Partial<VideoThumbnailDependencies>;
}

export interface ProcessedVideoThumbnail extends ProcessedImage {
  timeSeconds: number;
  durationSeconds: number;
  /** Alias lama yang dipertahankan agar mudah dibaca pada kode pemanggil. */
  captureTime: number;
}

const extensionMimeTypes: Readonly<Record<string, SupportedVideoMimeType>> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export const supportedVideoMimeType = (
  file: Pick<File, 'name' | 'type'>,
): SupportedVideoMimeType | null => {
  const declaredType = file.type.trim().toLowerCase().split(';', 1)[0];
  if (SUPPORTED_VIDEO_MIME_TYPES.includes(declaredType as SupportedVideoMimeType)) {
    return declaredType as SupportedVideoMimeType;
  }

  // Sebagian browser seluler tidak mengisi MIME type. Ekstensi hanya dipakai
  // sebagai fallback saat type benar-benar kosong, bukan untuk menimpa type
  // lain yang jelas tidak didukung.
  if (declaredType) return null;
  const extension = file.name.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  return extensionMimeTypes[extension] ?? null;
};

export const validateVideoForThumbnail = (file: Pick<File, 'name' | 'type'>) => {
  const mimeType = supportedVideoMimeType(file);
  if (!mimeType) {
    throw new Error('Video harus berformat MP4 atau WebM.');
  }
  return mimeType;
};

export const chooseVideoFrameTime = (duration: number, randomValue: number) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Durasi video tidak dapat dibaca oleh browser.');
  }
  const safeRandom = Number.isFinite(randomValue)
    ? Math.min(1, Math.max(0, randomValue))
    : 0.5;
  // Pembulatan milidetik menghindari artefak floating point dan tetap cukup
  // presisi untuk memilih frame thumbnail.
  return Math.round(
    duration * (MIN_CAPTURE_FRACTION + safeRandom * CAPTURE_FRACTION_RANGE) * 1000,
  ) / 1000;
};

export const selectVideoCaptureTime = chooseVideoFrameTime;

export const scaledVideoFrameDimensions = (
  width: number,
  height: number,
  maxFrameSide = DEFAULT_MAX_FRAME_SIDE,
) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Ukuran frame video tidak dapat dibaca oleh browser.');
  }
  const safeMaxSide = Number.isFinite(maxFrameSide) && maxFrameSide > 0
    ? maxFrameSide
    : DEFAULT_MAX_FRAME_SIDE;
  const scale = Math.min(1, safeMaxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const defaultDependencies = (): VideoThumbnailDependencies => ({
  createVideo: () => document.createElement('video'),
  createCanvas: () => document.createElement('canvas'),
  createObjectUrl: (file) => URL.createObjectURL(file),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  encodeCanvas: encodeCanvasToWebP,
  readBlob: blobToDataUrl,
  setTimer: (callback, timeoutMs) => globalThis.setTimeout(callback, timeoutMs),
  clearTimer: (handle) => globalThis.clearTimeout(handle),
});

const renderVideoFrame = async (
  video: HTMLVideoElement,
  dependencies: VideoThumbnailDependencies,
  maxFrameSide: number,
) => {
  let dimensions = scaledVideoFrameDimensions(
    video.videoWidth,
    video.videoHeight,
    maxFrameSide,
  );

  for (let attempt = 0; attempt < MAX_FRAME_ENCODE_ATTEMPTS; attempt += 1) {
    const canvas = dependencies.createCanvas();
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Thumbnail video tidak dapat diproses oleh browser.');
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      return await dependencies.encodeCanvas(canvas);
    } catch (error) {
      if (!(error instanceof ImageTooLargeError)) throw error;
      dimensions = {
        width: Math.max(1, Math.round(dimensions.width * FRAME_DOWNSCALE_FACTOR)),
        height: Math.max(1, Math.round(dimensions.height * FRAME_DOWNSCALE_FACTOR)),
      };
    }
  }

  throw new ImageTooLargeError();
};

export const extractVideoThumbnailToWebP = async (
  file: File,
  options: VideoThumbnailOptions = {},
): Promise<ProcessedVideoThumbnail> => {
  validateVideoForThumbnail(file);

  const dependencies = {
    ...defaultDependencies(),
    ...options.dependencies,
  };
  const random = options.random ?? Math.random;
  const timeoutMs = Number.isFinite(options.timeoutMs) && (options.timeoutMs ?? 0) > 0
    ? options.timeoutMs as number
    : DEFAULT_TIMEOUT_MS;
  const maxFrameSide = Number.isFinite(options.maxFrameSide) && (options.maxFrameSide ?? 0) > 0
    ? options.maxFrameSide as number
    : DEFAULT_MAX_FRAME_SIDE;
  const video = dependencies.createVideo();
  const objectUrl = dependencies.createObjectUrl(file);
  let objectUrlRevoked = false;

  const revokeObjectUrlOnce = () => {
    if (objectUrlRevoked) return;
    objectUrlRevoked = true;
    try {
      dependencies.revokeObjectUrl(objectUrl);
    } catch {
      // URL sudah tidak dipakai; kegagalan revoke tidak boleh menutupi hasil.
    }
  };

  try {
    const result = await new Promise<ProcessedVideoThumbnail>((resolve, reject) => {
      let settled = false;
      let captureTime: number | null = null;
      let timeoutHandle: TimerHandle | null = null;

      const removeListeners = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
      };

      const settle = (
        callback: (value: ProcessedVideoThumbnail | Error) => void,
        value: ProcessedVideoThumbnail | Error,
      ) => {
        if (settled) return;
        settled = true;
        removeListeners();
        if (timeoutHandle !== null) dependencies.clearTimer(timeoutHandle);
        callback(value);
      };

      const fail = (error: unknown) => settle(
        reject as (value: ProcessedVideoThumbnail | Error) => void,
        error instanceof Error ? error : new Error('Thumbnail video gagal dibuat.'),
      );

      function onError() {
        fail(new Error('Format atau codec video tidak dapat dibaca oleh browser.'));
      }

      function onLoadedMetadata() {
        try {
          captureTime = chooseVideoFrameTime(video.duration, random());
          // Event `seeked` sudah dipasang sebelum currentTime diubah sehingga
          // frame video singkat sekalipun tidak terlewat.
          video.currentTime = captureTime;
        } catch (error) {
          fail(error);
        }
      }

      function onSeeked() {
        if (captureTime === null || settled) return;
        void (async () => {
          try {
            const blob = await renderVideoFrame(video, dependencies, maxFrameSide);
            const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || `video-${Date.now()}`;
            const thumbnail: ProcessedVideoThumbnail = {
              dataUrl: await dependencies.readBlob(blob),
              fileName: `${baseName}-thumbnail.webp`,
              size: blob.size,
              timeSeconds: captureTime,
              durationSeconds: video.duration,
              captureTime,
            };
            settle(
              resolve as (value: ProcessedVideoThumbnail | Error) => void,
              thumbnail,
            );
          } catch (error) {
            fail(error);
          }
        })();
      }

      video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', onError, { once: true });
      const scheduledTimeout = dependencies.setTimer(
        () => fail(new Error('Pembuatan thumbnail video melewati batas waktu.')),
        timeoutMs,
      );
      timeoutHandle = scheduledTimeout;
      // Dependency pengujian boleh menjalankan callback secara sinkron.
      if (settled) dependencies.clearTimer(scheduledTimeout);

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;
      video.load();
    });

    return result;
  } finally {
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch {
      // Pembersihan elemen tidak boleh menutupi hasil/error utama.
    }
    revokeObjectUrlOnce();
  }
};

export const createVideoThumbnail = extractVideoThumbnailToWebP;
