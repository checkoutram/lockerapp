import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import JSZip from 'jszip';
import type { LockerItem, SecretQuestions, Locker } from '@/types';
import { savePhoto, deletePhoto, getPhotoUrl } from './photoStorage';

// Synchronous native check — same as working build 6
const isNative = Capacitor.isNativePlatform();

const Prefs = {
  async get(key: string): Promise<{ value: string | null }> {
    if (isNative) {
      try {
        return await Preferences.get({ key });
      } catch {
        // fallback to localStorage
      }
    }
    try {
      const val = localStorage.getItem(key);
      return { value: val };
    } catch {
      return { value: null };
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (isNative) {
      try {
        await Preferences.set({ key, value });
        return;
      } catch {
        // fallback to localStorage
      }
    }
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  async remove(key: string): Promise<void> {
    if (isNative) {
      try {
        await Preferences.remove({ key });
        return;
      } catch {
        // fallback to localStorage
      }
    }
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

export const SecureStore = {
  async setItemAsync(key: string, value: string): Promise<void> {
    await Prefs.set(`secure_${key}`, value);
  },
  async getItemAsync(key: string): Promise<string | null> {
    const { value } = await Prefs.get(`secure_${key}`);
    return value;
  },
  async deleteItemAsync(key: string): Promise<void> {
    await Prefs.remove(`secure_${key}`);
  },
};

export const AsyncStorage = {
  async setItem(key: string, value: string): Promise<void> {
    await Prefs.set(`async_${key}`, value);
  },
  async getItem(key: string): Promise<string | null> {
    const { value } = await Prefs.get(`async_${key}`);
    return value;
  },
  async removeItem(key: string): Promise<void> {
    await Prefs.remove(`async_${key}`);
  },
};

export async function getStorageUsed(): Promise<{ used: number; total: number }> {
  return { used: 0, total: 50 * 1024 * 1024 };
}

export async function wipeAllData(): Promise<void> {
  await clearAllData();
}

const ITEMS_KEY = 'vlocker_items_v3';
const LOCKERS_KEY = 'vlocker_lockers_v3';
const MIGRATION_KEY = 'vlocker_migrated_v3';
const APP_VERSION_KEY = 'vlocker_app_version';

// Legacy keys (v2 and earlier)
const LEGACY_ITEMS_KEY = 'vlocker_items';
const LEGACY_LOCKERS_KEY = 'vlocker_lockers';

export async function getItems(): Promise<LockerItem[]> {
  try {
    const { value } = await Prefs.get(ITEMS_KEY);
    if (!value) return [];
    const items: LockerItem[] = JSON.parse(value);
    return items
      .filter((item) => item && typeof item === 'object' && item.id && item.name && item.category)
      .map((item) => ({
        ...item,
        inLocker: item.inLocker !== false,
      }));
  } catch {
    return [];
  }
}

export async function setItems(items: LockerItem[]): Promise<void> {
  await Prefs.set(ITEMS_KEY, JSON.stringify(items));
}

export async function getItemById(id: string): Promise<LockerItem | null> {
  const items = await getItems();
  return items.find((item) => item.id === id) || null;
}

export async function getItemsByCategory(category: string): Promise<LockerItem[]> {
  const items = await getItems();
  return items.filter((item) => item.category === category);
}

export async function deleteItem(id: string): Promise<void> {
  const items = await getItems();
  const item = items.find((i) => i.id === id);

  if (item) {
    for (const photoRef of item.photos || []) {
      if (photoRef.startsWith('file://')) {
        await deletePhoto(photoRef);
      }
    }
    for (const photoRef of item.billPhotos || []) {
      if (photoRef.startsWith('file://')) {
        await deletePhoto(photoRef);
      }
    }
  }

  const filtered = items.filter((item) => item.id !== id);
  await Prefs.set(ITEMS_KEY, JSON.stringify(filtered));
}

export async function deleteAllItems(): Promise<void> {
  const items = await getItems();
  for (const item of items) {
    for (const photoRef of item.photos || []) {
      if (photoRef.startsWith('file://')) {
        await deletePhoto(photoRef);
      }
    }
    for (const photoRef of item.billPhotos || []) {
      if (photoRef.startsWith('file://')) {
        await deletePhoto(photoRef);
      }
    }
  }
  await Prefs.remove(ITEMS_KEY);
}

export async function saveItem(item: LockerItem): Promise<{ success: boolean; error?: string }> {
  try {
    const check = await canStoreItem(item);
    if (!check.canStore) {
      return { success: false, error: check.reason };
    }

    const photoPaths: string[] = [];
    for (let i = 0; i < item.photos.length; i++) {
      const photo = item.photos[i];
      if (photo.startsWith('data:')) {
        const path = await savePhoto(photo, item.id, i);
        photoPaths.push(path);
      } else {
        photoPaths.push(photo);
      }
    }

    const billPaths: string[] = [];
    for (let i = 0; i < item.billPhotos.length; i++) {
      const photo = item.billPhotos[i];
      if (photo.startsWith('data:')) {
        const path = await savePhoto(photo, item.id, i + 100);
        billPaths.push(path);
      } else {
        billPaths.push(photo);
      }
    }

    const itemToSave: LockerItem = { ...item, photos: photoPaths, billPhotos: billPaths };
    const items = await getItems();
    items.push(itemToSave);
    await Prefs.set(ITEMS_KEY, JSON.stringify(items));
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Save failed';
    return { success: false, error: msg };
  }
}

export async function updateItem(updatedItem: LockerItem): Promise<{ success: boolean; error?: string }> {
  try {
    const items = await getItems();
    const index = items.findIndex((i) => i.id === updatedItem.id);
    if (index === -1) return { success: false, error: 'Item not found' };

    const photoPaths: string[] = [];
    for (let i = 0; i < updatedItem.photos.length; i++) {
      const photo = updatedItem.photos[i];
      if (photo.startsWith('data:')) {
        const path = await savePhoto(photo, updatedItem.id, i);
        photoPaths.push(path);
      } else {
        photoPaths.push(photo);
      }
    }

    const billPaths: string[] = [];
    for (let i = 0; i < updatedItem.billPhotos.length; i++) {
      const photo = updatedItem.billPhotos[i];
      if (photo.startsWith('data:')) {
        const path = await savePhoto(photo, updatedItem.id, i + 100);
        billPaths.push(path);
      } else {
        billPaths.push(photo);
      }
    }

    items[index] = { ...updatedItem, photos: photoPaths, billPhotos: billPaths };
    await Prefs.set(ITEMS_KEY, JSON.stringify(items));
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    return { success: false, error: msg };
  }
}

async function canStoreItem(_item: LockerItem): Promise<{ canStore: boolean; reason?: string }> {
  try {
    const items = await getItems();
    if (items.length >= 500) {
      return { canStore: false, reason: 'Maximum 500 items reached.' };
    }
    return { canStore: true };
  } catch {
    return { canStore: false, reason: 'Storage check failed.' };
  }
}

// ---- SECRET QUESTIONS ----
const SECRET_Q_KEY = 'vlocker_secret_questions';

export async function saveSecretQuestions(questions: SecretQuestions): Promise<void> {
  await Prefs.set(SECRET_Q_KEY, JSON.stringify(questions));
}

export async function getSecretQuestions(): Promise<SecretQuestions | null> {
  try {
    const { value } = await Prefs.get(SECRET_Q_KEY);
    if (!value) return null;
    return JSON.parse(value) as SecretQuestions;
  } catch {
    return null;
  }
}

export async function hasSecretQuestions(): Promise<boolean> {
  const { value } = await Prefs.get(SECRET_Q_KEY);
  return !!value;
}

export async function exportData(): Promise<string> {
  const items = await getItems();
  return JSON.stringify(items, null, 2);
}

// ---- FULL BACKUP / RESTORE (includes photos) ----

export interface VLockerBackup {
  version: string;
  exportedAt: string;
  appVersion: string;
  lockers: Locker[];
  items: LockerItem[];
  secretQuestions: SecretQuestions | null;
  settings: Record<string, unknown>;
}

/**
 * Export ALL app data including photos embedded as base64.
 * Photos stored as native file paths are read and converted to data URIs.
 */
export async function exportFullBackup(): Promise<string> {
  const lockers = await getLockers();
  const items = await getItems();
  const secretQuestions = await getSecretQuestions();
  const settings = await getSettings();

  // Deep clone items so we don't mutate originals
  const exportItems: LockerItem[] = JSON.parse(JSON.stringify(items));

  // Convert all photo refs to embedded base64 data URIs
  for (const item of exportItems) {
    // Item photos
    if (item.photos && item.photos.length > 0) {
      const embeddedPhotos: string[] = [];
      for (const photoRef of item.photos) {
        try {
          if (photoRef.startsWith('file://')) {
            const dataUri = await getPhotoUrl(photoRef);
            if (dataUri) embeddedPhotos.push(dataUri);
          } else if (photoRef.startsWith('data:')) {
            embeddedPhotos.push(photoRef);
          }
        } catch {
          // Skip unreadable photos
        }
      }
      item.photos = embeddedPhotos;
    }

    // Bill photos
    if (item.billPhotos && item.billPhotos.length > 0) {
      const embeddedBillPhotos: string[] = [];
      for (const photoRef of item.billPhotos) {
        try {
          if (photoRef.startsWith('file://')) {
            const dataUri = await getPhotoUrl(photoRef);
            if (dataUri) embeddedBillPhotos.push(dataUri);
          } else if (photoRef.startsWith('data:')) {
            embeddedBillPhotos.push(photoRef);
          }
        } catch {
          // Skip unreadable photos
        }
      }
      item.billPhotos = embeddedBillPhotos;
    }
  }

  const backup: VLockerBackup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    appVersion: '3.0.0',
    lockers,
    items: exportItems,
    secretQuestions,
    settings,
  };

  return JSON.stringify(backup);
}

/**
 * Import a full backup. Restores lockers, items (with photos), secret questions, and settings.
 * Photos are saved back to native file storage if running on a native device.
 * Existing data is wiped first.
 */
export async function importFullBackup(jsonString: string): Promise<{ success: boolean; error?: string; stats?: { lockers: number; items: number; photos: number } }> {
  try {
    const backup = JSON.parse(jsonString) as Partial<VLockerBackup>;

    // Validate structure
    if (!backup.version || !Array.isArray(backup.lockers) || !Array.isArray(backup.items)) {
      return { success: false, error: 'Invalid backup file. Missing required data.' };
    }

    // Wipe existing data first
    await clearAllData();

    // Clean up any existing native photo files
    if (isNative) {
      try {
        await Filesystem.rmdir({ path: 'photos', directory: Directory.Data, recursive: true });
      } catch {
        // Directory may not exist
      }
    }

    // Restore lockers
    if (backup.lockers.length > 0) {
      await saveLockers(backup.lockers);
    }

    // Restore items — re-save photos to native storage
    let photoCount = 0;
    const restoredItems: LockerItem[] = JSON.parse(JSON.stringify(backup.items));

    for (const item of restoredItems) {
      // Restore item photos
      if (item.photos && item.photos.length > 0) {
        const newPhotoPaths: string[] = [];
        for (let i = 0; i < item.photos.length; i++) {
          const photoData = item.photos[i];
          if (photoData.startsWith('data:')) {
            const savedPath = await savePhoto(photoData, item.id, i);
            newPhotoPaths.push(savedPath);
            photoCount++;
          }
        }
        item.photos = newPhotoPaths;
      }

      // Restore bill photos
      if (item.billPhotos && item.billPhotos.length > 0) {
        const newBillPaths: string[] = [];
        for (let i = 0; i < item.billPhotos.length; i++) {
          const photoData = item.billPhotos[i];
          if (photoData.startsWith('data:')) {
            const savedPath = await savePhoto(photoData, item.id, i + 100);
            newBillPaths.push(savedPath);
            photoCount++;
          }
        }
        item.billPhotos = newBillPaths;
      }
    }

    await setItems(restoredItems);

    // Restore secret questions
    if (backup.secretQuestions) {
      await saveSecretQuestions(backup.secretQuestions);
    }

    // Restore settings (but don't overwrite PIN-related flags)
    if (backup.settings) {
      const { pin, ...safeSettings } = backup.settings as Record<string, unknown>;
      await saveSettings(safeSettings);
    }

    return {
      success: true,
      stats: {
        lockers: backup.lockers.length,
        items: backup.items.length,
        photos: photoCount,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to import backup' };
  }
}

// ---- SETTINGS ----
export async function getSettings(): Promise<Record<string, unknown>> {
  try {
    const { value } = await Prefs.get('vlocker_settings');
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await Prefs.set('vlocker_settings', JSON.stringify(settings));
}

export async function clearAllData(): Promise<void> {
  await deleteAllItems();
  await Prefs.remove('vlocker_settings');
  await Prefs.remove('vlocker_session');
  await Prefs.remove(SECRET_Q_KEY);
  await Prefs.remove(LOCKERS_KEY);
  await Prefs.remove(MIGRATION_KEY);
  await Prefs.remove(APP_VERSION_KEY);
}

// ---- SESSION ----
export async function setSessionActive(active: boolean): Promise<void> {
  await Prefs.set('vlocker_session', JSON.stringify({ active, timestamp: Date.now() }));
}

export async function isSessionActive(): Promise<boolean> {
  try {
    const { value } = await Prefs.get('vlocker_session');
    if (!value) return false;
    const session = JSON.parse(value);
    return session.active && (Date.now() - session.timestamp < 30 * 60 * 1000);
  } catch {
    return false;
  }
}

// ---- LOCKERS (new for v3) ----
export async function getLockers(): Promise<Locker[]> {
  const { value } = await Prefs.get(LOCKERS_KEY);
  return value ? JSON.parse(value) : [];
}

export async function saveLockers(lockers: Locker[]): Promise<void> {
  await Prefs.set(LOCKERS_KEY, JSON.stringify(lockers));
}

export async function addLocker(locker: Locker): Promise<void> {
  const lockers = await getLockers();
  lockers.push(locker);
  await saveLockers(lockers);
}

export async function updateLocker(locker: Locker): Promise<void> {
  const lockers = await getLockers();
  const idx = lockers.findIndex((l) => l.id === locker.id);
  if (idx >= 0) {
    lockers[idx] = locker;
    await saveLockers(lockers);
  }
}

export async function deleteLocker(lockerId: string): Promise<void> {
  const lockers = await getLockers();
  const filtered = lockers.filter((l) => l.id !== lockerId);
  await saveLockers(filtered);
}

// ---- MIGRATION (v2 -> v3) ----
export async function hasMigrated(): Promise<boolean> {
  const { value } = await Prefs.get(MIGRATION_KEY);
  return value === 'true';
}

export async function setMigrated(): Promise<void> {
  await Prefs.set(MIGRATION_KEY, 'true');
}

export async function getAppVersion(): Promise<string> {
  const { value } = await Prefs.get(APP_VERSION_KEY);
  return value || '';
}

export async function setAppVersion(version: string): Promise<void> {
  await Prefs.set(APP_VERSION_KEY, version);
}

export async function getLegacyItems(): Promise<any[]> {
  const { value } = await Prefs.get(LEGACY_ITEMS_KEY);
  return value ? JSON.parse(value) : [];
}

export async function getLegacyLockers(): Promise<any[]> {
  const { value } = await Prefs.get(LEGACY_LOCKERS_KEY);
  return value ? JSON.parse(value) : [];
}

/**
 * Clean up orphaned photo files that are no longer referenced by any item.
 */
export async function cleanupOrphanedPhotos(): Promise<{ deleted: number; errors: number }> {
  if (!isNative) return { deleted: 0, errors: 0 };

  try {
    // Get all referenced photo paths
    const items = await getItems();
    const referencedPaths = new Set<string>();
    for (const item of items) {
      for (const photo of item.photos || []) {
        if (photo.startsWith('file://')) referencedPaths.add(photo);
      }
      for (const photo of item.billPhotos || []) {
        if (photo.startsWith('file://')) referencedPaths.add(photo);
      }
    }

    // List all files in photos directory
    let files: { name: string }[] = [];
    try {
      const result = await Filesystem.readdir({ path: 'photos', directory: Directory.Data });
      files = result.files;
    } catch {
      return { deleted: 0, errors: 0 };
    }

    let deleted = 0;
    let errors = 0;

    for (const file of files) {
      // Normalize path for comparison
      let isReferenced = false;
      for (const ref of referencedPaths) {
        if (ref.includes(file.name)) {
          isReferenced = true;
          break;
        }
      }
      if (!isReferenced) {
        try {
          await Filesystem.deleteFile({ path: `photos/${file.name}`, directory: Directory.Data });
          deleted++;
        } catch {
          errors++;
        }
      }
    }

    return { deleted, errors };
  } catch {
    return { deleted: 0, errors: 0 };
  }
}

export async function clearLegacyData(): Promise<void> {
  await Prefs.remove(LEGACY_ITEMS_KEY);
  await Prefs.remove(LEGACY_LOCKERS_KEY);
}

// ---- MIGRATION HELPER ----
export async function runV3Migration(): Promise<{ migrated: boolean; defaultLockerId?: string }> {
  const alreadyMigrated = await hasMigrated();
  if (alreadyMigrated) return { migrated: false };

  const legacyItems = await getLegacyItems();
  const legacyLockers = await getLegacyLockers();

  let defaultLockerId = 'default';
  let newLockers: Locker[] = [];

  if (legacyLockers.length > 0) {
    newLockers = legacyLockers.map((ll: any) => ({
      id: ll.id || `locker_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: ll.name || 'Locker 1',
      bankName: ll.bankName || undefined,
      branch: undefined,
      location: undefined,
      description: undefined,
      createdAt: new Date().toISOString(),
    }));
    defaultLockerId = newLockers[0].id;
  } else {
    const defaultLocker: Locker = {
      id: 'default',
      name: 'Locker 1',
      createdAt: new Date().toISOString(),
    };
    newLockers = [defaultLocker];
  }

  await saveLockers(newLockers);

  if (legacyItems.length > 0) {
    const migratedItems: LockerItem[] = legacyItems.map((li: any) => ({
      ...li,
      lockerId: defaultLockerId,
    }));
    await Prefs.set(ITEMS_KEY, JSON.stringify(migratedItems));
  }

  await clearLegacyData();
  await setMigrated();

  return { migrated: true, defaultLockerId };
}

// ---- ZIP EXPORT/IMPORT ----

interface ZipPhotoEntry {
  zipPath: string;
  data: string; // base64
}

/**
 * Export all data as a ZIP file.
 * Structure: backup.json + photos/ folder with individual photo files.
 */
export async function exportFullBackupZip(): Promise<{ blob: Blob; skippedPhotos: number }> {
  const zip = new JSZip();
  const [items, lockers, secretQuestions, settings] = await Promise.all([
    getItems(), getLockers(), getSecretQuestions(), getSettings(),
  ]);

  // Clone items for export
  const exportItems: LockerItem[] = JSON.parse(JSON.stringify(items));
  const photoEntries: ZipPhotoEntry[] = [];
  let skippedPhotos = 0;

  for (const item of exportItems) {
    // Item photos
    if (item.photos && item.photos.length > 0) {
      const newPaths: string[] = [];
      for (let i = 0; i < item.photos.length; i++) {
        const photoRef = item.photos[i];
        let base64Data = '';
        try {
          if (photoRef.startsWith('file://')) {
            base64Data = await getPhotoUrl(photoRef) || '';
          } else if (photoRef.startsWith('data:')) {
            base64Data = photoRef;
          }
        } catch {
          skippedPhotos++;
        }
        if (base64Data) {
          const zipPath = `photos/${item.id}_${i}.txt`;
          photoEntries.push({ zipPath, data: base64Data });
          newPaths.push(zipPath);
        } else {
          skippedPhotos++;
        }
      }
      item.photos = newPaths;
    }

    // Bill photos
    if (item.billPhotos && item.billPhotos.length > 0) {
      const newPaths: string[] = [];
      for (let i = 0; i < item.billPhotos.length; i++) {
        const photoRef = item.billPhotos[i];
        let base64Data = '';
        try {
          if (photoRef.startsWith('file://')) {
            base64Data = await getPhotoUrl(photoRef) || '';
          } else if (photoRef.startsWith('data:')) {
            base64Data = photoRef;
          }
        } catch {
          skippedPhotos++;
        }
        if (base64Data) {
          const zipPath = `photos/${item.id}_bill_${i}.txt`;
          photoEntries.push({ zipPath, data: base64Data });
          newPaths.push(zipPath);
        } else {
          skippedPhotos++;
        }
      }
      item.billPhotos = newPaths;
    }
  }

  // Add JSON metadata
  const backup = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    appVersion: '3.0.0',
    format: 'zip',
    lockers,
    items: exportItems,
    secretQuestions,
    settings,
  };
  zip.file('backup.json', JSON.stringify(backup, null, 2));

  // Add photos
  for (const entry of photoEntries) {
    zip.file(entry.zipPath, entry.data);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, skippedPhotos };
}

/**
 * Import from a ZIP file.
 */
export async function importFullBackupZip(zipData: Blob | ArrayBuffer): Promise<{ success: boolean; error?: string; stats?: { lockers: number; items: number; photos: number }; orphanedItems?: number }> {
  try {
    const zip = await JSZip.loadAsync(zipData);
    const jsonFile = zip.file('backup.json');
    if (!jsonFile) {
      return { success: false, error: 'Invalid ZIP: backup.json not found' };
    }

    const jsonContent = await jsonFile.async('string');
    const backup = JSON.parse(jsonContent) as any;

    if (!backup.version || !Array.isArray(backup.lockers) || !Array.isArray(backup.items)) {
      return { success: false, error: 'Invalid backup file. Missing required data.' };
    }

    // Wipe existing data
    await clearAllData();
    if (isNative) {
      try {
        await Filesystem.rmdir({ path: 'photos', directory: Directory.Data, recursive: true });
      } catch { /* ignore */ }
    }

    // Restore lockers
    if (backup.lockers.length > 0) {
      await saveLockers(backup.lockers);
    }

    // Validate locker IDs exist
    const validLockerIds = new Set(backup.lockers.map((l: Locker) => l.id));
    const fallbackLockerId = backup.lockers[0]?.id || '';
    let orphanedItems = 0;

    // Restore items with photos from ZIP
    let photoCount = 0;
    const restoredItems: LockerItem[] = JSON.parse(JSON.stringify(backup.items));

    for (const item of restoredItems) {
      // Fix orphaned locker references
      if (item.lockerId && !validLockerIds.has(item.lockerId)) {
        item.lockerId = fallbackLockerId;
        orphanedItems++;
      }
      // Restore item photos
      if (item.photos && item.photos.length > 0) {
        const newPhotoPaths: string[] = [];
        for (let i = 0; i < item.photos.length; i++) {
          const zipPath = item.photos[i];
          const photoFile = zip.file(zipPath);
          if (photoFile) {
            const base64Data = await photoFile.async('string');
            if (base64Data.startsWith('data:')) {
              const savedPath = await savePhoto(base64Data, item.id, i);
              newPhotoPaths.push(savedPath);
              photoCount++;
            }
          }
        }
        item.photos = newPhotoPaths;
      }

      // Restore bill photos
      if (item.billPhotos && item.billPhotos.length > 0) {
        const newBillPaths: string[] = [];
        for (let i = 0; i < item.billPhotos.length; i++) {
          const zipPath = item.billPhotos[i];
          const photoFile = zip.file(zipPath);
          if (photoFile) {
            const base64Data = await photoFile.async('string');
            if (base64Data.startsWith('data:')) {
              const savedPath = await savePhoto(base64Data, item.id, i + 100);
              newBillPaths.push(savedPath);
              photoCount++;
            }
          }
        }
        item.billPhotos = newBillPaths;
      }
    }

    await setItems(restoredItems);

    if (backup.secretQuestions) {
      await saveSecretQuestions(backup.secretQuestions);
    }
    if (backup.settings) {
      const { pin, ...safeSettings } = backup.settings as Record<string, unknown>;
      await saveSettings(safeSettings);
    }

    return {
      success: true,
      stats: {
        lockers: backup.lockers.length,
        items: backup.items.length,
        photos: photoCount,
      },
      orphanedItems,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to import ZIP backup' };
  }
}
