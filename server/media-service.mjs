import { isWebPDataUrl } from './media-storage.mjs';

const storageUnavailable = () => Object.assign(
  new Error(
    'Supabase Storage belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SECRET_KEY pada environment server.',
  ),
  { status: 503 },
);

const replaceImage = async (
  value,
  storage,
  location,
  uploadedPaths,
  uploadCache,
) => {
  if (!isWebPDataUrl(value)) return value;
  if (!storage) throw storageUnavailable();
  if (uploadCache.has(value)) return uploadCache.get(value).url;
  const uploaded = await storage.uploadDataUrl(value, location);
  uploadCache.set(value, uploaded);
  uploadedPaths.add(uploaded.path);
  return uploaded.url;
};

const cleanupPartialUploads = async (storage, uploadedPaths) => {
  if (!storage || !uploadedPaths.size) return;
  try {
    await storage.deletePaths([...uploadedPaths]);
  } catch (error) {
    console.error('Pembersihan upload foto parsial tertunda:', error?.message || error);
  }
};

export const materializeEntityImages = async (entityId, updates, storage, cache) => {
  const result = { ...updates };
  const uploadedPaths = new Set();
  const uploadCache = cache || new Map();
  const location = (collection) => ({
    ownerType: 'entities',
    ownerId: entityId,
    collection,
  });

  try {
    if (updates.profile !== undefined) {
      const profile = { ...updates.profile };
      if (profile.headPhotoUrl !== undefined) {
        profile.headPhotoUrl = await replaceImage(
          profile.headPhotoUrl,
          storage,
          location('profile-head'),
          uploadedPaths,
          uploadCache,
        );
      }
      if (profile.organizationStructureUrl !== undefined) {
        profile.organizationStructureUrl = await replaceImage(
          profile.organizationStructureUrl,
          storage,
          location('organization'),
          uploadedPaths,
          uploadCache,
        );
      }
      if (Array.isArray(profile.staff)) {
        const staffMembers = [];
        for (const staff of profile.staff) {
          staffMembers.push({
            ...staff,
            photoUrl: await replaceImage(
              staff.photoUrl,
              storage,
              location('staff'),
              uploadedPaths,
              uploadCache,
            ),
          });
        }
        profile.staff = staffMembers;
      }
      result.profile = profile;
    }

    if (Array.isArray(updates.statistics)) {
      const statistics = [];
      for (const category of updates.statistics) {
        if (category.thumbnail === undefined) {
          statistics.push({ ...category });
          continue;
        }
        statistics.push({
          ...category,
          thumbnail: await replaceImage(
            category.thumbnail,
            storage,
            location('statistics'),
            uploadedPaths,
            uploadCache,
          ),
        });
      }
      result.statistics = statistics;
    }

    if (Array.isArray(updates.news)) {
      const articles = [];
      for (const article of updates.news) {
        articles.push({
          ...article,
          thumbnail: await replaceImage(
            article.thumbnail,
            storage,
            location('news'),
            uploadedPaths,
            uploadCache,
          ),
        });
      }
      result.news = articles;
    }

    if (Array.isArray(updates.gallery)) {
      const gallery = [];
      for (const item of updates.gallery) {
        const sourceUrls = Array.isArray(item.urls) && item.urls.length
          ? item.urls
          : [item.url];
        const urls = [];
        for (const url of sourceUrls) {
          urls.push(await replaceImage(
            url,
            storage,
            location('gallery'),
            uploadedPaths,
            uploadCache,
          ));
        }
        gallery.push({ ...item, url: urls[0], urls });
      }
      result.gallery = gallery;
    }

    return { updates: result, uploadedPaths: [...uploadedPaths] };
  } catch (error) {
    await cleanupPartialUploads(storage, uploadedPaths);
    throw error;
  }
};

export const materializeAdminAvatar = async (adminId, avatarUrl, storage, cache) => {
  const uploadedPaths = new Set();
  const value = await replaceImage(
    avatarUrl,
    storage,
    { ownerType: 'admins', ownerId: adminId, collection: 'avatar' },
    uploadedPaths,
    cache || new Map(),
  );
  return { avatarUrl: value, uploadedPaths: [...uploadedPaths] };
};

export const collectEntityImageUrls = (content) => {
  const urls = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value) urls.add(value);
  };
  const profile = content?.profile;
  add(profile?.headPhotoUrl);
  add(profile?.organizationStructureUrl);
  for (const staff of profile?.staff || []) add(staff.photoUrl);
  for (const category of content?.statistics || []) add(category.thumbnail);
  for (const article of content?.news || []) add(article.thumbnail);
  for (const item of content?.gallery || []) {
    const galleryUrls = Array.isArray(item.urls) && item.urls.length
      ? item.urls
      : [item.url];
    galleryUrls.forEach(add);
  }
  return urls;
};

export const collectOwnedPaths = (storage, urls) => {
  if (!storage) return new Set();
  return new Set(
    [...urls]
      .map((url) => storage.getObjectPath(url))
      .filter(Boolean),
  );
};

export const deleteUploadedPaths = async (storage, paths) => {
  if (storage && paths.length) await storage.deletePaths(paths);
};

export const deleteRemovedEntityImages = async (
  storage,
  entityId,
  previousContent,
  nextContent,
) => {
  if (!storage) return;
  const previous = collectOwnedPaths(storage, collectEntityImageUrls(previousContent));
  const next = collectOwnedPaths(storage, collectEntityImageUrls(nextContent));
  const owner = { ownerType: 'entities', ownerId: entityId };
  await storage.deletePaths(
    [...previous].filter((path) => storage.ownsPath(path, owner) && !next.has(path)),
  );
};
