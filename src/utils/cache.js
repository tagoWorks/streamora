const cache = new Map();

export function getCachedData(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < 3600000) { // 1 hour in milliseconds
    return item.data;
  }
  return null;
}

export function setCachedData(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}