export function createStorage(opts) {
  const storage = opts.localStorage;
  const keys = opts.keys;
  const warn = opts.warn;

  function loadJson(key, fallbackText, fallbackValue) {
    try {
      const raw = storage.getItem(key);
      return JSON.parse(raw || fallbackText);
    } catch (_) {
      return fallbackValue;
    }
  }

  function saveJson(key, value, failLabel) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (failLabel && warn) warn(failLabel, e);
      return false;
    }
  }

  function loadConfig(defaultConfig) {
    const raw = loadJson(keys.LS_CFG, '{}', {});
    return Object.assign(defaultConfig, raw);
  }

  function saveConfig(cfg) {
    return saveJson(keys.LS_CFG, cfg, 'saveCfg fail');
  }

  function loadSizeState() {
    return loadJson(keys.LS_SIZE, '{}', {});
  }

  function loadPositionState() {
    return loadJson(keys.LS_KEY, '{}', {});
  }

  function loadFabPositionState() {
    return loadJson(keys.LS_FAB, '{}', {});
  }

  function savePositionState(state) {
    return saveJson(keys.LS_KEY, state, null);
  }

  function saveFabPositionState(state) {
    return saveJson(keys.LS_FAB, state, null);
  }

  function removeLegacyPositionKeys() {
    try {
      ['rp_player_state_v1', 'rp_player_pos_v2', 'rp_player_pos_v3', 'liquidGlassPosition'].forEach(function (k) {
        storage.removeItem(k);
      });
    } catch (_) {}
  }

  function loadLibrary() {
    const lib = Object.assign({ manual: [], rp: {}, favorites: [] }, loadJson(keys.LS_LIB, '{}', {}));
    if (!Array.isArray(lib.manual)) lib.manual = [];
    if (!lib.rp || typeof lib.rp !== 'object') lib.rp = {};
    if (!Array.isArray(lib.favorites)) lib.favorites = [];
    return lib;
  }

  function saveLibrary(lib) {
    return saveJson(keys.LS_LIB, lib, 'saveLib fail');
  }

  function loadRadioFavorites() {
    const a = loadJson(keys.LS_RADIO_FAV, '[]', []);
    return Array.isArray(a) ? a : [];
  }

  function saveRadioFavorites(radioFav) {
    return saveJson(keys.LS_RADIO_FAV, radioFav, null);
  }

  function loadRpRejected() {
    const r = loadJson(keys.LS_RP_REJECTED, '{}', {});
    return r && typeof r === 'object' ? r : {};
  }

  function saveRpRejected(rpRejected) {
    return saveJson(keys.LS_RP_REJECTED, rpRejected, null);
  }

  function loadQueueState() {
    return loadJson(keys.LS_QUEUE, '{}', {});
  }

  function saveQueueState(queue, curIdx) {
    return saveJson(keys.LS_QUEUE, { queue: queue, curIdx: curIdx }, null);
  }

  return {
    loadJson: loadJson,
    saveJson: saveJson,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    loadSizeState: loadSizeState,
    loadPositionState: loadPositionState,
    loadFabPositionState: loadFabPositionState,
    savePositionState: savePositionState,
    saveFabPositionState: saveFabPositionState,
    removeLegacyPositionKeys: removeLegacyPositionKeys,
    loadLibrary: loadLibrary,
    saveLibrary: saveLibrary,
    loadRadioFavorites: loadRadioFavorites,
    saveRadioFavorites: saveRadioFavorites,
    loadRpRejected: loadRpRejected,
    saveRpRejected: saveRpRejected,
    loadQueueState: loadQueueState,
    saveQueueState: saveQueueState
  };
}