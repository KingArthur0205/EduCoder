// IndexedDB utility functions for fallback storage when localStorage is full

const DB_NAME = 'TranscriptStorage';
const DB_VERSION = 1;
const STORE_NAME = 'transcripts';

interface TranscriptData {
  key: string;
  value: string;
  timestamp: number;
}

// Initialize IndexedDB
export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Save data to IndexedDB
export async function saveToIndexedDB(key: string, value: string): Promise<void> {
  const db = await initIndexedDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  const data: TranscriptData = {
    key,
    value,
    timestamp: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Load data from IndexedDB
export async function loadFromIndexedDB(key: string): Promise<string | null> {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return null;
  }
}

// Remove data from IndexedDB
export async function removeFromIndexedDB(key: string): Promise<void> {
  const db = await initIndexedDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Check if key exists in IndexedDB
export async function existsInIndexedDB(key: string): Promise<boolean> {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result !== undefined);
    });
  } catch (error) {
    console.error('Error checking IndexedDB:', error);
    return false;
  }
}

// Get all keys from IndexedDB
export async function getAllKeysFromIndexedDB(): Promise<string[]> {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  } catch (error) {
    console.error('Error getting all keys from IndexedDB:', error);
    return [];
  }
}

// Clear all data from IndexedDB
export async function clearIndexedDB(): Promise<void> {
  const db = await initIndexedDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}