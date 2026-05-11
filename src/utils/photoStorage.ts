/**
 * Native photo storage using Capacitor Filesystem
 * Photos are saved to app-specific directory (not localStorage!)
 * Only file paths are stored in Preferences (tiny strings)
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const PHOTOS_DIR = 'photos';
const ITEMS_KEY = 'vlocker_items';

// Check if running on native platform
const isNative = Capacitor.isNativePlatform();

// Ensure photos directory exists
async function ensurePhotosDir(): Promise<void> {
  try {
    await Filesystem.mkdir({
      directory: Directory.Data,
      path: PHOTOS_DIR,
      recursive: true,
    });
  } catch {
    // Directory may already exist
  }
}

/**
 * Save a base64 photo to app-specific file storage
 * Returns the file path/identifier to store
 */
export async function savePhoto(base64Data: string, itemId: string, photoIndex: number): Promise<string> {
  // If web, store base64 directly (for browser testing)
  if (!isNative) {
    return base64Data;
  }

  // Native: save as file
  await ensurePhotosDir();

  // Remove data:image/xxx;base64, prefix if present
  let cleanBase64 = base64Data;
  const commaIndex = base64Data.indexOf(',');
  if (commaIndex !== -1) {
    cleanBase64 = base64Data.substring(commaIndex + 1);
  }

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

/**
 * Read a photo file and return a displayable URL
 */
export async function getPhotoUrl(photoRef: string): Promise<string> {
  // If it's a data URL (web mode), return as-is
  if (photoRef.startsWith('data:')) {
    return photoRef;
  }

  // If native file path
  if (isNative && photoRef.startsWith('file://')) {
    const relativePath = photoRef.replace('file://', '');
    try {
      const result = await Filesystem.readFile({
        path: relativePath,
        directory: Directory.Data,
      });
      return `data:image/jpeg;base64,${result.data}`;
    } catch {
      return '';
    }
  }

  return photoRef;
}

/**
 * Delete a photo file
 */
export async function deletePhoto(photoRef: string): Promise<void> {
  if (!isNative || !photoRef.startsWith('file://')) return;

  const relativePath = photoRef.replace('file://', '');
  try {
    await Filesystem.deleteFile({
      path: relativePath,
      directory: Directory.Data,
    });
  } catch {
    // File may not exist
  }
}

/**
 * Migrate old base64 data to file storage if needed
 * (call this on app startup)
 */
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
          // If photo is a base64 string (old format), migrate to file
          if (photo.startsWith('data:') && photo.length > 10000) {
            try {
              const filePath = await savePhoto(photo, item.id, i);
              item.photos[i] = filePath;
              migrated = true;
            } catch {
              // Keep original if migration fails
            }
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
            } catch {
              // Keep original if migration fails
            }
          }
        }
      }
    }

    if (migrated) {
      await Preferences.set({ key: ITEMS_KEY, value: JSON.stringify(items) });
    }
  } catch {
    // Migration not critical
  }
}
