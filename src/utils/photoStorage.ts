import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import PhotoEncryption from '../plugins/PhotoEncryption';

const PHOTO_DIR = 'photos';

let memoryCache = new Map<string, string>();

function getTimestamp(): string {
  return Date.now().toString();
}

async function ensureDir(): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: PHOTO_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // already exists
  }
}

/**
 * Get a displayable URL from a photo reference.
 * If it's a file path, loads and decrypts the photo.
 * If it's already a data URL, returns as-is.
 */
export async function getPhotoUrl(photoRef: string): Promise<string> {
  if (photoRef.startsWith('data:')) {
    return photoRef;
  }
  return loadPhoto(photoRef);
}

/**
 * Save a photo (base64) to encrypted storage.
 * Returns the storage path (without extension).
 */
export async function savePhoto(
  base64Data: string,
  itemId: string,
  index: number
): Promise<string> {
  await ensureDir();
  const ts = getTimestamp();
  const baseName = `${itemId}_${index}_${ts}`;

  if (Capacitor.isNativePlatform()) {
    // Write raw bytes temporarily, then encrypt
    const tempPath = `${PHOTO_DIR}/${baseName}.tmp`;
    const encPath = `${PHOTO_DIR}/${baseName}.enc`;

    // Strip data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    await Filesystem.writeFile({
      path: tempPath,
      data: cleanBase64,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });

    // Encrypt via native plugin
    const result = await PhotoEncryption.encryptPhoto({
      inputPath: tempPath,
      outputPath: encPath,
    });

    if (!result.success) {
      throw new Error('Encryption failed');
    }

    // Delete temp file
    try {
      await Filesystem.deleteFile({
        path: tempPath,
        directory: Directory.Data,
      });
    } catch {
      // ignore
    }

    // Cache the decrypted image for this session
    memoryCache.set(encPath, base64Data);

    return `${PHOTO_DIR}/${baseName}`;
  } else {
    // Web fallback: store as base64 directly (no encryption on web)
    const fileName = `${baseName}.jpg`;
    const path = `${PHOTO_DIR}/${fileName}`;
    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return path;
  }
}

/**
 * Load a photo from encrypted storage.
 * Returns a data URL.
 */
export async function loadPhoto(path: string): Promise<string> {
  // Check memory cache first
  const cached = memoryCache.get(path);
  if (cached) return cached;

  if (Capacitor.isNativePlatform()) {
    // Check if encrypted version exists
    const encPath = `${path}.enc`;
    try {
      const result = await PhotoEncryption.decryptPhoto({ encPath });
      memoryCache.set(path, result.base64);
      return result.base64;
    } catch {
      // Fallback: try unencrypted .jpg
      const jpgPath = `${path}.jpg`;
      try {
        const { data } = await Filesystem.readFile({
          path: jpgPath,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
        const strData = typeof data === 'string' ? data : '';
        memoryCache.set(path, strData);
        return strData;
      } catch {
        throw new Error('Photo not found: ' + path);
      }
    }
  } else {
    // Web: read directly
    const { data } = await Filesystem.readFile({
      path,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return typeof data === 'string' ? data : '';
  }
}

/**
 * Delete a photo from storage.
 */
export async function deletePhoto(path: string): Promise<void> {
  // Remove from cache
  memoryCache.delete(path);

  if (Capacitor.isNativePlatform()) {
    // Try deleting encrypted version
    const encPath = `${path}.enc`;
    try {
      await PhotoEncryption.deleteFile({ filePath: encPath });
      return;
    } catch {
      // Fallback: try unencrypted
    }
  }

  try {
    await Filesystem.deleteFile({
      path,
      directory: Directory.Data,
    });
  } catch {
    // ignore if doesn't exist
  }
}

/**
 * Delete all photos for an item.
 */
export async function deleteItemPhotos(itemId: string): Promise<void> {
  try {
    const { files } = await Filesystem.readdir({
      path: PHOTO_DIR,
      directory: Directory.Data,
    });
    for (const file of files) {
      if (file.name.startsWith(itemId + '_')) {
        try {
          await Filesystem.deleteFile({
            path: `${PHOTO_DIR}/${file.name}`,
            directory: Directory.Data,
          });
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // directory might not exist
  }
}

/**
 * Migrate existing unencrypted photos to encrypted format.
 */
export async function migrateExistingPhotos(): Promise<{ migrated: number; alreadyDone: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    return { migrated: 0, alreadyDone: true };
  }
  return PhotoEncryption.migrateExistingPhotos();
}

/**
 * Check if migration is already done.
 */
export async function isMigrationDone(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  const result = await PhotoEncryption.isMigrationDone();
  return result.done;
}

/**
 * Create secure backup with password.
 */
export async function createSecureBackup(password: string): Promise<{ backupBase64: string; photoCount: number }> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Secure backup only available on native Android');
  }
  return PhotoEncryption.createSecureBackup({ password });
}

/**
 * Restore from secure backup.
 */
export async function restoreSecureBackup(password: string, backupBase64: string): Promise<{ restored: number; success: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Secure restore only available on native Android');
  }
  return PhotoEncryption.restoreSecureBackup({ password, backupBase64 });
}

/**
 * Clear decrypted photo cache from memory.
 * Call this when app goes to background or user logs out.
 */
export function clearPhotoCache(): void {
  memoryCache.clear();
}

/**
 * Get the number of cached photos in memory.
 */
export function getCachedPhotoCount(): number {
  return memoryCache.size;
}
