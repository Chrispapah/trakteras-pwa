const isStorageAvailable = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function loadStoredValue<T>(key: string): T | null {
  if (!isStorageAvailable()) return null;

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch (error) {
    console.error(`Failed to read cached value for ${key}:`, error);
    return null;
  }
}

export function saveStoredValue<T>(key: string, value: T) {
  if (!isStorageAvailable()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to store cached value for ${key}:`, error);
  }
}

export function removeStoredValue(key: string) {
  if (!isStorageAvailable()) return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove cached value for ${key}:`, error);
  }
}
