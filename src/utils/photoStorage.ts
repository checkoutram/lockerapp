import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

const PHOTOS_DIR = 'photos';
const ITEMS_KEY = 'vlocker_items';

async function ensurePhotosDir(): Promise<void> {
  if (!isNative) return;
  try {
    await Filesystem.mkdir({
      directory: Directory.Data,
      path: PHOTOS_DIR,
      recursive: true,
    });
  } catch {}
}

export async function savePhoto(base64Data: string, itemId: string, photoIndex: number): Promise<string> {
  if (!isNative) return base64Data;
  await ensurePhotosDir();
  let cleanBase64 = base64Data;
  const commaIndex = base64Data.indexOf(',');
  if (commaIndex !== -1) cleanBase64 = base64Data.substring(commaIndex + 1);
  const fileName = `${itemId}_${photoIndex}_${Date.now()}.jpg`;
  const filePath = `${PHOTOS_DIR}/${fileName}`;
  await Filesystem.writeFile({
    path: filePath,
    data: cleanBase64,
    directory: Directory.Data,
    recursive: true,
  });
  return `file://${filePath}`;
}

export async function getPhotoUrl(photoRef: string): Promise<string> {
  if (photoRef.startsWith('data:')) return photoRef;
  if (isNative && photoRef.startsWith('file://')) {
    const relativePath = photoRef.replace('file://', '');
    try {
      const result = await Filesystem.readFile({
        path: relativePath,
        directory: Directory.Data,
      });
      return `data:image/jpeg;base64,${result.data}`;
    } catch { return ''; }
  }
  return photoRef;
}

export async function deletePhoto(photoRef: string): Promise<void> {
  if (!isNative || !photoRef.startsWith('file://')) return;
  const relativePath = photoRef.replace('file://', '');
  try {
    await Filesystem.deleteFile({
      path: relativePath,
      directory: Directory.Data,
    });
  } catch {}
}

export async function migratePhotosIfNeeded(): Promise<void> {
  if (!isNative) return;
  try {
    const { value } = await Preferences.get({ key: ITEMS_KEY });
    if (!value) return;
    const items = JSON.parse(value);
    let migrated = false;
    for (const item of items) {
      if (item.photos) {
        for (let i = 0; i < item.photos.length; i++) {
          const photo = item.photos[i];
          if (photo.startsWith('data:') && photo.length > 10000) {
            try {
              const filePath = await savePhoto(photo, item.id, i);
              item.photos[i] = filePath;
              migrated = true;
            } catch {}
          }
        }
      }
      if (item.billPhotos) {
        for (let i = 0; i < item.billPhotos.length; i++) {
          const photo = item.billPhotos[i];
          if (photo.startsWith('data:') && photo.length > 10000) {
            try {
              const filePath = await savePhoto(photo, item.id, i + 100);
              item.billPhotos[i] = filePath;
              migrated = true;
            } catch {}
          }
        }
      }
    }
    if (migrated) await Preferences.set({ key: ITEMS_KEY, value: JSON.stringify(items) });
  } catch {}
}
