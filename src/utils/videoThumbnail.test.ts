import assert from 'node:assert/strict';
import test from 'node:test';
import { ImageTooLargeError } from './imageUpload';
import {
  chooseVideoFrameTime,
  extractVideoThumbnailToWebP,
  scaledVideoFrameDimensions,
  supportedVideoMimeType,
  validateVideoForThumbnail,
} from './videoThumbnail';
import { newsVideoContentType } from './videoUpload';

test('validasi video menerima MP4/WebM dan fallback ekstensi hanya ketika MIME kosong', () => {
  assert.equal(supportedVideoMimeType({ name: 'rapat.MP4', type: 'video/mp4' }), 'video/mp4');
  assert.equal(supportedVideoMimeType({ name: 'rapat.webm', type: '' }), 'video/webm');
  assert.equal(supportedVideoMimeType({ name: 'bukan-video.mp4', type: 'image/jpeg' }), null);
  assert.throws(
    () => validateVideoForThumbnail({ name: 'rekaman.mov', type: 'video/quicktime' }),
    /MP4 atau WebM/,
  );
});

test('upload berita menerima MIME MP4 atau ekstensi MP4 saat browser tidak mengirim MIME', () => {
  assert.equal(newsVideoContentType({ name: 'rapat.mp4', type: 'video/mp4' }), 'video/mp4');
  assert.equal(newsVideoContentType({ name: 'rapat.MP4', type: '' }), 'video/mp4');
  assert.equal(newsVideoContentType({ name: 'rapat.mp4', type: 'video/webm' }), null);
  assert.equal(newsVideoContentType({ name: 'rapat.webm', type: '' }), null);
});

test('waktu frame berada pada 10–90 persen durasi dan random yang rusak memakai tengah', () => {
  assert.equal(chooseVideoFrameTime(100, 0), 10);
  assert.equal(chooseVideoFrameTime(100, 0.25), 30);
  assert.equal(chooseVideoFrameTime(100, 1), 90);
  assert.equal(chooseVideoFrameTime(100, Number.NaN), 50);
  assert.throws(() => chooseVideoFrameTime(0, 0.5), /Durasi video/);
});

test('ukuran frame mempertahankan rasio dan tidak memperbesar video kecil', () => {
  assert.deepEqual(scaledVideoFrameDimensions(1920, 1080), { width: 1280, height: 720 });
  assert.deepEqual(scaledVideoFrameDimensions(640, 360), { width: 640, height: 360 });
  assert.deepEqual(scaledVideoFrameDimensions(1080, 1920), { width: 720, height: 1280 });
});

class FakeVideo extends EventTarget {
  duration = 100;
  videoWidth = 1920;
  videoHeight = 1080;
  preload = '';
  muted = false;
  playsInline = false;
  src = '';
  loadCalls = 0;
  pauseCalls = 0;
  private currentTimeValue = 0;

  get currentTime() {
    return this.currentTimeValue;
  }

  set currentTime(value: number) {
    this.currentTimeValue = value;
    queueMicrotask(() => this.dispatchEvent(new Event('seeked')));
  }

  load() {
    this.loadCalls += 1;
    if (this.src) queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata')));
  }

  pause() {
    this.pauseCalls += 1;
  }

  removeAttribute(name: string) {
    if (name === 'src') this.src = '';
  }
}

test('ekstraksi membuat WebP, mencoba ukuran lebih kecil, lalu membersihkan resource sekali', async () => {
  const video = new FakeVideo();
  const canvasSizes: Array<{ width: number; height: number }> = [];
  let encodeCalls = 0;
  let revokeCalls = 0;
  let clearTimerCalls = 0;
  let drawCalls = 0;

  const result = await extractVideoThumbnailToWebP(
    { name: 'musyawarah.mp4', type: 'video/mp4' } as File,
    {
      random: () => 0.25,
      dependencies: {
        createVideo: () => video as unknown as HTMLVideoElement,
        createCanvas: () => {
          const canvas = {
            width: 0,
            height: 0,
            getContext: () => ({
              drawImage: () => {
                drawCalls += 1;
                canvasSizes.push({ width: canvas.width, height: canvas.height });
              },
            }),
          };
          return canvas as unknown as HTMLCanvasElement;
        },
        createObjectUrl: () => 'blob:uji-video',
        revokeObjectUrl: () => {
          revokeCalls += 1;
        },
        encodeCanvas: async () => {
          encodeCalls += 1;
          if (encodeCalls === 1) throw new ImageTooLargeError();
          return new Blob(['thumbnail'], { type: 'image/webp' });
        },
        readBlob: async () => 'data:image/webp;base64,dGVzdA==',
        setTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
        clearTimer: () => {
          clearTimerCalls += 1;
        },
      },
    },
  );

  assert.equal(result.fileName, 'musyawarah-thumbnail.webp');
  assert.equal(result.timeSeconds, 30);
  assert.equal(result.captureTime, 30);
  assert.equal(result.durationSeconds, 100);
  assert.equal(result.size, 9);
  assert.equal(drawCalls, 2);
  assert.deepEqual(canvasSizes, [
    { width: 1280, height: 720 },
    { width: 1088, height: 612 },
  ]);
  assert.equal(clearTimerCalls, 1);
  assert.equal(revokeCalls, 1);
  assert.equal(video.pauseCalls, 1);
  assert.equal(video.loadCalls, 2);
});

test('timeout menolak proses serta tetap membersihkan timer dan object URL sekali', async () => {
  const video = new FakeVideo();
  video.load = () => {
    video.loadCalls += 1;
  };
  let revokeCalls = 0;
  let clearTimerCalls = 0;

  await assert.rejects(
    extractVideoThumbnailToWebP(
      { name: 'diam.webm', type: 'video/webm' } as File,
      {
        timeoutMs: 10,
        dependencies: {
          createVideo: () => video as unknown as HTMLVideoElement,
          createObjectUrl: () => 'blob:diam',
          revokeObjectUrl: () => {
            revokeCalls += 1;
          },
          setTimer: (callback) => {
            queueMicrotask(callback);
            return 2 as unknown as ReturnType<typeof setTimeout>;
          },
          clearTimer: () => {
            clearTimerCalls += 1;
          },
        },
      },
    ),
    /melewati batas waktu/,
  );

  assert.equal(clearTimerCalls, 1);
  assert.equal(revokeCalls, 1);
  assert.equal(video.pauseCalls, 1);
});
