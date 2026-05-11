/**
 * Storage using Capacitor Preferences (replaces localStorage)
 * Photos are stored as files in app-specific directory (not in storage!)
 * Only file paths are stored in Preferences
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import type { LockerItem } from '@/types';
import { savePhoto, deletePhoto } from './photoStorage';

// Check if running on native platform
const isNative = Capacitor.isNativePlatform();

// ---- Preferences with localStorage fallback for web ----
const Prefs = {
  async get(key: string): Promise<{ value: string | null }> {
    if (isNative) {
      return Preferences.get({ key });
    }
    // Web fallback: localStorage
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

// ---- Backward-compatible wrappers for existing code ----

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
  // Not applicable for Preferences, return placeholder
  return { used: 0, total: 50 * 1024 * 1024 }; // 50MB placeholder
}

export async function wipeAllData(): Promise<void> {
  await clearAllData();
}

const ITEMS_KEY = 'vlocker_items';

// ---- CRUD ----

export async function getItems(): Promise<LockerItem[]> {
  try {
    const { value } = await Prefs.get(ITEMS_KEY);
    if (!value) return [];
    const items: LockerItem[] = JSON.parse(value);
    // Filter out items with missing required fields
    return items.filter(
      (item) => item && typeof item === 'object' && item.id && item.name && item.category
    );
  } catch {
    return [];
  }
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

  // Delete photo files first
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
  // Delete all photo files
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

/**
 * Save item with photos stored as files
 * base64 photos are converted to file storage, only paths kept
 */
export async function saveItem(item: LockerItem): Promise<{ success: boolean; error?: string }> {
  try {
    // Check storage before saving
    const check = await canStoreItem(item);
    if (!check.canStore) {
      return { success: false, error: check.reason };
    }

    // Convert base64 photos to file storage
    const photoPaths: string[] = [];
    for (let i = 0; i < item.photos.length; i++) {
      const photo = item.photos[i];
      if (photo.startsWith('data:')) {
        // Save to file system, get path
        const path = await savePhoto(photo, item.id, i);
        photoPaths.push(path);
      } else {
        // Already a path, keep it
        photoPaths.push(photo);
      }
    }

    // Convert bill photos
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

    const itemToSave: LockerItem = {
      ...item,
      photos: photoPaths,
      billPhotos: billPaths,
    };

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

    // Convert any new base64 photos to files
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

// Check if we can store an item
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

// ---- EXPORT ----
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
    // Check if session is within 30 minutes
    return session.active && (Date.now() - session.timestamp < 30 * 60 * 1000);
  } catch {
    return false;
  }
}
