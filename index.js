(function () {
  'use strict';

  if (window.__rpPlayerLock) {
    try {
      const sid0 = (typeof getScriptId === 'function') ? getScriptId() : null;
      if (typeof $ === 'function' && sid0) $('body > div[script_id="' + sid0 + '"]').slice(1).remove();
    } catch (_) {}
    return;
  }
  window.__rpPlayerLock = true;

  const PFX = 'rp-player';
  const LS_KEY = 'rp_player_pos_v4';
  const LS_FAB = 'rp_player_fab_v1';
  const LS_CFG = 'rp_player_cfg_v1';
  const LS_QUEUE = 'rp_player_queue_v1';
  const LS_LIB = 'rp_player_lib_v1';
  const LS_RADIO_FAV = 'rp_player_radiofav_v1';
  const LS_RP_REJECTED = 'rp_player_rp_rejected_v1';
  const LS_SIZE = 'rp_player_size_v1';
  const DEFAULT_JAMENDO_KEY = '6fcc94f7';
  const DEFAULT_YT_KEY = 'AIzaSyDMuAcY3e7h6EDCybpGVuwGbvq7lYJB18A';
  const BAIBAI_JS = 'https://drive.baibai.cv/f/ZKEBuW/Music.js';

  const ALL_LS_KEYS = [
    LS_KEY, LS_FAB, LS_CFG, LS_QUEUE, LS_LIB, LS_RADIO_FAV, LS_RP_REJECTED, LS_SIZE,
    'rp_player_state_v1', 'rp_player_pos_v2', 'rp_player_pos_v3', 'liquidGlassPosition'
  ];

  const THEMES = ['default', 'glass', 'neon', 'paper', 'minimal'];
  let theme = 'default';
  try {
    const c = JSON.parse(localStorage.getItem(LS_CFG) || '{}');
    if (c.theme) theme = c.theme;
  } catch (_) {}

  let DEBUG = true;
  try {
    const c = JSON.parse(localStorage.getItem(LS_CFG) || '{}');
    if (typeof c.debug === 'boolean') DEBUG = c.debug;
  } catch (_) {}

  function log(...args) { if (DEBUG) console.log('[ST Player]', ...args); }
  function info(...args) { console.log('[ST Player]', ...args); }
  function warn(...args) { console.warn('[ST Player]', ...args); }
  function error(...args) { console.error('[ST Player]', ...args); }
  function dbg(tag, ...args) { if (DEBUG) console.log('[ST Player][' + tag + ']', ...args); }

  let cfg = {
    source: 'youtube', jamendoKey: '', ytKey: '', accent: '', opacity: -1,
    rpAuto: false, rpQuick: false, rpEvery: 10, rpCount: 5,
    rpProfile: '', rpTokenLimitOn: false, rpTokenLimit: 6000,
    rpLang: '', rpLangCustom: '', rpAutoplay: false, rpQuickAutoplay: false,
    rpSource: 'auto', rpGenre: '', rpGenreCustom: '', rpUseFavorites: false,
    bgType: 'none', bgUrl: '', bgBase64: '', bgByTheme: {},
    textColor: '', textColorByTheme: {}, solidByTheme: {},
    solidLightByTheme: {}, accentByTheme: {}, debug: true
  };
  try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem(LS_CFG) || '{}')); } catch (_) {}
  if (!cfg.bgByTheme || typeof cfg.bgByTheme !== 'object') cfg.bgByTheme = {};
  if (!cfg.textColorByTheme || typeof cfg.textColorByTheme !== 'object') cfg.textColorByTheme = {};
  if (!cfg.solidByTheme || typeof cfg.solidByTheme !== 'object') cfg.solidByTheme = {};
  if (!cfg.solidLightByTheme || typeof cfg.solidLightByTheme !== 'object') cfg.solidLightByTheme = {};
  if (!cfg.accentByTheme || typeof cfg.accentByTheme !== 'object') cfg.accentByTheme = {};
  if (typeof cfg.debug === 'boolean') DEBUG = cfg.debug;

  (function migrateQuickAutoplay() {
    try {
      if (cfg.rpQuickAutoplay && !cfg.rpAutoplay) {
        cfg.rpAutoplay = true;
      }
    } catch (_) {}
  })();

  let bgPending = null;

  function saveCfg() {
    try { localStorage.setItem(LS_CFG, JSON.stringify(cfg)); } catch (e) { warn('saveCfg fail', e); }
  }
  function jamKey() {
    return (cfg.jamendoKey || '').trim() || DEFAULT_JAMENDO_KEY;
  }
  function ytKey() {
    return (cfg.ytKey || '').trim() || DEFAULT_YT_KEY;
  }

  (function migrateOpacity() {
    if (typeof cfg.opacity === 'number' && cfg.opacity >= 0) {
      const b = cfg.bgByTheme[theme];
      if (!b || typeof b.opacity !== 'number') {
        if (!cfg.bgByTheme[theme]) cfg.bgByTheme[theme] = {};
        cfg.bgByTheme[theme].opacity = cfg.opacity;
        saveCfg();
      }
    }
  })();

  try {
    ['rp_player_state_v1', 'rp_player_pos_v2', 'rp_player_pos_v3', 'liquidGlassPosition'].forEach(function (k) {
      localStorage.removeItem(k);
    });
  } catch (_) {}

  let uiMode = 'pill';
  let searchOpen = false, libOpen = false, radioOpen = false, rpOpen = false, plOpen = false, radioTab = 'soma';
  let radioResults = [];
  let ytHidden = true;
  let secScroll = 0;
  let searching = false;
  let queueCollapsed = false;
  let resCollapsed = false;
  let flashPlId = null;
  let rpPulse = false;
  let rpBusy = false;
  let trackEnded = false;

  let confirmDelete = null;
  let exportPop = null;

  let accAccent = false, accText = false, accSolid = false, accBg = false;
  let rpAccLang = false, rpAccGenre = false, rpAccSource = false, rpAccBackup = false;

  let searchAbortController = null;
  let rpAbortController = null;

  let posCollapsedX = -1, posCollapsedY = -1;
  let posExpandedX = -1, posExpandedY = -1;
  let posFabX = -1, posFabY = -1;
  let sizeCollapsedW = 0, sizeCollapsedH = 0;
  let sizeExpandedW = 0, sizeExpandedH = 0, posX = -1, posY = -1;
  let sizeFabW = 0, sizeFabH = 0;
  let userW = 0, userH = 0;
  let returnMiniX = -1;
  let returnMiniY = -1;
  let returnMiniW = 0;
  let returnMiniH = 0;
  let returnMiniMode = 'pill';

  let pendingFabPoint = null;

  let audioCurrentTime = 0;
  let audioDuration = 0;
  let currentPlayId = 0;

  Object.defineProperty(window, '__rpUiMode', {
    configurable: true,
    get: function () { return uiMode; }
  });

  function isCollapsed() {
    return uiMode !== 'panel';
  }
  function isFab() {
    return uiMode === 'fab';
  }

  let collapsed = true;
  function syncCollapsed() {
    collapsed = isCollapsed();
  }
  syncCollapsed();
  (function () {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SIZE) || '{}');
      if (typeof s.collapsedW === 'number') sizeCollapsedW = s.collapsedW;
      if (typeof s.collapsedH === 'number') sizeCollapsedH = s.collapsedH;
      if (typeof s.expandedW === 'number') sizeExpandedW = s.expandedW;
      if (typeof s.expandedH === 'number') sizeExpandedH = s.expandedH;
      if (typeof s.fabW === 'number') sizeFabW = s.fabW;
      if (typeof s.fabH === 'number') sizeFabH = s.fabH;
      if (typeof s.w === 'number' && sizeExpandedW === 0) sizeExpandedW = s.w;
      if (typeof s.h === 'number' && sizeExpandedH === 0) sizeExpandedH = s.h;
    } catch (e) {}
  })();

  function saveSize() {
    try {
      if (uiMode === 'fab') {
        sizeFabW = userW || sizeFabW;
        sizeFabH = userH || sizeFabH;
      } else if (collapsed) {
        sizeCollapsedW = userW || sizeCollapsedW;
        sizeCollapsedH = userH || sizeCollapsedH;
      } else {
        sizeExpandedW = userW || sizeExpandedW;
        sizeExpandedH = userH || sizeExpandedH;
      }
      localStorage.setItem(LS_SIZE, JSON.stringify({
        collapsedW: sizeCollapsedW,
        collapsedH: sizeCollapsedH,
        expandedW: sizeExpandedW,
        expandedH: sizeExpandedH,
        fabW: sizeFabW,
        fabH: sizeFabH
      }));
    } catch (e) { warn('saveSize fail', e); }
  }

  (function () {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if (typeof s.uiMode === 'string') {
        uiMode = s.uiMode;
      } else if (typeof s.collapsed === 'boolean') {
        uiMode = s.collapsed ? 'pill' : 'panel';
      }
      if (uiMode !== 'pill' && uiMode !== 'panel' && uiMode !== 'fab') uiMode = 'pill';
      if (typeof s.collapsedX === 'number') posCollapsedX = s.collapsedX;
      if (typeof s.collapsedY === 'number') posCollapsedY = s.collapsedY;
      if (typeof s.expandedX === 'number') posExpandedX = s.expandedX;
      if (typeof s.expandedY === 'number') posExpandedY = s.expandedY;
      if (typeof s.x === 'number' && posExpandedX === -1) posExpandedX = s.x;
      if (typeof s.y === 'number' && posExpandedY === -1) posExpandedY = s.y;
    } catch (e) {}
    try {
      const f = JSON.parse(localStorage.getItem(LS_FAB) || '{}');
      if (typeof f.x === 'number') posFabX = f.x;
      if (typeof f.y === 'number') posFabY = f.y;
    } catch (e) {}
    syncCollapsed();
  })();

  function curPosX() {
    if (uiMode === 'fab') return posFabX;
    return collapsed ? posCollapsedX : posExpandedX;
  }
  function curPosY() {
    if (uiMode === 'fab') return posFabY;
    return collapsed ? posCollapsedY : posExpandedY;
  }
  function curSizeW() {
    if (uiMode === 'fab') return sizeFabW;
    return (collapsed ? sizeCollapsedW : sizeExpandedW) || 0;
  }
  function curSizeH() {
    if (uiMode === 'fab') return sizeFabH;
    return (collapsed ? sizeCollapsedH : sizeExpandedH) || 0;
  }

  try {
    posX = curPosX();
    posY = curPosY();
    userW = curSizeW();
    userH = curSizeH();
  } catch (_) {}

  function persistPosOnly() {
    try {
      syncCollapsed();

      localStorage.setItem(LS_KEY, JSON.stringify({
        uiMode: uiMode,
        collapsed: collapsed,

        collapsedX: posCollapsedX,
        collapsedY: posCollapsedY,

        expandedX: posExpandedX,
        expandedY: posExpandedY
      }));

      localStorage.setItem(LS_FAB, JSON.stringify({
        x: posFabX,
        y: posFabY
      }));
    } catch (e) {
      warn('persistPosOnly fail', e);
    }
  }

  function persistUiMode() {
    persistPosOnly();
  }

  function savePos() {
    try {
      if (!root) return;

      syncCollapsed();

      const r = root.getBoundingClientRect();
      const x = Math.round(r.left);
      const y = Math.round(r.top);

      posX = x;
      posY = y;

      if (uiMode === 'fab') {
        posFabX = x;
        posFabY = y;

        posCollapsedX = x;
        posCollapsedY = y;
      } else if (collapsed) {
        posCollapsedX = x;
        posCollapsedY = y;

        posFabX = x;
        posFabY = y;
      } else {
        posExpandedX = x;
        posExpandedY = y;
      }

      persistPosOnly();
    } catch (e) {
      warn('savePos fail', e);
    }
  }

  function syncMiniAnchorFromRect(rect) {
    if (!rect) return;

    const x = Math.round(rect.left);
    const y = Math.round(rect.top);

    posCollapsedX = x;
    posCollapsedY = y;

    posFabX = x;
    posFabY = y;

    posX = x;
    posY = y;

    persistPosOnly();
  }

  function syncCollapsedAnchorFromRect(rect) {
    syncMiniAnchorFromRect(rect);
  }

  function syncMiniAnchorFromRoot() {
    if (!root) return;
    syncMiniAnchorFromRect(root.getBoundingClientRect());
  }

  function syncCollapsedAnchorFromRoot() {
    syncMiniAnchorFromRoot();
  }

  function clearReturnMiniAnchor() {
    returnMiniX = -1;
    returnMiniY = -1;
    returnMiniW = 0;
    returnMiniH = 0;
    returnMiniMode = 'pill';
  }

  function rememberReturnMiniFromRect(rect, mode) {
    if (!rect) return;

    returnMiniX = Math.round(rect.left);
    returnMiniY = Math.round(rect.top);
    returnMiniW = Math.round(rect.width || 0);
    returnMiniH = Math.round(rect.height || 0);
    returnMiniMode = mode || uiMode || 'pill';
  }

  function hasReturnMiniAnchor() {
    return returnMiniX >= 0 && returnMiniY >= 0;
  }

  function clampXYForSize(x, y, w, h) {
    const W = VW();
    const H = VH();

    const minX = 4;
    const minY = TOPBAR;

    const maxX = Math.max(minX, W - w - 4);
    const maxY = Math.max(minY, H - h - 4);

    return {
      x: Math.round(Math.max(minX, Math.min(x, maxX))),
      y: Math.round(Math.max(minY, Math.min(y, maxY)))
    };
  }

  function panelPosFromMini(miniX, miniY, miniW, miniH, panelW, panelH) {
    const W = VW();
    const H = VH();

    const minX = 4;
    const minY = TOPBAR;

    const maxX = Math.max(minX, W - panelW - 4);
    const maxY = Math.max(minY, H - panelH - 4);

    let x = miniX;
    let y = miniY;

    if (x + panelW > W - 4) {
      x = miniX + miniW - panelW;
    }

    if (miniY + miniH + panelH > H - 4) {
      y = miniY + miniH - panelH;
    }

    if (x < minX) x = minX;
    if (x > maxX) x = maxX;
    if (y < minY) y = minY;
    if (y > maxY) y = maxY;

    return {
      x: Math.round(x),
      y: Math.round(y)
    };
  }

  function fabPosFromPoint(pointX, pointY, fabW, fabH) {
    const w = fabW || 48;
    const h = fabH || 48;
    const x = pointX - w / 2;
    const y = pointY - h / 2;
    return clampXYForSize(x, y, w, h);
  }

  function switchUiMode(newMode, sourceRect) {
    if (newMode !== 'panel' && newMode !== 'pill' && newMode !== 'fab') return;

    if (!root) {
      uiMode = newMode;
      syncCollapsed();
      persistPosOnly();
      return;
    }

    const oldMode = uiMode;
    const oldCollapsed = oldMode !== 'panel';

    const rect = sourceRect || root.getBoundingClientRect();
    const x = Math.round(rect.left);
    const y = Math.round(rect.top);
    const w = Math.round(rect.width || 0);
    const h = Math.round(rect.height || 0);

    const fabPoint = (newMode === 'fab') ? pendingFabPoint : null;
    pendingFabPoint = null;

    if (oldMode === 'panel') {
      posExpandedX = x;
      posExpandedY = y;
    } else {
      posCollapsedX = x;
      posCollapsedY = y;
      posFabX = x;
      posFabY = y;
    }

    if (oldCollapsed && newMode === 'panel') {
      rememberReturnMiniFromRect(rect, oldMode);

      uiMode = 'panel';
      syncCollapsed();

      userW = sizeExpandedW || userW || 0;
      userH = sizeExpandedH || userH || 0;

      posX = x;
      posY = y;

      persistPosOnly();
      render();

      requestAnimationFrame(function () {
        if (!root) return;

        const nr = root.getBoundingClientRect();
        const p = panelPosFromMini(
          returnMiniX,
          returnMiniY,
          returnMiniW || w,
          returnMiniH || h,
          nr.width || root.offsetWidth || 260,
          nr.height || root.offsetHeight || 300
        );

        posX = p.x;
        posY = p.y;

        applyPos();
        savePos();
      });

      return;
    }

    if (oldMode === 'panel' && newMode !== 'panel') {
      let tx = x;
      let ty = y;

      if (newMode === 'fab' && fabPoint) {
        const fp = fabPosFromPoint(fabPoint.x, fabPoint.y, sizeFabW || 48, sizeFabH || 48);
        tx = fp.x;
        ty = fp.y;
      } else if (hasReturnMiniAnchor()) {
        tx = returnMiniX;
        ty = returnMiniY;
      }

      posExpandedX = x;
      posExpandedY = y;

      posCollapsedX = tx;
      posCollapsedY = ty;
      posFabX = tx;
      posFabY = ty;

      uiMode = newMode;
      syncCollapsed();

      if (uiMode === 'fab') {
        userW = sizeFabW || 0;
        userH = sizeFabH || 0;
      } else {
        userW = sizeCollapsedW || 0;
        userH = sizeCollapsedH || 0;
      }

      posX = tx;
      posY = ty;

      persistPosOnly();
      render();

      requestAnimationFrame(function () {
        applyUserSize();
        if (newMode === 'fab' && fabPoint) {
          const nr = root.getBoundingClientRect();
          const fp = fabPosFromPoint(fabPoint.x, fabPoint.y, nr.width || 48, nr.height || 48);
          posX = fp.x;
          posY = fp.y;
          posFabX = fp.x;
          posFabY = fp.y;
          posCollapsedX = fp.x;
          posCollapsedY = fp.y;
        }
        applyPos();
        savePos();
        clearReturnMiniAnchor();
      });

      return;
    }

    if (oldCollapsed && newMode !== 'panel') {
      let tx = x;
      let ty = y;

      if (newMode === 'fab' && fabPoint) {
        const fp = fabPosFromPoint(fabPoint.x, fabPoint.y, sizeFabW || 48, sizeFabH || 48);
        tx = fp.x;
        ty = fp.y;
      }

      posCollapsedX = tx;
      posCollapsedY = ty;
      posFabX = tx;
      posFabY = ty;

      uiMode = newMode;
      syncCollapsed();

      if (uiMode === 'fab') {
        userW = sizeFabW || 0;
        userH = sizeFabH || 0;
      } else {
        userW = sizeCollapsedW || 0;
        userH = sizeCollapsedH || 0;
      }

      posX = tx;
      posY = ty;

      persistPosOnly();
      render();

      requestAnimationFrame(function () {
        applyUserSize();
        if (newMode === 'fab' && fabPoint) {
          const nr = root.getBoundingClientRect();
          const fp = fabPosFromPoint(fabPoint.x, fabPoint.y, nr.width || 48, nr.height || 48);
          posX = fp.x;
          posY = fp.y;
          posFabX = fp.x;
          posFabY = fp.y;
          posCollapsedX = fp.x;
          posCollapsedY = fp.y;
        }
        applyPos();
        savePos();
      });

      return;
    }

    uiMode = newMode;
    syncCollapsed();

    posX = x;
    posY = y;

    persistPosOnly();
    render();

    requestAnimationFrame(function () {
      applyUserSize();
      applyPos();
      savePos();
    });
  }

  function switchCollapsedLinked(nextCollapsed, sourceRect) {
    switchUiMode(nextCollapsed ? 'pill' : 'panel', sourceRect);
  }

  let $j;

  function jq() {
    return (typeof $ === 'function' && $.fn) ? $ : (window.jQuery && window.jQuery.fn ? window.jQuery : null);
  }
  function scriptId() {
    try {
      if (typeof getScriptId === 'function') return getScriptId();
    } catch (_) {}
    return null;
  }
  function VW() {
    let w = 0;
    if ($j) {
      try { w = $j('body').width() || $j(window).width() || 0; } catch (_) {}
    }
    if (!w) w = window.innerWidth || 360;
    return w;
  }
  function VH() {
    let h = 0;
    if ($j) {
      try { h = $j('body').height() || $j(window).height() || 0; } catch (_) {}
    }
    if (!h) h = window.innerHeight || 640;
    return h;
  }

  function topBarOffset() {
    let off = 0;
    try {
      const sels = ['#top-bar', '#top-settings-holder', '#sheld_extension_floating_prompt', '.topbar'];
      for (let i = 0; i < sels.length; i++) {
        const el = document.querySelector(sels[i]);
        if (el) {
          const r = el.getBoundingClientRect();
          const st = window.getComputedStyle(el);
          if (r.height > 0 && r.top <= 4 && st.display !== 'none' && st.visibility !== 'hidden') {
            if (r.bottom > off) off = r.bottom;
          }
        }
      }
    } catch (_) {}
    if (off < 0) off = 0;
    return Math.max(8, Math.min(off + 6, 160));
  }

  let TOPBAR = topBarOffset();

  function refreshTopbar() {
    TOPBAR = topBarOffset();
  }

  function stContext() {
    try {
      if (window.SillyTavern && window.SillyTavern.getContext) return window.SillyTavern.getContext();
    } catch (_) {}
    return null;
  }

  function getChatId() {
    const c = stContext();
    if (c) {
      try { return String(c.chatId || c.characterId || c.groupId || 'default'); } catch (_) {}
    }
    return 'default';
  }

  function getChatName() {
    const c = stContext();
    if (c) {
      try {
        return String(c.name2 || c.characterName || ('Чат ' + (c.chatId || ''))).slice(0, 40) || 'Чат';
      } catch (_) {}
    }
    return 'Чат';
  }

  function dateStamp() {
    const d = new Date();
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2);
  }

  const audio = new Audio();
  audio.volume = 0.7;

  let queue = [];
  let curIdx = -1;
  let isPlaying = false;
  let statusMsg = 'Найдите трек';
  let ytCurrentEmbed = null;

  audio.addEventListener('timeupdate', function () {
    if (curIdx >= 0 && queue[curIdx]) {
      audioCurrentTime = audio.currentTime;
      audioDuration = audio.duration || 0;
      updateProgressBarUI();
    }
  });

  audio.addEventListener('loadedmetadata', function () {
    if (curIdx >= 0 && queue[curIdx]) {
      audioDuration = audio.duration || 0;
      updateProgressBarUI();
    }
  });

  function formatTime(secs) {
    if (isNaN(secs) || secs === Infinity) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function sliderFill(el, val, max) {
    if (!el) return;
    const m = max > 0 ? max : 100;
    const pct = Math.max(0, Math.min(100, (val / m) * 100));
    el.style.background =
      'linear-gradient(to right, var(--rp-accent, #7aa6ff) 0%, var(--rp-accent, #7aa6ff) ' + pct +
      '%, var(--rp-accent-soft, rgba(122,166,255,0.22)) ' + pct +
      '%, var(--rp-accent-soft, rgba(122,166,255,0.22)) 100%)';
  }

  function updateProgressBarUI() {
    if (!bodyEl || collapsed) return;
    const sld = bodyEl.querySelector('.' + PFX + '-progress-slider');
    const curLbl = bodyEl.querySelector('.' + PFX + '-cur-time');
    const durLbl = bodyEl.querySelector('.' + PFX + '-dur-time');
    if (sld) {
      sld.value = audioCurrentTime;
      sld.max = audioDuration || 100;
      sliderFill(sld, audioCurrentTime, audioDuration || 100);
    }
    if (curLbl) curLbl.textContent = formatTime(audioCurrentTime);
    if (durLbl) durLbl.textContent = formatTime(audioDuration);
  }

  function updateVolUI() {
    if (!bodyEl) return;
    const v = bodyEl.querySelector('[data-vol]');
    if (v) sliderFill(v, Math.round(audio.volume * 100), 100);
  }

  let results = [];
  let resultsTitle = '';
  let resultsRp = false;
  let searchState = { query: '', scope: 'all', srcIdx: 0, offsets: {}, ytTokens: {}, exhausted: false };

  let lib = { manual: [], rp: {}, favorites: [] };
  try { lib = Object.assign({ manual: [], rp: {}, favorites: [] }, JSON.parse(localStorage.getItem(LS_LIB) || '{}')); } catch (_) {}
  if (!Array.isArray(lib.manual)) lib.manual = [];
  if (!lib.rp || typeof lib.rp !== 'object') lib.rp = {};
  if (!Array.isArray(lib.favorites)) lib.favorites = [];
  function saveLib() {
    try { localStorage.setItem(LS_LIB, JSON.stringify(lib)); } catch (e) { warn('saveLib fail', e); }
  }
  let radioFav = [];
  try {
    const a = JSON.parse(localStorage.getItem(LS_RADIO_FAV) || '[]');
    if (Array.isArray(a)) radioFav = a;
  } catch (_) {}
  function saveRadioFav() {
    try { localStorage.setItem(LS_RADIO_FAV, JSON.stringify(radioFav)); } catch (_) {}
  }

  let rpRejected = {};
  try {
    const r = JSON.parse(localStorage.getItem(LS_RP_REJECTED) || '{}');
    if (r && typeof r === 'object') rpRejected = r;
  } catch (_) {}

  function saveRpRejected() {
    try { localStorage.setItem(LS_RP_REJECTED, JSON.stringify(rpRejected)); } catch (_) {}
  }

  function isRadioFav(url) {
    return radioFav.some(function (s) { return s.url === url; });
  }

  function toggleRadioFav(station) {
    if (isRadioFav(station.url)) {
      radioFav = radioFav.filter(function (s) { return s.url !== station.url; });
    } else {
      radioFav.push({ name: station.name, url: station.url, tag: station.tag || '' });
    }
    saveRadioFav();
    render();
  }

  const FAV_CHAT_KEY = '__favorites__';

  function trackSigForFav(t) {
    if (!t) return '';
    if (t.ytid) return 'yt:' + t.ytid;
    if (t.url) return 'url:' + t.url;
    return rpTrackSig(t);
  }

  function isFav(t) {
    const sig = trackSigForFav(t);
    if (!sig) return false;
    return lib.favorites.some(function (x) { return trackSigForFav(x) === sig; });
  }

  function toggleFav(t) {
    if (!t) return;
    const sig = trackSigForFav(t);
    if (!sig) return;
    const idx = lib.favorites.findIndex(function (x) { return trackSigForFav(x) === sig; });
    if (idx >= 0) {
      lib.favorites.splice(idx, 1);
      dbg('fav', 'removed', rpTrackHuman(t));
    } else {
      const copy = JSON.parse(JSON.stringify(t));
      delete copy._rpSuggestedChat;
      delete copy._rpWhy;
      delete copy.why;
      lib.favorites.push(copy);
      dbg('fav', 'added', rpTrackHuman(t));
    }
    saveLib();
    render();
  }

  function trackExistsAnywhereExceptRemoval(sig, exclude) {
    if (!sig) return true;
    function has(arr) {
      if (!Array.isArray(arr)) return false;
      return arr.some(function (t) {
        return t && t !== exclude && trackSigForFav(t) === sig;
      });
    }
    if (has(queue)) return true;
    if (has(lib.favorites)) return true;
    for (let i = 0; i < lib.manual.length; i++) {
      if (lib.manual[i] && has(lib.manual[i].tracks)) return true;
    }
    const keys = Object.keys(lib.rp);
    for (let i = 0; i < keys.length; i++) {
      if (lib.rp[keys[i]] && has(lib.rp[keys[i]].tracks)) return true;
    }
    return false;
  }

  function markGlobalDislike(track) {
    if (!track) return;
    const sig = trackSigForFav(track);
    if (!sig) return;
    if (trackExistsAnywhereExceptRemoval(sig, track)) {
      dbg('dislike', 'skip (still exists elsewhere)', rpTrackHuman(track));
      return;
    }
    const cid = getChatId();
    const rsig = rpTrackSig(track);
    if (!rsig) return;
    if (!rpRejected[cid]) rpRejected[cid] = [];
    if (rpRejected[cid].indexOf(rsig) < 0) {
      rpRejected[cid].push(rsig);
      rpRejected[cid] = rpRejected[cid].slice(-300);
      saveRpRejected();
      dbg('dislike', 'global dislike recorded', rpTrackHuman(track));
    }
  }
  const SOMA_STATIONS = [
    { name: 'Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3', tag: 'ambient/космос' },
    { name: 'Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3', tag: 'чилл/даунтемпо' },
    { name: 'Groove Salad Classic', url: 'https://ice1.somafm.com/gsclassic-128-mp3', tag: 'чилл/классика Soma' },
    { name: 'Deep Space One', url: 'https://ice1.somafm.com/deepspaceone-128-mp3', tag: 'тёмный эмбиент' },
    { name: 'Space Station Soma', url: 'https://ice1.somafm.com/spacestation-128-mp3', tag: 'электро/спейс' },
    { name: 'Mission Control', url: 'https://ice1.somafm.com/missioncontrol-128-mp3', tag: 'эмбиент/космос' },
    { name: 'Lush', url: 'https://ice1.somafm.com/lush-128-mp3', tag: 'вокал/мечтательное' },
    { name: 'Beat Blender', url: 'https://ice1.somafm.com/beatblender-128-mp3', tag: 'хаус/даунтемпо' },
    { name: 'Secret Agent', url: 'https://ice1.somafm.com/secretagent-128-mp3', tag: 'спай/джаз/нуар' },
    { name: 'Dub Step Beyond', url: 'https://ice1.somafm.com/dubstep-128-mp3', tag: 'дабстеп/бас' },
    { name: 'DEF CON Radio', url: 'https://ice1.somafm.com/defcon-128-mp3', tag: 'тёмное электро' },
    { name: 'The Trip', url: 'https://ice1.somafm.com/thetrip-128-mp3', tag: 'прог/транс' },
    { name: 'Black Rock FM', url: 'https://ice1.somafm.com/brfm-128-mp3', tag: 'разное/burning man' },
    { name: 'Indie Pop Rocks', url: 'https://ice1.somafm.com/indiepop-128-mp3', tag: 'инди-поп/альтернатива' },
    { name: 'Metal Detector', url: 'https://ice1.somafm.com/metal-128-mp3', tag: 'метал' },
    { name: 'Folk Forward', url: 'https://ice1.somafm.com/folkfwd-128-mp3', tag: 'фолк/инди-фолк' },
    { name: 'Seven Inch Soul', url: 'https://ice1.somafm.com/7soul-128-mp3', tag: 'соул/фанк' },
    { name: 'Suburbs of Goa', url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3', tag: 'world/desi' },
    { name: 'Vaporwaves', url: 'https://ice1.somafm.com/vaporwaves-128-mp3', tag: 'вейпорвейв' },
    { name: 'Sonic Universe', url: 'https://ice1.somafm.com/sonicuniverse-128-mp3', tag: 'авангард-джаз' },
    { name: 'Fluid', url: 'https://ice1.somafm.com/fluid-128-mp3', tag: 'хип-хоп/трип-хоп' },
    { name: 'Illinois Street Lounge', url: 'https://ice1.somafm.com/illstreet-128-mp3', tag: 'lounge/retro' },
    { name: 'Boot Liquor', url: 'https://ice1.somafm.com/bootliquor-128-mp3', tag: 'americana/country' },
    { name: 'BAGeL Radio', url: 'https://ice1.somafm.com/bagel-128-mp3', tag: 'альтернатива/инди/андерграунд' },
    { name: 'Doomed', url: 'https://ice1.somafm.com/doomed-128-mp3', tag: 'dark/industrial/doom' },
    { name: 'PopTron', url: 'https://ice1.somafm.com/poptron-128-mp3', tag: 'electropop/synthpop' },
    { name: 'Cliqhop IDM', url: 'https://ice1.somafm.com/cliqhop-128-mp3', tag: 'idm/glitch' },
    { name: 'Digitalis', url: 'https://ice1.somafm.com/digitalis-128-mp3', tag: 'инди-электро/альт' },
    { name: 'Underground 80s', url: 'https://ice1.somafm.com/u80s-128-mp3', tag: 'андерграунд/80s/post-punk' },
    { name: 'Covers', url: 'https://ice1.somafm.com/covers-128-mp3', tag: 'каверы/разное' }
  ];

  const RADIO_CHIPS = [
    'jazz', 'lofi', 'ambient', 'rock', 'classical', 'chill', 'electronic', 'pop', 'metal', 'folk',
    'rap', 'hip-hop', 'trip-hop', 'alternative', 'indie', 'underground', 'punk', 'post-punk',
    'industrial', 'darkwave', 'goth', 'blues', 'breakcore', 'drum and bass', 'dubstep',
    'synthpop', 'vaporwave', 'funk', 'soul'
  ];

  let somaLoading = false;
  let somaLoadedFromApi = false;

  async function loadMoreSomaStations() {
    if (somaLoading) return;
    somaLoading = true;
    statusMsg = 'Загружаю станции SomaFM…';
    render();

    try {
      const res = await fetchTimeout('https://somafm.com/channels.json', 6000);
      if (!res.ok) throw new Error('soma_http');
      const data = await res.json();
      const chans = data && Array.isArray(data.channels) ? data.channels : [];
      let added = 0;

      chans.forEach(function (ch) {
        const pls = Array.isArray(ch.playlists) ? ch.playlists : [];
        let url = '';
        const mp3 = pls.find(function (p) {
          return p && p.format === 'mp3' && p.url && /128|highest|mp3/i.test(String(p.url));
        }) || pls.find(function (p) {
          return p && p.format === 'mp3' && p.url;
        });

        if (mp3 && mp3.url) url = mp3.url;
        if (!url && ch.id) url = 'https://ice1.somafm.com/' + ch.id + '-128-mp3';
        if (!url) return;

        const exists = SOMA_STATIONS.some(function (s) {
          return s.url === url || String(s.name).toLowerCase() === String(ch.title || ch.id).toLowerCase();
        });

        if (!exists) {
          SOMA_STATIONS.push({
            name: ch.title || ch.id || 'SomaFM',
            url: url,
            tag: String(ch.genre || ch.description || '').replace(/\s+/g, ' ').slice(0, 80)
          });
          added++;
        }
      });

      somaLoadedFromApi = true;
      statusMsg = added ? ('Добавлено станций: ' + added) : 'Все станции SomaFM уже загружены';
      dbg('soma', 'loaded', added, 'new stations');
    } catch (e) {
      statusMsg = 'Не удалось загрузить SomaFM';
      warn('soma load fail', e);
    }

    somaLoading = false;
    render();
  }

  const RP_LANGS = [
    { id: '', label: 'Любой' },
    { id: 'English', label: 'English' },
    { id: 'Russian', label: 'Русский' },
    { id: 'Japanese', label: '日本語' },
    { id: 'French', label: 'Français' },
    { id: 'German', label: 'Deutsch' },
    { id: 'Korean', label: '한국어' },
    { id: 'Chinese', label: '中文' },
    { id: 'Spanish', label: 'Español' },
    { id: 'Italian', label: 'Italiano' }
  ];

  const RP_GENRES = [
    { id: '', label: 'Любой' },
    { id: 'rock', label: 'Рок' },
    { id: 'pop', label: 'Поп' },
    { id: 'metal', label: 'Метал' },
    { id: 'jazz', label: 'Джаз' },
    { id: 'classical', label: 'Классика' },
    { id: 'electronic', label: 'Электроника' },
    { id: 'ambient', label: 'Эмбиент' },
    { id: 'lofi', label: 'Lo-fi' },
    { id: 'hip-hop', label: 'Хип-хоп' },
    { id: 'folk', label: 'Фолк' },
    { id: 'blues', label: 'Блюз' },
    { id: 'soundtrack', label: 'Саундтрек' },
    { id: 'indie', label: 'Инди' },
    { id: 'punk', label: 'Панк' },
    { id: 'meme', label: 'Мемы' }
];


  function isMemeGenre() {
    return cfg.rpGenre === 'meme';
  }

  function currentBg() {
    var b = cfg.bgByTheme && cfg.bgByTheme[theme];
    if (b && (b.base64 || b.url || typeof b.opacity === 'number')) return b;
    return null;
  }

  function applyBackground() {
    try {
      if (!root) return;
      var b = null;
      if (bgPending && (bgPending.base64 || bgPending.url)) {
        b = bgPending;
      } else {
        b = currentBg();
      }
      var img = b ? (b.base64 || b.url) : '';
      if (img) {
        root.style.backgroundImage = 'url("' + img + '")';
        root.style.backgroundSize = 'cover';
        root.style.backgroundPosition = 'center';
      } else {
        root.style.removeProperty('background-image');
        root.style.removeProperty('background-size');
        root.style.removeProperty('background-position');
      }
    } catch (e) {}
  }

  function applyBgToTheme(themeId, bgObj) {
    if (!themeId) return;
    if (bgObj && (bgObj.base64 || bgObj.url || typeof bgObj.opacity === 'number')) {
      cfg.bgByTheme[themeId] = {
        base64: bgObj.base64 || '',
        url: bgObj.url || '',
        opacity: (typeof bgObj.opacity === 'number') ? bgObj.opacity : undefined
      };
    } else {
      delete cfg.bgByTheme[themeId];
    }
    saveCfg();
    applyBackground();
    applyAccentVar();
  }

  function applyBgToAllThemes(bgObj) {
    THEMES.forEach(function (tm) {
      if (bgObj && (bgObj.base64 || bgObj.url || typeof bgObj.opacity === 'number')) {
        cfg.bgByTheme[tm] = {
          base64: bgObj.base64 || '',
          url: bgObj.url || '',
          opacity: (typeof bgObj.opacity === 'number') ? bgObj.opacity : undefined
        };
      } else {
        delete cfg.bgByTheme[tm];
      }
    });
    saveCfg();
    applyBackground();
    applyAccentVar();
  }

  function bgForApplyOrCurrent() {
    let b = null;

    if (bgPending && (bgPending.base64 || bgPending.url || typeof bgPending.opacity === 'number')) {
      b = JSON.parse(JSON.stringify(bgPending));
    } else {
      const cur = currentBg();
      if (cur && (cur.base64 || cur.url || typeof cur.opacity === 'number')) {
        b = JSON.parse(JSON.stringify(cur));
      }
    }

    if (!b) b = {};

    try {
      const inp = bodyEl && bodyEl.querySelector ? bodyEl.querySelector('[data-bg-url]') : null;
      const url = inp ? String(inp.value || '').trim() : '';
      if (url) {
        b.url = url;
        b.base64 = '';
      }
    } catch (_) {}

    if (bgPending && typeof bgPending.opacity === 'number') {
      b.opacity = bgPending.opacity;
    } else {
      const cur = currentBg();
      if (cur && typeof cur.opacity === 'number' && typeof b.opacity !== 'number') b.opacity = cur.opacity;
    }

    if (!(b.base64 || b.url || typeof b.opacity === 'number')) return null;
    return b;
  }

  function setBgPendingFromUrl(url) {
    url = (url || '').trim();
    if (url) bgPending = { base64: '', url: url };
    else bgPending = null;
  }

  function setBgPendingFromFile(file, cb) {
    if (!file) {
      bgPending = null;
      if (cb) cb();
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      bgPending = { base64: ev.target.result || '', url: '' };
      if (cb) cb();
    };
    reader.onerror = function (e) {
      if (cb) cb();
    };
    reader.readAsDataURL(file);
  }

  function currentTextColor() {
    var c = cfg.textColorByTheme && cfg.textColorByTheme[theme];
    if (validHex(c)) return normHex(c);
    if (validHex(cfg.textColor)) return normHex(cfg.textColor);
    return '';
  }

  function setTextColorForTheme(themeId, hex) {
    if (!themeId) return;
    if (hex && validHex(hex)) cfg.textColorByTheme[themeId] = normHex(hex);
    else delete cfg.textColorByTheme[themeId];
    saveCfg();
    applyTextColorVar();
  }

  function setTextColorForAll(hex) {
    THEMES.forEach(function (tm) {
      if (hex && validHex(hex)) cfg.textColorByTheme[tm] = normHex(hex);
      else delete cfg.textColorByTheme[tm];
    });
    saveCfg();
    applyTextColorVar();
  }

  function applyTextColorVar() {
    if (!root) return;
    var c = currentTextColor();
    if (c) root.style.setProperty('--rp-text', c);
    else root.style.removeProperty('--rp-text');
  }

  function isSolidTheme() {
    return !!(cfg.solidByTheme && cfg.solidByTheme[theme]);
  }

  function setSolidForTheme(themeId, on) {
    if (!themeId) return;
    if (on) cfg.solidByTheme[themeId] = true;
    else delete cfg.solidByTheme[themeId];
    saveCfg();
    applySolidClass();
  }

  function setSolidForAll(on) {
    THEMES.forEach(function (tm) {
      if (on) cfg.solidByTheme[tm] = true;
      else delete cfg.solidByTheme[tm];
    });
    saveCfg();
    applySolidClass();
  }

  function isSolidLightTheme() {
    return !!(cfg.solidLightByTheme && cfg.solidLightByTheme[theme]);
  }

  function setSolidLightForTheme(themeId, on) {
    if (!themeId) return;
    if (on) cfg.solidLightByTheme[themeId] = true;
    else delete cfg.solidLightByTheme[themeId];
    saveCfg();
    applySolidClass();
  }

  function setSolidLightForAll(on) {
    THEMES.forEach(function (tm) {
      if (on) cfg.solidLightByTheme[tm] = true;
      else delete cfg.solidLightByTheme[tm];
    });
    saveCfg();
    applySolidClass();
  }

  function applySolidClass() {
    if (!root) return;
    root.classList.remove(PFX + '-solid');
    root.classList.remove(PFX + '-solid-light');
    if (isSolidLightTheme()) root.classList.add(PFX + '-solid-light');
    else if (isSolidTheme()) root.classList.add(PFX + '-solid');
  }

  function playRadio(station) {
    currentPlayId++;
    trackEnded = false;
    stopAudio();
    stopYt();
    statusMsg = '';
    curIdx = -1;
    queue = [];
    saveQueue();

    audio.src = station.url;
    dbg('radio', 'play', station.name, station.url);

    audio.play().then(function () {
      isPlaying = true;
      window.__rpRadioNow = station;
      render();
    }).catch(function (e) {
      isPlaying = false;
      statusMsg = 'Радио недоступно';
      warn('radio play fail', station.name, e);
      render();
    });

    window.__rpRadioNow = station;
    render();
  }

  async function searchRadioBrowser(q) {
    statusMsg = 'Поиск радио…';
    radioResults = [];
    render();
    try {
      const base = 'https://de1.api.radio-browser.info/json/stations/search';
      let res, data;
      try {
        res = await fetch(base + '?limit=20&hidebroken=true&order=clickcount&reverse=true&tag=' + encodeURIComponent(q));
        data = await res.json();
      } catch (_) {
        data = [];
      }
      if (!data || !data.length) {
        res = await fetch(base + '?limit=20&hidebroken=true&order=clickcount&reverse=true&name=' + encodeURIComponent(q));
        data = await res.json();
      }
      radioResults = (data || []).filter(function (s) {
        return s.url_resolved;
      }).slice(0, 18).map(function (s) {
        return {
          name: s.name || 'станция',
          url: s.url_resolved,
          tag: (s.country || '') + (s.tags ? ' · ' + String(s.tags).split(',').slice(0, 2).join(',') : '')
        };
      });
      statusMsg = radioResults.length ? '' : 'Ничего не найдено';
      dbg('radio', 'browser search', q, '->', radioResults.length);
    } catch (e) {
      statusMsg = 'Ошибка поиска радио';
      warn('radio browser fail', e);
    }
    render();
  }

  let baibaiLoaded = false, baibaiLoading = false;

  function loadBaibai() {
    if (baibaiLoaded || baibaiLoading) return;
    if (window.Music && window.Music.SearchMusic) {
      baibaiLoaded = true;
      return;
    }
    baibaiLoading = true;
    try {
      const s = document.createElement('script');
      s.src = BAIBAI_JS;
      s.onload = function () {
        baibaiLoaded = true;
        baibaiLoading = false;
        dbg('baibai', 'loaded');
      };
      s.onerror = function () {
        baibaiLoading = false;
        warn('baibai load fail');
      };
      (document.head || document.documentElement).appendChild(s);
    } catch (_) {
      baibaiLoading = false;
    }
  }

  function saveQueue() {
    try { localStorage.setItem(LS_QUEUE, JSON.stringify({ queue: queue, curIdx: curIdx })); } catch (_) {}
  }

  function loadQueue() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_QUEUE) || '{}');
      if (Array.isArray(s.queue)) {
        queue = s.queue;
        curIdx = (typeof s.curIdx === 'number') ? s.curIdx : -1;
      }
    } catch (_) {}
  }

  function extractYtVideo(s) {
    s = String(s || '').trim();
    let m = s.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    return null;
  }

  function extractYtList(s) {
    s = String(s || '').trim();
    let m = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    return null;
  }

  function hasDash(s) {
    return /[-—–]/.test(String(s || ''));
  }

  function fetchWithCancel(url, options = {}, controller) {
    const opts = Object.assign({}, options);
    if (controller) opts.signal = controller.signal;
    return fetch(url, opts);
  }

  const Jamendo = {
    name: 'Jamendo',
    type: 'audio',
    async search(query, controller) {
      const url = 'https://api.jamendo.com/v3.0/tracks/?client_id=' + encodeURIComponent(jamKey()) +
        '&format=json&limit=1&audioformat=mp32&search=' + encodeURIComponent(query);
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      if (!data || !data.results || !data.results.length) return null;
      const t = data.results[0];
      return { kind: 'audio', url: t.audio, title: t.name, artist: t.artist_name, source: 'Jamendo' };
    },
    async searchMany(query, limit, offset, controller) {
      const url = 'https://api.jamendo.com/v3.0/tracks/?client_id=' + encodeURIComponent(jamKey()) +
        '&format=json&limit=' + (limit || 10) + '&offset=' + (offset || 0) + '&audioformat=mp32&order=popularity_total&namesearch=' + encodeURIComponent(query);
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      if (!data || !data.results || !data.results.length) return [];
      return data.results.filter(function (t) {
        return t.audio;
      }).map(function (t) {
        return { kind: 'audio', url: t.audio, title: t.name, artist: t.artist_name, source: 'Jamendo' };
      });
    }
  };

  const YouTubeAPI = {
    name: 'YouTube',
    type: 'yt',
    async searchNoKey(query, limit = 10) {
      const fallback = ['https://inv.thepixora.com', 'https://invidious.jing.rocks', 'https://yt.artemislena.eu', 'https://invidious.private.coffee'];
      let instances = cachedInvidious.length > 0 ? cachedInvidious : fallback;
      const pool = instances.sort(() => 0.5 - Math.random()).slice(0, 3);

      for (let url of pool) {
        try {
          const res = await fetchTimeout(`${url}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, 4000);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.slice(0, limit).map(it => ({
              kind: 'yt',
              ytid: it.videoId,
              title: it.title,
              artist: it.author || '',
              source: 'YouTube (NK)'
            }));
          }
        } catch (e) {
          warn('Invidious search fail on ' + url);
        }
      }
      return null;
    },
    async search(query, controller) {
      if (!cfg.ytKey || cfg.ytKey === DEFAULT_YT_KEY) {
        const results = await this.searchNoKey(query, 1);
        if (results && results[0]) return results[0];
      }

      const url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=1&q=' +
        encodeURIComponent(query) + '&key=' + encodeURIComponent(ytKey());
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      if (data && data.error) throw new Error('yt_api_error');
      if (!data || !data.items || !data.items.length) return null;
      const it = data.items[0];
      let title = (it.snippet.title || '');
      const ta = document.createElement('textarea');
      ta.innerHTML = title;
      title = ta.value;
      return { kind: 'yt', ytid: it.id.videoId, title: title, artist: it.snippet.channelTitle || '', source: 'YouTube' };
    },
    async searchMany(query, limit, offset, pageToken, controller) {
      if (!cfg.ytKey || cfg.ytKey === DEFAULT_YT_KEY) {
        const items = await this.searchNoKey(query, limit || 10);
        if (items) return { items: items, nextToken: null };
      }

      let url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&order=relevance&maxResults=' +
        (limit || 10) + '&q=' + encodeURIComponent(query) + '&key=' + encodeURIComponent(ytKey());
      if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      if (data && data.error) throw new Error('yt_api_error');
      if (!data || !data.items || !data.items.length) return { items: [], nextToken: null };
      const items = data.items.filter(function (it) {
        return it.id && it.id.videoId;
      }).map(function (it) {
        let title = (it.snippet.title || '');
        const ta = document.createElement('textarea');
        ta.innerHTML = title;
        title = ta.value;
        return { kind: 'yt', ytid: it.id.videoId, title: title, artist: it.snippet.channelTitle || '', source: 'YouTube' };
      });
      return { items: items, nextToken: data.nextPageToken || null };
    }
  };

  const YouTubeLink = {
    name: 'YT-ссылка',
    type: 'yt',
    async search(query) {
      const list = extractYtList(query);
      const vid = extractYtVideo(query);
      if (list) {
        return { kind: 'ytlist', ytlist: list, ytid: vid || null, title: 'YouTube плейлист', artist: 'list: ' + list.slice(0, 12), source: 'YT-ссылка' };
      }
      if (vid) {
        return { kind: 'yt', ytid: vid, title: 'YouTube видео', artist: vid, source: 'YT-ссылка' };
      }
      return null;
    },
    async searchMany(query) {
      const r = await this.search(query);
      return r ? [r] : [];
    }
  };

  const Baibai = {
    name: 'baibai',
    type: 'audio',
    async search(query) {
      loadBaibai();
      let tries = 0;
      while ((!window.Music || !window.Music.SearchMusic) && tries < 30) {
        await new Promise(function (r) { setTimeout(r, 100); });
        tries++;
      }
      if (!window.Music || !window.Music.SearchMusic) throw new Error('baibai not loaded');
      const r = await window.Music.SearchMusic(query, '');
      if (!r || !r.Url) return null;
      return { kind: 'audio', url: r.Url, title: r.Name || query, artist: r.Singer || '', source: 'baibai' };
    },
    async searchMany(query, limit, offset) {
      if (offset && offset > 0) return [];
      const r = await this.search(query);
      return r ? [r] : [];
    }
  };

  const CCMixter = {
    name: 'ccMixter',
    type: 'audio',
    async search(query, controller) {
      const arr = await this.searchMany(query, 1, 0, controller);
      return arr.length ? arr[0] : null;
    },
    async searchMany(query, limit, offset, controller) {
      const url = 'https://ccmixter.org/api/query?f=json&limit=' + (limit || 10) + '&offset=' + (offset || 0) + '&tags=' + encodeURIComponent(query) + '&sort=rank';
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return [];
      const out = [];
      data.forEach(function (t) {
        let mp3 = '';
        if (t.files && t.files.length) {
          const f = t.files.find(function (x) {
            return x.download_url && /mp3/i.test(x.file_name || x.download_url);
          }) || t.files[0];
          mp3 = f && f.download_url ? f.download_url : '';
        }
        if (mp3) out.push({ kind: 'audio', url: mp3, title: t.upload_name || query, artist: t.user_name || '', source: 'ccMixter' });
      });
      return out;
    }
  };

  const FMA = {
    name: 'FMA',
    type: 'audio',
    async search(query, controller) {
      const arr = await this.searchMany(query, 1, 0, controller);
      return arr.length ? arr[0] : null;
    },
    async searchMany(query, limit, offset, controller) {
      let url = 'https://freemusicarchive.org/api/get/tracks.json?api_key=&limit=' + (limit || 10) + '&search=' + encodeURIComponent(query);
      if (offset && offset > 0) url += '&page=' + (Math.floor(offset / (limit || 10)) + 1);
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      const arr = data && (data.dataset || data.aTracks || []);
      if (!arr || !arr.length) return [];
      const out = [];
      arr.forEach(function (t) {
        const mp3 = t.track_file_url || t.track_url || '';
        if (mp3) out.push({ kind: 'audio', url: mp3, title: t.track_title || query, artist: t.artist_name || '', source: 'FMA' });
      });
      return out;
    }
  };

  const ALL_SOURCES = [YouTubeAPI, Jamendo, Baibai, CCMixter, FMA];

  function srcByKey(key) {
    if (key === 'youtube') return YouTubeAPI;
    if (key === 'jamendo') return Jamendo;
    if (key === 'baibai') return Baibai;
    if (key === 'ccmixter') return CCMixter;
    if (key === 'fma') return FMA;
    if (key === 'ytlink') return YouTubeLink;
    return null;
  }

  async function fetchTimeout(url, ms = 4500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  async function getNetEaseStream(query) {
    try {
      const searchRes = await fetchTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=3&source=netease&name=${encodeURIComponent(query)}`);
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      if (!searchData || searchData.length === 0 || !searchData[0].id) return null;

      const urlRes = await fetchTimeout(`https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${searchData[0].id}`);
      if (!urlRes.ok) return null;
      const urlData = await urlRes.json();

      if (urlData && urlData.url && urlData.url.startsWith('http')) return urlData.url;
    } catch (e) {
      return null;
    }
    return null;
  }

  let cachedInvidious = [];
  let invFetchTime = 0;

  async function tryInvidiousStream(videoId) {
    const fallback = ['https://inv.thepixora.com', 'https://invidious.jing.rocks', 'https://yt.artemislena.eu', 'https://invidious.private.coffee'];
    let instances = fallback;

    if (cachedInvidious.length > 0 && Date.now() - invFetchTime < 3600000) {
      instances = cachedInvidious;
    } else {
      try {
        const res = await fetchTimeout('https://api.invidious.io/instances.json?sort_by=health', 3000);
        if (res.ok) {
          const data = await res.json();
          const valid = data.filter(function (d) {
            return d[1] && d[1].type === 'https' && d[1].api === true && d[1].cors === true && d[1].health > 50;
          }).map(function (d) {
            return d[1].uri;
          });
          if (valid.length > 0) {
            instances = valid;
            cachedInvidious = valid;
            invFetchTime = Date.now();
          }
        }
      } catch (e) {}
    }

    const pool = instances.sort(() => 0.5 - Math.random()).slice(0, 5);
    const promises = pool.map(async function (url) {
      const res = await fetchTimeout(`${url}/api/v1/videos/${videoId}`);
      if (!res.ok) throw new Error('bad http');
      const data = await res.json();
      if (data.adaptiveFormats) {
        const audio = data.adaptiveFormats.filter(function (f) {
          return f.type && f.type.startsWith('audio');
        });
        if (audio.length > 0) {
          const stream = audio.find(function (s) {
            return parseInt(s.bitrate || 0, 10) >= 120000;
          }) || audio[0];
          if (stream && stream.url) return stream.url;
        }
      }
      throw new Error('no stream');
    });

    return await Promise.any(promises).catch(function () { return null; });
  }
  let cachedPiped = [];
  let pipedFetchTime = 0;

  async function tryPipedStream(videoId) {
    const fallback = ['https://piapi.ggtyler.dev', 'https://pipedapi.tokhmi.xyz', 'https://pipedapi.kavin.rocks', 'https://api.piped.private.coffee'];
    let instances = fallback;

    if (cachedPiped.length > 0 && Date.now() - pipedFetchTime < 3600000) {
      instances = cachedPiped;
    } else {
      try {
        const res = await fetchTimeout('https://raw.githubusercontent.com/TeamPiped/Piped-Instances/main/instances.json', 3000);
        if (res.ok) {
          const data = await res.json();
          const valid = data.filter(function (i) {
            return i.api_url;
          }).map(function (i) {
            return i.api_url;
          });
          if (valid.length > 0) {
            instances = valid;
            cachedPiped = valid;
            pipedFetchTime = Date.now();
          }
        }
      } catch (e) {}
    }

    const pool = instances.sort(() => 0.5 - Math.random()).slice(0, 5);
    const promises = pool.map(async function (url) {
      const res = await fetchTimeout(`${url}/streams/${videoId}`);
      if (!res.ok) throw new Error('bad http');
      const data = await res.json();
      if (data.audioStreams && data.audioStreams.length > 0) {
        const stream = data.audioStreams.find(function (s) {
          return s.bitrate >= 120000;
        }) || data.audioStreams[0];
        if (stream && stream.url) return stream.url;
      }
      throw new Error('no stream');
    });

    return await Promise.any(promises).catch(function () { return null; });
  }

  async function getTrackAudioStream(track) {
    if (!track) return null;

    let query = (track.title || '') + ' ' + (track.artist || '');
    query = query.replace(/\b(official|music video|audio|hd|hq|lyrics|video)\b/gi, '').replace(/\s+/g, ' ').trim();

    if (query.length > 2) {
      dbg('stream', 'try NetEase for', query);
      const neteaseUrl = await getNetEaseStream(query);
      if (neteaseUrl) {
        dbg('stream', 'NetEase OK');
        return neteaseUrl;
      }
    }

    if (!track.ytid) return null;

    dbg('stream', 'try Invidious for', track.ytid);
    const invUrl = await tryInvidiousStream(track.ytid);
    if (invUrl) {
      dbg('stream', 'Invidious OK');
      return invUrl;
    }

    dbg('stream', 'try Piped for', track.ytid);
    const pipedUrl = await tryPipedStream(track.ytid);
    if (pipedUrl) {
      dbg('stream', 'Piped OK');
      return pipedUrl;
    }

    warn('all stream fallbacks failed for', track.ytid);
    return null;
  }

  function activeSource() {
    if (cfg.source === 'youtube') return YouTubeAPI;
    if (cfg.source === 'ytlink') return YouTubeLink;
    if (cfg.source === 'baibai') return Baibai;
    if (cfg.source === 'ccmixter') return CCMixter;
    if (cfg.source === 'fma') return FMA;
    return Jamendo;
  }
  function withTimeout(promise, ms, controller) {
    return Promise.race([
      promise,
      new Promise(function (_, rej) {
        const id = setTimeout(function () {
          rej(new Error('timeout'));
        }, ms);
        if (controller) {
          controller.signal.addEventListener('abort', function () {
            clearTimeout(id);
            rej(new Error('aborted'));
          });
        }
      })
    ]);
  }

  function dedupeResults(arr) {
    const seen = {};
    const out = [];
    arr.forEach(function (r) {
      const key = (r.kind === 'yt' ? r.ytid : r.url) || (r.title + '|' + r.artist);
      if (key && !seen[key]) {
        seen[key] = 1;
        out.push(r);
      }
    });
    return out;
  }

  async function srcMany(src, query, limit, offset, controller) {
    dbg('search', 'srcMany via', src.name, '| q=', query, '| off=', offset);
    if (src === YouTubeAPI) {
      const token = searchState.ytTokens[src.name] || null;
      const r = await withTimeout(src.searchMany(query, limit, offset, token, controller), 8000, controller);
      searchState.ytTokens[src.name] = r.nextToken;
      return r.items || [];
    }
    return await withTimeout(src.searchMany(query, limit, offset, controller), 8000, controller);
  }

  async function searchOneSource(src, query) {
    searching = true;
    statusMsg = 'Поиск…';
    resultsRp = false;
    render();
    dbg('search', 'searchOneSource via', src.name, '| q=', query);
    searchAbortController = new AbortController();
    try {
      const r = await withTimeout(src.search(query, searchAbortController), 8000, searchAbortController);
      if (r) {
        results = [r];
        resultsTitle = src.name + ' · трек';
        statusMsg = '';
        searching = false;
        queue.push(r);
        saveQueue();
        playIndex(queue.length - 1);
        return;
      }
      statusMsg = 'Не найдено: ' + query;
    } catch (e) {
      if (e.message === 'aborted') statusMsg = 'Поиск отменён';
      else { statusMsg = src.name + ': ошибка'; warn('searchOneSource error', src.name, e); }
    }
    searching = false;
    searchAbortController = null;
    render();
  }

  async function topOneSource(src, query) {
    searching = true;
    statusMsg = 'Ищу: ' + src.name + '…';
    results = [];
    resultsRp = false;
    render();
    dbg('search', 'topOneSource via', src.name, '| q=', query);
    searchState = { query: query, scope: 'src', srcIdx: 0, offsets: {}, ytTokens: {}, exhausted: false };
    searchAbortController = new AbortController();
    try {
      const arr = await srcMany(src, query, 10, 0, searchAbortController);
      searchState.offsets[src.name] = 10;
      results = dedupeResults(arr).slice(0, 50);
      resultsTitle = src.name + ' · «' + query + '»';
      statusMsg = results.length ? '' : 'Ничего не найдено';
    } catch (e) {
      if (e.message === 'aborted') statusMsg = 'Поиск отменён';
      else { statusMsg = src.name + ': ошибка'; warn('topOneSource error', src.name, e); }
    }
    searching = false;
    searchAbortController = null;
    render();
  }

  async function moreOneSource() {
    const src = activeSource();
    if (src === YouTubeLink) return;
    searching = true;
    statusMsg = 'Ищу ещё: ' + src.name + '…';
    render();
    searchAbortController = new AbortController();
    try {
      const off = searchState.offsets[src.name] || 0;
      const arr = await srcMany(src, searchState.query, 5, off, searchAbortController);
      searchState.offsets[src.name] = off + 5;
      const before = results.length;
      results = dedupeResults(results.concat(arr)).slice(0, 200);
      statusMsg = (results.length > before) ? '' : 'Больше нет результатов';
      if (results.length === before) searchState.exhausted = true;
    } catch (e) {
      if (e.message === 'aborted') statusMsg = 'Поиск отменён';
      else { statusMsg = src.name + ': ошибка'; warn('moreOneSource error', e); }
    }
    searching = false;
    searchAbortController = null;
    render();
  }

  async function findExactAll(query) {
    searching = true;
    statusMsg = 'Общий поиск…';
    results = [];
    resultsRp = false;
    render();
    searchAbortController = new AbortController();
    for (let k = 0; k < ALL_SOURCES.length; k++) {
      const src = ALL_SOURCES[k];
      statusMsg = 'Ищу: ' + src.name + '…';
      render();
      try {
        const r = await withTimeout(src.search(query, searchAbortController), 6000, searchAbortController);
        if (r) {
          results = [r];
          resultsTitle = src.name + ' · трек';
          statusMsg = '';
          searching = false;
          queue.push(r);
          saveQueue();
          playIndex(queue.length - 1);
          return;
        }
      } catch (e) {
        if (e.message === 'aborted') {
          statusMsg = 'Поиск отменён';
          searching = false;
          searchAbortController = null;
          render();
          return;
        }
        warn('findExactAll error', src.name, e);
      }
    }
    statusMsg = 'Нигде не найдено: ' + query;
    searching = false;
    searchAbortController = null;
    render();
  }

  async function topAll(query) {
    searching = true;
    statusMsg = 'Собираю результаты…';
    results = [];
    resultsRp = false;
    render();
    searchState = { query: query, scope: 'all', srcIdx: 0, offsets: {}, ytTokens: {}, exhausted: false };
    searchAbortController = new AbortController();
    let acc = [];
    for (let k = 0; k < ALL_SOURCES.length; k++) {
      const src = ALL_SOURCES[k];
      statusMsg = 'Ищу: ' + src.name + '…';
      render();
      try {
        const arr = await srcMany(src, query, 5, 0, searchAbortController);
        searchState.offsets[src.name] = 5;
        if (arr && arr.length) {
          acc = dedupeResults(acc.concat(arr));
          results = acc.slice(0, 200);
          render();
        }
      } catch (e) {
        if (e.message === 'aborted') {
          statusMsg = 'Поиск отменён';
          searching = false;
          searchAbortController = null;
          render();
          return;
        }
        warn('topAll error', src.name, e);
      }
    }
    results = acc.slice(0, 200);
    resultsTitle = '«' + query + '» (везде)';
    statusMsg = results.length ? '' : 'Нигде не найдено: ' + query;
    searching = false;
    searchAbortController = null;
    render();
  }

  async function moreAll() {
    searching = true;
    statusMsg = 'Ищу ещё…';
    render();
    searchAbortController = new AbortController();
    let acc = results.slice();
    const before = acc.length;
    for (let k = 0; k < ALL_SOURCES.length; k++) {
      const src = ALL_SOURCES[k];
      statusMsg = 'Ищу: ' + src.name + '…';
      render();
      try {
        const off = searchState.offsets[src.name] || 0;
        const arr = await srcMany(src, searchState.query, 5, off, searchAbortController);
        searchState.offsets[src.name] = off + 5;
        if (arr && arr.length) acc = dedupeResults(acc.concat(arr));
      } catch (e) {
        if (e.message === 'aborted') {
          statusMsg = 'Поиск отменён';
          searching = false;
          searchAbortController = null;
          render();
          return;
        }
        warn('moreAll error', src.name, e);
      }
    }
    results = acc.slice(0, 200);
    statusMsg = (results.length > before) ? '' : 'Больше нет результатов';
    if (results.length === before) searchState.exhausted = true;
    searching = false;
    searchAbortController = null;
    render();
  }

  function searchMore() {
    if (searchState.scope === 'all') moreAll();
    else moreOneSource();
  }

  function runSearch(query, scope) {
    if (!query) return;
    const exact = hasDash(query);
    dbg('search', 'runSearch | scope=', scope, '| source=', cfg.source, '| exact=', exact, '| q=', query);
    if (scope === 'all') {
      if (cfg.source === 'ytlink') {
        searchOneSource(YouTubeLink, query);
        return;
      }
      if (exact) findExactAll(query);
      else topAll(query);
    } else {
      const src = activeSource();
      dbg('search', 'scope=src -> activeSource=', src.name);
      if (src === YouTubeLink) {
        searchOneSource(src, query);
        return;
      }
      if (exact) searchOneSource(src, query);
      else topOneSource(src, query);
    }
  }

  function cancelSearch() {
    if (searchAbortController) {
      searchAbortController.abort();
      searchAbortController = null;
    }
    searching = false;
    statusMsg = 'Поиск отменён';
    render();
  }

  function clearSearch() {
    if (resultsRp && Array.isArray(results) && results.length) {
      results.forEach(function (t) {
        if (t) {
          t._rpSuggestedChat = t._rpSuggestedChat || getChatId();
          markRpRejected(t);
        }
      });
    }

    results = [];
    resultsTitle = '';
    resultsRp = false;
    statusMsg = 'Найдите трек';
    searching = false;
    searchState = { query: '', scope: 'all', srcIdx: 0, offsets: {}, ytTokens: {}, exhausted: false };

    if (searchAbortController) {
      searchAbortController.abort();
      searchAbortController = null;
    }

    render();
  }

  function enqueueResult(r, play) {
    const copy = JSON.parse(JSON.stringify(r));

    if (resultsRp) {
      copy._rpSuggestedChat = getChatId();
      if (copy.why && !copy._rpWhy) copy._rpWhy = copy.why;
    }

    queue.push(copy);
    saveQueue();

    if (resultsRp) {
      addToRpPlaylist(copy);
      clearRpPulse();
    }

    if (play) playIndex(queue.length - 1);
    else render();
  }

  function rpSourceOrder() {
    if (cfg.rpSource === 'youtube') return [YouTubeAPI];
    if (cfg.rpSource === 'jamendo') return [Jamendo];
    if (cfg.rpSource === 'baibai') return [Baibai];
    return ALL_SOURCES;
  }

  async function findTrackForRp(query, controller, extraAvoidSigs) {
    const order = rpSourceOrder();
    dbg('rp', 'findTrackForRp via', order.map(function (s) { return s.name; }).join(','), '| q=', query);

    for (let k = 0; k < order.length; k++) {
      const src = order[k];

      try {
        let candidates = [];

        if (src === YouTubeAPI) {
          const r = await withTimeout(src.searchMany(query, 6, 0, null, controller), 7000, controller);
          candidates = r && r.items ? r.items : [];
        } else if (src.searchMany) {
          candidates = await withTimeout(src.searchMany(query, 6, 0, controller), 7000, controller);
        } else {
          const one = await withTimeout(src.search(query, controller), 7000, controller);
          candidates = one ? [one] : [];
        }

        for (let i = 0; i < candidates.length; i++) {
          const r = candidates[i];
          if (!r) continue;
          if (isRpAvoidedCandidate(r, extraAvoidSigs)) continue;
          return r;
        }
      } catch (e) {
        if (e.message === 'aborted') throw e;
        warn('findTrackForRp src error', src.name, e);
      }
    }

    return null;
  }

  function isYtTrack(t) {
    return t && (t.kind === 'yt' || t.kind === 'ytlist');
  }

  function curTrack() {
    return curIdx >= 0 ? queue[curIdx] : null;
  }

  const badYtIds = {};
  const badStreamUrls = {};

  function cleanTrackText(s) {
    return String(s || '')
      .replace(/\b(official|music video|audio|hd|hq|lyrics|video|visualizer|remaster(ed)?|full album)\b/gi, ' ')
      .replace(/[()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function trackQuery(t) {
    if (!t) return '';
    const a = cleanTrackText(t.artist || '');
    const ti = cleanTrackText(t.title || '');
    if (a && ti) return a + ' — ' + ti;
    return (ti || a || '').trim();
  }

  function mediaKey(t) {
    if (!t) return '';
    if (t.ytid) return 'yt:' + t.ytid;
    if (t.url) return 'url:' + t.url;
    return 'txt:' + cleanTrackText((t.artist || '') + '|' + (t.title || '')).toLowerCase();
  }

  function markBadMedia(t) {
    if (!t) return;
    if (t.ytid) badYtIds[t.ytid] = Date.now();
    if (t.url) badStreamUrls[t.url] = Date.now();
  }

  function isBadMedia(t) {
    if (!t) return false;
    if (t.ytid && badYtIds[t.ytid]) return true;
    if (t.url && badStreamUrls[t.url]) return true;
    return false;
  }

  function isProbablyYtBacked(t) {
    if (!t) return false;
    if (t.ytid) return true;
    const s = String(t.source || '') + ' ' + String(t.url || '');
    return /youtube|youtu\.be|invidious|piped|nk/i.test(s);
  }

  async function sourceManyDirect(src, query, limit, controller) {
    if (!src || src === YouTubeLink) return [];
    if (src === YouTubeAPI) {
      const r = await withTimeout(src.searchMany(query, limit || 6, 0, null, controller), 7500, controller);
      return r && r.items ? r.items : [];
    }
    return await withTimeout(src.searchMany(query, limit || 6, 0, controller), 7500, controller);
  }

  async function findReplacementForTrack(track, controller) {
    if (!track) return null;

    const baseQ = trackQuery(track);
    const queries = [];
    if (baseQ) queries.push(baseQ);
    if (track.title && track.artist) queries.push(cleanTrackText(track.title + ' ' + track.artist));
    if (track.title) queries.push(cleanTrackText(track.title));

    const seenQ = {};
    const uniqQueries = queries.filter(function (q) {
      q = String(q || '').trim();
      if (!q || seenQ[q.toLowerCase()]) return false;
      seenQ[q.toLowerCase()] = 1;
      return true;
    });

    const sourceOrder = [Jamendo, Baibai, CCMixter, FMA, YouTubeAPI];
    const originalKey = mediaKey(track);

    for (let qi = 0; qi < uniqQueries.length; qi++) {
      const q = uniqQueries[qi];

      for (let si = 0; si < sourceOrder.length; si++) {
        const src = sourceOrder[si];
        let arr = [];

        try {
          arr = await sourceManyDirect(src, q, 6, controller);
        } catch (e) {
          if (e && e.message === 'aborted') throw e;
          arr = [];
        }

        for (let i = 0; i < arr.length; i++) {
          const cand = arr[i];
          if (!cand) continue;
          if (mediaKey(cand) === originalKey) continue;
          if (isBadMedia(cand)) continue;

          if (cand.kind === 'audio' && cand.url) {
            cand._replacementFor = originalKey;
            return cand;
          }

          if (cand.kind === 'yt' && cand.ytid) {
            const streamUrl = await getTrackAudioStream(cand);
            if (streamUrl) {
              return {
                kind: 'audio',
                url: streamUrl,
                title: cand.title,
                artist: cand.artist,
                source: (cand.source || 'YouTube') + ' → audio',
                ytid: cand.ytid,
                _replacementFor: originalKey
              };
            }

            const okEmbed = await checkYtEmbedAllowed(cand.ytid);
            if (okEmbed) {
              cand._replacementFor = originalKey;
              return cand;
            }

            markBadMedia(cand);
          }
        }
      }
    }

    return null;
  }

  async function replaceOrSkipTrack(i, oldTrack, playId, reason) {
    if (playId !== currentPlayId) return;
    markBadMedia(oldTrack);

    statusMsg = reason || 'Трек недоступен, ищу замену…';
    render();

    let repl = null;
    try {
      repl = await findReplacementForTrack(oldTrack, null);
    } catch (_) {
      repl = null;
    }

    if (playId !== currentPlayId) return;
    if (i < 0 || i >= queue.length) return;

    if (repl) {
      repl._autoReplacement = true;
      queue[i] = repl;
      saveQueue();
      statusMsg = 'Нашла рабочую замену…';
      render();
      playIndex(i);
      return;
    }

    if (queue.length > 1) {
      statusMsg = 'Трек недоступен, пропускаю…';
      render();
      nextTrack();
      return;
    }

    stopAudio();
    stopYt();
    isPlaying = false;
    statusMsg = 'Трек недоступен, замена не найдена';
    render();
  }

  function ytEmbedSrc(t) {
    if (!t) return '';
    let origin = '';
    try { origin = window.location.origin || ''; } catch (_) {}
    const q = '?autoplay=1&playsinline=1&rel=0&enablejsapi=1' + (origin ? '&origin=' + encodeURIComponent(origin) : '');
    if (t.kind === 'ytlist') {
      return 'https://www.youtube.com/embed/' + (t.ytid || 'videoseries') + q + '&listType=playlist&list=' + encodeURIComponent(t.ytlist);
    }
    return 'https://www.youtube.com/embed/' + encodeURIComponent(t.ytid) + q;
  }

  let ytApiPromise = null;

  function ensureYtIframeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise(function (resolve, reject) {
      const old = window.onYouTubeIframeAPIReady;
      let done = false;

      window.onYouTubeIframeAPIReady = function () {
        done = true;
        try {
          if (typeof old === 'function') old();
        } catch (_) {}
        resolve();
      };

      try {
        const exists = document.querySelector('script[src*="youtube.com/iframe_api"]');
        if (!exists) {
          const s = document.createElement('script');
          s.src = 'https://www.youtube.com/iframe_api';
          s.onerror = function () {
            if (!done) reject(new Error('yt_iframe_api_load'));
          };
          (document.head || document.documentElement).appendChild(s);
        }
      } catch (e) {
        reject(e);
      }

      setTimeout(function () {
        if (window.YT && window.YT.Player) resolve();
        else if (!done) reject(new Error('yt_iframe_api_timeout'));
      }, 5000);
    });

    return ytApiPromise;
  }

  async function checkYtEmbedAllowed(videoId) {
    if (!videoId) return false;

    try {
      await ensureYtIframeApi();
    } catch (_) {
      return true;
    }

    return await new Promise(function (resolve) {
      let done = false;
      let player = null;

      const holder = document.createElement('div');
      holder.style.position = 'fixed';
      holder.style.left = '-9999px';
      holder.style.top = '-9999px';
      holder.style.width = '1px';
      holder.style.height = '1px';
      holder.style.opacity = '0';
      holder.style.pointerEvents = 'none';
      document.body.appendChild(holder);

      function finish(ok) {
        if (done) return;
        done = true;
        try {
          if (player && player.destroy) player.destroy();
        } catch (_) {}
        try { holder.remove(); } catch (_) {}
        resolve(!!ok);
      }

      try {
        player = new window.YT.Player(holder, {
          width: '1',
          height: '1',
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin || undefined
          },
          events: {
            onReady: function () {
              try {
                if (player && player.mute) player.mute();
                if (player && player.playVideo) player.playVideo();
              } catch (_) {}

              setTimeout(function () {
                finish(true);
              }, 1800);
            },
            onStateChange: function () {
              setTimeout(function () {
                finish(true);
              }, 300);
            },
            onError: function (ev) {
              const code = ev && typeof ev.data !== 'undefined' ? Number(ev.data) : 0;
              if ([2, 5, 100, 101, 150, 153].indexOf(code) >= 0) finish(false);
              else finish(false);
            }
          }
        });
      } catch (_) {
        finish(true);
      }

      setTimeout(function () {
        finish(true);
      }, 3500);
    });
  }

  function stopAudio() {
    try { audio.pause(); } catch (_) {}
  }

  function stopYt() {
    ytCurrentEmbed = null;
  }

  function fallbackToYtIframe(t) {
    stopAudio();
    isPlaying = true;
    statusMsg = '';
    ytCurrentEmbed = ytEmbedSrc(t);
    render();
  }

  async function playIndex(i) {
    if (i < 0 || i >= queue.length) return;

    curIdx = i;
    trackEnded = false;
    saveQueue();

    const t = queue[i];
    statusMsg = '';
    audioCurrentTime = 0;
    audioDuration = 0;
    currentPlayId++;
    const playId = currentPlayId;

    try { window.__rpRadioNow = null; } catch (_) {}

    if (t.kind === 'yt') {
      stopAudio();
      stopYt();
      isPlaying = false;
      statusMsg = 'Проверяю аудио YouTube…';
      render();

      const streamUrl = await getTrackAudioStream(t);
      if (playId !== currentPlayId) return;

      if (streamUrl) {
        statusMsg = '';
        audio.src = streamUrl;
        audio.play().then(function () {
          if (playId !== currentPlayId) return;
          isPlaying = true;
          render();
        }).catch(async function () {
          if (playId !== currentPlayId) return;
          markBadMedia({ url: streamUrl, ytid: t.ytid });

          statusMsg = 'Аудиопоток умер, проверяю YouTube embed…';
          render();

          const embedOk = await checkYtEmbedAllowed(t.ytid);
          if (playId !== currentPlayId) return;

          if (embedOk) {
            statusMsg = 'Аудио недоступно, запускаю YouTube-плеер…';
            render();
            fallbackToYtIframe(t);
          } else {
            await replaceOrSkipTrack(i, t, playId, 'YouTube запретил воспроизведение, ищу другой трек…');
          }
        });
        render();
        return;
      }

      statusMsg = 'Аудио не вытащилось, проверяю YouTube embed…';
      render();

      const embedOk = await checkYtEmbedAllowed(t.ytid);
      if (playId !== currentPlayId) return;

      if (embedOk) {
        statusMsg = 'Аудио недоступно, запускаю YouTube-плеер…';
        render();
        fallbackToYtIframe(t);
      } else {
        await replaceOrSkipTrack(i, t, playId, 'YouTube запретил embed, ищу замену…');
      }

      return;
    }

    if (t.kind === 'ytlist') {
      fallbackToYtIframe(t);
      return;
    }

    stopYt();

    if (!t.url) {
      await replaceOrSkipTrack(i, t, playId, 'У трека нет аудио-ссылки, ищу замену…');
      return;
    }

    audio.src = t.url;

    audio.play().then(function () {
      if (playId !== currentPlayId) return;
      isPlaying = true;
      statusMsg = '';
      render();
    }).catch(async function () {
      if (playId !== currentPlayId) return;

      markBadMedia(t);

      if (isProbablyYtBacked(t)) statusMsg = 'Поток устарел, заново ищу через Invidious/Piped/фолбэки…';
      else statusMsg = 'Ошибка потока, ищу рабочую замену…';
      render();

      const repl = await findReplacementForTrack(t, null);
      if (playId !== currentPlayId) return;

      if (repl) {
        queue[i] = repl;
        saveQueue();
        playIndex(i);
        return;
      }

      isPlaying = false;
      statusMsg = 'Ошибка воспроизведения';
      render();
    });

    render();
  }

  function togglePlay() {
    if (curIdx < 0) {
      if (window.__rpRadioNow) {
        if (isPlaying || !audio.paused) {
          try { audio.pause(); } catch (_) {}
          isPlaying = false;
          updatePlayBtn();
        } else {
          audio.play().then(function () {
            isPlaying = true;
            updatePlayBtn();
          }).catch(function () {
            isPlaying = false;
            statusMsg = 'Радио недоступно';
            render();
          });
        }
        return;
      }

      statusMsg = 'Сначала найдите трек';
      render();
      return;
    }

    const t = queue[curIdx];

    if (isYtTrack(t) && ytCurrentEmbed) {
      statusMsg = '';
      return;
    }

    if (isPlaying || !audio.paused) {
      try { audio.pause(); } catch (_) {}
      isPlaying = false;
      updatePlayBtn();
      return;
    }

    trackEnded = false;

    if (audio.src && !isYtTrack(t)) {
      audio.play().then(function () {
        isPlaying = true;
        updatePlayBtn();
      }).catch(function () {
        playIndex(curIdx);
      });
      return;
    }

    playIndex(curIdx);
  }

  function nextTrack() {
    if (queue.length) playIndex((curIdx + 1) % queue.length);
  }

  function prevTrack() {
    if (queue.length) playIndex((curIdx - 1 + queue.length) % queue.length);
  }

  function removeFromQueue(i) {
    if (i < 0 || i >= queue.length) return;

    const removed = queue[i];
    const wasCur = (i === curIdx);

    if (removed && removed._rpSuggestedChat === getChatId()) markRpRejected(removed);

    queue.splice(i, 1);
    if (removed) markGlobalDislike(removed);

    if (i < curIdx) {
      curIdx--;
    } else if (wasCur) {
      currentPlayId++;

      if (queue.length === 0) {
        curIdx = -1;
        stopAudio();
        stopYt();

        try {
          audio.removeAttribute('src');
          audio.load();
        } catch (_) {}

        isPlaying = false;
        statusMsg = 'Очередь пуста';
        saveQueue();
        render();
        return;
      } else {
        if (curIdx >= queue.length) curIdx = 0;
        saveQueue();
        playIndex(curIdx);
        return;
      }
    }

    saveQueue();
    render();
  }

  function clearQueue() {
    if (!queue.length) return;

    currentPlayId++;

    queue.forEach(function (t) {
      if (t && t._rpSuggestedChat === getChatId()) markRpRejected(t);
    });

    queue = [];
    curIdx = -1;
    stopAudio();
    stopYt();

    try {
      audio.removeAttribute('src');
      audio.load();
    } catch (_) {}

    isPlaying = false;
    statusMsg = 'Очередь очищена';
    saveQueue();
    render();
  }
  function renameItem(i) {
    if (i < 0 || i >= queue.length) return;
    const cur = queue[i].title || '';
    let nv = null;
    try { nv = window.prompt('Название:', cur); } catch (_) {}
    if (nv !== null && String(nv).trim()) {
      queue[i].title = String(nv).trim();
      saveQueue();
      render();
    }
  }

  function flashPlaylist(id) {
    flashPlId = id;
    render();
    setTimeout(function () {
      flashPlId = null;
      render();
    }, 1200);
  }

  function addTrackToManual(plId, track) {
    const p = lib.manual.find(function (x) { return x.id === plId; });
    if (!p || !track) return;

    if (!Array.isArray(p.tracks)) p.tracks = [];

    const copy = JSON.parse(JSON.stringify(track));
    if (resultsRp) {
      copy._rpSuggestedChat = getChatId();
      if (copy.why && !copy._rpWhy) copy._rpWhy = copy.why;
    }

    p.tracks.push(copy);
    saveLib();
    flashPlaylist(plId);
  }

  function createManualFromQueue() {
    if (!queue.length) {
      statusMsg = 'Очередь пуста';
      render();
      return;
    }
    let nm = null;
    try { nm = window.prompt('Название плейлиста:', 'Мой плейлист'); } catch (_) {}
    if (nm === null || !String(nm).trim()) return;
    lib.manual.push({ id: 'm' + Date.now(), name: String(nm).trim(), tracks: JSON.parse(JSON.stringify(queue)) });
    saveLib();
    render();
  }

  function createManualFromTrack(track) {
    if (!track) return;

    let nm = null;
    try { nm = window.prompt('Название нового плейлиста:', 'Мой плейлист'); } catch (_) {}

    if (nm === null || !String(nm).trim()) return;

    const copy = JSON.parse(JSON.stringify(track));
    if (resultsRp) {
      copy._rpSuggestedChat = getChatId();
      if (copy.why && !copy._rpWhy) copy._rpWhy = copy.why;
    }

    lib.manual.push({
      id: 'm' + Date.now(),
      name: String(nm).trim(),
      tracks: [copy]
    });

    saveLib();
    render();
  }

  function saveCurrentAsRp() {
    if (!queue.length) {
      statusMsg = 'Очередь пуста';
      render();
      return;
    }

    const cid = getChatId();
    if (!lib.rp[cid]) lib.rp[cid] = { name: getChatName() + ' ' + dateStamp(), tracks: [] };

    lib.rp[cid].tracks = JSON.parse(JSON.stringify(queue)).map(function (t) {
      if (t && t._rpSuggestedChat === undefined && resultsRp) t._rpSuggestedChat = cid;
      return t;
    });

    saveLib();
    render();
  }

  function addToRpPlaylist(track) {
    if (!track) return;

    const cid = getChatId();
    if (!lib.rp[cid]) lib.rp[cid] = { name: getChatName() + ' ' + dateStamp(), tracks: [] };
    if (!Array.isArray(lib.rp[cid].tracks)) lib.rp[cid].tracks = [];

    const copy = JSON.parse(JSON.stringify(track));
    copy._rpSuggestedChat = cid;
    if (copy.why && !copy._rpWhy) copy._rpWhy = copy.why;

    const sig = rpTrackSig(copy);

    const exists = lib.rp[cid].tracks.some(function (x) {
      const xsig = rpTrackSig(x);
      if (sig && xsig && sig === xsig) return true;

      if (x.kind === 'yt' && copy.kind === 'yt' && x.ytid && copy.ytid) return x.ytid === copy.ytid;
      if (x.url && copy.url) return x.url === copy.url;

      return false;
    });

    if (!exists) {
      lib.rp[cid].tracks.push(copy);
      saveLib();
    }
  }

  function loadPlaylist(tracks) {
    if (!Array.isArray(tracks) || !tracks.length) return;

    stopAudio();
    stopYt();

    queue = JSON.parse(JSON.stringify(tracks));
    curIdx = -1;
    saveQueue();

    playIndex(0);
  }

  function openManualEditor(id) {
    editId = id;
    editKind = 'm';
    exportPop = null;
    libOpen = true;
    searchOpen = false;
    radioOpen = false;
    rpOpen = false;
    plOpen = false;
    scrollMemory.lib = 0;
    render();
  }

  function openRpEditor(cid) {
    editId = cid;
    editKind = 'rp';
    exportPop = null;
    libOpen = true;
    searchOpen = false;
    radioOpen = false;
    rpOpen = false;
    plOpen = false;
    scrollMemory.lib = 0;
    render();
  }

  function openFavEditor() {
    editKind = 'fav';
    editId = '__fav__';
    exportPop = null;
    libOpen = true;
    searchOpen = false;
    radioOpen = false;
    rpOpen = false;
    plOpen = false;
    scrollMemory.lib = 0;
    render();
  }

  function renamePlaylistManual(id) {
    const p = lib.manual.find(function (x) { return x.id === id; });
    if (!p) return;
    let nv = null;
    try { nv = window.prompt('Название плейлиста:', p.name); } catch (_) {}
    if (nv !== null && String(nv).trim()) {
      p.name = String(nv).trim();
      saveLib();
      render();
    }
  }

  function renamePlaylistRp(cid) {
    const p = lib.rp[cid];
    if (!p) return;
    let nv = null;
    try { nv = window.prompt('Название плейлиста:', p.name); } catch (_) {}
    if (nv !== null && String(nv).trim()) {
      p.name = String(nv).trim();
      saveLib();
      render();
    }
  }

  function deleteManual(id) {
    lib.manual = lib.manual.filter(function (p) { return p.id !== id; });
    saveLib();
    render();
  }

  function deleteRp(cid) {
    delete lib.rp[cid];
    saveLib();
    render();
  }

  function deleteFavorites() {
    lib.favorites = [];
    saveLib();
    render();
  }

  function deleteTrackFromManual(plId, idx) {
    const p = lib.manual.find(function (x) { return x.id === plId; });
    if (!p || !Array.isArray(p.tracks)) return;

    const removed = p.tracks[idx];
    if (removed && removed._rpSuggestedChat === getChatId()) markRpRejected(removed);

    p.tracks.splice(idx, 1);
    saveLib();
    if (removed) markGlobalDislike(removed);
    render();
  }

  function deleteTrackFromRp(cid, idx) {
    const p = lib.rp[cid];
    if (!p || !Array.isArray(p.tracks)) return;

    const removed = p.tracks[idx];
    if (cid === getChatId() && removed) markRpRejected(removed);

    p.tracks.splice(idx, 1);
    saveLib();
    if (removed) markGlobalDislike(removed);
    render();
  }

  function deleteTrackFromFav(idx) {
    if (idx < 0 || idx >= lib.favorites.length) return;
    const removed = lib.favorites[idx];
    lib.favorites.splice(idx, 1);
    saveLib();
    if (removed) markGlobalDislike(removed);
    render();
  }

  function clearRpPulse() {
    if (rpPulse) {
      rpPulse = false;
      if (root) root.classList.remove(PFX + '-pulse');
    }
  }

  function setRpPulse() {
    rpPulse = true;
    if (root) root.classList.add(PFX + '-pulse');
  }

  function getProfiles() {
    const c = stContext();
    if (!c) return [];
    try {
      const cm = c.extensionSettings && c.extensionSettings.connectionManager;
      if (cm && Array.isArray(cm.profiles)) return cm.profiles;
    } catch (_) {}
    return [];
  }

  function selectedProfileId() {
    if (cfg.rpProfile) return cfg.rpProfile;
    const c = stContext();
    try {
      const cm = c && c.extensionSettings && c.extensionSettings.connectionManager;
      if (cm && cm.selectedProfile) return cm.selectedProfile;
    } catch (_) {}
    return '';
  }

  function profileExists(id) {
    if (!id) return false;
    return getProfiles().some(function (x) { return x.id === id; });
  }

  function profileName(id) {
    if (!id) return 'Текущий профиль';
    const p = getProfiles().find(function (x) { return x.id === id; });
    return p ? (p.name || id) : 'Текущий профиль';
  }

  function getRecentMessages(n) {
    const c = stContext();
    if (!c || !Array.isArray(c.chat)) return [];
    const arr = c.chat.filter(function (m) {
      return m && !m.is_system && typeof m.mes === 'string' && m.mes.trim();
    });
    const slice = arr.slice(-n);
    return slice.map(function (m) {
      const who = m.is_user ? 'User' : (m.name || 'Char');
      let txt = String(m.mes).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cfg.rpTokenLimitOn) {
        const maxChars = Math.max(200, (cfg.rpTokenLimit || 4000) * 3);
        if (txt.length > maxChars) txt = txt.slice(-maxChars);
      }
      return who + ': ' + txt;
    });
  }

  function langLine() {
    let lang = cfg.rpLang;
    if (lang === 'custom') lang = (cfg.rpLangCustom || '').trim();
    if (!lang) return '';
    return '- Prefer tracks with lyrics in ' + lang + '.';
  }

  function genreValue() {
    let g = cfg.rpGenre;
    if (g === 'custom') g = (cfg.rpGenreCustom || '').trim();
    return g || '';
  }

  function normTrackPart(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/&amp;/g, '&')
      .replace(/\b(official|music video|audio|hd|hq|lyrics|video|visualizer|remaster(ed)?|feat\.?|ft\.)\b/gi, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function rpTrackSigFromParts(artist, title) {
    const a = normTrackPart(artist);
    const t = normTrackPart(title);
    if (!a && !t) return '';
    return a + ' — ' + t;
  }

  function rpTrackSig(track) {
    if (!track) return '';
    return rpTrackSigFromParts(track.artist || '', track.title || track.track || '');
  }

  function rpTrackHuman(track) {
    if (!track) return '';
    const a = String(track.artist || '').trim();
    const t = String(track.title || track.track || '').trim();
    if (a && t) return a + ' — ' + t;
    return t || a;
  }

  function markRpRejected(track) {
    const sig = rpTrackSig(track);
    if (!sig) return;

    const cid = getChatId();
    if (!rpRejected[cid]) rpRejected[cid] = [];
    if (rpRejected[cid].indexOf(sig) < 0) {
      rpRejected[cid].push(sig);
      rpRejected[cid] = rpRejected[cid].slice(-300);
      saveRpRejected();
    }
  }

  function getRejectedRpSigs() {
    const cid = getChatId();
    return Array.isArray(rpRejected[cid]) ? rpRejected[cid].slice() : [];
  }

  function collectPlaylistTracks() {
    const out = [];

    try {
      if (Array.isArray(queue)) {
        queue.forEach(function (t) {
          if (t) out.push(t);
        });
      }
    } catch (_) {}

    try {
      if (lib && Array.isArray(lib.manual)) {
        lib.manual.forEach(function (p) {
          if (p && Array.isArray(p.tracks)) {
            p.tracks.forEach(function (t) {
              if (t) out.push(t);
            });
          }
        });
      }
    } catch (_) {}

    try {
      if (lib && lib.rp) {
        Object.keys(lib.rp).forEach(function (cid) {
          const p = lib.rp[cid];
          if (p && Array.isArray(p.tracks)) {
            p.tracks.forEach(function (t) {
              if (t) out.push(t);
            });
          }
        });
      }
    } catch (_) {}

    return out;
  }

  function getRpAvoidSigs() {
    const map = {};
    collectPlaylistTracks().forEach(function (t) {
      const sig = rpTrackSig(t);
      if (sig) map[sig] = rpTrackHuman(t);
    });

    getRejectedRpSigs().forEach(function (sig) {
      if (sig && !map[sig]) map[sig] = sig;
    });

    return Object.keys(map);
  }

  function getRecentlyPicked() {
    return getRpAvoidSigs();
  }

  function isRpAvoidedCandidate(track, extraAvoidSigs) {
    const sig = rpTrackSig(track);
    if (!sig) return false;

    const avoid = getRpAvoidSigs();
    if (Array.isArray(extraAvoidSigs)) {
      extraAvoidSigs.forEach(function (x) {
        if (x) avoid.push(x);
      });
    }

    return avoid.indexOf(sig) >= 0;
  }

  function getFavoriteHints(limit) {
    if (!cfg.rpUseFavorites) return [];
    if (!Array.isArray(lib.favorites) || !lib.favorites.length) return [];
    const arr = lib.favorites.slice(-(limit || 30));
    return arr.map(function (t) { return rpTrackHuman(t); }).filter(Boolean);
  }

  function buildMemePrompt(count, messages, avoidList) {
    const seed = Math.floor(Math.random() * 100000);

    let avoidReq = '';
    if (avoidList && avoidList.length) {
      avoidReq = '\n=== EXCLUSION LIST (already used) ===\n' +
        'Do NOT output any entry whose artist/source AND title both match an entry below. You may reuse a meme format with a clearly different specific clip/title.\n' +
        avoidList.map(function (x) { return '- ' + x; }).join('\n') + '\n';
    }

    const sys =
      'You are a CHAOTIC MEME SOUND curator for a roleplay session. Your ONLY job is comedic, absurd, viral MEME audio.\n' +
      'Analyze the recent messages: their mood, what is happening, the cringe/drama/awkwardness/epic-ness, and the DIRECT SPEECH of the characters.\n' +
      'Then suggest ' + count + ' MAXIMALLY STUPID, ridiculous, viral MEME sounds / songs / sound effects that would either (a) hilariously underline the absurdity of the scene, (b) create a comedic contrast with a serious moment, or (c) defuse / break the tension with pure nonsense.\n\n' +
      'THIS IS MEME MODE. The usual rules are INVERTED:\n' +
      '- Sound effects, jingles, memes, novelty audio, TikTok sounds, vines, YouTube Poop staples, "brainrot" audio — ALL ALLOWED and ENCOURAGED.\n' +
      '- Real "serious" songs are mostly NOT what we want here, unless they themselves are a famous meme (e.g. Rickroll).\n' +
      '- Everything must be findable on YouTube (memes basically all live there).\n\n' +
      'Examples of the VIBE we want (do not just copy these, pick what fits the scene, and find fresh/relevant ones too):\n' +
      '- Sad Trombone / "Wah Wah Wah" fail sound\n' +
      '- Rick Astley - Never Gonna Give You Up (Rickroll)\n' +
      '- "Directed by Robert B. Weide" Curb Your Enthusiasm outro theme\n' +
      '- "To Be Continued" (Roundabout - Yes / JoJo meme)\n' +
      '- "Oh no no no" laugh / "Bing Chilling"\n' +
      '- Vine boom sound effect\n' +
      '- "Why are you running" / "Yamete kudasai"\n' +
      '- Windows XP error / shutdown sounds\n' +
      '- "Among Us" drip / sus sound\n' +
      '- Trending TikTok sounds and brainrot audio (e.g. the "deer/elk" weird trend sounds, "Skibidi", "Oi oi oi baka", "Tokyo Drift", phonk for edits, "Sigma" edit music, "Metamorphosis" edit song, etc.)\n' +
      '- Music made for "edits" / "fanmade edit" phonk and hard beats\n' +
      '- Classic meme tracks: "Crab Rave", "Megalovania", "Astronomia (Coffin Dance)", "All Star - Smash Mouth", "Sandstorm - Darude", "Believer but it slaps", "Run - Awolnation (epic build)"\n' +
      '- Absurd / nonsense audio: "He need some milk", "Bruh", "Emotional Damage", "Nani?!", "MmmMMMmmm Monster"\n\n' +
      'Pick the one(s) that BEST match what is literally happening in the scene right now and maximize the comedic effect.\n' +
      'In the "artist" field put the channel/meme name/source (or "Meme" if unknown). In the "track" field put the clear searchable name of the exact sound/song.\n' +
      avoidReq +
      '\n(variation token, ignore: ' + seed + ')\n' +
      '\nReturn STRICTLY valid JSON, one line, no markdown:\n' +
      '{"tracks":[{"artist":"...","track":"...","lang":"any","why":"<пояснение на русском, почему именно этот мемный звук подходит сцене, 1 предложение>"}]}\n\n' +
      'Recent messages:\n' + messages.join('\n');

    return sys;
  }

  function buildRpPrompt(count, messages, avoidList) {
    if (isMemeGenre()) {
      return buildMemePrompt(count, messages, avoidList);
    }

    let lang = cfg.rpLang;
    if (lang === 'custom') lang = (cfg.rpLangCustom || '').trim();

    const genre = genreValue();

    let langHard = '';
    let langTop = '';
    if (lang) {
      langTop = '!!! ABSOLUTE TOP PRIORITY — TRACK LANGUAGE !!!\n' +
        'EVERY single track you suggest MUST be a song sung IN ' + lang + ' (lyrics in ' + lang + ').\n' +
        'This OVERRIDES everything else. A perfectly fitting song in the WRONG language is FORBIDDEN and counts as a FAILURE.\n' +
        'If you are unsure whether a song is in ' + lang + ', do NOT use it — pick another that you are CERTAIN is in ' + lang + '.\n' +
        'Instrumental tracks are allowed only if no ' + lang + ' vocal track fits.\n\n';
      langHard = '\n\n=== FINAL CHECK BEFORE OUTPUT ===\n' +
        'Re-read every track. Confirm EACH ONE is sung in ' + lang + '. If any track is not in ' + lang + ', REPLACE it now with a real ' + lang + ' song. Output ONLY after all tracks are in ' + lang + '.';
    }

    let genreReq = '';
    if (genre && genre.toLowerCase() !== 'any' && genre.toLowerCase() !== 'любой') {
      genreReq = '- Strongly prefer the genre / style: ' + genre + '. Stay within this genre unless it clearly clashes with the scene.\n';
    }

    let favReq = '';
    const favHints = getFavoriteHints(30);
    if (favHints.length) {
      favReq = '\nThe user LIKED these tracks (use them to understand the user taste in artists, genres, mood — lean toward similar vibes, but do NOT just repeat these exact tracks):\n' +
        favHints.map(function (x) { return '- ' + x; }).join('\n') + '\n';
    }

    let avoidReq = '';
    if (avoidList && avoidList.length) {
      avoidReq = '\n=== EXCLUSION LIST (already used ARTIST + TRACK pairs) ===\n' +
        'The list below contains specific SONGS in the format "Artist — Title".\n' +
        'These are NOT banned artists. The artist is NOT forbidden — only this EXACT combination of artist AND that specific title is forbidden.\n' +
        'RULES:\n' +
        '- You MUST NOT output any song whose artist AND title both match an entry below.\n' +
        '- You MAY freely reuse an artist from this list, as long as you pick a DIFFERENT song (different title) by that artist.\n' +
        '- Same artist + different track = ALLOWED. Same artist + same track = FORBIDDEN.\n' +
        'Forbidden artist+track pairs:\n' +
        avoidList.map(function (x) { return '- ' + x; }).join('\n') + '\n';
    }

    const seed = Math.floor(Math.random() * 100000);

    const sys =
      langTop +
      'You are a music curator for an immersive roleplay session.\n' +
      'Analyze the mood, emotions, atmosphere, tempo, narrative and the DIRECT SPEECH of the characters (User and Char) in the recent messages.\n' +
      'Suggest ' + count + ' real, existing music track(s) that capture the EMOTIONAL TONE of the current scene.\n\n' +
      'Rules:\n' +
      '- Only REAL, existing tracks (artist + title), findable on YouTube or major music sources. Never invent tracks.\n' +
      '- ONLY actual songs or instrumental pieces. NEVER jingles, ringtones, sound effects, ad music, memes, children songs, novelty audio.\n' +
      '- Emotional tone of the track MUST match the scene (dramatic=intense, sad=melancholic, tense=dark, romantic=tender).\n' +
      '- An ARTIST may appear multiple times across suggestions, AS LONG AS each track title is different. Repeating an artist is fine; repeating the exact same artist+title pair is not.\n' +
      genreReq +
      (lang ? '- REMINDER: ALL tracks MUST be in ' + lang + '. No exceptions.\n' : '') +
      favReq +
      avoidReq +
      '\n(variation token, ignore: ' + seed + ')\n' +
      '\nReturn STRICTLY valid JSON, one line, no markdown:\n' +
      '{"tracks":[{"artist":"...","track":"...","lang":"' + (lang || 'any') + '","why":"<пояснение на русском, 1 предложение>"}]}\n\n' +
      'Recent messages:\n' + messages.join('\n') +
      langHard;

    return sys;
  }

  function parseRpJson(text) {
    if (!text) return [];
    let s = String(text).trim();
    s = s.replace(/```json/gi, '').replace(/```/g, '').trim();
    let obj = null;
    try {
      obj = JSON.parse(s);
    } catch (_) {
      const m = s.match(/\{[\s\S]*\}/);
      if (m) {
        try { obj = JSON.parse(m[0]); } catch (_) {}
      }
    }
    if (!obj || !Array.isArray(obj.tracks)) return [];
    return obj.tracks.filter(function (t) {
      return t && t.artist && t.track;
    }).map(function (t) {
      return {
        artist: String(t.artist).trim(),
        track: String(t.track).trim(),
        why: String(t.why || '').trim()
      };
    });
  }

  async function callModel(prompt) {
    const c = stContext();
    if (!c) throw new Error('no ST context');

    let profId = selectedProfileId();

    if (profId && !profileExists(profId)) {
      warn('callModel: profile id not found in profiles list, falling back to current ST profile. id=', profId);
      statusMsg = 'Профиль плеера не найден, использую текущий профиль Таверны…';
      render();
      profId = '';
    }

    const maxTok = cfg.rpTokenLimitOn ? (parseInt(cfg.rpTokenLimit, 10) || 6000) : undefined;

    if (profId && c.ConnectionManagerRequestService && c.ConnectionManagerRequestService.sendRequest) {
      try {
        dbg('rp', 'callModel via CMRS, profile=', profileName(profId), 'maxTok=', maxTok);
        const resp = await c.ConnectionManagerRequestService.sendRequest(profId, prompt, maxTok);
        if (typeof resp === 'string') return resp;
        if (resp && typeof resp.content === 'string') return resp.content;
        if (resp && resp.choices && resp.choices[0]) {
          return (resp.choices[0].message && resp.choices[0].message.content) || resp.choices[0].text || '';
        }
        return '';
      } catch (e) {
        warn('CMRS sendRequest error, fallback to generateQuietPrompt', e);
        statusMsg = 'Ошибка профиля подключения, пробую текущий профиль Таверны…';
        render();
      }
    }

    if (c.generateQuietPrompt) {
      dbg('rp', 'callModel via generateQuietPrompt (current ST profile)');
      const r = await c.generateQuietPrompt(prompt, false, false);
      return (typeof r === 'string') ? r : '';
    }

    throw new Error('no generation method');
  }

  async function runRpAnalysis(count, msgCount, mode) {
    if (rpBusy) return;

    const runId = ++rpRunId;

    rpBusy = true;
    searching = true;

    if (!collapsed) rpOpen = true;

    statusMsg = isMemeGenre() ? 'ИИ подбирает мемные звуки…' : 'ИИ подбирает музыку…';
    resultsRp = true;
    results = [];

    const controller = new AbortController();
    rpAbortController = controller;

    render();

    try {
      const messages = getRecentMessages(msgCount);

      if (runId !== rpRunId || controller.signal.aborted) return;

      if (!messages.length) {
        if (runId === rpRunId) {
          statusMsg = 'Нет сообщений для анализа';
          rpBusy = false;
          searching = false;
          if (rpAbortController === controller) rpAbortController = null;
          render();
        }
        return;
      }

      const avoid = getRpAvoidSigs();
      const prompt = buildRpPrompt(count, messages, avoid);
      const raw = await callModel(prompt);

      if (runId !== rpRunId || controller.signal.aborted) return;

      const picks = parseRpJson(raw);

      if (!picks.length) {
        if (runId === rpRunId) {
          statusMsg = 'ИИ не вернул треки (проверьте профиль)';
          warn('RP: parsed 0 tracks. raw len=', (raw || '').length);
          rpBusy = false;
          searching = false;
          if (rpAbortController === controller) rpAbortController = null;
          render();
        }
        return;
      }

      results = [];
      resultsTitle = isMemeGenre() ? 'Мем-вайб сцены' : 'Вайб сцены';
      statusMsg = 'Ищу треки (' + picks.length + ')…';
      render();

      const usedSigs = avoid.slice();
      const found = [];

      for (let i = 0; i < picks.length; i++) {
        if (runId !== rpRunId || controller.signal.aborted) return;

        const p = picks[i];
        const sig = rpTrackSigFromParts(p.artist, p.track);

        if (sig && usedSigs.indexOf(sig) >= 0) continue;

        try {
          const r = await findTrackForRp(p.artist + ' — ' + p.track, controller, usedSigs);

          if (runId !== rpRunId || controller.signal.aborted) return;

          if (r) {
            r.why = p.why;
            r._rpSuggestedChat = getChatId();
            found.push(r);

            const rsig = rpTrackSig(r) || sig;
            if (rsig && usedSigs.indexOf(rsig) < 0) usedSigs.push(rsig);
          }
        } catch (e) {
          if (e.message === 'aborted') throw e;
          warn('RP find track error', e);
        }
      }

      if (runId !== rpRunId || controller.signal.aborted) return;

      results = found.filter(Boolean);
      render();

      if (!results.length) {
        statusMsg = 'ИИ предложил треки, но их не нашли или они были в исключениях';
      } else {
        statusMsg = '';
        setRpPulse();

        if (cfg.rpAutoplay && results.length) {
          enqueueResult(results[0], true);
        }
      }
    } catch (e) {
      if (runId === rpRunId) {
        if (e.message === 'aborted') statusMsg = 'Операция отменена';
        else {
          statusMsg = 'Ошибка ИИ: ' + (e && e.message ? e.message : 'unknown');
          error('RP analysis error', e);
        }
      }
    }

    if (runId === rpRunId) {
      rpBusy = false;
      searching = false;
      if (rpAbortController === controller) rpAbortController = null;
      render();
    }
  }

  function rpQuickVibe() {
    if (rpBusy) return;

    if (searching || searchAbortController) {
      statusMsg = 'Сначала завершите или отмените текущий поиск';
      render();
      return;
    }

    if (!cfg.rpQuick) {
      if (!collapsed) {
        rpOpen = true;
        statusMsg = 'Включите быстрый режим в РП-настройках';
      }
      render();
      return;
    }

    runRpAnalysis(1, 3, 'quick');
  }

  function rpAutoTrigger() {
    if (!cfg.rpAuto || rpBusy) return;
    runRpAnalysis(Math.max(1, cfg.rpCount || 5), Math.max(2, cfg.rpEvery || 10), 'auto');
  }

  function cancelRp() {
    cancelBusyOps('Операция отменена');
  }

  let rpMsgCounter = 0;

  function onChatMessage() {
    if (!cfg.rpAuto) return;
    rpMsgCounter++;
    dbg('rp', 'msg counter', rpMsgCounter, '/', Math.max(2, cfg.rpEvery || 10));
    if (rpMsgCounter >= Math.max(2, cfg.rpEvery || 10)) {
      rpMsgCounter = 0;
      rpAutoTrigger();
    }
  }

  audio.addEventListener('error', function () {
    const t = curTrack();
    if (!t || curIdx < 0) return;
    if (!audio.src && !isYtTrack(t)) return;

    const playId = currentPlayId;
    markBadMedia(t);

    if (isYtTrack(t) || isProbablyYtBacked(t)) {
      replaceOrSkipTrack(curIdx, t, playId, 'Поток оборвался, ищу рабочую замену…');
    } else {
      statusMsg = 'Ошибка аудио, пробую найти замену…';
      render();
      replaceOrSkipTrack(curIdx, t, playId, 'Ошибка аудио, ищу замену…');
    }
  });

  audio.addEventListener('ended', function () {
    if (curIdx >= 0 && queue[curIdx]) {
      if (queue.length > 1) {
        nextTrack();
      } else {
        isPlaying = false;
        trackEnded = true;
        if (uiMode === 'fab' && rpEnabled() && cfg.rpQuick) {
          render();
        } else {
          updatePlayBtn();
        }
      }
    }
  });

  audio.addEventListener('pause', function () {
    isPlaying = false;
    updatePlayBtn();
  });

  audio.addEventListener('play', function () {
    isPlaying = true;
    trackEnded = false;
    updatePlayBtn();
  });
  function exportPlaylistText(pl) {
    if (!pl || !Array.isArray(pl.tracks)) return '';
    const lines = pl.tracks.map(function (t) {
      const a = String(t.artist || '').trim();
      const ti = String(t.title || '').trim();
      if (a && ti) return a + ' — ' + ti;
      return ti || a;
    }).filter(Boolean);
    return '# ' + (pl.name || 'Playlist') + '\n' + lines.join('\n');
  }

  function exportPlaylistJson(pl) {
    if (!pl) return '';
    const obj = {
      _rpPlayerExport: true,
      type: 'playlist',
      version: 1,
      name: pl.name || 'Playlist',
      tracks: (pl.tracks || []).map(function (t) {
        return {
          kind: t.kind || 'audio',
          title: t.title || '',
          artist: t.artist || '',
          url: t.url || '',
          ytid: t.ytid || '',
          ytlist: t.ytlist || '',
          source: t.source || ''
        };
      })
    };
    return JSON.stringify(obj, null, 2);
  }

  function downloadFile(filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { document.body.removeChild(a); } catch (_) {}
        try { URL.revokeObjectURL(url); } catch (_) {}
      }, 200);
      dbg('export', 'downloaded', filename);
    } catch (e) {
      error('download fail', e);
      statusMsg = 'Не удалось скачать файл';
      render();
    }
  }

  function safeFileName(s) {
    return String(s || 'playlist').replace(/[^\p{L}\p{N}\-_ ]+/gu, '').replace(/\s+/g, '_').slice(0, 40) || 'playlist';
  }

  function doExportPlaylist(kind, fmt) {
    let pl = null;
    if (kind === 'm') pl = lib.manual.find(function (x) { return x.id === editId; });
    else if (kind === 'rp') pl = lib.rp[editId];
    else if (kind === 'fav') pl = { name: 'Избранное', tracks: lib.favorites };
    if (!pl) return;

    const base = safeFileName(pl.name);
    if (fmt === 'json') {
      downloadFile(base + '.json', exportPlaylistJson(pl), 'application/json;charset=utf-8');
    } else {
      downloadFile(base + '.txt', exportPlaylistText(pl), 'text/plain;charset=utf-8');
    }
    exportPop = null;
    render();
  }

  function backupAll() {
    const obj = {
      _rpPlayerBackup: true,
      version: 1,
      ts: Date.now(),
      cfg: cfg,
      lib: lib,
      radioFav: radioFav,
      rpRejected: rpRejected,
      queue: { queue: queue, curIdx: curIdx }
    };
    downloadFile('rp_player_backup_' + dateStamp().replace(/\./g, '-') + '.json', JSON.stringify(obj, null, 2), 'application/json;charset=utf-8');
  }

  function importBackup(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) {
      statusMsg = 'Файл бэкапа повреждён';
      render();
      return;
    }
    if (!obj || typeof obj !== 'object') {
      statusMsg = 'Неверный формат бэкапа';
      render();
      return;
    }

    try {
      if (obj._rpPlayerExport && obj.type === 'playlist') {
        lib.manual.push({
          id: 'm' + Date.now(),
          name: obj.name || ('Импорт ' + dateStamp()),
          tracks: Array.isArray(obj.tracks) ? obj.tracks : []
        });
        saveLib();
        statusMsg = 'Плейлист импортирован';
        render();
        return;
      }

      if (obj.cfg && typeof obj.cfg === 'object') {
        cfg = Object.assign(cfg, obj.cfg);
        if (typeof cfg.debug === 'boolean') DEBUG = cfg.debug;
        if (cfg.theme) theme = cfg.theme;
        saveCfg();
      }
      if (obj.lib && typeof obj.lib === 'object') {
        lib = Object.assign({ manual: [], rp: {}, favorites: [] }, obj.lib);
        if (!Array.isArray(lib.manual)) lib.manual = [];
        if (!lib.rp || typeof lib.rp !== 'object') lib.rp = {};
        if (!Array.isArray(lib.favorites)) lib.favorites = [];
        saveLib();
      }
      if (Array.isArray(obj.radioFav)) {
        radioFav = obj.radioFav;
        saveRadioFav();
      }
      if (obj.rpRejected && typeof obj.rpRejected === 'object') {
        rpRejected = obj.rpRejected;
        saveRpRejected();
      }
      if (obj.queue && Array.isArray(obj.queue.queue)) {
        queue = obj.queue.queue;
        curIdx = typeof obj.queue.curIdx === 'number' ? obj.queue.curIdx : -1;
        saveQueue();
      }

      statusMsg = 'Бэкап импортирован';
      info('backup imported');
      applyBackground();
      applyAccentVar();
      applyTextColorVar();
      applySolidClass();
      render();
    } catch (e) {
      error('import error', e);
      statusMsg = 'Ошибка импорта бэкапа';
      render();
    }
  }

  function triggerImport() {
    try {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json,.json,.txt';
      inp.style.display = 'none';
      inp.addEventListener('change', function () {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          importBackup(String(ev.target.result || ''));
        };
        reader.readAsText(f);
      });
      document.body.appendChild(inp);
      inp.click();
      setTimeout(function () { try { document.body.removeChild(inp); } catch (_) {} }, 1000);
    } catch (e) {
      error('triggerImport fail', e);
    }
  }

  function fullReset() {
    try {
      currentPlayId++;
      stopAudio();
      stopYt();
    } catch (_) {}
    try {
      ALL_LS_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { warn('fullReset ls fail', e); }
    info('full reset done, reloading widget state');
    try {
      window.__rpPlayerLock = false;
      if (root && root.parentNode) root.parentNode.removeChild(root);
    } catch (_) {}
    try { location.reload(); } catch (_) {}
  }
  const ICONS = {
    music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="currentColor" class="${PFX}-ic"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor" class="${PFX}-ic"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    prev: `<svg viewBox="0 0 24 24" fill="currentColor" class="${PFX}-ic"><polygon points="19 20 9 12 19 4 19 20"/><rect x="3" y="4" width="2" height="16"/></svg>`,
    next: `<svg viewBox="0 0 24 24" fill="currentColor" class="${PFX}-ic"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="2" height="16"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.2 4.2l4.3 4.3M15.5 15.5l4.3 4.3M1 12h6M17 12h6M4.2 19.8l4.3-4.3M15.5 8.5l4.3-4.3"/></svg>`,
    reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    vol: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" class="${PFX}-ic"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><polyline points="6 9 12 15 18 9"/></svg>`,
    chevronUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><polyline points="18 15 12 9 6 15"/></svg>`,
    palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16c3.3 0 6-2.7 6-6 0-5-4.5-8-10-8z"/></svg>`,
    radio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M3.5 8.5 18 3l1 3"/><rect x="2" y="8" width="20" height="13" rx="2"/><circle cx="8" cy="14.5" r="3"/><line x1="16" y1="12" x2="18" y2="12"/><line x1="16" y1="16" x2="18" y2="16"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    heartFill: `<svg viewBox="0 0 24 24" fill="#ff6b8a" stroke="#ff6b8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z"/><path d="M19 15l.7 1.9L21.5 18l-1.8.6L19 21l-.7-2.4L16.5 18l1.8-.6z"/></svg>`,
    wand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z"/></svg>`,
    cancelX: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="${PFX}-ic"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${PFX}-ic"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`
  };

  function saveTheme() {
    cfg.theme = theme;
    saveCfg();
  }

  (function migrateBg() {
    try {
      if ((cfg.bgBase64 || cfg.bgUrl) && (!cfg.bgByTheme[theme])) {
        cfg.bgByTheme[theme] = { base64: cfg.bgBase64 || '', url: cfg.bgUrl || '' };
      }
      cfg.bgBase64 = '';
      cfg.bgUrl = '';
      cfg.bgType = 'none';
      saveCfg();
    } catch (e) {}
  })();

  function validHex(v) {
    return /^#?[0-9a-fA-F]{6}$/.test(String(v || '').trim());
  }

  function normHex(v) {
    v = String(v || '').trim();
    if (v[0] !== '#') v = '#' + v;
    return v.toLowerCase();
  }

  function accentColor() {
    var c = cfg.accentByTheme && cfg.accentByTheme[theme];
    if (validHex(c)) return normHex(c);
    if (validHex(cfg.accent)) return normHex(cfg.accent);
    return '';
  }

  function setAccent(v) {
    if (!v) cfg.accent = '';
    else if (validHex(v)) cfg.accent = normHex(v);
    saveCfg();
  }

  function setAccentForTheme(themeId, hex) {
    if (!themeId) return;
    if (hex && validHex(hex)) cfg.accentByTheme[themeId] = normHex(hex);
    else delete cfg.accentByTheme[themeId];
    saveCfg();
    applyAccentVar();
  }

  function setAccentForAll(hex) {
    THEMES.forEach(function (tm) {
      if (hex && validHex(hex)) cfg.accentByTheme[tm] = normHex(hex);
      else delete cfg.accentByTheme[tm];
    });
    saveCfg();
    applyAccentVar();
  }

  function hexToRgb(hex) {
    hex = normHex(hex).replace('#', '');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function applyAccentVar() {
    if (!root) return;
    const a = accentColor();
    if (a) {
      root.style.setProperty('--rp-accent', a);
      try {
        const rgb = hexToRgb(a);
        root.style.setProperty('--rp-accent-soft', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.24)');
      } catch (_) {
        root.style.setProperty('--rp-accent-soft', 'rgba(122,166,255,0.24)');
      }
    } else {
      root.style.removeProperty('--rp-accent');
      root.style.removeProperty('--rp-accent-soft');
    }

    let op = null;
    if (bgPending && typeof bgPending.opacity === 'number') {
      op = bgPending.opacity;
    } else {
      const b = currentBg();
      if (b && typeof b.opacity === 'number') {
        op = b.opacity;
      } else if (typeof cfg.opacity === 'number' && cfg.opacity >= 0) {
        op = cfg.opacity;
      }
    }
    if (op !== null) {
      root.style.setProperty('--rp-bg-alpha', (op / 100).toFixed(2));
    } else {
      root.style.removeProperty('--rp-bg-alpha');
    }
  }

  function rpEnabled() {
    return cfg.rpAuto || cfg.rpQuick;
  }
  const CSS = `
  .${PFX}-root { position: fixed; z-index: 99998; box-sizing: border-box; font-family: Arial, sans-serif; color: var(--rp-text, #f0f0f5); -webkit-user-select: none; user-select: none; touch-action: none; overflow: visible; border-radius: 16px; display: flex; flex-direction: column; }
  .${PFX}-root *, .${PFX}-root *::before, .${PFX}-root *::after { box-sizing: border-box; }
  .${PFX}-root.dragging { transition: none !important; }
  .${PFX}-root.dragging * { cursor: grabbing !important; }
  .${PFX}-root.resizing { transition: none !important; }
  .${PFX}-root.${PFX}-pulse .${PFX}-glass { animation: ${PFX}-pulse 1.3s ease-in-out infinite; }
  @keyframes ${PFX}-pulse {
    0%, 100% { box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 0 0 var(--rp-accent, rgba(120,170,255,0.7)); }
    50% { box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 18px 4px var(--rp-accent, rgba(120,170,255,0.7)); }
  }
  .${PFX}-shell { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .${PFX}-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .${PFX}-glass { background: rgba(30,30,40,var(--rp-bg-alpha, 0.92)); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%); border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }

  .${PFX}-fab { width: 48px; height: 48px; border-radius: 50% !important; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; background-clip: padding-box; line-height: 0; }
  .${PFX}-root.${PFX}-fabmode { border-radius: 50% !important; overflow: visible; }
  .${PFX}-root.${PFX}-fabmode, .${PFX}-root.${PFX}-fabmode .${PFX}-shell, .${PFX}-root.${PFX}-fabmode .${PFX}-body { border-radius: 50% !important; }
  .${PFX}-fab[data-handle] { cursor: grab; }
  .${PFX}-fab .${PFX}-ic { width: 24px; height: 24px; pointer-events: none; display: block; }
  .${PFX}-fab[data-fabbtn] svg polygon { transform: translateX(1px); }
  .${PFX}-fab .${PFX}-spin { width: 22px; height: 22px; }
  .${PFX}-fab.vibe { background: var(--rp-accent, rgba(120,170,255,0.32)) !important; }

  .${PFX}-progress-container { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .${PFX}-time-lbl { font-size: 10px; opacity: 0.6; min-width: 28px; text-align: center; font-family: monospace; }
  .${PFX}-progress-slider { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: var(--rp-accent-soft, rgba(122,166,255,0.22)); border-radius: 2px; outline: none; }
  .${PFX}-progress-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--rp-accent, #7aa6ff); cursor: pointer; border: 1px solid #fff; }
  .${PFX}-progress-slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--rp-accent, #7aa6ff); border: 1px solid #fff; cursor: pointer; }

  .${PFX}-ytlayer { display: none; transition: opacity .2s; flex-shrink: 0; }
  .${PFX}-ytlayer.show { display: block; position: relative; width: 100%; height: 130px; border-radius: 12px; overflow: hidden; background: #000; margin-bottom: 10px; }
  .${PFX}-ytlayer iframe { width: 100%; height: 130px; border: 0; display: block; }
  .${PFX}-ytlayer.hidden-layer { opacity: 0.25; }
  .${PFX}-ytlayer.hidden-layer:hover, .${PFX}-ytlayer.hidden-layer:active { opacity: 1; }
  .${PFX}-ytclose { position: absolute; top: 5px; right: 5px; z-index: 3; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .${PFX}-yteye { position: absolute; top: 5px; right: 34px; z-index: 3; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .${PFX}-ytclose .${PFX}-ic, .${PFX}-yteye .${PFX}-ic { width: 13px; height: 13px; color: #fff; pointer-events: none; }

  .${PFX}-pill { display: flex; align-items: center; gap: 10px; padding: 10px 12px; min-width: 170px; max-width: 92vw; }
  .${PFX}-pill[data-handle] { cursor: grab; }
  .${PFX}-pill-icon, .${PFX}-pill-theme, .${PFX}-pill-vibe, .${PFX}-note-btn, .${PFX}-head-btn { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); }
  .${PFX}-pill-icon, .${PFX}-pill-theme, .${PFX}-pill-vibe, .${PFX}-note-btn { cursor: pointer; touch-action: none; }
  .${PFX}-pill-icon .${PFX}-ic, .${PFX}-pill-theme .${PFX}-ic, .${PFX}-pill-vibe .${PFX}-ic, .${PFX}-note-btn .${PFX}-ic, .${PFX}-head-btn .${PFX}-ic { width: 16px; height: 16px; pointer-events: none; }
  .${PFX}-pill-text { font-size: 12px; font-weight: 600; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; cursor: grab; touch-action: none; }
  .${PFX}-pill-controls { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .${PFX}-pill-theme { background: rgba(255,255,255,0.1); }
  .${PFX}-pill-vibe { background: var(--rp-accent, rgba(120,170,255,0.24)); }

  .${PFX}-panel { width: var(--rp-user-w, 264px); max-width: 92vw; flex: 1; min-height: 0; padding: 13px; display: flex; flex-direction: column; gap: 9px; overflow: hidden; }
  .${PFX}-scrollable { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 9px; padding-right: 2px; min-height: 0; }
  .${PFX}-sec { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
  .${PFX}-ymin { width: 232px; max-width: 82vw; padding: 11px; display: flex; flex-direction: column; gap: 8px; border-radius: 16px; overflow: hidden; }
  .${PFX}-ymin-body { display: flex; align-items: center; gap: 8px; }
  .${PFX}-ymin-title { flex: 1; min-width: 0; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: grab; }
  .${PFX}-ymin-controls, .${PFX}-ymin-actions { display: flex; align-items: center; gap: 8px; }

  .${PFX}-note-btn { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); cursor: pointer; touch-action: none; }
  .${PFX}-note-btn:active { background: rgba(255,255,255,0.24); }
  .${PFX}-note-btn .${PFX}-ic { width: 16px; height: 16px; pointer-events: none; }

  .${PFX}-head { display: flex; align-items: center; gap: clamp(3px, calc((var(--rp-user-w, 264px) - 220px) * 0.06), 12px); flex-wrap: nowrap; flex-shrink: 0; }
  .${PFX}-head-grab { display: flex; align-items: center; flex: 1 1 auto; min-width: 0; height: 30px; cursor: grab; touch-action: none; }
  .${PFX}-head-title { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
  .${PFX}-head-spacer { flex: 1; min-width: 6px; height: 26px; cursor: grab; touch-action: none; }
  .${PFX}-head-btn { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: .7; background: rgba(255,255,255,0.1); flex-shrink: 0; }
  .${PFX}-head-btn:active { opacity: 1; background: rgba(255,255,255,0.24); }
  .${PFX}-head-btn.on { opacity: 1; background: var(--rp-accent, rgba(120,170,255,0.3)); }
  .${PFX}-head-btn .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-theme-btn { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: .55; background: rgba(255,255,255,0.08); flex-shrink: 0; }
  .${PFX}-theme-btn:active { opacity: 1; }
  .${PFX}-theme-btn .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-now { display: flex; flex-direction: column; gap: 1px; min-height: 24px; justify-content: center; text-align: center; padding: 0; flex-shrink: 0; }
  .${PFX}-now-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-now-artist { font-size: 10px; opacity: .6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-now-status { font-size: 11px; opacity: .55; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .${PFX}-now-pos { font-size: 10px; opacity: .4; margin-top: 1px; }

  .${PFX}-marq { overflow: hidden; white-space: nowrap; position: relative; }
  .${PFX}-marq-inner { display: inline-block; white-space: nowrap; will-change: transform; }
  .${PFX}-marq.run .${PFX}-marq-inner { animation: ${PFX}-marq-move var(--marq-dur, 6s) ease-in-out infinite alternate; }
  @keyframes ${PFX}-marq-move {
    0% { transform: translateX(0); }
    100% { transform: translateX(var(--marq-shift, 0px)); }
  }

  .${PFX}-spin { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.25); border-top-color: var(--rp-accent, #7aa6ff); border-radius: 50%; display: inline-block; animation: ${PFX}-rot .7s linear infinite; flex-shrink: 0; }
  @keyframes ${PFX}-rot { to { transform: rotate(360deg); } }

  .${PFX}-search { display: flex; gap: 6px; align-items: center; }
  .${PFX}-search input { flex: 1; min-width: 0; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 9px; color: var(--rp-text, #f0f0f5); font-size: 13px; padding: 8px 10px; outline: none; font-family: inherit; }
  .${PFX}-search input::placeholder { color: rgba(255,255,255,0.35); }
  .${PFX}-search-btn { width: 38px; height: 38px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); border: none; border-radius: 9px; color: var(--rp-text, #f0f0f5); cursor: pointer; }
  .${PFX}-search-btn:active { background: rgba(255,255,255,0.26); }
  .${PFX}-search-btn .${PFX}-ic { width: 16px; height: 16px; pointer-events: none; }

  .${PFX}-controls { display: flex; align-items: center; justify-content: center; gap: 16px; flex-shrink: 0; }
  .${PFX}-cbtn { background: rgba(255,255,255,0.1); border: none; cursor: pointer; color: var(--rp-text, #f0f0f5); display: flex; align-items:center; justify-content:center; padding: 8px; border-radius: 50%; }
  .${PFX}-cbtn:active { transform: scale(.86); background: rgba(255,255,255,0.24); }
  .${PFX}-cbtn .${PFX}-ic { width: 17px; height: 17px; pointer-events: none; }
  .${PFX}-cbtn.play { background: rgba(255,255,255,0.16); padding: 10px; }
  .${PFX}-cbtn.play .${PFX}-ic { width: 20px; height: 20px; }
  .${PFX}-cbtn-sm { padding: 6px; background: rgba(255,255,255,0.1); }
  .${PFX}-cbtn-sm .${PFX}-ic { width: 14px; height: 14px; }

  .${PFX}-ymin-ctrls { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .${PFX}-vol { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .${PFX}-vol .${PFX}-ic { width: 15px; height: 15px; opacity: .55; flex-shrink: 0; }
  .${PFX}-vol input { flex: 1; height:4px; -webkit-appearance: none; appearance: none; background: var(--rp-accent-soft, rgba(122,166,255,0.22)); border-radius: 2px; outline: none; }
  .${PFX}-vol input::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: var(--rp-accent, #fff); cursor: pointer; }
  .${PFX}-vol input::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: var(--rp-accent, #fff); border: none; cursor: pointer; }

  .${PFX}-sec-h { font-size: 10px; font-weight: 700; opacity: .5; text-transform: uppercase; letter-spacing: .04em; margin: 4px 0 2px; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .${PFX}-sec-h-actions { display: flex; gap: 4px; }
  .${PFX}-sec-h-btn { opacity: .6; cursor: pointer; display: flex; padding: 2px; }
  .${PFX}-sec-h-btn:active { opacity: 1; }
  .${PFX}-sec-h-btn .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-empty { font-size: 11px; opacity: .4; text-align: center; padding: 6px 0; }
  .${PFX}-row { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.03); }
  .${PFX}-row:active { background: rgba(255,255,255,0.1); }
  .${PFX}-row.active { background: var(--rp-accent, rgba(120,170,255,0.18)); }
  .${PFX}-row.rprow { flex-wrap: wrap; }
  .${PFX}-row-num { font-size: 10px; opacity: .4; width: 15px; flex-shrink: 0; }
  .${PFX}-row-meta { flex: 1; min-width: 0; }
  .${PFX}-row-t { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-row-a { font-size: 10px; opacity: .5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-row-why { font-size: 10px; opacity: .55; font-style: italic; line-height: 1.3; width: 100%; margin-top: 3px; white-space: normal; }
  .${PFX}-row-src { font-size: 9px; opacity: .55; background: rgba(255,255,255,0.1); border-radius: 5px; padding: 1px 5px; flex-shrink: 0; }
  .${PFX}-row-act { opacity: .35; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-act:active { opacity: 1; }
  .${PFX}-row-act .${PFX}-ic { width: 13px; height: 13px; pointer-events: none; }
  .${PFX}-row-play { opacity: .6; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-play:active { opacity: 1; }
  .${PFX}-row-play .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }
  .${PFX}-row-add { opacity: .55; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-add:active { opacity: 1; }
  .${PFX}-row-add .${PFX}-ic { width: 15px; height: 15px; pointer-events: none; }
  .${PFX}-row-fav { opacity: .55; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-fav:active { opacity: 1; }
  .${PFX}-row-fav .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }
  .${PFX}-rfav { opacity: .5; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-rfav:active { opacity: 1; }
  .${PFX}-rfav .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-more { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 8px; background: rgba(255,255,255,0.03); cursor: pointer; font-size: 11px; opacity: .65; }
  .${PFX}-more:active { background: rgba(255,255,255,0.1); opacity: 1; }
  .${PFX}-more .${PFX}-ic { width: 13px; height: 13px; opacity: .6; }
  .${PFX}-more .${PFX}-spin { width: 12px; height: 12px; }

  .${PFX}-savebar { display: flex; gap: 6px; margin-top: 4px; }
  .${PFX}-savebtn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10px; font-weight: 600; padding: 8px 4px; border-radius: 8px; background: rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-savebtn:active { background: rgba(255,255,255,0.22); }
  .${PFX}-savebtn .${PFX}-ic { width: 13px; height: 13px; pointer-events: none; }
  .${PFX}-savebtn.danger { background: rgba(255,90,90,0.18); }
  .${PFX}-savebtn.danger:active { background: rgba(255,90,90,0.34); }

  .${PFX}-pop { position: absolute; left: 8px; right: 8px; z-index: 5; background: rgba(20,20,30,0.98); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); padding: 10px; display: flex; flex-direction: column; gap: 5px; max-height: 260px; overflow-y: auto; }
  .${PFX}-pop-h { font-size: 11px; font-weight: 700; opacity: .7; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
  .${PFX}-pop-h .${PFX}-row-act { opacity: .6; }
  .${PFX}-pop-item { display: flex; align-items: center; gap: 6px; padding: 8px 9px; border-radius: 8px; background: rgba(255,255,255,0.06); cursor: pointer; font-size: 12px; border: 1px solid transparent; transition: border-color .2s; }
  .${PFX}-pop-item:active { background: rgba(255,255,255,0.18); }
  .${PFX}-pop-item.flash { border-color: #3ad97f; box-shadow: 0 0 6px rgba(58,217,127,0.5); }
  .${PFX}-pop-item .${PFX}-ic { width: 14px; height: 14px; flex-shrink: 0; pointer-events: none; }
  .${PFX}-pop-new { background: var(--rp-accent, rgba(120,170,255,0.25)); font-weight: 600; }
  .${PFX}-pop-msg { font-size: 12px; opacity: .85; padding: 4px 2px 8px; line-height: 1.4; }
  .${PFX}-pop-btns { display: flex; gap: 6px; }
  .${PFX}-pop-btn { flex: 1; text-align: center; font-size: 12px; font-weight: 600; padding: 8px 4px; border-radius: 8px; background: rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-pop-btn:active { background: rgba(255,255,255,0.24); }
  .${PFX}-pop-btn.danger { background: rgba(255,90,90,0.25); }
  .${PFX}-pop-btn.danger:active { background: rgba(255,90,90,0.45); }

  .${PFX}-drawer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 9px; display: flex; flex-direction: column; gap: 7px; }
  .${PFX}-srcrow { display: flex; flex-wrap: wrap; gap: 6px; }
  .${PFX}-srcbtn { flex: 1 1 28%; text-align: center; font-size: 10px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-srcbtn.on { background: var(--rp-accent, rgba(120,170,255,0.28)); border-color: var(--rp-accent, rgba(120,170,255,0.5)); }

  .${PFX}-keybox { display: flex; flex-direction: column; gap: 5px; padding: 8px; border-radius: 8px; background: rgba(0,0,0,0.18); }
  .${PFX}-flabel { font-size: 10px; opacity: .6; text-transform: uppercase; letter-spacing: .03em; margin-top: 2px; }
  .${PFX}-finput { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--rp-text, #f0f0f5); font-size: 12px; padding: 7px 9px; outline: none; font-family: inherit; width: 100%; }
  .${PFX}-flink { font-size: 10px; color: #6cf; text-decoration: none; opacity: .8; cursor: pointer; }
  .${PFX}-ythint { font-size: 10px; opacity: .45; text-align: center; }

  .${PFX}-tabs { display: flex; gap: 6px; }
  .${PFX}-tab { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-tab.on { background: var(--rp-accent, rgba(120,170,255,0.28)); border-color: var(--rp-accent, rgba(120,170,255,0.5)); }
  .${PFX}-tab .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }
  .${PFX}-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .${PFX}-chip { font-size: 10px; padding: 5px 9px; border-radius: 12px; background: rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-chip:active { background: rgba(255,255,255,0.24); }
  .${PFX}-chip.on { background: var(--rp-accent, rgba(120,170,255,0.32)); }
  .${PFX}-chip.meme { background: linear-gradient(90deg, rgba(255,176,46,0.35), rgba(255,47,208,0.35)); font-weight: 700; }
  .${PFX}-chip.meme.on { background: linear-gradient(90deg, rgba(255,176,46,0.8), rgba(255,47,208,0.8)); }

  .${PFX}-acc { border-top: 1px solid rgba(255,255,255,0.08); }
  .${PFX}-acc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 2px; cursor: pointer; }
  .${PFX}-acc-head-lbl { font-size: 11px; font-weight: 700; opacity: .75; }
  .${PFX}-acc-head .${PFX}-ic { width: 14px; height: 14px; opacity: .6; pointer-events: none; }
  .${PFX}-acc-body { display: flex; flex-direction: column; gap: 7px; padding: 2px 0 8px; }

  .${PFX}-toggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); cursor: pointer; }
  .${PFX}-toggle-label { font-size: 12px; font-weight: 600; }
  .${PFX}-toggle-sub { font-size: 9px; opacity: .5; margin-top: 1px; }
  .${PFX}-sw-track { width: 38px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.18); position: relative; flex-shrink: 0; transition: background .2s; }
  .${PFX}-sw-track.on { background: var(--rp-accent, rgba(120,170,255,0.7)); }
  .${PFX}-sw-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; }
  .${PFX}-sw-track.on .${PFX}-sw-knob { left: 18px; }

  .${PFX}-numrow { display: flex; gap: 8px; }
  .${PFX}-numbox { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .${PFX}-numbox input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--rp-text, #f0f0f5); font-size: 13px; padding: 7px; outline: none; text-align: center; font-family: inherit; width: 100%; }
  .${PFX}-profsel { display: flex; align-items: center; justify-content: space-between; gap: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 10px; cursor: pointer; font-size: 12px; }
  .${PFX}-profsel .${PFX}-ic { width: 13px; height: 13px; opacity: .6; }
  .${PFX}-quickbtn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 8px; background: var(--rp-accent, rgba(120,170,255,0.22)); cursor: pointer; font-size: 12px; font-weight: 600; }
  .${PFX}-quickbtn:active { opacity: .8; }
  .${PFX}-quickbtn .${PFX}-ic { width: 15px; height: 15px; }

  .${PFX}-colorpop { display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: rgba(0,0,0,0.28); margin-top: 4px; max-height: min(58vh, 420px); overflow-y: auto; min-height: 0; flex-shrink: 1; }
  .${PFX}-colorpop-h { font-size: 10px; font-weight: 700; opacity: .6; text-transform: uppercase; letter-spacing: .04em; margin: 4px 0 2px; }
  .${PFX}-colorrow { display: flex; gap: 6px; align-items: center; }
  .${PFX}-colorrow input[type="color"] { width: 34px; height: 34px; padding: 0; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: transparent; cursor: pointer; flex-shrink: 0; }
  .${PFX}-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
  .${PFX}-sw { width: 22px; height: 22px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); }
  .${PFX}-oprow { display: flex; align-items: center; gap: 8px; }
  .${PFX}-oprow .${PFX}-ic { width: 14px; height: 14px; opacity: .5; flex-shrink: 0; }
  .${PFX}-oprow input { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.18); border-radius: 2px; outline: none; }
  .${PFX}-oprow input::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: pointer; }
  .${PFX}-oprow input::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: none; cursor: pointer; }
  .${PFX}-opval { font-size: 10px; opacity: .6; width: 34px; text-align: right; }
  .${PFX}-colorbtns { display: flex; gap: 6px; }
  .${PFX}-cbtn2 { flex: 1; font-size: 11px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; text-align: center; transition: background .15s, border-color .15s, transform .1s; }
  .${PFX}-cbtn2:active, .${PFX}-cbtn2.flash { background: var(--rp-accent, rgba(120,170,255,0.5)); border-color: var(--rp-accent, rgba(120,170,255,0.7)); transform: scale(.96); }
  .${PFX}-solidtoggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; border-radius: 8px; background: rgba(255,255,255,0.05); cursor: pointer; }
  .${PFX}-solidtoggle-lbl { font-size: 11px; font-weight: 600; }

  .${PFX}-resize, .${PFX}-resize-left { position: absolute; width: 22px; height: 22px; z-index: 10; opacity: 0; cursor: nwse-resize; touch-action: none; }
  .${PFX}-resize:hover, .${PFX}-resize-left:hover, .${PFX}-root.resizing .${PFX}-resize, .${PFX}-root.resizing .${PFX}-resize-left { opacity: 0.6; }
  .${PFX}-resize { right: 2px; bottom: 2px; }
  .${PFX}-resize-left { left: 2px; bottom: 2px; cursor: nesw-resize; }

  .${PFX}-root[data-theme="neon"] .${PFX}-glass { background: rgba(10,10,18,var(--rp-bg-alpha, 1)); border: 1px solid var(--rp-accent, #ff2fd0); box-shadow: 0 0 8px var(--rp-accent, rgba(255,47,208,0.4)), 0 0 18px var(--rp-accent, rgba(255,47,208,0.15)); }
  .${PFX}-root[data-theme="glass"] .${PFX}-glass { background: rgba(255,255,255,var(--rp-bg-alpha, 0.08)); backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%); border: 1px solid rgba(255,255,255,0.22); box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18); }
  .${PFX}-root[data-theme="neon"] .${PFX}-head-btn,
  .${PFX}-root[data-theme="neon"] .${PFX}-cbtn,
  .${PFX}-root[data-theme="neon"] .${PFX}-note-btn,
  .${PFX}-root[data-theme="neon"] .${PFX}-theme-btn,
  .${PFX}-root[data-theme="neon"] .${PFX}-pill-theme,
  .${PFX}-root[data-theme="neon"] .${PFX}-pill-icon,
  .${PFX}-root[data-theme="neon"] .${PFX}-fab {
  box-shadow:
    0 0 8px var(--rp-accent, rgba(255,47,208,0.75)),
    0 0 18px var(--rp-accent, rgba(255,47,208,0.35));
  }
  .${PFX}-root[data-theme="neon"].${PFX}-fabmode .${PFX}-fab {
  border: 1px solid var(--rp-accent, #ff2fd0);
  box-shadow:
    0 0 10px var(--rp-accent, rgba(255,47,208,0.85)),
    0 0 24px var(--rp-accent, rgba(255,47,208,0.45)),
    0 0 42px var(--rp-accent, rgba(255,47,208,0.22));
}
  .${PFX}-root[data-theme="neon"] .${PFX}-ic { filter: drop-shadow(0 0 2px var(--rp-accent, rgba(255,47,208,0.7))); }
  .${PFX}-root[data-theme="paper"] .${PFX}-glass { background: rgba(244,236,216,var(--rp-bg-alpha, 1)); border: 1px solid #c9b48a; box-shadow: 0 4px 14px rgba(80,60,30,0.25); color: var(--rp-text, #3a2f1c); }
  .${PFX}-root[data-theme="paper"] { color: var(--rp-text, #3a2f1c); }
  .${PFX}-root[data-theme="paper"] .${PFX}-note-btn, .${PFX}-root[data-theme="paper"] .${PFX}-head-btn, .${PFX}-root[data-theme="paper"] .${PFX}-cbtn, .${PFX}-root[data-theme="paper"] .${PFX}-theme-btn, .${PFX}-root[data-theme="paper"] .${PFX}-pill-icon, .${PFX}-root[data-theme="paper"] .${PFX}-pill-theme, .${PFX}-root[data-theme="paper"] .${PFX}-srcbtn, .${PFX}-root[data-theme="paper"] .${PFX}-savebtn, .${PFX}-root[data-theme="paper"] .${PFX}-row, .${PFX}-root[data-theme="paper"] .${PFX}-tab, .${PFX}-root[data-theme="paper"] .${PFX}-chip, .${PFX}-root[data-theme="paper"] .${PFX}-toggle { background: rgba(120,90,40,0.1); }
  .${PFX}-root[data-theme="paper"] .${PFX}-search input, .${PFX}-root[data-theme="paper"] .${PFX}-finput, .${PFX}-root[data-theme="paper"] .${PFX}-numbox input, .${PFX}-root[data-theme="paper"] .${PFX}-profsel { background: rgba(120,90,40,0.08); color: var(--rp-text, #3a2f1c); border-color: rgba(120,90,40,0.25); }
  .${PFX}-root[data-theme="paper"] .${PFX}-pop { background: #f4ecd8; color: var(--rp-text, #3a2f1c); border-color: #c9b48a; }
  .${PFX}-root[data-theme="paper"] .${PFX}-pop-item { background: rgba(120,90,40,0.1); }
  .${PFX}-root[data-theme="minimal"] .${PFX}-glass { background: color-mix(in srgb, var(--SmartThemeBodyColor, #888) calc(var(--rp-bg-alpha, 0.06) * 100%), transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid color-mix(in srgb, var(--SmartThemeBodyColor, #888) 16%, transparent); box-shadow: none; color: var(--rp-text, var(--SmartThemeBodyColor, #eee)); }
  .${PFX}-root[data-theme="minimal"] { color: var(--rp-text, var(--SmartThemeBodyColor, #eee)); }
  .${PFX}-root[data-theme="minimal"] .${PFX}-note-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-head-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-cbtn, .${PFX}-root[data-theme="minimal"] .${PFX}-theme-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-pill-icon, .${PFX}-root[data-theme="minimal"] .${PFX}-pill-theme, .${PFX}-root[data-theme="minimal"] .${PFX}-row, .${PFX}-root[data-theme="minimal"] .${PFX}-srcbtn, .${PFX}-root[data-theme="minimal"] .${PFX}-savebtn, .${PFX}-root[data-theme="minimal"] .${PFX}-tab, .${PFX}-root[data-theme="minimal"] .${PFX}-chip, .${PFX}-root[data-theme="minimal"] .${PFX}-toggle { background: color-mix(in srgb, var(--SmartThemeBodyColor, #888) 8%, transparent); }

  .${PFX}-root.${PFX}-solid .${PFX}-row, .${PFX}-root.${PFX}-solid .${PFX}-srcbtn, .${PFX}-root.${PFX}-solid .${PFX}-savebtn, .${PFX}-root.${PFX}-solid .${PFX}-tab, .${PFX}-root.${PFX}-solid .${PFX}-chip, .${PFX}-root.${PFX}-solid .${PFX}-toggle, .${PFX}-root.${PFX}-solid .${PFX}-cbtn2, .${PFX}-root.${PFX}-solid .${PFX}-more, .${PFX}-root.${PFX}-solid .${PFX}-pop-item { background: rgba(0,0,0,0.45) !important; }
  .${PFX}-root.${PFX}-solid .${PFX}-head-btn, .${PFX}-root.${PFX}-solid .${PFX}-cbtn, .${PFX}-root.${PFX}-solid .${PFX}-note-btn, .${PFX}-root.${PFX}-solid .${PFX}-theme-btn, .${PFX}-root.${PFX}-solid .${PFX}-pill-icon, .${PFX}-root.${PFX}-solid .${PFX}-pill-theme, .${PFX}-root.${PFX}-solid .${PFX}-search-btn { background: rgba(0,0,0,0.5) !important; }
  .${PFX}-root.${PFX}-solid .${PFX}-search input, .${PFX}-root.${PFX}-solid .${PFX}-finput, .${PFX}-root.${PFX}-solid .${PFX}-numbox input, .${PFX}-root.${PFX}-solid .${PFX}-profsel, .${PFX}-root.${PFX}-solid .${PFX}-keybox { background: rgba(0,0,0,0.55) !important; }
  .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-row, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-srcbtn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-savebtn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-tab, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-chip, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-toggle, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-cbtn2, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-more { background: rgba(120,90,40,0.32) !important; }
  .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-head-btn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-cbtn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-note-btn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-theme-btn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-pill-icon, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-pill-theme { background: rgba(120,90,40,0.4) !important; }

  .${PFX}-root.${PFX}-solid-light .${PFX}-row, .${PFX}-root.${PFX}-solid-light .${PFX}-srcbtn, .${PFX}-root.${PFX}-solid-light .${PFX}-savebtn, .${PFX}-root.${PFX}-solid-light .${PFX}-tab, .${PFX}-root.${PFX}-solid-light .${PFX}-chip, .${PFX}-root.${PFX}-solid-light .${PFX}-toggle, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn2, .${PFX}-root.${PFX}-solid-light .${PFX}-more, .${PFX}-root.${PFX}-solid-light .${PFX}-pop-item { background: rgba(255,255,255,0.5) !important; }
  .${PFX}-root.${PFX}-solid-light .${PFX}-head-btn, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn, .${PFX}-root.${PFX}-solid-light .${PFX}-note-btn, .${PFX}-root.${PFX}-solid-light .${PFX}-theme-btn, .${PFX}-root.${PFX}-solid-light .${PFX}-pill-icon, .${PFX}-root.${PFX}-solid-light .${PFX}-pill-theme, .${PFX}-root.${PFX}-solid-light .${PFX}-search-btn { background: rgba(255,255,255,0.55) !important; }
  .${PFX}-root.${PFX}-solid-light .${PFX}-search input, .${PFX}-root.${PFX}-solid-light .${PFX}-finput, .${PFX}-root.${PFX}-solid-light .${PFX}-numbox input, .${PFX}-root.${PFX}-solid-light .${PFX}-profsel, .${PFX}-root.${PFX}-solid-light .${PFX}-keybox { background: rgba(255,255,255,0.6) !important; }

  .${PFX}-root.${PFX}-solid .${PFX}-row.active, .${PFX}-root.${PFX}-solid-light .${PFX}-row.active,
  .${PFX}-root.${PFX}-solid .${PFX}-srcbtn.on, .${PFX}-root.${PFX}-solid-light .${PFX}-srcbtn.on,
  .${PFX}-root.${PFX}-solid .${PFX}-tab.on, .${PFX}-root.${PFX}-solid-light .${PFX}-tab.on,
  .${PFX}-root.${PFX}-solid .${PFX}-chip.on, .${PFX}-root.${PFX}-solid-light .${PFX}-chip.on,
  .${PFX}-root.${PFX}-solid .${PFX}-head-btn.on, .${PFX}-root.${PFX}-solid-light .${PFX}-head-btn.on,
  .${PFX}-root.${PFX}-solid .${PFX}-sw-track.on, .${PFX}-root.${PFX}-solid-light .${PFX}-sw-track.on,
  .${PFX}-root.${PFX}-solid .${PFX}-quickbtn, .${PFX}-root.${PFX}-solid-light .${PFX}-quickbtn,
  .${PFX}-root.${PFX}-solid .${PFX}-pop-new, .${PFX}-root.${PFX}-solid-light .${PFX}-pop-new,
  .${PFX}-root.${PFX}-solid .${PFX}-pill-vibe, .${PFX}-root.${PFX}-solid-light .${PFX}-pill-vibe,
  .${PFX}-root.${PFX}-solid .${PFX}-cbtn2:active, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn2:active,
  .${PFX}-root.${PFX}-solid .${PFX}-cbtn2.flash, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn2.flash,
  .${PFX}-root.${PFX}-solid .${PFX}-fab.vibe, .${PFX}-root.${PFX}-solid-light .${PFX}-fab.vibe { background: var(--rp-accent, rgba(120,170,255,0.7)) !important; }

  .${PFX}-bgrow { display: flex; gap: 8px; align-items: center; }
  .${PFX}-bgfile-label { flex: 1; display: inline-block; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 7px 9px; font-size: 11px; cursor: pointer; text-align: center; color: #ccc; }
  .${PFX}-bgfile-input { display: none; }
  .${PFX}-bgfile-name { font-size: 10px; opacity: 0.7; margin-top: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `;
  let root, shell, ytLayer, bodyEl;
  let searchTab = 'all';
  let colorPopOpen = false;
  let plPop = null;
  let editId = null, editKind = null;
  let profPop = false;

  const SWATCHES = ['#ff2fd0', '#7aa6ff', '#00e0c6', '#ffb02e', '#ff5c5c', '#a06bff', '#3ad97f', '#ff8fb3'];
  const TEXT_SWATCHES = ['#ffffff', '#000000', '#f0f0f5', '#3a2f1c', '#cccccc', '#ffe9a8', '#a8e0ff', '#ffb3c6'];

  function cleanupAll() {
    const sid = scriptId();
    try {
      if ($j && sid) {
        $j('body > div[script_id="' + sid + '"]').remove();
        $j('head > div[script_id="' + sid + '"]').remove();
      }
    } catch (_) {}
    try {
      document.querySelectorAll('[class*="' + PFX + '"], .lg-widget').forEach(function (el) {
        el.remove();
      });
      document.querySelectorAll('style').forEach(function (st) {
        if (st.id === PFX + '-css' || (st.textContent && st.textContent.indexOf(PFX) !== -1)) st.remove();
      });
    } catch (_) {}
    try {
      if ($j) $j(window).off('.' + PFX);
    } catch (_) {}
  }

  function getMount() {
    const sid = scriptId();
    if ($j && sid) {
      const host = $j('<div>').attr('script_id', sid);
      $j('body').append(host);
      return host[0];
    }
    return document.body;
  }

  function injectStyles() {
    const st = document.createElement('style');
    st.id = PFX + '-css';
    st.textContent = CSS;
    const sid = scriptId();
    if ($j && sid) {
      const wrap = $j('<div>').attr('script_id', sid).append(st);
      $j('head').append(wrap);
    } else {
      (document.head || document.documentElement).appendChild(st);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function placeholderText() {
    if (cfg.source === 'ytlink') return 'Ссылка YouTube (трек/плейлист)';
    return 'Имя (топ) или Имя — Трек';
  }

  function syncYtLayer() {
    if (!ytLayer) return;
    const t = curTrack();
    const yt = isYtTrack(t);
    if (yt && ytCurrentEmbed) {
      const existing = ytLayer.querySelector('iframe');
      const want = ytCurrentEmbed;
      if (!existing || existing.getAttribute('data-src') !== want) {
        ytLayer.innerHTML = '';
        const f = document.createElement('iframe');
        f.setAttribute('data-src', want);
        f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('referrerpolicy', 'origin');
        f.src = want;
        ytLayer.appendChild(f);

        const eye = document.createElement('div');
        eye.className = PFX + '-yteye';
        eye.setAttribute('data-yteye', '1');
        eye.innerHTML = ytHidden ? ICONS.eyeOff : ICONS.eye;
        ytLayer.appendChild(eye);

        const cls = document.createElement('div');
        cls.className = PFX + '-ytclose';
        cls.setAttribute('data-ytclose', '1');
        cls.innerHTML = ICONS.close;
        ytLayer.appendChild(cls);
      } else {
        const eye = ytLayer.querySelector('.' + PFX + '-yteye');
        if (eye) eye.innerHTML = ytHidden ? ICONS.eyeOff : ICONS.eye;
      }
      ytLayer.classList.add('show');
      ytLayer.classList.toggle('hidden-layer', ytHidden);
    } else {
      ytLayer.innerHTML = '';
      ytCurrentEmbed = null;
      ytLayer.className = PFX + '-ytlayer';
    }
  }

  function applyEyeState() {
    if (!ytLayer) return;
    if (ytLayer.classList.contains('show')) ytLayer.classList.toggle('hidden-layer', ytHidden);
    const eye = ytLayer.querySelector('.' + PFX + '-yteye');
    if (eye) eye.innerHTML = ytHidden ? ICONS.eyeOff : ICONS.eye;
  }

  function closeYt() {
    currentPlayId++;
    ytCurrentEmbed = null;

    if (ytLayer) {
      ytLayer.innerHTML = '';
      ytLayer.className = PFX + '-ytlayer';
    }

    const t = curTrack();
    if (isYtTrack(t)) isPlaying = false;

    render();
  }

  function fabShowsVibe() {
    if (!rpEnabled() || !cfg.rpQuick) return false;

    if (window.__rpRadioNow) return false;

    if (curIdx >= 0 && queue[curIdx]) {
      const lastOneEnded = trackEnded && queue.length <= 1;
      return lastOneEnded;
    }

    return true;
  }

  function fabHTML() {
    const showVibe = fabShowsVibe();
    let inner;
    if (showVibe) {
      inner = rpBusy ? '<span class="' + PFX + '-spin"></span>' : ICONS.wand;
    } else {
      inner = isPlaying ? ICONS.pause : ICONS.play;
    }
    return '<div class="' + PFX + '-glass ' + PFX + '-fab' + (showVibe ? ' vibe' : '') + '" data-handle data-fabbtn' +
      (showVibe ? ' data-fabvibe="1"' : '') + '>' + inner + '</div>';
  }

  function pillHTML() {
    const cur = curTrack();
    let label = cur ? (cur.title || 'Музыка') : 'Музыка';
    if (!cur && window.__rpRadioNow) label = window.__rpRadioNow.name;
    let h = '<div class="' + PFX + '-glass ' + PFX + '-pill" data-handle>' +
      '<div class="' + PFX + '-pill-text ' + PFX + '-marq"><span class="' + PFX + '-marq-inner">' + esc(label) + '</span></div>' +
      '<div class="' + PFX + '-pill-controls">';
    if (rpEnabled()) h += '<div class="' + PFX + '-pill-vibe" data-quickvibe>' + (rpBusy ? '<span class="' + PFX + '-spin"></span>' : ICONS.wand) + '</div>';
    h += '<div class="' + PFX + '-pill-theme" data-themebtn>' + ICONS.palette + '</div>';
    h += '<div class="' + PFX + '-pill-icon" data-play data-fabsource>' + (isPlaying ? ICONS.pause : ICONS.play) + '</div>';
    h += '</div></div>';
    return h;
  }

  function yminHTML() {
    const vibeBtn = rpEnabled() ? '<div class="' + PFX + '-pill-vibe" data-quickvibe>' + (rpBusy ? '<span class="' + PFX + '-spin"></span>' : ICONS.wand) + '</div>' : '';
    return '<div class="' + PFX + '-glass ' + PFX + '-ymin" data-handle>' +
      '<div class="' + PFX + '-ymin-body">' +
        '<div class="' + PFX + '-ymin-title ' + PFX + '-marq"><span class="' + PFX + '-marq-inner">' + esc('Музыка') + '</span></div>' +
        '<div class="' + PFX + '-ymin-controls">' +
          '<button class="' + PFX + '-cbtn ' + PFX + '-cbtn-sm" data-prev>' + ICONS.prev + '</button>' +
          '<button class="' + PFX + '-cbtn ' + PFX + '-cbtn-sm" data-next>' + ICONS.next + '</button>' +
        '</div>' +
        '<div class="' + PFX + '-ymin-actions">' +
          vibeBtn +
          '<div class="' + PFX + '-note-btn" data-play data-fabsource>' + (isPlaying ? ICONS.pause : ICONS.play) + '</div>' +
          '<div class="' + PFX + '-head-btn" data-themebtn>' + ICONS.palette + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function favBtnHTML(t, attr) {
    const on = isFav(t);
    return '<span class="' + PFX + '-row-fav" ' + attr + '>' + (on ? ICONS.heartFill : ICONS.heart) + '</span>';
  }

  function resultsHTML() {
    let h = '<div class="' + PFX + '-sec-h"><span>' + esc(resultsTitle || 'Результаты') + ' (' + results.length + ')</span>' +
      '<span class="' + PFX + '-sec-h-actions">' +
        '<span class="' + PFX + '-sec-h-btn" data-restoggle>' + (resCollapsed ? ICONS.chevron : ICONS.chevronUp) + '</span>' +
        '<span class="' + PFX + '-sec-h-btn" data-resclear>' + ICONS.close + '</span>' +
      '</span></div>';
    if (resCollapsed) return h;
    h += '<div class="' + PFX + '-sec" data-scrollsec="results">';
    results.forEach(function (t, i) {
      h += '<div class="' + PFX + '-row' + (t.why ? ' rprow' : '') + '" data-resplay="' + i + '">' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(t.title) + '</div><div class="' + PFX + '-row-a">' + esc(t.artist) + '</div></div>' +
        (t.source ? '<span class="' + PFX + '-row-src">' + esc(t.source) + '</span>' : '') +
        favBtnHTML(t, 'data-resfav="' + i + '"') +
        '<span class="' + PFX + '-row-add" data-resadd="' + i + '">' + ICONS.plus + '</span>' +
        (t.why ? '<div class="' + PFX + '-row-why">🎵 ' + esc(t.why) + '</div>' : '') +
      '</div>';
    });
    if (!resultsRp && !searchState.exhausted && cfg.source !== 'ytlink' && !(searchState.scope === 'src' && cfg.source === 'baibai')) {
      h += '<div class="' + PFX + '-more" data-more>' + (searching ? '<span class="' + PFX + '-spin"></span>Ищу…' : ICONS.search + 'Искать дальше') + '</div>';
    }
    h += '</div>';
    return h;
  }

  function keyBoxHTML() {
    if (cfg.source === 'jamendo') {
      return '<div class="' + PFX + '-keybox">' +
        '<div class="' + PFX + '-flabel">Jamendo Client ID</div>' +
        '<input class="' + PFX + '-finput" data-cfg="jamendoKey" placeholder="по умолч. встроенный" value="' + esc(cfg.jamendoKey) + '">' +
        '<span class="' + PFX + '-flink" data-link="https://developer.jamendo.com">→ получить ключ Jamendo</span>' +
      '</div>';
    }
    if (cfg.source === 'youtube') {
      return '<div class="' + PFX + '-keybox">' +
        '<div class="' + PFX + '-flabel">YouTube API ключ</div>' +
        '<input class="' + PFX + '-finput" data-cfg="ytKey" placeholder="по умолч. встроенный" value="' + esc(cfg.ytKey) + '">' +
        '<span class="' + PFX + '-flink" data-link="https://console.cloud.google.com">→ получить ключ YouTube</span>' +
      '</div>';
    }
    if (cfg.source === 'ytlink') {
      return '<div class="' + PFX + '-keybox"><div class="' + PFX + '-ythint">Вставь ссылку на видео или плейлист YouTube в поле поиска</div></div>';
    }
    return '';
  }

  function searchHTML() {
    let h = '<div class="' + PFX + '-drawer">';
    h += '<div class="' + PFX + '-tabs">' +
      '<div class="' + PFX + '-tab ' + (searchTab === 'all' ? 'on' : '') + '" data-stab="all">Поиск везде</div>' +
      '<div class="' + PFX + '-tab ' + (searchTab === 'src' ? 'on' : '') + '" data-stab="src">Источник</div>' +
    '</div>';
    h += '<div class="' + PFX + '-search">' +
      '<input type="text" data-q placeholder="' + esc(placeholderText()) + '">' +
      (searching ? '<button class="' + PFX + '-search-btn" data-cancel-search title="Отменить поиск">' + ICONS.cancelX + '</button>' : '<button class="' + PFX + '-search-btn" data-find>' + ICONS.search + '</button>') +
    '</div>';
    if (searching) {
      h += '<div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; font-size: 11px; color: var(--rp-accent, #7aa6ff); opacity: 0.9;">' +
        '<span class="' + PFX + '-spin" style="width: 14px; height: 14px; border-width: 2px;"></span>' +
        '<span>' + (statusMsg ? esc(statusMsg) : 'Шуршу в интернетах...') + '</span>' +
      '</div>';
    }
    if (searchTab === 'src') {
      h += '<div class="' + PFX + '-flabel">Источник</div>' +
        '<div class="' + PFX + '-srcrow">' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'youtube' ? 'on' : '') + '" data-src="youtube">YouTube API</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'jamendo' ? 'on' : '') + '" data-src="jamendo">Jamendo</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'ytlink' ? 'on' : '') + '" data-src="ytlink">YouTube</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'baibai' ? 'on' : '') + '" data-src="baibai">baibai</div>' +
        '</div>' +
        keyBoxHTML();
    }
    if (results.length) h += resultsHTML();
    if (cfg.rpQuick) {
      h += '<div class="' + PFX + '-quickbtn" data-quickvibe style="margin-top:6px;">' + (rpBusy ? '<span class="' + PFX + '-spin"></span>' : ICONS.wand) + 'Вайб сцены</div>';
      if (rpBusy) h += '<div class="' + PFX + '-savebtn" data-cancel-rp style="margin-top:6px;">' + ICONS.cancelX + '<span>Отменить</span></div>';
    }
    h += '</div>';
    return h;
  }

  function trackRowEdit(t, i) {
    return '<div class="' + PFX + '-row" data-pltrack="' + i + '">' +
      '<span class="' + PFX + '-row-num">' + (i + 1) + '</span>' +
      '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(t.title) + '</div><div class="' + PFX + '-row-a">' + esc(t.artist) + '</div></div>' +
      (t.source ? '<span class="' + PFX + '-row-src">' + esc(t.source) + '</span>' : '') +
      favBtnHTML(t, 'data-plfav="' + i + '"') +
      '<span class="' + PFX + '-row-act" data-trkdel="' + i + '">' + ICONS.close + '</span>' +
    '</div>';
  }

  function libHTML() {
    let h = '<div class="' + PFX + '-sec" data-scrollsec="lib">';

    if (editKind === 'fav') {
      h += '<div class="' + PFX + '-sec-h"><span>Избранное · ред.</span>' +
        '<span class="' + PFX + '-sec-h-actions">' +
          '<span class="' + PFX + '-sec-h-btn" data-loadfavqueue="1" title="В очередь">' + ICONS.play + '</span>' +
          '<span class="' + PFX + '-sec-h-btn" data-exportopen="fav" title="Экспорт">' + ICONS.download + '</span>' +
        '</span></div>';
      if (!lib.favorites.length) h += '<div class="' + PFX + '-empty">Пусто</div>';
      else lib.favorites.forEach(function (t, i) {
        h += '<div class="' + PFX + '-row" data-favtrack="' + i + '">' +
          '<span class="' + PFX + '-row-num">' + (i + 1) + '</span>' +
          '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(t.title) + '</div><div class="' + PFX + '-row-a">' + esc(t.artist) + '</div></div>' +
          (t.source ? '<span class="' + PFX + '-row-src">' + esc(t.source) + '</span>' : '') +
          '<span class="' + PFX + '-row-act" data-favdel="' + i + '">' + ICONS.close + '</span>' +
        '</div>';
      });
      h += '<div class="' + PFX + '-savebar"><div class="' + PFX + '-savebtn" data-editback>' + ICONS.chevron + '<span>Назад</span></div></div>';
      h += '</div>';
      return h;
    }

    if (editId !== null) {
      let pl = null;
      if (editKind === 'm') pl = lib.manual.find(function (x) { return x.id === editId; });
      else pl = lib.rp[editId];
      if (!pl) {
        editId = null;
        editKind = null;
      } else {
        h += '<div class="' + PFX + '-sec-h"><span>' + esc(pl.name) + ' · ред.</span>' +
          '<span class="' + PFX + '-sec-h-actions">' +
            '<span class="' + PFX + '-sec-h-btn" data-editplay="' + editKind + '" title="В очередь">' + ICONS.play + '</span>' +
            '<span class="' + PFX + '-sec-h-btn" data-exportopen="' + editKind + '" title="Экспорт">' + ICONS.download + '</span>' +
          '</span></div>';
        if (exportPop) {
          h += '<div class="' + PFX + '-colorbtns" style="margin:2px 0 6px;">' +
            '<div class="' + PFX + '-cbtn2" data-exportdo="text">Текст (.txt)</div>' +
            '<div class="' + PFX + '-cbtn2" data-exportdo="json">JSON (.json)</div>' +
            '<div class="' + PFX + '-cbtn2" data-exportcancel>Отмена</div>' +
          '</div>';
        }
        if (!pl.tracks || !pl.tracks.length) h += '<div class="' + PFX + '-empty">Пусто</div>';
        else pl.tracks.forEach(function (t, i) {
          h += trackRowEdit(t, i);
        });
        h += '<div class="' + PFX + '-savebar"><div class="' + PFX + '-savebtn" data-editback>' + ICONS.chevron + '<span>Назад</span></div></div>';
        h += '</div>';
        return h;
      }
    }

    h += '<div class="' + PFX + '-sec-h">Избранное</div>';
    if (!lib.favorites.length) h += '<div class="' + PFX + '-empty">Лайкните трек ♥, чтобы создать</div>';
    else {
      h += '<div class="' + PFX + '-row" data-openfav="1">' +
        '<span class="' + PFX + '-row-fav" style="opacity:1;pointer-events:none;">' + ICONS.heartFill + '</span>' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">Избранное</div><div class="' + PFX + '-row-a">' + lib.favorites.length + ' треков</div></div>' +
        '<span class="' + PFX + '-row-play" data-loadfav="1" title="В очередь">' + ICONS.play + '</span>' +
        '<span class="' + PFX + '-row-act" data-delfav="1">' + ICONS.close + '</span>' +
      '</div>';
    }

    h += '<div class="' + PFX + '-sec-h">Ручные плейлисты</div>';
    if (!lib.manual.length) h += '<div class="' + PFX + '-empty">Нет сохранённых</div>';
    else lib.manual.forEach(function (p) {
      h += '<div class="' + PFX + '-row" data-openm="' + p.id + '">' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(p.name) + '</div><div class="' + PFX + '-row-a">' + (p.tracks ? p.tracks.length : 0) + ' треков</div></div>' +
        '<span class="' + PFX + '-row-act" data-renm="' + p.id + '">' + ICONS.edit + '</span>' +
        '<span class="' + PFX + '-row-play" data-loadm="' + p.id + '" title="В очередь">' + ICONS.play + '</span>' +
        '<span class="' + PFX + '-row-act" data-delm="' + p.id + '">' + ICONS.close + '</span>' +
      '</div>';
      if (confirmDelete && confirmDelete.kind === 'm' && confirmDelete.id === p.id) {
        h += '<div class="' + PFX + '-pop-btns" style="margin:2px 0 6px;">' +
          '<div class="' + PFX + '-pop-btn danger" data-confirmdel>Удалить</div>' +
          '<div class="' + PFX + '-pop-btn" data-confirmcancel>Отмена</div>' +
        '</div>';
      }
    });

    h += '<div class="' + PFX + '-sec-h">Плейлисты РП (по чатам)</div>';
    const keys = Object.keys(lib.rp);
    if (!keys.length) h += '<div class="' + PFX + '-empty">Нет сохранённых</div>';
    else keys.forEach(function (cid) {
      const p = lib.rp[cid];
      h += '<div class="' + PFX + '-row" data-openrp="' + esc(cid) + '">' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(p.name) + '</div><div class="' + PFX + '-row-a">' + (p.tracks ? p.tracks.length : 0) + ' треков</div></div>' +
        '<span class="' + PFX + '-row-act" data-renrp="' + esc(cid) + '">' + ICONS.edit + '</span>' +
        '<span class="' + PFX + '-row-play" data-loadrp="' + esc(cid) + '" title="В очередь">' + ICONS.play + '</span>' +
        '<span class="' + PFX + '-row-act" data-delrp="' + esc(cid) + '">' + ICONS.close + '</span>' +
      '</div>';
      if (confirmDelete && confirmDelete.kind === 'rp' && confirmDelete.id === cid) {
        h += '<div class="' + PFX + '-pop-btns" style="margin:2px 0 6px;">' +
          '<div class="' + PFX + '-pop-btn danger" data-confirmdel>Удалить</div>' +
          '<div class="' + PFX + '-pop-btn" data-confirmcancel>Отмена</div>' +
        '</div>';
      }
    });
    h += '</div>';
    return h;
  }

  function queueHTML() {
    let h = '<div class="' + PFX + '-sec-h"><span>Очередь (' + queue.length + ')</span>' +
      '<span class="' + PFX + '-sec-h-actions">' +
        (queue.length ? '<span class="' + PFX + '-sec-h-btn" data-clearqueue title="Очистить очередь">' + ICONS.close + '</span>' : '') +
        '<span class="' + PFX + '-sec-h-btn" data-queuetoggle>' + (queueCollapsed ? ICONS.chevron : ICONS.chevronUp) + '</span>' +
      '</span></div>';

    if (queueCollapsed) return h;

    if (!queue.length) {
      return h + '<div class="' + PFX + '-sec"><div class="' + PFX + '-empty">Очередь пуста</div></div>';
    }

    h += '<div class="' + PFX + '-sec" data-scrollsec="queue">';
    queue.forEach(function (t, i) {
      const act = (i === curIdx);
      h += '<div class="' + PFX + '-row' + (act ? ' active' : '') + '" data-pl="' + i + '">' +
        '<span class="' + PFX + '-row-num">' + (i + 1) + '</span>' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t' + (act ? ' ' + PFX + '-marq' : '') + '">' + (act ? '<span class="' + PFX + '-marq-inner">' + esc(t.title) + '</span>' : esc(t.title)) + '</div><div class="' + PFX + '-row-a">' + esc(t.artist) + '</div></div>' +
        (t.source ? '<span class="' + PFX + '-row-src">' + esc(t.source) + '</span>' : '') +
        favBtnHTML(t, 'data-qfav="' + i + '"') +
        '<span class="' + PFX + '-row-add" data-qadd="' + i + '">' + ICONS.plus + '</span>' +
        '<span class="' + PFX + '-row-act" data-pledit="' + i + '">' + ICONS.edit + '</span>' +
        '<span class="' + PFX + '-row-act" data-pldel="' + i + '">' + ICONS.close + '</span>' +
      '</div>';
    });

    h += '</div><div class="' + PFX + '-savebar">' +
      '<div class="' + PFX + '-savebtn" data-savemanual>' + ICONS.save + '<span>В ручные</span></div>' +
      '<div class="' + PFX + '-savebtn" data-saverp>' + ICONS.save + '<span>В РП-чат</span></div>' +
    '</div>';

    return h;
  }

  function radioHTML() {
    let h = '<div class="' + PFX + '-drawer">';
    h += '<div class="' + PFX + '-tabs">' +
      '<div class="' + PFX + '-tab ' + (radioTab === 'soma' ? 'on' : '') + '" data-rtab="soma">SomaFM</div>' +
      '<div class="' + PFX + '-tab ' + (radioTab === 'browser' ? 'on' : '') + '" data-rtab="browser">Browser</div>' +
      '<div class="' + PFX + '-tab ' + (radioTab === 'fav' ? 'on' : '') + '" data-rtab="fav">' + ICONS.heartFill + '</div>' +
    '</div>';

    function stationRow(s, extra) {
      const fav = isRadioFav(s.url);
      return '<div class="' + PFX + '-row" data-rplay="' + esc(s.url) + '" data-rname="' + esc(s.name) + '" data-rtag="' + esc(s.tag || '') + '">' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(s.name) + '</div><div class="' + PFX + '-row-a">' + esc(s.tag || '') + '</div></div>' +
        '<span class="' + PFX + '-rfav" data-rfav="' + esc(s.url) + '" data-rfname="' + esc(s.name) + '" data-rftag="' + esc(s.tag || '') + '">' + (fav ? ICONS.heartFill : ICONS.heart) + '</span>' +
        (extra || '') + '</div>';
    }

    if (radioTab === 'soma') {
      h += '<div class="' + PFX + '-sec" data-scrollsec="radio">';
      SOMA_STATIONS.forEach(function (s) { h += stationRow(s); });
      h += '<div class="' + PFX + '-more" data-somamore>' +
        (somaLoading ? '<span class="' + PFX + '-spin"></span>Загружаю…' : ICONS.search + (somaLoadedFromApi ? 'Обновить список SomaFM' : 'Загрузить ещё станции SomaFM')) +
      '</div>';
      h += '</div>';
    } else if (radioTab === 'browser') {
      h += '<div class="' + PFX + '-search" style="margin-top:7px">' +
        '<input type="text" data-rq placeholder="Жанр, страна, язык...">' +
        '<button class="' + PFX + '-search-btn" data-rfind>' + ICONS.search + '</button>' +
      '</div>';
      h += '<div class="' + PFX + '-chips">';
      RADIO_CHIPS.forEach(function (c) {
        h += '<div class="' + PFX + '-chip" data-rchip="' + c + '">' + c + '</div>';
      });
      h += '</div>';
      h += '<div class="' + PFX + '-sec" data-scrollsec="radio">';
      if (!radioResults.length) h += '<div class="' + PFX + '-empty">' + (statusMsg && statusMsg.indexOf('адио') >= 0 ? esc(statusMsg) : 'Введите запрос или тапните тег') + '</div>';
      else radioResults.forEach(function (s) { h += stationRow(s); });
      h += '</div>';
    } else {
      h += '<div class="' + PFX + '-sec" data-scrollsec="radio">';
      if (!radioFav.length) h += '<div class="' + PFX + '-empty">Нет избранных станций</div>';
      else radioFav.forEach(function (s) {
        h += stationRow(s, '<span class="' + PFX + '-row-act" data-rdelfav="' + esc(s.url) + '">' + ICONS.close + '</span>');
      });
      h += '</div>';
    }

    return h + '</div>';
  }
  function rpHTML() {
    let h = '<div class="' + PFX + '-drawer">';
    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpAuto"><div><div class="' + PFX + '-toggle-label">Авто-режим</div><div class="' + PFX + '-toggle-sub">подбор каждые N сообщений</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpAuto ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';

    if (cfg.rpAuto) {
      h += '<div class="' + PFX + '-numrow">' +
        '<div class="' + PFX + '-numbox"><div class="' + PFX + '-flabel">Каждые (сообщ.)</div><input type="number" min="2" max="100" data-rpnum="rpEvery" value="' + (cfg.rpEvery || 10) + '"></div>' +
        '<div class="' + PFX + '-numbox"><div class="' + PFX + '-flabel">Треков</div><input type="number" min="1" max="10" data-rpnum="rpCount" value="' + (cfg.rpCount || 5) + '"></div>' +
      '</div>';
    }

    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpQuick"><div><div class="' + PFX + '-toggle-label">Быстрый режим</div><div class="' + PFX + '-toggle-sub">кнопка «Вайб сцены» во вкладке «Поиск» и в свёрнутом виде</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpQuick ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';

    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpAutoplay"><div><div class="' + PFX + '-toggle-label">Авто-воспроизведение</div><div class="' + PFX + '-toggle-sub">сразу включать найденный трек (оба режима). Выкл — только пульсация</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpAutoplay ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';

    if (cfg.rpQuick) {
      h += '<div class="' + PFX + '-quickbtn" data-quickvibe>' + (rpBusy ? '<span class="' + PFX + '-spin"></span>' : ICONS.wand) + 'Вайб сцены</div>';
      if (rpBusy) h += '<div class="' + PFX + '-savebtn" data-cancel-rp style="margin-top:6px;">' + ICONS.cancelX + '<span>Отменить</span></div>';
    }

    h += '<div class="' + PFX + '-flabel">Профиль подключения</div>';
    h += '<div class="' + PFX + '-profsel" data-profsel><span>' + esc(profileName(cfg.rpProfile)) + '</span>' + ICONS.chevron + '</div>';

    h += '<div class="' + PFX + '-acc"><div class="' + PFX + '-acc-head" data-rpacc="source"><span class="' + PFX + '-acc-head-lbl">Источник подбора</span>' + (rpAccSource ? ICONS.chevronUp : ICONS.chevron) + '</div>';
    if (rpAccSource) {
      h += '<div class="' + PFX + '-acc-body"><div class="' + PFX + '-srcrow">' +
        '<div class="' + PFX + '-srcbtn ' + (cfg.rpSource === 'youtube' ? 'on' : '') + '" data-rpsrc="youtube">Только YouTube</div>' +
        '<div class="' + PFX + '-srcbtn ' + (cfg.rpSource === 'jamendo' ? 'on' : '') + '" data-rpsrc="jamendo">Только Jamendo</div>' +
        '<div class="' + PFX + '-srcbtn ' + (cfg.rpSource === 'baibai' ? 'on' : '') + '" data-rpsrc="baibai">Только baibai</div>' +
        '<div class="' + PFX + '-srcbtn ' + (cfg.rpSource === 'auto' ? 'on' : '') + '" data-rpsrc="auto">Везде (все)</div>' +
      '</div></div>';
    }
    h += '</div>';

    h += '<div class="' + PFX + '-acc"><div class="' + PFX + '-acc-head" data-rpacc="lang"><span class="' + PFX + '-acc-head-lbl">Язык музыки</span>' + (rpAccLang ? ICONS.chevronUp : ICONS.chevron) + '</div>';
    if (rpAccLang) {
      h += '<div class="' + PFX + '-acc-body"><div class="' + PFX + '-chips">';
      RP_LANGS.forEach(function (l) {
        h += '<div class="' + PFX + '-chip ' + (cfg.rpLang === l.id ? 'on' : '') + '" data-rplang="' + l.id + '">' + l.label + '</div>';
      });
      h += '<div class="' + PFX + '-chip ' + (cfg.rpLang === 'custom' ? 'on' : '') + '" data-rplang="custom">+ свой</div>';
      h += '</div>';
      if (cfg.rpLang === 'custom') {
        h += '<input class="' + PFX + '-finput" data-cfg="rpLangCustom" placeholder="напр. Korean, Spanish..." value="' + esc(cfg.rpLangCustom) + '">';
      }
      h += '</div>';
    }
    h += '</div>';

    h += '<div class="' + PFX + '-acc"><div class="' + PFX + '-acc-head" data-rpacc="genre"><span class="' + PFX + '-acc-head-lbl">Жанр музыки</span>' + (rpAccGenre ? ICONS.chevronUp : ICONS.chevron) + '</div>';
    if (rpAccGenre) {
      h += '<div class="' + PFX + '-acc-body"><div class="' + PFX + '-chips">';
      RP_GENRES.forEach(function (g) {
        h += '<div class="' + PFX + '-chip ' + (g.id === 'meme' ? 'meme ' : '') + (cfg.rpGenre === g.id ? 'on' : '') + '" data-rpgenre="' + g.id + '">' + g.label + '</div>';
      });
        h += '<div class="' + PFX + '-chip ' + (cfg.rpGenre === 'custom' ? 'on' : '') + '" data-rpgenre="custom">+ свой</div>';
        h += '</div>';
      if (cfg.rpGenre === 'custom') {
        h += '<input class="' + PFX + '-finput" data-cfg="rpGenreCustom" placeholder="напр. shoegaze, drum and bass..." value="' + esc(cfg.rpGenreCustom) + '">';
      }
      if (cfg.rpGenre === 'meme') {
        h += '<div class="' + PFX + '-ythint" style="text-align:left; line-height:1.4; margin-top:4px;">Мем-режим: подбирает вирусные мемные треки, звуки, TikTok-аудио, фейл-эффекты, музыку для эдитов и абсурдные вставки, чтобы подчеркнуть нелепость сцены, создать контраст или разрядить обстановку. Язык в этом режиме не учитывается.</div>';
      }
      h += '</div>';
    }
    h += '</div>';

    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpUseFavorites"><div><div class="' + PFX + '-toggle-label">Учитывать вкусы (лайки)</div><div class="' + PFX + '-toggle-sub">отправлять избранное ИИ для понимания вкусов</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpUseFavorites ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';

    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpTokenLimitOn"><div><div class="' + PFX + '-toggle-label">Лимит контекста</div><div class="' + PFX + '-toggle-sub">ограничить объём сканирования</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpTokenLimitOn ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';

    if (cfg.rpTokenLimitOn) {
      h += '<div class="' + PFX + '-numbox"><div class="' + PFX + '-flabel">Лимит токенов (≈)</div><input type="number" min="1000" step="1000" data-rpnum="rpTokenLimit" value="' + (cfg.rpTokenLimit || 6000) + '"></div>';
    }

    h += '<div class="' + PFX + '-toggle" data-rptoggle="debug"><div><div class="' + PFX + '-toggle-label">Подробные логи</div><div class="' + PFX + '-toggle-sub">вывод в консоль (termux/powershell)</div></div><div class="' + PFX + '-sw-track ' + (cfg.debug ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';

    h += '<div class="' + PFX + '-colorpop-h">Данные виджета</div>';
    h += '<div class="' + PFX + '-savebar">' +
      '<div class="' + PFX + '-savebtn" data-importbackup>' + ICONS.upload + '<span>Импорт</span></div>' +
      '<div class="' + PFX + '-savebtn" data-backup>' + ICONS.download + '<span>Бэкап</span></div>' +
      '<div class="' + PFX + '-savebtn danger" data-fullreset>' + ICONS.trash + '<span>Сброс</span></div>' +
    '</div>';
    if (confirmDelete && confirmDelete.kind === 'reset') {
      h += '<div class="' + PFX + '-pop-msg">Полностью очистить всю память и настройки виджета? Виджет перезагрузится.</div>' +
        '<div class="' + PFX + '-pop-btns">' +
          '<div class="' + PFX + '-pop-btn danger" data-confirmdel>Сбросить всё</div>' +
          '<div class="' + PFX + '-pop-btn" data-confirmcancel>Отмена</div>' +
        '</div>';
    }

    h += '</div>';
    return h;
  }

  function colorPopHTML() {
    const cur = accentColor() || '#7aa6ff';
    const curTxt = currentTextColor() || '#ffffff';
    let opv;
    if (bgPending && typeof bgPending.opacity === 'number') opv = bgPending.opacity;
    else {
      const b = currentBg();
      if (b && typeof b.opacity === 'number') opv = b.opacity;
      else opv = (typeof cfg.opacity === 'number' && cfg.opacity >= 0) ? cfg.opacity : 92;
    }

    let sw = '';
    SWATCHES.forEach(function (c) {
      sw += '<div class="' + PFX + '-sw" data-swatch="' + c + '" style="background:' + c + '"></div>';
    });

    let tsw = '';
    TEXT_SWATCHES.forEach(function (c) {
      tsw += '<div class="' + PFX + '-sw" data-textswatch="' + c + '" style="background:' + c + '"></div>';
    });

    const solidOn = isSolidTheme();
    const solidLightOn = isSolidLightTheme();

    const curBg = currentBg();
    const bgUrlVal = (bgPending && bgPending.url) || (curBg && curBg.url) || '';
    const bgName = bgPending ? (bgPending.base64 ? 'Файл выбран' : (bgPending.url ? 'URL: ' + esc(bgPending.url) : '')) : (curBg && curBg.base64 ? 'Текущий файл темы' : (curBg && curBg.url ? 'URL: ' + esc(curBg.url) : ''));

    let h = '<div class="' + PFX + '-colorpop" data-scrollsec="colorpop">';

    h += '<div class="' + PFX + '-acc"><div class="' + PFX + '-acc-head" data-acc="accent"><span class="' + PFX + '-acc-head-lbl">Акцентный цвет</span>' + (accAccent ? ICONS.chevronUp : ICONS.chevron) + '</div>';
    if (accAccent) {
      h += '<div class="' + PFX + '-acc-body">' +
        '<div class="' + PFX + '-colorrow">' +
          '<input type="color" data-colorpick value="' + cur + '">' +
          '<input class="' + PFX + '-finput" data-colorhex placeholder="#RRGGBB" value="' + esc(accentColor()) + '">' +
        '</div>' +
        '<div class="' + PFX + '-swatches">' + sw + '</div>' +
        '<div class="' + PFX + '-colorbtns">' +
          '<div class="' + PFX + '-cbtn2" data-accentapplytheme>Эта тема</div>' +
          '<div class="' + PFX + '-cbtn2" data-accentapplyall>Все темы</div>' +
          '<div class="' + PFX + '-cbtn2" data-accentdel>Сброс</div>' +
        '</div></div>';
    }
    h += '</div>';

    h += '<div class="' + PFX + '-acc"><div class="' + PFX + '-acc-head" data-acc="text"><span class="' + PFX + '-acc-head-lbl">Цвет текста</span>' + (accText ? ICONS.chevronUp : ICONS.chevron) + '</div>';
    if (accText) {
      h += '<div class="' + PFX + '-acc-body">' +
        '<div class="' + PFX + '-colorrow">' +
          '<input type="color" data-textpick value="' + curTxt + '">' +
          '<input class="' + PFX + '-finput" data-texthex placeholder="#RRGGBB" value="' + esc(currentTextColor()) + '">' +
        '</div>' +
        '<div class="' + PFX + '-swatches">' + tsw + '</div>' +
        '<div class="' + PFX + '-colorbtns">' +
          '<div class="' + PFX + '-cbtn2" data-textapplytheme>Эта тема</div>' +
          '<div class="' + PFX + '-cbtn2" data-textapplyall>Все темы</div>' +
          '<div class="' + PFX + '-cbtn2" data-textdel>Сброс</div>' +
        '</div></div>';
    }
    h += '</div>';

    h += '<div class="' + PFX + '-acc"><div class="' + PFX + '-acc-head" data-acc="solid"><span class="' + PFX + '-acc-head-lbl">Подложки под текст</span>' + (accSolid ? ICONS.chevronUp : ICONS.chevron) + '</div>';
    if (accSolid) {
      h += '<div class="' + PFX + '-acc-body">' +
        '<div class="' + PFX + '-solidtoggle" data-solidtoggle><div class="' + PFX + '-solidtoggle-lbl">Тёмная подложка</div><div class="' + PFX + '-sw-track ' + (solidOn ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>' +
        '<div class="' + PFX + '-solidtoggle" data-solidlighttoggle><div class="' + PFX + '-solidtoggle-lbl">Светлая подложка</div><div class="' + PFX + '-sw-track ' + (solidLightOn ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>' +
        '<div class="' + PFX + '-colorbtns">' +
          '<div class="' + PFX + '-cbtn2" data-soliddarkall>Тёмные: все</div>' +
          '<div class="' + PFX + '-cbtn2" data-solidlightall>Светлые: все</div>' +
          '<div class="' + PFX + '-cbtn2" data-solidnoneall>Снять</div>' +
        '</div></div>';
    }
    h += '</div>';

    h += '<div class="' + PFX + '-colorpop-h">Прозрачность фона</div>' +
      '<div class="' + PFX + '-oprow">' + ICONS.palette + '<input type="range" min="0" max="100" value="' + opv + '" data-opacity><span class="' + PFX + '-opval">' + opv + '%</span></div>' +
      '<div class="' + PFX + '-colorbtns">' +
        '<div class="' + PFX + '-cbtn2" data-opapplytheme>Прозр: эта тема</div>' +
        '<div class="' + PFX + '-cbtn2" data-opapplyall>Прозр: все темы</div>' +
      '</div>';

    h += '<div class="' + PFX + '-acc"><div class="' + PFX + '-acc-head" data-acc="bg"><span class="' + PFX + '-acc-head-lbl">Фон виджета</span>' + (accBg ? ICONS.chevronUp : ICONS.chevron) + '</div>';
    if (accBg) {
      h += '<div class="' + PFX + '-acc-body">' +
        '<div class="' + PFX + '-bgrow">' +
          '<input class="' + PFX + '-finput" placeholder="URL изображения" data-bg-url value="' + esc(bgUrlVal) + '">' +
          '<label class="' + PFX + '-bgfile-label">Файл<input type="file" accept="image/*" data-bg-file class="' + PFX + '-bgfile-input"></label>' +
        '</div>' +
        '<div class="' + PFX + '-bgfile-name" data-bgfile-name>' + bgName + '</div>' +
        '<div class="' + PFX + '-colorbtns">' +
          '<div class="' + PFX + '-cbtn2" data-bgapplytheme>Фон: эта тема</div>' +
          '<div class="' + PFX + '-cbtn2" data-bgapplyall>Фон: все темы</div>' +
        '</div>' +
        '<div class="' + PFX + '-colorbtns">' +
          '<div class="' + PFX + '-cbtn2" data-bgdeltheme>Удалить (тема)</div>' +
          '<div class="' + PFX + '-cbtn2" data-bgdelall>Удалить (все)</div>' +
        '</div></div>';
    }
    h += '</div>';

    h += '<div class="' + PFX + '-colorbtns">' +
        '<div class="' + PFX + '-cbtn2" data-sizereset>Размер сброс</div>' +
        '<div class="' + PFX + '-cbtn2" data-colorreset>Сброс</div>' +
        '<div class="' + PFX + '-cbtn2" data-colorclose>Готово</div>' +
      '</div>';

    h += '</div>';
    return h;
  }

  function plPopHTML() {
    let h = '<div class="' + PFX + '-pop" data-plpop>';
    h += '<div class="' + PFX + '-pop-h"><span>В плейлист</span><span class="' + PFX + '-row-act" data-plpopclose>' + ICONS.close + '</span></div>';
    h += '<div class="' + PFX + '-pop-item ' + PFX + '-pop-new" data-plnew>' + ICONS.plus + '<span>Создать новый</span></div>';
    if (lib.manual.length) {
      lib.manual.forEach(function (p) {
        const fl = (flashPlId === p.id) ? ' flash' : '';
        h += '<div class="' + PFX + '-pop-item' + fl + '" data-pladd="' + p.id + '">' + ICONS.folder + '<span>' + esc(p.name) + '</span><span class="' + PFX + '-row-src" style="margin-left:auto">' + (p.tracks ? p.tracks.length : 0) + '</span></div>';
      });
    }
    h += '</div>';
    return h;
  }

  function profPopHTML() {
    let h = '<div class="' + PFX + '-pop" data-profpop>';
    h += '<div class="' + PFX + '-pop-h"><span>Профиль</span><span class="' + PFX + '-row-act" data-profpopclose>' + ICONS.close + '</span></div>';
    h += '<div class="' + PFX + '-pop-item' + (!cfg.rpProfile ? ' ' + PFX + '-pop-new' : '') + '" data-profpick="">' + ICONS.gear + '<span>Текущий профиль Таверны</span></div>';
    const profs = getProfiles();
    if (!profs.length) h += '<div class="' + PFX + '-empty">Нет сохранённых профилей</div>';
    else {
      profs.forEach(function (p) {
        h += '<div class="' + PFX + '-pop-item' + (cfg.rpProfile === p.id ? ' ' + PFX + '-pop-new' : '') + '" data-profpick="' + esc(p.id) + '">' + ICONS.wand + '<span>' + esc(p.name || p.id) + '</span></div>';
      });
    }
    h += '</div>';
    return h;
  }

  function panelHTML() {
    const cur = curTrack();
    const vol = Math.round(audio.volume * 100);
    const yt = isYtTrack(cur);
    const radioNow = (!cur && window.__rpRadioNow);
    let nowBlock;

    if (yt) {
      nowBlock = '<div class="' + PFX + '-now"><div class="' + PFX + '-now-title ' + PFX + '-marq"><span class="' + PFX + '-marq-inner">' + esc(cur.title) + '</span></div><div class="' + PFX + '-now-pos">' + (curIdx + 1) + ' / ' + queue.length + '</div></div>';
    } else if (radioNow) {
      nowBlock = '<div class="' + PFX + '-now"><div class="' + PFX + '-now-title ' + PFX + '-marq"><span class="' + PFX + '-marq-inner">📻 ' + esc(window.__rpRadioNow.name) + '</span></div><div class="' + PFX + '-now-artist">' + esc(window.__rpRadioNow.tag || 'радио') + '</div></div>';
    } else if (cur) {
      nowBlock = '<div class="' + PFX + '-now"><div class="' + PFX + '-now-title ' + PFX + '-marq"><span class="' + PFX + '-marq-inner">' + esc(cur.title) + '</span></div><div class="' + PFX + '-now-artist ' + PFX + '-marq"><span class="' + PFX + '-marq-inner">' + esc(cur.artist) + (cur.source ? ' · ' + esc(cur.source) : '') + '</span></div><div class="' + PFX + '-now-pos">' + (curIdx + 1) + ' / ' + queue.length + '</div></div>';
    } else {
      nowBlock = '<div class="' + PFX + '-now"><div class="' + PFX + '-now-status">' + (searching ? '<span class="' + PFX + '-spin"></span>' : '') + esc(statusMsg) + '</div></div>';
    }

    let progressBlock = '';
    if (cur && !radioNow && (!yt || (yt && !ytCurrentEmbed))) {
      progressBlock = '<div class="' + PFX + '-progress-container">' +
        '<span class="' + PFX + '-time-lbl ' + PFX + '-cur-time">' + formatTime(audioCurrentTime) + '</span>' +
        '<input type="range" class="' + PFX + '-progress-slider" min="0" step="0.1" max="' + (audioDuration || 100) + '" value="' + audioCurrentTime + '" data-progress-seek>' +
        '<span class="' + PFX + '-time-lbl ' + PFX + '-dur-time">' + formatTime(audioDuration) + '</span>' +
      '</div>';
    }

    let favCur = '';
    if (cur && !radioNow) {
      favCur = '<div class="' + PFX + '-theme-btn" data-favcur title="В избранное">' + (isFav(cur) ? ICONS.heartFill : ICONS.heart) + '</div>';
    }

    return '<div class="' + PFX + '-glass ' + PFX + '-panel">' +
      '<div class="' + PFX + '-head">' +
        '<div class="' + PFX + '-note-btn" data-handle data-notebtn data-notesource title="Свернуть">' + ICONS.music + '</div>' +
        '<div class="' + PFX + '-theme-btn" data-themebtn>' + ICONS.palette + '</div>' +
        favCur +
        '<div class="' + PFX + '-head-grab" data-handle></div>' +
        '<div class="' + PFX + '-head-btn ' + (searchOpen ? 'on' : '') + '" data-searchtab>' + ICONS.search + '</div>' +
        '<div class="' + PFX + '-head-btn ' + (radioOpen ? 'on' : '') + '" data-radiotoggle>' + ICONS.radio + '</div>' +
        '<div class="' + PFX + '-head-btn ' + (rpOpen ? 'on' : '') + '" data-rptab>' + ICONS.sparkle + '</div>' +
        '<div class="' + PFX + '-head-btn ' + (libOpen ? 'on' : '') + '" data-libtoggle>' + ICONS.folder + '</div>' +
        '<div class="' + PFX + '-head-btn ' + (plOpen ? 'on' : '') + '" data-pltoggle>' + ICONS.list + '</div>' +
      '</div>' +
      (colorPopOpen ? colorPopHTML() : '') +
      (plPop !== null ? plPopHTML() : '') +
      (profPop ? profPopHTML() : '') +
      nowBlock +
      '<div class="' + PFX + '-vol">' + ICONS.vol + '<input type="range" min="0" max="100" value="' + vol + '" data-vol></div>' +
      '<div class="' + PFX + '-controls">' +
        '<button class="' + PFX + '-cbtn" data-prev>' + ICONS.prev + '</button>' +
        ((yt && ytCurrentEmbed) ? '' : '<button class="' + PFX + '-cbtn play" data-play>' + (isPlaying ? ICONS.pause : ICONS.play) + '</button>') +
        '<button class="' + PFX + '-cbtn" data-next>' + ICONS.next + '</button>' +
      '</div>' +
      progressBlock +
      ((yt && ytCurrentEmbed) ? '<div class="' + PFX + '-ythint">Управление плеем — в окошке YouTube</div>' : '') +
      '<div class="' + PFX + '-scrollable">' +
        (searchOpen ? searchHTML() : '') +
        (radioOpen ? radioHTML() : '') +
        (rpOpen ? rpHTML() : '') +
        (libOpen ? libHTML() : '') +
        (plOpen ? queueHTML() : '') +
      '</div>' +
      '<div class="' + PFX + '-resize" data-resize></div>' +
      '<div class="' + PFX + '-resize-left" data-resize-left></div>' +
    '</div>';
  }
  function applyMarquee() {
    if (!bodyEl) return;
    const els = bodyEl.querySelectorAll('.' + PFX + '-marq');
    els.forEach(function (wrap) {
      const inner = wrap.querySelector('.' + PFX + '-marq-inner');
      if (!inner) return;
      wrap.classList.remove('run');
      wrap.style.removeProperty('--marq-shift');
      wrap.style.removeProperty('--marq-dur');
      const overflow = inner.scrollWidth - wrap.clientWidth;
      if (overflow > 4) {
        const shift = -(overflow + 8);
        const dur = Math.max(3, Math.abs(shift) / 30);
        wrap.style.setProperty('--marq-shift', shift + 'px');
        wrap.style.setProperty('--marq-dur', dur + 's');
        wrap.classList.add('run');
      }
    });
  }

  function applyUserSize() {
    if (!root) return;
    if (uiMode === 'fab') {
      root.style.removeProperty('--rp-user-w');
      root.style.removeProperty('max-height');
      root.style.removeProperty('min-height');
      root.style.removeProperty('height');
      return;
    }
    if (collapsed) {
      root.style.removeProperty('--rp-user-w');
      root.style.removeProperty('max-height');
      root.style.removeProperty('min-height');
      root.style.removeProperty('height');
      return;
    }
    const W = VW(), H = VH();
    if (userW > 0) {
      const w = Math.max(220, Math.min(userW, Math.floor(W * 0.94)));
      root.style.setProperty('--rp-user-w', w + 'px');
    } else {
      root.style.removeProperty('--rp-user-w');
    }
    const topOffset = TOPBAR + 10;
    const maxPossible = Math.max(200, H - topOffset - 10);
    let maxH;
    if (userH > 0) maxH = Math.max(180, Math.min(userH, maxPossible));
    else maxH = Math.max(200, Math.min(maxPossible, Math.floor(H * 0.7)));
    root.style.maxHeight = maxH + 'px';
    root.style.removeProperty('height');
    root.style.minHeight = '180px';
    root.style.removeProperty('--rp-sec-max');
  }

  let scrollMemory = {};
  let renderedScrollKey = 'main';

  function currentScrollKey() {
    if (colorPopOpen) return 'color';
    if (searchOpen) return 'search';
    if (radioOpen) return 'radio';
    if (rpOpen) return 'rp';
    if (libOpen) return editId !== null || editKind === 'fav' ? 'lib-edit' : 'lib';
    if (plOpen) return 'queue';
    return 'main';
  }

  function saveScrollState(key) {
    if (!bodyEl) return;
    key = key || renderedScrollKey || currentScrollKey();
    const sc = bodyEl.querySelector('.' + PFX + '-scrollable');
    if (sc) scrollMemory['scrollable:' + key] = sc.scrollTop;
    const cp = bodyEl.querySelector('.' + PFX + '-colorpop');
    if (cp) scrollMemory.colorpop = cp.scrollTop;
  }

  function restoreScrollState(key) {
    if (!bodyEl) return;
    key = key || currentScrollKey();
    const sc = bodyEl.querySelector('.' + PFX + '-scrollable');
    if (sc) sc.scrollTop = scrollMemory['scrollable:' + key] || 0;
    const cp = bodyEl.querySelector('.' + PFX + '-colorpop');
    if (cp) cp.scrollTop = scrollMemory.colorpop || 0;
  }

  function render() {
    if (!shell) return;
    syncCollapsed();
    refreshTopbar();
    syncYtLayer();

    const active = document.activeElement;
    const keepQ = active && active.hasAttribute && active.hasAttribute('data-q') ? active.value : null;
    const keepRq = active && active.hasAttribute && active.hasAttribute('data-rq') ? active.value : null;
    const keepCfg = active && active.hasAttribute && active.hasAttribute('data-cfg') ? { k: active.getAttribute('data-cfg'), v: active.value } : null;
    const keepNum = active && active.hasAttribute && active.hasAttribute('data-rpnum') ? { k: active.getAttribute('data-rpnum'), v: active.value } : null;
    const keepHex = active && active.hasAttribute && active.hasAttribute('data-colorhex') ? active.value : null;
    const keepTHex = active && active.hasAttribute && active.hasAttribute('data-texthex') ? active.value : null;

    saveScrollState(renderedScrollKey);

    const cur = curTrack();
    const ytNow = isYtTrack(cur) && ytCurrentEmbed;
    root.setAttribute('data-theme', theme);
    if (uiMode === 'fab') root.classList.add(PFX + '-fabmode');
    else root.classList.remove(PFX + '-fabmode');
    applyAccentVar();
    applyTextColorVar();
    applySolidClass();
    if (rpPulse) root.classList.add(PFX + '-pulse');
    else root.classList.remove(PFX + '-pulse');

    let html;
    if (uiMode === 'fab') html = fabHTML();
    else if (collapsed) html = (ytNow ? yminHTML() : pillHTML());
    else html = panelHTML();
    bodyEl.innerHTML = html;

    applyUserSize();
    applyPos();

    const nextKey = currentScrollKey();
    renderedScrollKey = nextKey;

    restoreScrollState(nextKey);
    requestAnimationFrame(function () {
      restoreScrollState(nextKey);
    });
    setTimeout(function () {
      restoreScrollState(nextKey);
    }, 30);

    if (keepQ !== null) {
      const i = bodyEl.querySelector('[data-q]');
      if (i) { i.value = keepQ; i.focus(); }
    }
    if (keepRq !== null) {
      const i = bodyEl.querySelector('[data-rq]');
      if (i) { i.value = keepRq; i.focus(); }
    }
    if (keepCfg) {
      const i = bodyEl.querySelector('[data-cfg="' + keepCfg.k + '"]');
      if (i) { i.value = keepCfg.v; i.focus(); }
    }
    if (keepNum) {
      const i = bodyEl.querySelector('[data-rpnum="' + keepNum.k + '"]');
      if (i) { i.value = keepNum.v; i.focus(); }
    }
    if (keepHex !== null) {
      const i = bodyEl.querySelector('[data-colorhex]');
      if (i) { i.value = keepHex; i.focus(); }
    }
    if (keepTHex !== null) {
      const i = bodyEl.querySelector('[data-texthex]');
      if (i) { i.value = keepTHex; i.focus(); }
    }

    updateProgressBarUI();
    updateVolUI();
    applyMarquee();

    setTimeout(function () {
      applyUserSize();
      applyPos();
      restoreScrollState(nextKey);
    }, 50);
  }

  function updatePlayBtn() {
    if (!bodyEl) return;
    bodyEl.querySelectorAll('[data-play]').forEach(function (b) {
      b.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    });
    bodyEl.querySelectorAll('[data-notebtn]').forEach(function (b) {
      if (collapsed) b.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    });
    if (uiMode === 'fab') {
      const fb = bodyEl.querySelector('[data-fabbtn]');
      const wantVibe = fabShowsVibe();
      const haveVibe = !!(fb && fb.getAttribute('data-fabvibe'));
      if (wantVibe !== haveVibe) {
        render();
        return;
      }
      if (fb && !fb.getAttribute('data-fabvibe')) fb.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
      return;
    }
    if (collapsed) {
      const cur = curTrack();
      const wantYmin = isYtTrack(cur) && ytCurrentEmbed;
      const haveYmin = !!bodyEl.querySelector('.' + PFX + '-ymin');
      if (wantYmin !== haveYmin) render();
    }
  }

  function applyPos() {
    if (!root) return;

    const w = root.offsetWidth || 110;
    const h = root.offsetHeight || 46;

    const W = VW();
    const H = VH();

    const minX = 4;
    const minY = TOPBAR;

    if (posX < 0 || posY < 0) {
      let sx = -1;
      let sy = -1;

      if (uiMode === 'fab') {
        sx = posFabX;
        sy = posFabY;

        if (sx < 0 || sy < 0) {
          sx = posCollapsedX;
          sy = posCollapsedY;
        }
      } else if (collapsed) {
        sx = posCollapsedX;
        sy = posCollapsedY;

        if (sx < 0 || sy < 0) {
          sx = posFabX;
          sy = posFabY;
        }
      } else {
        sx = posExpandedX;
        sy = posExpandedY;
      }

      if (typeof sx === 'number' && sx >= 0 && typeof sy === 'number' && sy >= 0) {
        posX = sx;
        posY = sy;
      } else {
        posX = Math.max(8, W - w - 12);
        posY = Math.max(minY + 14, H - h - 80);
      }
    }

    const maxX = Math.max(minX, W - w - 4);
    const maxY = Math.max(minY, H - h - 4);

    posX = Math.max(minX, Math.min(posX, maxX));
    posY = Math.max(minY, Math.min(posY, maxY));

    root.style.left = Math.round(posX) + 'px';
    root.style.top = Math.round(posY) + 'px';
  }

  const MODE_LONG_PRESS_MS = 600;
  const MODE_SWITCH_COOLDOWN_MS = 350;
  const MODE_MOVE_CANCEL_PX = 10;

  let down = false, moved = false, fromHandle = false, sx = 0, sy = 0, bl = 0, bt = 0, bw = 0, bh = 0, lockUntil = 0;
  let lpTimer = null, lpFired = false;
  let activePointerId = null;
  let resizing = false, rsx = 0, rsy = 0, rsW = 0, rsH = 0, leftResize = false, startLeft = 0;
  let fabLpTimer = null, fabLpFired = false, fabDownX = 0, fabDownY = 0;
  let noteLpTimer = null, noteLpFired = false, noteDownX = 0, noteDownY = 0;
  let modeGestureGuardUntil = 0;
  let modeGestureWaitRelease = false;
  let modeGestureReleaseBound = false;
  let modeGestureSuppressClickUntil = 0;
  let suppressFabVibeUntil = 0;
  let rpRunId = 0;

  function clearLongPress() {
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
  }

  function clearFabLongPress() {
    if (fabLpTimer) { clearTimeout(fabLpTimer); fabLpTimer = null; }
  }

  function clearNoteLongPress() {
    if (noteLpTimer) { clearTimeout(noteLpTimer); noteLpTimer = null; }
  }

  function endModeGestureGuard() {
    modeGestureWaitRelease = false;

    if (modeGestureReleaseBound) {
      modeGestureReleaseBound = false;
      try { window.removeEventListener('pointerup', endModeGestureGuard, true); } catch (_) {}
      try { window.removeEventListener('pointercancel', endModeGestureGuard, true); } catch (_) {}
      try { window.removeEventListener('mouseup', endModeGestureGuard, true); } catch (_) {}
      try { window.removeEventListener('touchend', endModeGestureGuard, true); } catch (_) {}
      try { window.removeEventListener('touchcancel', endModeGestureGuard, true); } catch (_) {}
    }
  }

  function bindModeGestureRelease() {
    if (modeGestureReleaseBound) return;

    modeGestureReleaseBound = true;
    try { window.addEventListener('pointerup', endModeGestureGuard, true); } catch (_) {}
    try { window.addEventListener('pointercancel', endModeGestureGuard, true); } catch (_) {}
    try { window.addEventListener('mouseup', endModeGestureGuard, true); } catch (_) {}
    try { window.addEventListener('touchend', endModeGestureGuard, true); } catch (_) {}
    try { window.addEventListener('touchcancel', endModeGestureGuard, true); } catch (_) {}
  }

  function armModeGestureGuard(ms) {
    const dur = ms || MODE_SWITCH_COOLDOWN_MS;
    modeGestureGuardUntil = Date.now() + dur;
    modeGestureWaitRelease = true;
    modeGestureSuppressClickUntil = Date.now() + dur;
    lockUntil = Math.max(lockUntil, modeGestureGuardUntil);
    bindModeGestureRelease();
  }

  function modeGestureBlocked() {
    return modeGestureWaitRelease || Date.now() < modeGestureGuardUntil;
  }

  function cancelBusyOps(msg) {
    let did = false;

    if (rpBusy || rpAbortController) {
      rpRunId++;

      if (rpAbortController) {
        try { rpAbortController.abort(); } catch (_) {}
        rpAbortController = null;
      }

      rpBusy = false;
      searching = false;
      did = true;
    }

    if (did) {
      clearRpPulse();
      statusMsg = msg || 'Операция отменена';
      render();
    }

    return did;
  }

  const INTER_SEL = '[data-find],[data-q],[data-play],[data-prev],[data-next],[data-stab],[data-src],[data-rplay],[data-pl],[data-qadd],[data-resplay],[data-resadd],[data-resclear],[data-restoggle],[data-more],[data-queuetoggle],[data-clearqueue],[data-rfind],[data-rchip],[data-rtab],[data-somamore],[data-radiotoggle],[data-libtoggle],[data-pltoggle],[data-searchtab],[data-rptab],[data-savemanual],[data-saverp],[data-loadm],[data-loadrp],[data-openm],[data-openrp],[data-vol],[data-plnew],[data-pladd],[data-plpopclose],[data-swatch],[data-textswatch],[data-colorreset],[data-colorclose],[data-sizereset],[data-opacity],[data-editm],[data-editrp],[data-renm],[data-renrp],[data-trkdel],[data-pltrack],[data-editback],[data-delm],[data-delrp],[data-pledit],[data-pldel],[data-rfav],[data-rdelfav],[data-yteye],[data-ytclose],[data-expandfull],[data-quickvibe],[data-rptoggle],[data-rpnum],[data-rplang],[data-rpgenre],[data-rpsrc],[data-rpacc],[data-profsel],[data-profpick],[data-profpopclose],[data-cfg],[data-resize],[data-resize-left],[data-cancel-search],[data-cancel-rp],[data-link],[data-bgapplytheme],[data-bgapplyall],[data-bgdeltheme],[data-bgdelall],[data-textpick],[data-texthex],[data-textapplytheme],[data-textapplyall],[data-textdel],[data-solidtoggle],[data-solidlighttoggle],[data-soliddarkall],[data-solidlightall],[data-solidnoneall],[data-opapplytheme],[data-opapplyall],[data-bg-url],[data-bg-file],[data-colorpick],[data-colorhex],[data-progress-seek],[data-accentapplytheme],[data-accentapplyall],[data-accentdel],[data-acc],[data-favcur],[data-resfav],[data-qfav],[data-plfav],[data-loadfav],[data-loadfavqueue],[data-openfav],[data-editfav],[data-delfav],[data-favtrack],[data-favdel],[data-editplay],[data-exportopen],[data-exportdo],[data-exportcancel],[data-confirmdel],[data-confirmcancel],[data-importbackup],[data-backup],[data-fullreset]';

  function onPointerDown(e) {
    const target = e.target;

    const fabBtn = target.closest('[data-fabbtn]');
    if (fabBtn && uiMode === 'fab') {
      if (e.button === 2) return;
      if (modeGestureBlocked()) return;

      fabLpFired = false;
      clearFabLongPress();

      down = true;
      moved = false;
      fromHandle = true;

      activePointerId = e.pointerId;

      sx = e.clientX;
      sy = e.clientY;

      fabDownX = e.clientX;
      fabDownY = e.clientY;

      const rect = root.getBoundingClientRect();
      bl = rect.left;
      bt = rect.top;
      bw = rect.width;
      bh = rect.height;

      try { fabBtn.setPointerCapture(e.pointerId); } catch (_) {}

      fabLpTimer = setTimeout(function () {
        if (modeGestureBlocked()) return;

        fabLpFired = true;
        clearFabLongPress();

        try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}

        down = false;
        moved = false;
        fromHandle = false;

        root.classList.remove('dragging');

        syncMiniAnchorFromRoot();
        switchUiMode('panel');

        modeGestureSuppressClickUntil = Date.now() + 350;
        lockUntil = Math.max(lockUntil, Date.now() + 350);
        armModeGestureGuard(350);
      }, MODE_LONG_PRESS_MS);

      return;
    }

    const rz = target.closest('[data-resize]');
    const lz = target.closest('[data-resize-left]');
    if (rz || lz) {
      resizing = true;
      leftResize = !!lz;
      activePointerId = e.pointerId;
      const rect = root.getBoundingClientRect();
      rsx = e.clientX;
      rsy = e.clientY;
      rsW = rect.width;
      rsH = rect.height;
      startLeft = rect.left;
      root.classList.add('resizing');
      try { (rz || lz).setPointerCapture(e.pointerId); } catch (_) {}
      if (e.cancelable) e.preventDefault();
      return;
    }

    const noteSource = target.closest('[data-notesource]');
    if (noteSource && uiMode === 'panel' && !modeGestureBlocked()) {
      noteLpFired = false;
      clearNoteLongPress();

      noteDownX = e.clientX;
      noteDownY = e.clientY;

      noteLpTimer = setTimeout(function () {
        if (modeGestureBlocked()) return;

        noteLpFired = true;
        clearNoteLongPress();

        try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}

        const rect = root.getBoundingClientRect();
        rememberReturnMiniFromRect(rect, 'pill');
        pendingFabPoint = { x: noteDownX, y: noteDownY };
        switchUiMode('fab');

        suppressFabVibeUntil = Date.now() + 350;
        modeGestureSuppressClickUntil = Date.now() + 350;
        lockUntil = Math.max(lockUntil, Date.now() + 350);

        down = false;
        moved = false;
        fromHandle = false;
        root.classList.remove('dragging');

        armModeGestureGuard(350);
      }, MODE_LONG_PRESS_MS);
    }

    const themeBtn = target.closest('[data-themebtn]');
    if (themeBtn) {
      lpFired = false;
      clearLongPress();
      sx = e.clientX;
      sy = e.clientY;

      lpTimer = setTimeout(function () {
        lpFired = true;
        clearLongPress();
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
        bgPending = currentBg() ? JSON.parse(JSON.stringify(currentBg())) : null;
        colorPopOpen = true;
        render();
        lockUntil = Date.now() + 400;
      }, MODE_LONG_PRESS_MS);

      return;
    }

    const fabSource = target.closest('[data-fabsource]');
    if (fabSource && collapsed && uiMode !== 'fab' && !modeGestureBlocked()) {
      lpFired = false;
      clearLongPress();

      sx = e.clientX;
      sy = e.clientY;

      const fdx = e.clientX;
      const fdy = e.clientY;

      lpTimer = setTimeout(function () {
        if (modeGestureBlocked()) return;

        lpFired = true;
        clearLongPress();

        try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}

        syncMiniAnchorFromRoot();
        pendingFabPoint = { x: fdx, y: fdy };
        switchUiMode('fab');

        suppressFabVibeUntil = Date.now() + 350;
        modeGestureSuppressClickUntil = Date.now() + 350;
        lockUntil = Math.max(lockUntil, Date.now() + 350);

        armModeGestureGuard(350);
      }, MODE_LONG_PRESS_MS);
    }

    if (target.closest(INTER_SEL)) return;

    const handle = target.closest('[data-handle]');
    if (!handle) return;
    if (e.button === 2) return;

    down = true;
    moved = false;
    fromHandle = true;
    activePointerId = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;

    const rect = root.getBoundingClientRect();
    bl = rect.left;
    bt = rect.top;
    bw = rect.width;
    bh = rect.height;

    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    if (resizing) {
      if (e.cancelable) e.preventDefault();
      const W = VW(), H = VH();
      let nw, nh;
      if (leftResize) {
        nw = rsW - (e.clientX - rsx);
        nh = rsH + (e.clientY - rsy);
        nw = Math.max(220, Math.min(nw, Math.floor(W * 0.94)));
        nh = Math.max(180, Math.min(nh, Math.floor(H * 0.86)));
        let newLeft = startLeft + (e.clientX - rsx);
        newLeft = Math.max(4, Math.min(newLeft, W - nw - 4));
        posX = newLeft;
      } else {
        nw = rsW + (e.clientX - rsx);
        nh = rsH + (e.clientY - rsy);
        nw = Math.max(220, Math.min(nw, Math.floor(W * 0.94)));
        nh = Math.max(180, Math.min(nh, Math.floor(H * 0.86)));
      }
      userW = Math.round(nw);
      userH = Math.round(nh);
      applyUserSize();
      applyPos();
      return;
    }

    if (lpTimer) {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > MODE_MOVE_CANCEL_PX) clearLongPress();
    }
    if (fabLpTimer) {
      if (Math.hypot(e.clientX - fabDownX, e.clientY - fabDownY) > MODE_MOVE_CANCEL_PX) clearFabLongPress();
    }
    if (noteLpTimer) {
      if (Math.hypot(e.clientX - noteDownX, e.clientY - noteDownY) > MODE_MOVE_CANCEL_PX) clearNoteLongPress();
    }

    if (!down) return;

    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 6) return;
    if (e.cancelable) e.preventDefault();

    moved = true;
    root.classList.add('dragging');

    const W = VW(), H = VH();
    const minY = TOPBAR;
    let nx = bl + dx, ny = bt + dy;
    const maxX = W - bw - 4, maxY = H - bh - 4;

    if (nx < 4) nx = 4;
    if (maxX > 4 && nx > maxX) nx = maxX;
    if (ny < minY) ny = minY;
    if (maxY > minY && ny > maxY) ny = maxY;

    posX = nx; posY = ny;
    root.style.left = nx + 'px';
    root.style.top = ny + 'px';
  }

  function onPointerUp(e) {
    const wasModeGestureBlocked = modeGestureWaitRelease || Date.now() < modeGestureGuardUntil;

    endModeGestureGuard();

    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    if (resizing) {
      resizing = false;
      leftResize = false;
      root.classList.remove('resizing');
      activePointerId = null;

      saveSize();
      savePos();

      lockUntil = Date.now() + 250;
      return;
    }

    if (noteLpTimer || noteLpFired) {
      clearNoteLongPress();

      if (noteLpFired) {
        noteLpFired = false;
        down = false;
        moved = false;
        fromHandle = false;
        root.classList.remove('dragging');
        activePointerId = null;

        suppressFabVibeUntil = Date.now() + 350;
        modeGestureSuppressClickUntil = Date.now() + 350;
        lockUntil = Math.max(lockUntil, Date.now() + 350);

        armModeGestureGuard(350);
        return;
      }
    }

    if (fabLpTimer || fabLpFired) {
      clearFabLongPress();

      if (fabLpFired) {
        fabLpFired = false;
        down = false;
        moved = false;
        fromHandle = false;
        root.classList.remove('dragging');
        activePointerId = null;

        modeGestureSuppressClickUntil = Date.now() + 350;
        lockUntil = Math.max(lockUntil, Date.now() + 350);

        armModeGestureGuard(350);
        return;
      }
    }

    if (wasModeGestureBlocked) {
      down = false;
      moved = false;
      fromHandle = false;
      root.classList.remove('dragging');
      activePointerId = null;

      modeGestureSuppressClickUntil = Date.now() + 350;
      lockUntil = Math.max(lockUntil, Date.now() + 350);
      return;
    }

    if (lpTimer) {
      clearLongPress();

      const tb = e.target && e.target.closest && e.target.closest('[data-themebtn]');
      const fs = e.target && e.target.closest && e.target.closest('[data-fabsource]');

      if (lpFired) {
        lpFired = false;
        activePointerId = null;
        modeGestureSuppressClickUntil = Date.now() + 350;
        lockUntil = Date.now() + 350;
        return;
      }

      if (tb) {
        if (Date.now() >= lockUntil) {
          theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
          saveTheme();
          applyBackground();
          render();
          lockUntil = Date.now() + 600;
        }

        activePointerId = null;
        return;
      }

      if (fs) {
        togglePlay();
        activePointerId = null;
        lockUntil = Date.now() + 300;
        return;
      }

      activePointerId = null;
      return;
    }

    if (!down) {
      activePointerId = null;
      return;
    }

    down = false;
    root.classList.remove('dragging');
    activePointerId = null;

    const wasMoved = moved;
    const wasHandle = fromHandle;

    moved = false;
    fromHandle = false;

    if (wasMoved) {
      savePos();

      if (uiMode === 'panel') {
        clearReturnMiniAnchor();
      } else {
        syncMiniAnchorFromRoot();
      }

      lockUntil = Date.now() + 400;
      return;
    }

    if (wasHandle) {
      if (Date.now() < lockUntil || Date.now() < modeGestureSuppressClickUntil) return;
      if (e && e.cancelable) e.preventDefault();

      if (uiMode === 'fab') {
        const fb = e.target && e.target.closest && e.target.closest('[data-fabbtn]');

        if (fb && fb.getAttribute('data-fabvibe')) {
          if (Date.now() < suppressFabVibeUntil) {
            lockUntil = Date.now() + 350;
            return;
          }

          if (rpBusy || rpAbortController) {
            cancelBusyOps('Операция отменена');
          } else {
            clearRpPulse();
            rpQuickVibe();
          }
        } else {
          togglePlay();
        }

        lockUntil = Date.now() + 350;
        return;
      }

      const noteTap = e.target && e.target.closest && e.target.closest('[data-notebtn]');
      if (noteTap && uiMode === 'panel') {
        switchUiMode('pill');
        armModeGestureGuard(350);
        return;
      }

      if (uiMode === 'panel') {
        switchUiMode('pill');
      } else {
        switchUiMode('panel');
      }

      armModeGestureGuard(350);
      return;
    }
  }

  function onPointerCancel(e) {
    clearLongPress();
    clearFabLongPress();
    clearNoteLongPress();
    endModeGestureGuard();

    if (resizing) {
      resizing = false;
      leftResize = false;
      root.classList.remove('resizing');
      saveSize();
    }

    if (down) {
      down = false;
      root.classList.remove('dragging');
    }

    activePointerId = null;
  }

  function doSearch(q) {
    if (!q) return;
    if (cfg.source === 'ytlink') { searchOneSource(YouTubeLink, q); return; }
    runSearch(q, searchTab === 'all' ? 'all' : 'src');
  }

  function rememberScroll() { saveScrollState(renderedScrollKey); }

  function onClick(e) {
    if (Date.now() < lockUntil || Date.now() < modeGestureSuppressClickUntil) return;
    const t = e.target;
    const inter = t.closest && t.closest(INTER_SEL);
    if (!inter) return;

    rememberScroll();

    const link = t.closest('[data-link]');
    if (link) { window.open(link.getAttribute('data-link'), '_blank'); return; }

    if (t.closest('[data-resize]') || t.closest('[data-resize-left]')) return;

    if (t.closest('[data-favcur]')) { toggleFav(curTrack()); lockUntil = Date.now() + 200; return; }

    let m;
    if ((m = t.closest('[data-resfav]'))) { toggleFav(results[parseInt(m.getAttribute('data-resfav'), 10)]); lockUntil = Date.now() + 200; return; }
    if ((m = t.closest('[data-qfav]'))) { toggleFav(queue[parseInt(m.getAttribute('data-qfav'), 10)]); lockUntil = Date.now() + 200; return; }
    if ((m = t.closest('[data-plfav]'))) {
      const i = parseInt(m.getAttribute('data-plfav'), 10);
      let pl = editKind === 'm' ? lib.manual.find(function (x) { return x.id === editId; }) : lib.rp[editId];
      if (pl && pl.tracks && pl.tracks[i]) toggleFav(pl.tracks[i]);
      lockUntil = Date.now() + 200; return;
    }

    if (t.closest('[data-openfav]')) { openFavEditor(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-loadfav]')) { loadPlaylist(lib.favorites); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-loadfavqueue]')) { loadPlaylist(lib.favorites); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-editfav]')) { openFavEditor(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-delfav]')) { confirmDelete = { kind: 'fav', id: '1' }; deleteFavorites(); confirmDelete = null; lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-favtrack]'))) {
      const i = parseInt(m.getAttribute('data-favtrack'), 10);
      if (lib.favorites[i]) { queue.push(JSON.parse(JSON.stringify(lib.favorites[i]))); saveQueue(); playIndex(queue.length - 1); }
      lockUntil = Date.now() + 300; return;
    }
    if ((m = t.closest('[data-favdel]'))) { deleteTrackFromFav(parseInt(m.getAttribute('data-favdel'), 10)); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-exportopen]'))) { exportPop = { kind: m.getAttribute('data-exportopen') }; render(); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-exportdo]'))) {
      const kind = exportPop ? exportPop.kind : (editKind === 'fav' ? 'fav' : editKind);
      doExportPlaylist(kind, m.getAttribute('data-exportdo'));
      lockUntil = Date.now() + 300; return;
    }
    if (t.closest('[data-exportcancel]')) { exportPop = null; render(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-editplay]'))) {
      const kind = m.getAttribute('data-editplay');
      let pl = null;
      if (kind === 'm') pl = lib.manual.find(function (x) { return x.id === editId; });
      else if (kind === 'rp') pl = lib.rp[editId];
      if (pl && pl.tracks) loadPlaylist(pl.tracks);
      lockUntil = Date.now() + 300; return;
    }

    if (t.closest('[data-confirmdel]')) {
      if (confirmDelete) {
        const cd = confirmDelete;
        confirmDelete = null;
        if (cd.kind === 'm') deleteManual(cd.id);
        else if (cd.kind === 'rp') deleteRp(cd.id);
        else if (cd.kind === 'reset') fullReset();
        else render();
      }
      lockUntil = Date.now() + 300; return;
    }
    if (t.closest('[data-confirmcancel]')) { confirmDelete = null; render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-importbackup]')) { triggerImport(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-backup]')) { backupAll(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-fullreset]')) { confirmDelete = { kind: 'reset' }; render(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-acc]'))) {
      const k = m.getAttribute('data-acc');
      if (k === 'accent') accAccent = !accAccent;
      else if (k === 'text') accText = !accText;
      else if (k === 'solid') accSolid = !accSolid;
      else if (k === 'bg') accBg = !accBg;
      render(); lockUntil = Date.now() + 200; return;
    }

    if ((m = t.closest('[data-rpacc]'))) {
      const k = m.getAttribute('data-rpacc');
      if (k === 'lang') rpAccLang = !rpAccLang;
      else if (k === 'genre') rpAccGenre = !rpAccGenre;
      else if (k === 'source') rpAccSource = !rpAccSource;
      render(); lockUntil = Date.now() + 200; return;
    }

    if ((m = t.closest('[data-rpsrc]'))) { cfg.rpSource = m.getAttribute('data-rpsrc'); saveCfg(); render(); lockUntil = Date.now() + 200; return; }
    if ((m = t.closest('[data-rpgenre]'))) { cfg.rpGenre = m.getAttribute('data-rpgenre'); saveCfg(); render(); lockUntil = Date.now() + 200; return; }

    if (t.closest('[data-quickvibe]')) {
      if (Date.now() < suppressFabVibeUntil) {
        lockUntil = Date.now() + 350;
        return;
      }

      clearRpPulse();
      rpQuickVibe();
      lockUntil = Date.now() + 300;
      return;
    }
    if (t.closest('[data-yteye]')) { ytHidden = !ytHidden; applyEyeState(); return; }
    if (t.closest('[data-ytclose]')) { closeYt(); return; }
    if (t.closest('[data-expandfull]')) {
      clearRpPulse();
      switchUiMode('panel');
      lockUntil = Date.now() + 300;
      return;
    }

    if (t.closest('[data-themebtn]')) {
      if (e.pointerType === 'mouse' || !e.pointerType) {
        theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
        saveTheme();
        applyBackground();
        render();
        lockUntil = Date.now() + 400;
      }
      return;
    }

    if ((m = t.closest('[data-swatch]'))) { setAccentForTheme(theme, m.getAttribute('data-swatch')); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-accentapplytheme]')) { const hx = bodyEl.querySelector('[data-colorhex]'); setAccentForTheme(theme, hx ? hx.value.trim() : ''); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-accentapplyall]')) { const hx = bodyEl.querySelector('[data-colorhex]'); setAccentForAll(hx ? hx.value.trim() : ''); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-accentdel]')) { setAccentForTheme(theme, ''); render(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-textswatch]'))) { setTextColorForTheme(theme, m.getAttribute('data-textswatch')); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-textapplytheme]')) { const hx = bodyEl.querySelector('[data-texthex]'); setTextColorForTheme(theme, hx ? hx.value.trim() : ''); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-textapplyall]')) { const hx = bodyEl.querySelector('[data-texthex]'); setTextColorForAll(hx ? hx.value.trim() : ''); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-textdel]')) { setTextColorForTheme(theme, ''); render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-solidtoggle]')) { const on = !isSolidTheme(); if (on) setSolidLightForTheme(theme, false); setSolidForTheme(theme, on); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-solidlighttoggle]')) { const on = !isSolidLightTheme(); if (on) setSolidForTheme(theme, false); setSolidLightForTheme(theme, on); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-soliddarkall]')) { setSolidLightForAll(false); setSolidForAll(true); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-solidlightall]')) { setSolidForAll(false); setSolidLightForAll(true); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-solidnoneall]')) { setSolidForAll(false); setSolidLightForAll(false); render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-opapplytheme]')) {
      const op = (bgPending && typeof bgPending.opacity === 'number') ? bgPending.opacity : undefined;
      if (typeof op === 'number') { if (!cfg.bgByTheme[theme]) cfg.bgByTheme[theme] = {}; cfg.bgByTheme[theme].opacity = op; saveCfg(); applyAccentVar(); }
      lockUntil = Date.now() + 300; return;
    }
    if (t.closest('[data-opapplyall]')) {
      const op = (bgPending && typeof bgPending.opacity === 'number') ? bgPending.opacity : undefined;
      if (typeof op === 'number') { THEMES.forEach(function (tm) { if (!cfg.bgByTheme[tm]) cfg.bgByTheme[tm] = {}; cfg.bgByTheme[tm].opacity = op; }); saveCfg(); applyAccentVar(); }
      lockUntil = Date.now() + 300; return;
    }

    if (t.closest('[data-sizereset]')) { userW = 0; userH = 0; saveSize(); applyUserSize(); applyPos(); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-colorreset]')) { setAccentForTheme(theme, ''); cfg.opacity = -1; saveCfg(); bgPending = null; applyAccentVar(); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-colorclose]')) { colorPopOpen = false; bgPending = null; render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-bgapplytheme]')) { applyBgToTheme(theme, bgForApplyOrCurrent()); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-bgapplyall]')) { applyBgToAllThemes(bgForApplyOrCurrent()); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-bgdeltheme]')) { applyBgToTheme(theme, null); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-bgdelall]')) { applyBgToAllThemes(null); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-plpopclose]')) { plPop = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-profpopclose]')) { profPop = false; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-profsel]')) { profPop = !profPop; render(); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-profpick]'))) { cfg.rpProfile = m.getAttribute('data-profpick'); saveCfg(); profPop = false; render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-resclear]')) { clearSearch(); clearRpPulse(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-restoggle]')) { resCollapsed = !resCollapsed; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-more]')) { searchMore(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-queuetoggle]')) { queueCollapsed = !queueCollapsed; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-clearqueue]')) { clearQueue(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-searchtab]')) { searchOpen = !searchOpen; if (searchOpen) { radioOpen = false; rpOpen = false; libOpen = false; plOpen = false; } render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-rptab]')) { rpOpen = !rpOpen; if (rpOpen) { searchOpen = false; radioOpen = false; libOpen = false; plOpen = false; } render(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-rptoggle]'))) {
      const k = m.getAttribute('data-rptoggle');
      cfg[k] = !cfg[k];
      saveCfg();
      if (k === 'debug') { DEBUG = cfg.debug; info('debug logging ' + (DEBUG ? 'ON' : 'OFF')); }
      if (k === 'rpAuto' && cfg.rpAuto) rpMsgCounter = 0;
      render(); lockUntil = Date.now() + 300; return;
    }

    if ((m = t.closest('[data-rplang]'))) { cfg.rpLang = m.getAttribute('data-rplang'); saveCfg(); render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-plnew]')) {
      if (plPop === 'queue') createManualFromQueue();
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'qtrack') createManualFromTrack(queue[plPop.i]);
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'restrack') { createManualFromTrack(results[plPop.i]); if (resultsRp) { addToRpPlaylist(results[plPop.i]); clearRpPulse(); } }
      else createManualFromTrack(results[plPop]);
      plPop = null; lockUntil = Date.now() + 300; return;
    }

    if ((m = t.closest('[data-pladd]'))) {
      let trk = null;
      if (plPop === 'queue') trk = curTrack();
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'qtrack') trk = queue[plPop.i];
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'restrack') { trk = results[plPop.i]; if (resultsRp) { addToRpPlaylist(trk); clearRpPulse(); } }
      else trk = results[plPop];
      addTrackToManual(m.getAttribute('data-pladd'), trk);
      lockUntil = Date.now() + 300; return;
    }

    if ((m = t.closest('[data-stab]'))) { searchTab = m.getAttribute('data-stab'); render(); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-resadd]'))) { enqueueResult(results[parseInt(m.getAttribute('data-resadd'), 10)], false); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-resplay]'))) { enqueueResult(results[parseInt(m.getAttribute('data-resplay'), 10)], true); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-qadd]'))) { plPop = { kind: 'qtrack', i: parseInt(m.getAttribute('data-qadd'), 10) }; render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-radiotoggle]')) { radioOpen = !radioOpen; if (radioOpen) { searchOpen = false; rpOpen = false; libOpen = false; plOpen = false; } render(); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-rtab]'))) { radioTab = m.getAttribute('data-rtab'); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-somamore]')) { loadMoreSomaStations(); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-rchip]'))) { searchRadioBrowser(m.getAttribute('data-rchip')); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-rfind]')) { const inp = bodyEl.querySelector('[data-rq]'); const q = inp ? inp.value.trim() : ''; if (q) searchRadioBrowser(q); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-rfav]'))) { toggleRadioFav({ name: m.getAttribute('data-rfname'), url: m.getAttribute('data-rfav'), tag: m.getAttribute('data-rftag') }); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-rdelfav]'))) { radioFav = radioFav.filter(function (s) { return s.url !== m.getAttribute('data-rdelfav'); }); saveRadioFav(); render(); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-rplay]'))) { playRadio({ name: m.getAttribute('data-rname'), url: m.getAttribute('data-rplay'), tag: m.getAttribute('data-rtag') }); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-src]'))) { cfg.source = m.getAttribute('data-src'); searchTab = 'src'; results = []; saveCfg(); dbg('search', 'source switched to', cfg.source); render(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-renm]'))) { renamePlaylistManual(m.getAttribute('data-renm')); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-renrp]'))) { renamePlaylistRp(m.getAttribute('data-renrp')); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-pledit]'))) { renameItem(parseInt(m.getAttribute('data-pledit'), 10)); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-pldel]'))) { removeFromQueue(parseInt(m.getAttribute('data-pldel'), 10)); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-editm]'))) { openManualEditor(m.getAttribute('data-editm')); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-editrp]'))) { openRpEditor(m.getAttribute('data-editrp')); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-trkdel]'))) {
      const i = parseInt(m.getAttribute('data-trkdel'), 10);
      if (editKind === 'm') deleteTrackFromManual(editId, i);
      else deleteTrackFromRp(editId, i);
      lockUntil = Date.now() + 300; return;
    }

    if ((m = t.closest('[data-pltrack]'))) {
      const i = parseInt(m.getAttribute('data-pltrack'), 10);
      let pl = editKind === 'm' ? lib.manual.find(function (x) { return x.id === editId; }) : lib.rp[editId];
      if (pl && pl.tracks && pl.tracks[i]) { queue.push(JSON.parse(JSON.stringify(pl.tracks[i]))); saveQueue(); playIndex(queue.length - 1); }
      lockUntil = Date.now() + 300; return;
    }

    if (t.closest('[data-editback]')) { editId = null; editKind = null; exportPop = null; scrollMemory.lib = 0; render(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-delm]'))) { confirmDelete = { kind: 'm', id: m.getAttribute('data-delm') }; render(); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-delrp]'))) { confirmDelete = { kind: 'rp', id: m.getAttribute('data-delrp') }; render(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-loadm]'))) { const p = lib.manual.find(function (x) { return x.id === m.getAttribute('data-loadm'); }); if (p) loadPlaylist(p.tracks); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-loadrp]'))) { const p = lib.rp[m.getAttribute('data-loadrp')]; if (p) loadPlaylist(p.tracks); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-openm]'))) { openManualEditor(m.getAttribute('data-openm')); lockUntil = Date.now() + 300; return; }
    if ((m = t.closest('[data-openrp]'))) { openRpEditor(m.getAttribute('data-openrp')); lockUntil = Date.now() + 300; return; }


    if (t.closest('[data-savemanual]')) { plPop = 'queue'; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-saverp]')) { saveCurrentAsRp(); lockUntil = Date.now() + 300; return; }

    if ((m = t.closest('[data-pl]'))) { playIndex(parseInt(m.getAttribute('data-pl'), 10)); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-cancel-search]')) { cancelSearch(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-cancel-rp]')) { cancelRp(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-notebtn]')) {
      if (moved) {
        lockUntil = Date.now() + 300;
        return;
      }

      if (uiMode === 'panel') {
        switchUiMode('pill');
      } else {
        switchUiMode('panel');
      }

      lockUntil = Date.now() + 300;
      return;
    }


    if (t.closest('[data-libtoggle]')) { libOpen = !libOpen; if (libOpen) { searchOpen = false; radioOpen = false; rpOpen = false; plOpen = false; editId = null; editKind = null; exportPop = null; } render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-pltoggle]')) { plOpen = !plOpen; if (plOpen) { searchOpen = false; radioOpen = false; rpOpen = false; libOpen = false; } render(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-play]') && !t.closest('[data-fabsource]')) { togglePlay(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-prev]')) { prevTrack(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-next]')) { nextTrack(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-find]')) {
      const inp = bodyEl.querySelector('[data-q]');
      const q = inp ? inp.value.trim() : '';
      if (q) { doSearch(q); if (inp) inp.value = ''; }
      lockUntil = Date.now() + 300; return;
    }
  }

  function onKey(e) {
    if (e.target && e.target.hasAttribute('data-q') && e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) { doSearch(q); e.target.value = ''; }
    }
    if (e.target && e.target.hasAttribute('data-rq') && e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) searchRadioBrowser(q);
    }
  }

  function onInput(e) {
    const el = e.target;
    if (!el) return;

    if (el.hasAttribute('data-vol')) {
      audio.volume = Math.max(0, Math.min(1, Number(el.value) / 100));
      sliderFill(el, Math.round(audio.volume * 100), 100);
    } else if (el.hasAttribute('data-progress-seek')) {
      audio.currentTime = Number(el.value);
      audioCurrentTime = audio.currentTime;
      sliderFill(el, audioCurrentTime, audioDuration || 100);
      updateProgressBarUI();
    } else if (el.hasAttribute('data-opacity')) {
      const val = Math.max(0, Math.min(100, parseInt(el.value, 10) || 0));
      if (!bgPending) bgPending = {};
      bgPending.opacity = val;
      applyAccentVar();
      const lbl = bodyEl.querySelector('.' + PFX + '-opval');
      if (lbl) lbl.textContent = val + '%';
    } else if (el.hasAttribute('data-colorpick')) {
      setAccentForTheme(theme, el.value);
      const hx = bodyEl.querySelector('[data-colorhex]');
      if (hx) hx.value = accentColor();
    } else if (el.hasAttribute('data-colorhex')) {
      const v = el.value.trim();
      if (!v) setAccentForTheme(theme, '');
      else if (validHex(v)) { setAccentForTheme(theme, v); const cp = bodyEl.querySelector('[data-colorpick]'); if (cp) cp.value = normHex(v); }
    } else if (el.hasAttribute('data-textpick')) {
      setTextColorForTheme(theme, el.value);
      const hx = bodyEl.querySelector('[data-texthex]');
      if (hx) hx.value = currentTextColor();
    } else if (el.hasAttribute('data-texthex')) {
      const v = el.value.trim();
      if (!v) setTextColorForTheme(theme, '');
      else if (validHex(v)) { setTextColorForTheme(theme, v); const cp = bodyEl.querySelector('[data-textpick]'); if (cp) cp.value = normHex(v); }
    } else if (el.hasAttribute('data-bg-url')) {
      setBgPendingFromUrl(el.value || '');
      const nm = bodyEl.querySelector('[data-bgfile-name]');
      if (nm) nm.textContent = bgPending && bgPending.url ? ('URL: ' + bgPending.url) : '';
      applyBackground();
      applyAccentVar();
    } else if (el.hasAttribute('data-bg-file')) {
      if (el.files && el.files[0]) {
        setBgPendingFromFile(el.files[0], function () {
          const nm = bodyEl.querySelector('[data-bgfile-name]');
          if (nm) nm.textContent = 'Файл выбран';
          applyBackground();
          applyAccentVar();
        });
      }
    } else if (el.hasAttribute('data-rpnum')) {
      cfg[el.getAttribute('data-rpnum')] = parseInt(el.value, 10) || 0;
      saveCfg();
    } else if (el.hasAttribute('data-cfg')) {
      cfg[el.getAttribute('data-cfg')] = el.value;
      saveCfg();
    }
  }

  function bindChatEvents() {
    const c = stContext();
    if (!c || !c.eventSource || !c.eventTypes) return;

    try {
      const et = c.eventTypes;
      const evRecv = et.MESSAGE_RECEIVED || et.message_received;
      const evSent = et.MESSAGE_SENT || et.message_sent;
      const evChat = et.CHAT_CHANGED || et.chat_changed;

      if (evRecv) c.eventSource.on(evRecv, function () { onChatMessage(); });
      if (evSent) c.eventSource.on(evSent, function () { onChatMessage(); });
      if (evChat) c.eventSource.on(evChat, function () { rpMsgCounter = 0; clearRpPulse(); });
      dbg('events', 'bound recv=', !!evRecv, 'sent=', !!evSent, 'chat=', !!evChat);
    } catch (e) {
      warn('bindChatEvents fail', e);
    }
  }

  function start() {
    try {
      $j = jq();
      cleanupAll();
      injectStyles();
      loadQueue();

      const mount = getMount();

      root = document.createElement('div');
      root.className = PFX + '-root';

      shell = document.createElement('div');
      shell.className = PFX + '-shell';

      ytLayer = document.createElement('div');
      ytLayer.className = PFX + '-ytlayer';

      bodyEl = document.createElement('div');
      bodyEl.className = PFX + '-body';

      shell.appendChild(ytLayer);
      shell.appendChild(bodyEl);
      root.appendChild(shell);
      mount.appendChild(root);

      if (curIdx >= 0 && queue[curIdx]) {
        const t = queue[curIdx];
        if (isYtTrack(t)) {
          ytCurrentEmbed = null;
          isPlaying = false;
          statusMsg = 'Тапните трек, чтобы обновить поток';
        }
      }

      render();

      setInterval(function () {
        const wandMenu = $j && $j('#extensionsMenu');
        if (wandMenu && wandMenu.length > 0 && $j('#rp-player-wand-container').length === 0) {
          const wandBtnHtml = `
            <div id="rp-player-wand-container" class="extension_container interactable" tabindex="0">
                <div id="rp-player-wand-btn" class="list-group-item flex-container flexGap5 interactable" tabindex="0">
                    <span>🎵 RP Music Player</span>
                </div>
            </div>
          `;
          wandMenu.append(wandBtnHtml);

          $j('#rp-player-wand-btn').on('click', function () {
            if (root.style.display === 'none') {
              root.style.display = 'flex';
              $j('#rp_player_show_toggle').prop('checked', true);
            } else {
              root.style.display = 'none';
              $j('#rp_player_show_toggle').prop('checked', false);
            }
          });
        }
      }, 1000);

      const extMenu = $j && $j('#extensions_popup .list-group');
      if (extMenu && extMenu.length > 0 && $j('#rp-player-ext-btn').length === 0) {
        const extBtn = $j('<div id="rp-player-ext-btn" class="list-group-item interactive extensions_menu_item" tabindex="0">🎵 RP Music Player</div>');
        extBtn.on('click', function () {
          if (root.style.display === 'none') {
            root.style.display = 'flex';
            $j('#rp_player_show_toggle').prop('checked', true);
          } else {
            root.style.display = 'none';
            $j('#rp_player_show_toggle').prop('checked', false);
          }
          $j('#extensions_popup').hide();
        });
        extMenu.append(extBtn);
      }

      if ($j && $j('#rp-player-extension-settings').length === 0) {
        const extHtml = `
          <div class="inline-drawer" id="rp-player-extension-settings">
            <div class="inline-drawer-toggle inline-drawer-header">
              <b>🎵 RP Music Player</b>
              <div class="inline-drawer-icon fa-solid fa-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content" style="display: none;">
              <label class="checkbox_label">
                <input type="checkbox" id="rp_player_show_toggle" checked>
                <span>Показывать виджет плеера на экране</span>
              </label>
              <small style="display:block; opacity:0.7; margin-top:5px;">
                Снимайте эту галочку, если плеер вам пока не нужен и вы хотите скрыть его с экрана.
              </small>
            </div>
          </div>
        `;
        $j('#extensions_settings').append(extHtml);
        $j('#rp_player_show_toggle').on('change', function () {
          const isChecked = $j(this).is(':checked');
          if (isChecked) root.style.display = 'flex';
          else root.style.display = 'none';
        });
      }

      try { applyBackground(); } catch (_) {}

      const supportsPointer = (typeof window.PointerEvent !== 'undefined');

      if (supportsPointer) {
        root.addEventListener('pointerdown', onPointerDown);
        root.addEventListener('pointermove', onPointerMove);
        root.addEventListener('pointerup', onPointerUp);
        root.addEventListener('pointercancel', onPointerCancel);
      } else {
        const wrap = function (fn) {
          return function (e) {
            const p = e.touches ? e.touches[0] : e;
            if (p) { e.clientX = p.clientX; e.clientY = p.clientY; e.pointerId = 1; e.button = e.button || 0; }
            fn(e);
          };
        };
        root.addEventListener('mousedown', wrap(onPointerDown));
        window.addEventListener('mousemove', wrap(onPointerMove));
        window.addEventListener('mouseup', wrap(onPointerUp));
        root.addEventListener('touchstart', wrap(onPointerDown), { passive: true });
        root.addEventListener('touchmove', wrap(onPointerMove), { passive: false });
        root.addEventListener('touchend', wrap(onPointerUp), { passive: false });
        root.addEventListener('touchcancel', wrap(onPointerCancel));
      }

      root.addEventListener('click', onClick);
      root.addEventListener('keydown', onKey);
      root.addEventListener('input', onInput);

      root.addEventListener('contextmenu', function (e) {
        const tb = e.target && e.target.closest && e.target.closest('[data-themebtn]');
        if (tb) {
          e.preventDefault();
          colorPopOpen = true;
          bgPending = currentBg() ? JSON.parse(JSON.stringify(currentBg())) : null;
          render();
          return;
        }
        const fb = e.target && e.target.closest && e.target.closest('[data-fabbtn]');
        if (fb && uiMode === 'fab') {
          e.preventDefault();

          syncMiniAnchorFromRoot();
          switchUiMode('panel');

          return;
        }

        const ns = e.target && e.target.closest && e.target.closest('[data-notesource]');
        if (ns && uiMode === 'panel') {
          e.preventDefault();

          const rect = root.getBoundingClientRect();
          rememberReturnMiniFromRect(rect, 'pill');
          pendingFabPoint = { x: e.clientX, y: e.clientY };
          switchUiMode('fab');

          suppressFabVibeUntil = Date.now() + 350;
          modeGestureSuppressClickUntil = Date.now() + 350;
          lockUntil = Math.max(lockUntil, Date.now() + 350);

          return;
        }

        const fs = e.target && e.target.closest && e.target.closest('[data-fabsource]');
        if (fs && collapsed && uiMode !== 'fab') {
          e.preventDefault();

          syncMiniAnchorFromRoot();
          pendingFabPoint = { x: e.clientX, y: e.clientY };
          switchUiMode('fab');

          suppressFabVibeUntil = Date.now() + 350;
          modeGestureSuppressClickUntil = Date.now() + 350;
          lockUntil = Math.max(lockUntil, Date.now() + 350);
        }
      });

      bindChatEvents();

      try {
        if ($j) $j(window).on('pagehide.' + PFX + ' beforeunload.' + PFX, cleanupAll);
      } catch (_) {}

      try {
        if ($j) {
          $j(window).on('resize.' + PFX, function () { refreshTopbar(); applyUserSize(); applyPos(); });
        } else {
          window.addEventListener('resize', function () { refreshTopbar(); applyUserSize(); applyPos(); });
        }
      } catch (_) {}

      setTimeout(function () { refreshTopbar(); applyPos(); }, 200);
      setTimeout(function () { refreshTopbar(); applyPos(); }, 800);
      setTimeout(function () { refreshTopbar(); applyPos(); }, 2000);

      info('RP Music Player started. uiMode=', uiMode, 'debug=', DEBUG);
    } catch (err) {
      error('init error:', err);
    }
  }

  $j = jq();
  if ($j) {
    $j(start);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
