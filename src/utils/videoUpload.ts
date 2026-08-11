import { Upload } from 'tus-js-client';
import { apiRequest } from '../services/api';

const MEBIBYTE = 1024 * 1024;
export const MAX_NEWS_VIDEO_BYTES = 40 * MEBIBYTE;

interface VideoUploadTicket {
  bucket: string;
  path: string;
  token: string;
  publicUrl: string;
  tusEndpoint: string;
}

export interface UploadedNewsVideo {
  path: string;
  publicUrl: string;
}

export const newsVideoContentType = (file: Pick<File, 'name' | 'type'>) => {
  const declaredType = file.type.trim().toLowerCase().split(';', 1)[0];
  if (declaredType === 'video/mp4') return 'video/mp4';
  if (!declaredType && /\.mp4$/i.test(file.name.trim())) return 'video/mp4';
  return null;
};

export const validateNewsVideoFile = (file: File) => {
  const contentType = newsVideoContentType(file);
  if (!contentType) {
    throw new Error('Video yang dapat diunggah saat ini harus berformat MP4.');
  }
  if (file.size <= 0) {
    throw new Error('Berkas video kosong dan tidak dapat diunggah.');
  }
  if (file.size > MAX_NEWS_VIDEO_BYTES) {
    throw new Error('Ukuran video maksimal 40 MB.');
  }
  return contentType;
};

export const cleanupUploadedNewsVideo = async (entityId: string, path: string) => {
  await apiRequest<{ success: true }>('/api/admin/video-upload-cleanup', {
    method: 'POST',
    body: JSON.stringify({ entityId, path }),
  });
};

export const uploadNewsVideo = async ({
  entityId,
  file,
  onProgress,
}: {
  entityId: string;
  file: File;
  onProgress?: (percentage: number) => void;
}): Promise<UploadedNewsVideo> => {
  const contentType = validateNewsVideoFile(file);
  const ticket = await apiRequest<VideoUploadTicket>('/api/admin/video-upload-ticket', {
    method: 'POST',
    body: JSON.stringify({
      entityId,
      fileName: file.name,
      contentType,
      size: file.size,
    }),
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: ticket.tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { 'x-signature': ticket.token },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: 6 * MEBIBYTE,
        metadata: {
          bucketName: ticket.bucket,
          objectName: ticket.path,
          contentType,
          cacheControl: '31536000',
        },
        onError: (error) => reject(
          new Error(`Unggah video belum berhasil: ${error.message || 'koneksi terputus.'}`),
        ),
        onProgress: (uploaded, total) => {
          if (total > 0) onProgress?.(Math.round((uploaded / total) * 100));
        },
        onSuccess: () => resolve(),
      });
      upload.start();
    });
    return { path: ticket.path, publicUrl: ticket.publicUrl };
  } catch (error) {
    try {
      await cleanupUploadedNewsVideo(entityId, ticket.path);
    } catch (cleanupError) {
      console.error('Pembersihan video parsial tertunda:', cleanupError);
    }
    throw error;
  }
};

export const formatVideoSize = (bytes: number) =>
  `${(bytes / MEBIBYTE).toFixed(bytes >= 10 * MEBIBYTE ? 0 : 1)} MB`;
