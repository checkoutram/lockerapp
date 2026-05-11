// Simulates expo-secure-store and AsyncStorage using localStorage
import type { LockerItem } from '@/types';
import { getValidPhotos } from '@/types';

const PREFIX = 'inbanklocker_';

// Secure Store simulation (for PIN)
export const SecureStore = {
  async getItemAsync(key: string): Promise<string | null> {
    return localStorage.getItem(PREFIX + key);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    localStorage.setItem(PREFIX + key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    localStorage.removeItem(PREFIX + key);
  },
};

// AsyncStorage simulation
export const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(PREFIX + key);
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(PREFIX + key, value);
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(PREFIX + key);
  },
};

// File System simulation - stores photos as base64 data URLs
export const FileSystem = {
  documentDirectory: 'inbanklocker_photos/',

  async writeAsStringAsync(uri: string, base64: string): Promise<void> {
    localStorage.setItem(uri, base64);
  },

  async readAsStringAsync(uri: string): Promise<string> {
    const data = localStorage.getItem(uri);
    if (!data) throw new Error('File not found');
    return data;
  },

  async deleteAsync(uri: string): Promise<void> {
    localStorage.removeItem(uri);
  },

  async getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }> {
    const data = localStorage.getItem(uri);
    if (!data) return { exists: false };
    return { exists: true, size: data.length * 0.75 }; // approximate base64 size
  },

  async makeDirectoryAsync(_uri: string): Promise<void> {
    // No-op in localStorage
  },
};

// Check if localStorage has enough space
function hasEnoughSpace(neededBytes: number): boolean {
  try {
    const testKey = PREFIX + '_quota_test_';
    const testData = 'x'.repeat(Math.min(neededBytes, 1024 * 1024));
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Calculate total storage used by photos (base64 data URLs stored in items)
export async function getStorageUsed(): Promise<string> {
  let total = 0;
  const items = await getItems();
  for (const item of items) {
    for (const photo of item.photos) {
      if (photo.startsWith('data:')) {
        total += Math.round(photo.length * 0.75);
      }
    }
    if (item.billPhotos) {
      for (const photo of item.billPhotos) {
        if (photo.startsWith('data:')) {
          total += Math.round(photo.length * 0.75);
        }
      }
    }
  }
  if (total === 0) return '0 B';
  if (total < 1024) return total + ' B';
  if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' KB';
  return (total / (1024 * 1024)).toFixed(2) + ' MB';
}

// Item CRUD operations
export async function getItems(): Promise<LockerItem[]> {
  const data = await AsyncStorage.getItem('items');
  if (!data) return [];
  try {
    const items: LockerItem[] = JSON.parse(data);
    // Clean up broken photos (old key strings) from loaded items
    return items.map((item) => ({
      ...item,
      photos: getValidPhotos(item.photos),
      billPhotos: getValidPhotos(item.billPhotos),
    }));
  } catch {
    return [];
  }
}

export async function saveItem(item: LockerItem): Promise<{ success: boolean; error?: string }> {
  try {
    const items = await getItems();
    items.unshift(item);
    
    const jsonStr = JSON.stringify(items);
    const size = jsonStr.length * 2;
    
    // Check if we have enough space
    if (!hasEnoughSpace(size)) {
      return { 
        success: false, 
        error: `Storage full. This item with photos is too large (~${(size / 1024 / 1024).toFixed(1)}MB). Try using fewer or smaller photos.` 
      };
    }
    
    await AsyncStorage.setItem('items', jsonStr);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to save: ${msg}` };
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  const items = await getItems();
  const filtered = items.filter(i => i.id !== itemId);
  await AsyncStorage.setItem('items', JSON.stringify(filtered));
}

export async function updateItem(updatedItem: LockerItem): Promise<{ success: boolean; error?: string }> {
  try {
    const items = await getItems();
    const index = items.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
      await AsyncStorage.setItem('items', JSON.stringify(items));
      return { success: true };
    }
    return { success: false, error: 'Item not found' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to update: ${msg}` };
  }
}

// Wipe all data
export async function wipeAllData(): Promise<void> {
  await AsyncStorage.removeItem('items');
  await SecureStore.deleteItemAsync('pin');
  await AsyncStorage.removeItem('biometric');
}
