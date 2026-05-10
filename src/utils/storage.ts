// Simulates expo-secure-store and AsyncStorage using localStorage
import type { LockerItem } from '@/types';

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

// Calculate total storage used by photos
export async function getStorageUsed(): Promise<string> {
  let total = 0;
  const items = await getItems();
  for (const item of items) {
    for (const photo of item.photos) {
      const info = await FileSystem.getInfoAsync(photo);
      if (info.exists && info.size) {
        total += info.size;
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
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveItem(item: LockerItem): Promise<void> {
  const items = await getItems();
  items.unshift(item);
  await AsyncStorage.setItem('items', JSON.stringify(items));
}

export async function deleteItem(itemId: string): Promise<void> {
  const items = await getItems();
  const item = items.find(i => i.id === itemId);
  if (item) {
    // Delete photos
    for (const photo of item.photos) {
      await FileSystem.deleteAsync(photo);
    }
  }
  const filtered = items.filter(i => i.id !== itemId);
  await AsyncStorage.setItem('items', JSON.stringify(filtered));
}

export async function updateItem(updatedItem: LockerItem): Promise<void> {
  const items = await getItems();
  const index = items.findIndex(i => i.id === updatedItem.id);
  if (index !== -1) {
    items[index] = updatedItem;
    await AsyncStorage.setItem('items', JSON.stringify(items));
  }
}

// Wipe all data
export async function wipeAllData(): Promise<void> {
  const items = await getItems();
  for (const item of items) {
    for (const photo of item.photos) {
      await FileSystem.deleteAsync(photo);
    }
  }
  await AsyncStorage.removeItem('items');
  await SecureStore.deleteItemAsync('pin');
  await AsyncStorage.removeItem('biometric');
}
