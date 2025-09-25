import type { PanelSizes } from '../types/tab';

// Storage configuration
const STORAGE_PREFIX = 'sql-playground';
const STORAGE_VERSION = 'v1';
const PANEL_SIZES_PREFIX = `${STORAGE_PREFIX}:panels:${STORAGE_VERSION}`;

// Cache for performance optimization
const sizeCache = new Map<string, PanelSizes>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

// Type guard for PanelSizes validation
function isValidPanelSizes(value: unknown): value is PanelSizes {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    value[0] >= 0 &&
    value[1] >= 0 &&
    value[0] <= 1 &&
    value[1] <= 1 &&
    (value[0] + value[1]) <= 1
  );
}

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Generate storage key for a tab
function getStorageKey(tabId: string): string {
  return `${PANEL_SIZES_PREFIX}:${tabId}`;
}

// Clean expired cache entries
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of cacheTimestamps.entries()) {
    if (now - timestamp > CACHE_TTL) {
      sizeCache.delete(key);
      cacheTimestamps.delete(key);
    }
  }
}

// Get cached value with TTL check
function getCachedValue(tabId: string): PanelSizes | null {
  cleanExpiredCache();
  const timestamp = cacheTimestamps.get(tabId);
  if (timestamp && Date.now() - timestamp <= CACHE_TTL) {
    return sizeCache.get(tabId) || null;
  }
  return null;
}

// Set cached value with timestamp
function setCachedValue(tabId: string, sizes: PanelSizes): void {
  sizeCache.set(tabId, sizes);
  cacheTimestamps.set(tabId, Date.now());
}

// Clear cache for a specific tab
function clearCachedValue(tabId: string): void {
  sizeCache.delete(tabId);
  cacheTimestamps.delete(tabId);
}

/**
 * Save panel sizes for a specific tab with error handling and caching
 */
export function savePanelSizes(tabId: string, sizes: PanelSizes): void {
  try {
    // Validate input
    if (!tabId || typeof tabId !== 'string') {
      console.warn('Invalid tabId provided to savePanelSizes');
      return;
    }

    if (!isValidPanelSizes(sizes)) {
      console.warn('Invalid panel sizes provided to savePanelSizes', sizes);
      return;
    }

    // Check localStorage availability
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage is not available, using cache only');
      setCachedValue(tabId, sizes);
      return;
    }

    // Use efficient JSON serialization (avoid unnecessary string operations)
    const serializedSizes = JSON.stringify(sizes);
    const key = getStorageKey(tabId);

    localStorage.setItem(key, serializedSizes);
    setCachedValue(tabId, sizes);
  } catch (error) {
    console.error('Failed to save panel sizes:', error);
    // Fallback to cache only
    setCachedValue(tabId, sizes);
  }
}

/**
 * Load panel sizes for a specific tab with caching and error handling
 */
export function loadPanelSizes(tabId: string): PanelSizes | null {
  try {
    // Validate input
    if (!tabId || typeof tabId !== 'string') {
      console.warn('Invalid tabId provided to loadPanelSizes');
      return null;
    }

    // Check cache first
    const cachedValue = getCachedValue(tabId);
    if (cachedValue) {
      return cachedValue;
    }

    // Check localStorage availability
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage is not available');
      return null;
    }

    const key = getStorageKey(tabId);
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return null;
    }

    // Parse and validate stored data
    const parsedSizes = JSON.parse(storedValue);

    if (!isValidPanelSizes(parsedSizes)) {
      console.warn('Invalid panel sizes found in storage, removing corrupted data');
      localStorage.removeItem(key);
      return null;
    }

    // Cache the valid value
    setCachedValue(tabId, parsedSizes);
    return parsedSizes;
  } catch (error) {
    console.error('Failed to load panel sizes:', error);
    return null;
  }
}

/**
 * Remove panel sizes for a specific tab
 */
export function removePanelSizes(tabId: string): void {
  try {
    // Validate input
    if (!tabId || typeof tabId !== 'string') {
      console.warn('Invalid tabId provided to removePanelSizes');
      return;
    }

    // Clear cache
    clearCachedValue(tabId);

    // Check localStorage availability
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage is not available');
      return;
    }

    const key = getStorageKey(tabId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove panel sizes:', error);
  }
}

/**
 * Clean up orphaned panel size data for tabs that no longer exist
 */
export function cleanupOrphanedData(activeTabIds: string[]): void {
  try {
    // Validate input
    if (!Array.isArray(activeTabIds)) {
      console.warn('Invalid activeTabIds provided to cleanupOrphanedData');
      return;
    }

    // Check localStorage availability
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage is not available, skipping cleanup');
      return;
    }

    const activeTabIdsSet = new Set(activeTabIds);
    const keysToRemove: string[] = [];

    // Find all panel size keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PANEL_SIZES_PREFIX + ':')) {
        const tabId = key.substring(PANEL_SIZES_PREFIX.length + 1);
        if (!activeTabIdsSet.has(tabId)) {
          keysToRemove.push(key);
        }
      }
    }

    // Remove orphaned keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove orphaned key ${key}:`, error);
      }
    });

    // Clean up cache for removed tabs
    keysToRemove.forEach(key => {
      const tabId = key.substring(PANEL_SIZES_PREFIX.length + 1);
      clearCachedValue(tabId);
    });

    if (keysToRemove.length > 0) {
      console.info(`Cleaned up ${keysToRemove.length} orphaned panel size entries`);
    }
  } catch (error) {
    console.error('Failed to cleanup orphaned data:', error);
  }
}

/**
 * Get all stored panel size keys for debugging purposes
 */
export function getAllPanelSizeKeys(): string[] {
  try {
    if (!isLocalStorageAvailable()) {
      return [];
    }

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PANEL_SIZES_PREFIX + ':')) {
        keys.push(key);
      }
    }
    return keys;
  } catch (error) {
    console.error('Failed to get panel size keys:', error);
    return [];
  }
}

/**
 * Clear all panel size data (useful for testing or reset)
 */
export function clearAllPanelSizes(): void {
  try {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage is not available');
      return;
    }

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PANEL_SIZES_PREFIX + ':')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    sizeCache.clear();
    cacheTimestamps.clear();

    console.info(`Cleared all panel size data (${keysToRemove.length} entries)`);
  } catch (error) {
    console.error('Failed to clear all panel sizes:', error);
  }
}