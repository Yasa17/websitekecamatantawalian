import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVideoEmbed } from './videoEmbed';

test('YouTube menerima watch, youtu.be, shorts, live, dan embed lalu menormalkannya', () => {
  const expected = {
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  };

  assert.deepEqual(resolveVideoEmbed('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12'), expected);
  assert.deepEqual(resolveVideoEmbed('youtube', 'https://youtu.be/dQw4w9WgXcQ?si=abc'), expected);
  assert.deepEqual(resolveVideoEmbed('youtube', 'https://youtube.com/shorts/dQw4w9WgXcQ'), expected);
  assert.deepEqual(resolveVideoEmbed('youtube', 'https://m.youtube.com/embed/dQw4w9WgXcQ'), expected);
  assert.deepEqual(resolveVideoEmbed('youtube', 'https://www.youtube.com/live/dQw4w9WgXcQ'), expected);
  assert.deepEqual(resolveVideoEmbed('youtube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'), expected);
});

test('Instagram menerima post, reel, dan IGTV lalu menghapus parameter pelacak', () => {
  assert.deepEqual(
    resolveVideoEmbed('instagram', 'https://www.instagram.com/reel/C9xY_z-12ab/?igsh=tracking'),
    {
      provider: 'instagram',
      sourceUrl: 'https://www.instagram.com/reel/C9xY_z-12ab/',
      embedUrl: 'https://www.instagram.com/reel/C9xY_z-12ab/embed/captioned/',
    },
  );
  assert.equal(
    resolveVideoEmbed('instagram', 'https://m.instagram.com/reel/C9xY_z-12ab/')?.sourceUrl,
    'https://www.instagram.com/reel/C9xY_z-12ab/',
  );
  assert.equal(resolveVideoEmbed('instagram', 'https://instagram.com/p/ABCde_12/extra'), null);
  assert.equal(resolveVideoEmbed('instagram', 'https://instagram.com/stories/example/123'), null);
});

test('Facebook menerima watch, video halaman, reel, share video, dan fb.watch', () => {
  const watch = resolveVideoEmbed('facebook', 'https://m.facebook.com/watch/?v=123456789012345&ref=sharing');
  assert.equal(watch?.sourceUrl, 'https://www.facebook.com/watch/?v=123456789012345');
  assert.equal(
    watch?.embedUrl,
    'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D123456789012345&show_text=false',
  );

  assert.equal(
    resolveVideoEmbed('facebook', 'https://www.facebook.com/desa.tawalian/videos/1234567890/')?.sourceUrl,
    'https://www.facebook.com/desa.tawalian/videos/1234567890/',
  );
  assert.equal(
    resolveVideoEmbed('facebook', 'https://web.facebook.com/desa.tawalian/videos/1234567890/')?.sourceUrl,
    'https://www.facebook.com/desa.tawalian/videos/1234567890/',
  );
  assert.equal(
    resolveVideoEmbed('facebook', 'https://facebook.com/reel/1234567890')?.sourceUrl,
    'https://www.facebook.com/reel/1234567890/',
  );
  assert.equal(
    resolveVideoEmbed('facebook', 'https://www.facebook.com/share/v/Abc_123-xYz/')?.sourceUrl,
    'https://www.facebook.com/share/v/Abc_123-xYz/',
  );
  assert.equal(
    resolveVideoEmbed('facebook', 'https://fb.watch/Abc_123-xYz/')?.sourceUrl,
    'https://fb.watch/Abc_123-xYz/',
  );
});

test('menolak protokol, kredensial, port, provider, host, path, dan ID yang tidak aman', () => {
  const invalidCases = [
    resolveVideoEmbed('youtube', 'http://youtu.be/dQw4w9WgXcQ'),
    resolveVideoEmbed('youtube', 'https://user:secret@youtu.be/dQw4w9WgXcQ'),
    resolveVideoEmbed('youtube', 'https://youtu.be:8443/dQw4w9WgXcQ'),
    resolveVideoEmbed('youtube', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'),
    resolveVideoEmbed('youtube', 'https://www.youtube.com/watch?v=too-short'),
    resolveVideoEmbed('youtube', 'https://youtu.be/dQw4w9WgXcQ/extra'),
    resolveVideoEmbed('instagram', 'https://evil.test/reel/C9xY_z-12ab/'),
    resolveVideoEmbed('instagram', 'https://instagram.com/reel/%2e%2e/'),
    resolveVideoEmbed('facebook', 'https://facebook.com/watch/?v=1%22%20onload%3Dalert(1)'),
    resolveVideoEmbed('facebook', 'https://facebook.com/example/posts/1234567890'),
    resolveVideoEmbed('facebook', 'https://youtu.be/dQw4w9WgXcQ'),
  ];

  assert.deepEqual(invalidCases, invalidCases.map(() => null));
});
