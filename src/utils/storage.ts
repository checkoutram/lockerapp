import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import type { LockerItem, SecretQuestions, Locker } from '@/types';
import { savePhoto, deletePhoto } from './photoStorage';

const isNative = Capacitor.isNativePlatform();

const Prefs = {
  async get(key: string): Promise<{ value: string | null }> {
    if (isNative) {
      return Preferences.get({ key });
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
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  async remove(key: string): Promise<void> {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
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
