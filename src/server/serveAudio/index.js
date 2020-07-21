const path = require("path");
const fs = require("fs").promises;

const cache = {
  // id: {lastAccess: timestamp, data: data}
};

/*
config:
 - mediaFolder
 - cacheLifetime (seconds, 0 for none)
*/

const clearCache = (cacheLifetime, timeout = 5e3) => {
  const now = Date.now();

  Object.keys(cache).forEach((id) => {
    const isOutdated = now < cache[id].lastAccess + cacheLifetime;
    if (isOutdated) delete cache[id];
  });
  // run again soon
  setTimeout(() => clearCache(cacheLifetime, timeout), timeout);
};

module.exports = (config) => {
  const { cacheLifetime = 360 } = config;
  clearCache(cacheLifetime * 1000);
  return async (chunkId) => {
    if (cacheLifetime > 0) {
      const cachedChunk = cache[chunkId];

      if (cachedChunk) {
        cachedChunk.lastAccess = Date.now();
        return Promise.resolve(cachedChunk.data);
      }
    }
    const chunkPath = path.join(config.mediaFolder, chunkId);
    const data = await fs.readFile(chunkPath);
    cache[chunkId] = {
      data,
      lastAccess: Date.now(),
    };
    return data;
  };
};
