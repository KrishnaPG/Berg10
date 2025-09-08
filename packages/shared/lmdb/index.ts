const lmdbEnv = LMDB.open({
  path: path.join(DB_DIR, "meta.lmdb"),
  compression: true,
  // high perf options
  mapSize: 100 * 1024 * 1024, // 100 MB
  commitDelay: 0,
  overlappingSync: false,
});
const db = {
  checkpoint: lmdbEnv.openDB<string, string>({ name: "checkpoint" }),
  progress: lmdbEnv.openDB<string, boolean>({ name: "progress" }),
  packIndex: lmdbEnv.openDB<Uint8Array, string>({ name: "pack_index" }), // 16-byte value: 8-byte packfile-id, 8-byte offset
  packsDone: lmdbEnv.openDB<boolean, string>({ name: "packs_scanned" }), // checkpoint for packIndex data
};

class CRUDMgr {
  constructor()
}