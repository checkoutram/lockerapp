// Simulates expo-crypto SHA-256 hashing
export async function digestStringAsync(
  algorithm: 'SHA-256',
  data: string
): Promise<string> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest(algorithm, encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Hash a PIN for storage
export async function hashPin(pin: string): Promise<string> {
  return digestStringAsync('SHA-256', pin);
}

// Compare a PIN against stored hash
export async function comparePin(pin: string): Promise<boolean> {
  // Import SecureStore dynamically to avoid circular dependency
  const { SecureStore } = await import('./storage');
  const storedHash = await SecureStore.getItemAsync('pin');
  if (!storedHash) return false;
  const inputHash = await hashPin(pin);
  return inputHash === storedHash;
}

// Generate UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
