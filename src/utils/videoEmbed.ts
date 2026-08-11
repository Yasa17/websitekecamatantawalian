export type VideoEmbedProvider = 'youtube' | 'instagram' | 'facebook';

export interface ResolvedVideoEmbed {
  provider: VideoEmbedProvider;
  sourceUrl: string;
  embedUrl: string;
  thumbnailUrl?: string;
}

export const VIDEO_EMBED_PROVIDER_LABELS: Record<VideoEmbedProvider, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_CODE_PATTERN = /^[A-Za-z0-9_-]{5,64}$/;
const FACEBOOK_VIDEO_ID_PATTERN = /^\d{5,32}$/;
const FACEBOOK_SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{5,128}$/;
const FACEBOOK_PAGE_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

const normalizeHost = (hostname: string) => hostname.toLowerCase().replace(/\.$/, '');

const parseSafeHttpsUrl = (value: string): URL | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;

  try {
    const parsed = new URL(value.trim());
    if (
      parsed.protocol !== 'https:'
      || parsed.username !== ''
      || parsed.password !== ''
      || parsed.port !== ''
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const pathSegments = (url: URL) => url.pathname.split('/').filter(Boolean);

const resolveYouTube = (url: URL): ResolvedVideoEmbed | null => {
  const hostname = normalizeHost(url.hostname);
  const segments = pathSegments(url);
  let videoId = '';

  if (hostname === 'youtu.be') {
    if (segments.length !== 1) return null;
    [videoId] = segments;
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(hostname)) {
    if ((url.pathname === '/watch' || url.pathname === '/watch/') && segments.length === 1) {
      videoId = url.searchParams.get('v') ?? '';
    } else if (
      segments.length === 2
      && (segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live')
    ) {
      videoId = segments[1];
    } else {
      return null;
    }
  } else if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(hostname)) {
    if (segments.length !== 2 || segments[0] !== 'embed') return null;
    videoId = segments[1];
  } else {
    return null;
  }

  if (!YOUTUBE_ID_PATTERN.test(videoId)) return null;

  const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return {
    provider: 'youtube',
    sourceUrl,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
};

const resolveInstagram = (url: URL): ResolvedVideoEmbed | null => {
  const hostname = normalizeHost(url.hostname);
  if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(hostname)) return null;

  const segments = pathSegments(url);
  if (
    segments.length !== 2
    || !['p', 'reel', 'tv'].includes(segments[0])
    || !INSTAGRAM_CODE_PATTERN.test(segments[1])
  ) {
    return null;
  }

  const sourceUrl = `https://www.instagram.com/${segments[0]}/${segments[1]}/`;
  return {
    provider: 'instagram',
    sourceUrl,
    embedUrl: `${sourceUrl}embed/captioned/`,
  };
};

const facebookEmbedUrl = (sourceUrl: string) => (
  `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(sourceUrl)}&show_text=false`
);

const resolveFacebook = (url: URL): ResolvedVideoEmbed | null => {
  const hostname = normalizeHost(url.hostname);
  const segments = pathSegments(url);

  if (hostname === 'fb.watch') {
    if (segments.length !== 1 || !FACEBOOK_SHORT_CODE_PATTERN.test(segments[0])) return null;
    const sourceUrl = `https://fb.watch/${segments[0]}/`;
    return {
      provider: 'facebook',
      sourceUrl,
      embedUrl: facebookEmbedUrl(sourceUrl),
    };
  }

  if (![
    'facebook.com',
    'www.facebook.com',
    'm.facebook.com',
    'web.facebook.com',
  ].includes(hostname)) return null;

  let sourceUrl = '';
  if (
    (url.pathname === '/watch' || url.pathname === '/watch/')
    && segments.length === 1
  ) {
    const videoId = url.searchParams.get('v') ?? '';
    if (!FACEBOOK_VIDEO_ID_PATTERN.test(videoId)) return null;
    sourceUrl = `https://www.facebook.com/watch/?v=${videoId}`;
  } else if (url.pathname === '/video.php') {
    const videoId = url.searchParams.get('v') ?? '';
    if (!FACEBOOK_VIDEO_ID_PATTERN.test(videoId)) return null;
    sourceUrl = `https://www.facebook.com/watch/?v=${videoId}`;
  } else if (
    segments.length === 3
    && FACEBOOK_PAGE_PATTERN.test(segments[0])
    && segments[1] === 'videos'
    && FACEBOOK_VIDEO_ID_PATTERN.test(segments[2])
  ) {
    sourceUrl = `https://www.facebook.com/${segments[0]}/videos/${segments[2]}/`;
  } else if (
    segments.length === 2
    && segments[0] === 'reel'
    && FACEBOOK_VIDEO_ID_PATTERN.test(segments[1])
  ) {
    sourceUrl = `https://www.facebook.com/reel/${segments[1]}/`;
  } else if (
    segments.length === 3
    && segments[0] === 'share'
    && segments[1] === 'v'
    && FACEBOOK_SHORT_CODE_PATTERN.test(segments[2])
  ) {
    sourceUrl = `https://www.facebook.com/share/v/${segments[2]}/`;
  } else {
    return null;
  }

  return {
    provider: 'facebook',
    sourceUrl,
    embedUrl: facebookEmbedUrl(sourceUrl),
  };
};

/**
 * Menormalkan URL video publik menjadi URL sumber dan URL iframe yang aman.
 * Mengembalikan null jika protokol, host, bentuk path, atau ID video tidak valid.
 */
export const resolveVideoEmbed = (
  provider: VideoEmbedProvider,
  value: string,
): ResolvedVideoEmbed | null => {
  const parsed = parseSafeHttpsUrl(value);
  if (!parsed) return null;

  if (provider === 'youtube') return resolveYouTube(parsed);
  if (provider === 'instagram') return resolveInstagram(parsed);
  if (provider === 'facebook') return resolveFacebook(parsed);
  return null;
};
