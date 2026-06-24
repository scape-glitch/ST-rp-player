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
  const LS_CFG = 'rp_player_cfg_v1';
  const LS_QUEUE = 'rp_player_queue_v1';
  const LS_LIB = 'rp_player_lib_v1';
  const LS_RADIO_FAV = 'rp_player_radiofav_v1';
  const LS_SIZE = 'rp_player_size_v1';
  const DEFAULT_JAMENDO_KEY = '6fcc94f7';
  const DEFAULT_YT_KEY = 'AIzaSyDMuAcY3e7h6EDCybpGVuwGbvq7lYJB18A';
  const BAIBAI_JS = 'https://drive.baibai.cv/f/ZKEBuW/Music.js';

  const THEMES = ['default', 'glass', 'neon', 'paper', 'minimal'];
  let theme = 'default';
  try { const c = JSON.parse(localStorage.getItem(LS_CFG) || '{}'); if (c.theme) theme = c.theme; } catch (_) {}

  function log(...args) { console.log('[ST Player]', ...args); }
  function warn(...args) { console.warn('[ST Player]', ...args); }
  function error(...args) { console.error('[ST Player]', ...args); }

  let cfg = {
    source: 'jamendo', jamendoKey: '', ytKey: '', accent: '', opacity: -1,
    rpAuto: false, rpQuick: false, rpEvery: 10, rpCount: 5,
    rpProfile: '', rpTokenLimitOn: false, rpTokenLimit: 6000,
    rpLang: '', rpLangCustom: '', rpQuickAutoplay: false,
    bgType: 'none', bgUrl: '', bgBase64: '', bgByTheme: {}
  };
  try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem(LS_CFG) || '{}')); } catch (_) {}
  if (!cfg.bgByTheme || typeof cfg.bgByTheme !== 'object') cfg.bgByTheme = {};
  let bgPending = null;
  function saveCfg() { try { localStorage.setItem(LS_CFG, JSON.stringify(cfg)); } catch (_) {} }
  function jamKey() { return (cfg.jamendoKey || '').trim() || DEFAULT_JAMENDO_KEY; }
  function ytKey() { return (cfg.ytKey || '').trim() || DEFAULT_YT_KEY; }

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
    ['rp_player_state_v1', 'rp_player_pos_v2', 'rp_player_pos_v3', 'liquidGlassPosition'].forEach(function (k) { localStorage.removeItem(k); });
  } catch (_) {}

  let collapsed = true;
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

  let searchAbortController = null;
  let rpAbortController = null;

  let posCollapsedX = -1, posCollapsedY = -1;
  let posExpandedX = -1, posExpandedY = -1;
  let sizeCollapsedW = 0, sizeCollapsedH = 0;
  let sizeExpandedW = 0, sizeExpandedH = 0, posX = -1, posY = -1;
  let userW = 0, userH = 0;

  let audioCurrentTime = 0;
  let audioDuration = 0;

  (function () {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SIZE) || '{}');
      if (typeof s.collapsedW === 'number') sizeCollapsedW = s.collapsedW;
      if (typeof s.collapsedH === 'number') sizeCollapsedH = s.collapsedH;
      if (typeof s.expandedW === 'number') sizeExpandedW = s.expandedW;
      if (typeof s.expandedH === 'number') sizeExpandedH = s.expandedH;
      if (typeof s.w === 'number' && sizeExpandedW === 0) sizeExpandedW = s.w;
      if (typeof s.h === 'number' && sizeExpandedH === 0) sizeExpandedH = s.h;
    } catch (e) {}
  })();

  function saveSize() {
    try {
      if (collapsed) { sizeCollapsedW = userW || sizeCollapsedW; sizeCollapsedH = userH || sizeCollapsedH; }
      else { sizeExpandedW = userW || sizeExpandedW; sizeExpandedH = userH || sizeExpandedH; }
      localStorage.setItem(LS_SIZE, JSON.stringify({
        collapsedW: sizeCollapsedW,
        collapsedH: sizeCollapsedH,
        expandedW: sizeExpandedW,
        expandedH: sizeExpandedH
      }));
    } catch (e) {}
  }

  (function () {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if (typeof s.collapsed === 'boolean') collapsed = s.collapsed;
      if (typeof s.collapsedX === 'number') posCollapsedX = s.collapsedX;
      if (typeof s.collapsedY === 'number') posCollapsedY = s.collapsedY;
      if (typeof s.expandedX === 'number') posExpandedX = s.expandedX;
      if (typeof s.expandedY === 'number') posExpandedY = s.expandedY;
      if (typeof s.x === 'number' && posExpandedX === -1) posExpandedX = s.x;
      if (typeof s.y === 'number' && posExpandedY === -1) posExpandedY = s.y;
    } catch (e) {}
  })();

  try {
    posX = (collapsed ? posCollapsedX : posExpandedX);
    posY = (collapsed ? posCollapsedY : posExpandedY);
    userW = (collapsed ? sizeCollapsedW : sizeExpandedW) || 0;
    userH = (collapsed ? sizeCollapsedH : sizeExpandedH) || 0;
  } catch (_) {}

  function savePos() {
    try {
      if (root) {
        const r = root.getBoundingClientRect();
        if (collapsed) { posCollapsedX = Math.round(r.left); posCollapsedY = Math.round(r.top); }
        else { posExpandedX = Math.round(r.left); posExpandedY = Math.round(r.top); }
      }
      localStorage.setItem(LS_KEY, JSON.stringify({
        collapsed: collapsed,
        collapsedX: posCollapsedX,
        collapsedY: posCollapsedY,
        expandedX: posExpandedX,
        expandedY: posExpandedY
      }));
      posX = (collapsed ? posCollapsedX : posExpandedX);
      posY = (collapsed ? posCollapsedY : posExpandedY);
    } catch (e) {}
  }

  let $j;
  function jq() { return (typeof $ === 'function' && $.fn) ? $ : (window.jQuery && window.jQuery.fn ? window.jQuery : null); }
  function scriptId() { try { if (typeof getScriptId === 'function') return getScriptId(); } catch (_) {} return null; }
  function VW() { let w = 0; if ($j) { try { w = $j('body').width() || $j(window).width() || 0; } catch (_) {} } if (!w) w = window.innerWidth || 360; return w; }
  function VH() { let h = 0; if ($j) { try { h = $j('body').height() || $j(window).height() || 0; } catch (_) {} } if (!h) h = window.innerHeight || 640; return h; }

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
  function refreshTopbar() { TOPBAR = topBarOffset(); }

  function stContext() {
    try { if (window.SillyTavern && window.SillyTavern.getContext) return window.SillyTavern.getContext(); } catch (_) {}
    return null;
  }
  function getChatId() {
    const c = stContext();
    if (c) { try { return String(c.chatId || c.characterId || c.groupId || 'default'); } catch (_) {} }
    return 'default';
  }
  function getChatName() {
    const c = stContext();
    if (c) { try { return String(c.name2 || c.characterName || ('Чат ' + (c.chatId || ''))).slice(0, 40) || 'Чат'; } catch (_) {} }
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
    if (curIdx >= 0 && queue[curIdx] && queue[curIdx].kind === 'audio') {
      audioCurrentTime = audio.currentTime;
      audioDuration = audio.duration || 0;
      updateProgressBarUI();
    }
  });

  audio.addEventListener('loadedmetadata', function () {
    if (curIdx >= 0 && queue[curIdx] && queue[curIdx].kind === 'audio') {
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

  function updateProgressBarUI() {
    if (!bodyEl || collapsed) return;
    const sld = bodyEl.querySelector('.' + PFX + '-progress-slider');
    const curLbl = bodyEl.querySelector('.' + PFX + '-cur-time');
    const durLbl = bodyEl.querySelector('.' + PFX + '-dur-time');
    if (sld) {
      sld.value = audioCurrentTime;
      sld.max = audioDuration || 100;
    }
    if (curLbl) curLbl.textContent = formatTime(audioCurrentTime);
    if (durLbl) durLbl.textContent = formatTime(audioDuration);
  }

  let results = [];
  let resultsTitle = '';
  let resultsRp = false;
  let searchState = { query: '', scope: 'all', srcIdx: 0, offsets: {}, ytTokens: {}, exhausted: false };

  let lib = { manual: [], rp: {} };
  try { lib = Object.assign({ manual: [], rp: {} }, JSON.parse(localStorage.getItem(LS_LIB) || '{}')); } catch (_) {}
  function saveLib() { try { localStorage.setItem(LS_LIB, JSON.stringify(lib)); } catch (_) {} }

  let radioFav = [];
  try { const a = JSON.parse(localStorage.getItem(LS_RADIO_FAV) || '[]'); if (Array.isArray(a)) radioFav = a; } catch (_) {}
  function saveRadioFav() { try { localStorage.setItem(LS_RADIO_FAV, JSON.stringify(radioFav)); } catch (_) {} }
  function isRadioFav(url) { return radioFav.some(function (s) { return s.url === url; }); }
  function toggleRadioFav(station) {
    if (isRadioFav(station.url)) radioFav = radioFav.filter(function (s) { return s.url !== station.url; });
    else radioFav.push({ name: station.name, url: station.url, tag: station.tag || '' });
    saveRadioFav(); render();
  }

  const SOMA_STATIONS = [
    { name: 'Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3', tag: 'ambient/космос' },
    { name: 'Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3', tag: 'чилл/даунтемпо' },
    { name: 'Deep Space One', url: 'https://ice1.somafm.com/deepspaceone-128-mp3', tag: 'тёмный эмбиент' },
    { name: 'Space Station', url: 'https://ice1.somafm.com/spacestation-128-mp3', tag: 'электро/спейс' },
    { name: 'Lush', url: 'https://ice1.somafm.com/lush-128-mp3', tag: 'вокал/мечтательное' },
    { name: 'Beat Blender', url: 'https://ice1.somafm.com/beatblender-128-mp3', tag: 'хаус/даунтемпо' },
    { name: 'Secret Agent', url: 'https://ice1.somafm.com/secretagent-128-mp3', tag: 'спай/джаз/нуар' },
    { name: 'Mission Control', url: 'https://ice1.somafm.com/missioncontrol-128-mp3', tag: 'эмбиент/космос' },
    { name: 'Dub Step Beyond', url: 'https://ice1.somafm.com/dubstep-128-mp3', tag: 'дабстеп' },
    { name: 'DEF CON Radio', url: 'https://ice1.somafm.com/defcon-128-mp3', tag: 'тёмное электро' },
    { name: 'The Trip', url: 'https://ice1.somafm.com/thetrip-128-mp3', tag: 'прог/транс' },
    { name: 'Black Rock FM', url: 'https://ice1.somafm.com/brfm-128-mp3', tag: 'разное/burning man' },
    { name: 'Indie Pop Rocks', url: 'https://ice1.somafm.com/indiepop-128-mp3', tag: 'инди-поп' },
    { name: 'Metal Detector', url: 'https://ice1.somafm.com/metal-128-mp3', tag: 'метал' },
    { name: 'Folk Forward', url: 'https://ice1.somafm.com/folkfwd-128-mp3', tag: 'фолк' },
    { name: 'Seven Inch Soul', url: 'https://ice1.somafm.com/7soul-128-mp3', tag: 'соул/фанк' },
    { name: 'Suburbs of Goa', url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3', tag: 'world/desi' },
    { name: 'Vaporwaves', url: 'https://ice1.somafm.com/vaporwaves-128-mp3', tag: 'вейпорвейв' },
    { name: 'Sonic Universe', url: 'https://ice1.somafm.com/sonicuniverse-128-mp3', tag: 'авангард-джаз' },
    { name: 'Fluid', url: 'https://ice1.somafm.com/fluid-128-mp3', tag: 'хип-хоп/трип' }
  ];

  const RADIO_CHIPS = ['jazz', 'lofi', 'ambient', 'rock', 'classical', 'chill', 'electronic', 'pop', 'metal', 'folk'];

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
    saveCfg(); applyBackground(); applyAccentVar();
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
    saveCfg(); applyBackground(); applyAccentVar();
  }

  function setBgPendingFromUrl(url) {
    url = (url || '').trim();
    if (url) bgPending = { base64: '', url: url };
    else bgPending = null;
  }
  function setBgPendingFromFile(file, cb) {
    if (!file) { bgPending = null; if (cb) cb(); return; }
    var reader = new FileReader();
    reader.onload = function (ev) { bgPending = { base64: ev.target.result || '', url: '' }; if (cb) cb(); };
    reader.onerror = function (e) { if (cb) cb(); };
    reader.readAsDataURL(file);
  }

  function playRadio(station) {
    stopYt();
    statusMsg = '';
    curIdx = -1;
    queue = [];
    audio.src = station.url;
    audio.play().then(function () { isPlaying = true; window.__rpRadioNow = station; render(); })
      .catch(function (e) { isPlaying = false; statusMsg = 'Радио недоступно'; render(); });
    window.__rpRadioNow = station;
    render();
  }

  async function searchRadioBrowser(q) {
    statusMsg = 'Поиск радио…'; radioResults = []; render();
    try {
      const base = 'https://de1.api.radio-browser.info/json/stations/search';
      let res, data;
      try { res = await fetch(base + '?limit=20&hidebroken=true&order=clickcount&reverse=true&tag=' + encodeURIComponent(q)); data = await res.json(); } catch (_) { data = []; }
      if (!data || !data.length) { res = await fetch(base + '?limit=20&hidebroken=true&order=clickcount&reverse=true&name=' + encodeURIComponent(q)); data = await res.json(); }
      radioResults = (data || []).filter(function (s) { return s.url_resolved; }).slice(0, 18).map(function (s) {
        return { name: s.name || 'станция', url: s.url_resolved, tag: (s.country || '') + (s.tags ? ' · ' + String(s.tags).split(',').slice(0, 2).join(',') : '') };
      });
      statusMsg = radioResults.length ? '' : 'Ничего не найдено';
    } catch (e) { statusMsg = 'Ошибка поиска радио'; }
    render();
  }

  let baibaiLoaded = false, baibaiLoading = false;
  function loadBaibai() {
    if (baibaiLoaded || baibaiLoading) return;
    if (window.Music && window.Music.SearchMusic) { baibaiLoaded = true; return; }
    baibaiLoading = true;
    try {
      const s = document.createElement('script');
      s.src = BAIBAI_JS;
      s.onload = function () { baibaiLoaded = true; baibaiLoading = false; };
      s.onerror = function () { baibaiLoading = false; };
      (document.head || document.documentElement).appendChild(s);
    } catch (_) { baibaiLoading = false; }
  }

  function saveQueue() {
    try { localStorage.setItem(LS_QUEUE, JSON.stringify({ queue: queue, curIdx: curIdx })); } catch (_) {}
  }
  function loadQueue() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_QUEUE) || '{}');
      if (Array.isArray(s.queue)) { queue = s.queue; curIdx = (typeof s.curIdx === 'number') ? s.curIdx : -1; }
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

  function hasDash(s) { return /[-—–]/.test(String(s || '')); }

  function fetchWithCancel(url, options = {}, controller) {
    const opts = Object.assign({}, options);
    if (controller) opts.signal = controller.signal;
    return fetch(url, opts);
  }

  const Jamendo = {
    name: 'Jamendo', type: 'audio',
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
      return data.results.filter(function (t) { return t.audio; }).map(function (t) {
        return { kind: 'audio', url: t.audio, title: t.name, artist: t.artist_name, source: 'Jamendo' };
      });
    }
  };

  const YouTubeAPI = {
    name: 'YouTube', type: 'yt',
    async search(query, controller) {
      const url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=1&q=' +
        encodeURIComponent(query) + '&key=' + encodeURIComponent(ytKey());
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      if (data && data.error) { console.warn('[RP_Player] YT API error', data.error); throw new Error('yt'); }
      if (!data || !data.items || !data.items.length) return null;
      const it = data.items[0];
      let title = (it.snippet.title || '');
      const ta = document.createElement('textarea'); ta.innerHTML = title; title = ta.value;
      return { kind: 'yt', ytid: it.id.videoId, title: title, artist: it.snippet.channelTitle || '', source: 'YouTube' };
    },
    async searchMany(query, limit, offset, pageToken, controller) {
      let url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&order=relevance&maxResults=' +
        (limit || 10) + '&q=' + encodeURIComponent(query) + '&key=' + encodeURIComponent(ytKey());
      if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
      const res = await fetchWithCancel(url, {}, controller);
      const data = await res.json();
      if (data && data.error) { console.warn('[RP_Player] YT API error', data.error); throw new Error('yt'); }
      if (!data || !data.items || !data.items.length) return { items: [], nextToken: null };
      const items = data.items.filter(function (it) { return it.id && it.id.videoId; }).map(function (it) {
        let title = (it.snippet.title || '');
        const ta = document.createElement('textarea'); ta.innerHTML = title; title = ta.value;
        return { kind: 'yt', ytid: it.id.videoId, title: title, artist: it.snippet.channelTitle || '', source: 'YouTube' };
      });
      return { items: items, nextToken: data.nextPageToken || null };
    }
  };

  const YouTubeLink = {
    name: 'YT-ссылка', type: 'yt',
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
    name: 'baibai', type: 'audio',
    async search(query) {
      loadBaibai();
      let tries = 0;
      while ((!window.Music || !window.Music.SearchMusic) && tries < 30) { await new Promise(function (r) { setTimeout(r, 100); }); tries++; }
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
    name: 'ccMixter', type: 'audio',
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
          const f = t.files.find(function (x) { return x.download_url && /mp3/i.test(x.file_name || x.download_url); }) || t.files[0];
          mp3 = f && f.download_url ? f.download_url : '';
        }
        if (mp3) out.push({ kind: 'audio', url: mp3, title: t.upload_name || query, artist: t.user_name || '', source: 'ccMixter' });
      });
      return out;
    }
  };

  const FMA = {
    name: 'FMA', type: 'audio',
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

  function activeSource() {
    if (cfg.source === 'youtube') return YouTubeAPI;
    if (cfg.source === 'ytlink') return YouTubeLink;
    if (cfg.source === 'baibai') return Baibai;
    if (cfg.source === 'ccmixter') return CCMixter;
    if (cfg.source === 'fma') return FMA;
    return Jamendo;
  }

  const ALL_SOURCES = [Jamendo, Baibai, YouTubeAPI, CCMixter, FMA];

  function withTimeout(promise, ms, controller) {
    return Promise.race([
      promise,
      new Promise(function (_, rej) {
        const id = setTimeout(function () { rej(new Error('timeout')); }, ms);
        if (controller) controller.signal.addEventListener('abort', () => { clearTimeout(id); rej(new Error('aborted')); });
      })
    ]);
  }

  function dedupeResults(arr) {
    const seen = {};
    const out = [];
    arr.forEach(function (r) {
      const key = (r.kind === 'yt' ? r.ytid : r.url) || (r.title + '|' + r.artist);
      if (key && !seen[key]) { seen[key] = 1; out.push(r); }
    });
    return out;
  }

  async function srcMany(src, query, limit, offset, controller) {
    if (src === YouTubeAPI) {
      const token = searchState.ytTokens[src.name] || null;
      const r = await withTimeout(src.searchMany(query, limit, offset, token, controller), 8000, controller);
      searchState.ytTokens[src.name] = r.nextToken;
      return r.items || [];
    }
    return await withTimeout(src.searchMany(query, limit, offset, controller), 8000, controller);
  }

  async function searchOneSource(src, query) {
    searching = true; statusMsg = 'Поиск…'; resultsRp = false; render();
    searchAbortController = new AbortController();
    try {
      const r = await withTimeout(src.search(query, searchAbortController), 8000, searchAbortController);
      if (r) { results = [r]; resultsTitle = src.name + ' · трек'; statusMsg = ''; searching = false; queue.push(r); saveQueue(); playIndex(queue.length - 1); return; }
      statusMsg = 'Не найдено: ' + query;
    } catch (e) {
      if (e.message === 'aborted') statusMsg = 'Поиск отменён';
      else statusMsg = src.name + ': ошибка';
    }
    searching = false; searchAbortController = null; render();
  }

  async function topOneSource(src, query) {
    searching = true; statusMsg = 'Ищу: ' + src.name + '…'; results = []; resultsRp = false; render();
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
      else statusMsg = src.name + ': ошибка';
    }
    searching = false; searchAbortController = null; render();
  }

  async function moreOneSource() {
    const src = activeSource();
    if (src === YouTubeLink) return;
    searching = true; statusMsg = 'Ищу ещё: ' + src.name + '…'; render();
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
      else statusMsg = src.name + ': ошибка';
    }
    searching = false; searchAbortController = null; render();
  }

  async function findExactAll(query) {
    searching = true; statusMsg = 'Общий поиск…'; results = []; resultsRp = false; render();
    searchAbortController = new AbortController();
    for (let k = 0; k < ALL_SOURCES.length; k++) {
      const src = ALL_SOURCES[k];
      statusMsg = 'Ищу: ' + src.name + '…'; render();
      try {
        const r = await withTimeout(src.search(query, searchAbortController), 6000, searchAbortController);
        if (r) { results = [r]; resultsTitle = src.name + ' · трек'; statusMsg = ''; searching = false; queue.push(r); saveQueue(); playIndex(queue.length - 1); return; }
      } catch (e) {
        if (e.message === 'aborted') { statusMsg = 'Поиск отменён'; searching = false; searchAbortController = null; render(); return; }
      }
    }
    statusMsg = 'Нигде не найдено: ' + query; searching = false; searchAbortController = null; render();
  }

  async function topAll(query) {
    searching = true; statusMsg = 'Собираю результаты…'; results = []; resultsRp = false; render();
    searchState = { query: query, scope: 'all', srcIdx: 0, offsets: {}, ytTokens: {}, exhausted: false };
    searchAbortController = new AbortController();
    let acc = [];
    for (let k = 0; k < ALL_SOURCES.length; k++) {
      const src = ALL_SOURCES[k];
      statusMsg = 'Ищу: ' + src.name + '…'; render();
      try {
        const arr = await srcMany(src, query, 5, 0, searchAbortController);
        searchState.offsets[src.name] = 5;
        if (arr && arr.length) { acc = dedupeResults(acc.concat(arr)); results = acc.slice(0, 200); render(); }
      } catch (e) {
        if (e.message === 'aborted') { statusMsg = 'Поиск отменён'; searching = false; searchAbortController = null; render(); return; }
      }
    }
    results = acc.slice(0, 200);
    resultsTitle = '«' + query + '» (везде)';
    statusMsg = results.length ? '' : 'Нигде не найдено: ' + query;
    searching = false; searchAbortController = null; render();
  }

  async function moreAll() {
    searching = true; statusMsg = 'Ищу ещё…'; render();
    searchAbortController = new AbortController();
    let acc = results.slice();
    const before = acc.length;
    for (let k = 0; k < ALL_SOURCES.length; k++) {
      const src = ALL_SOURCES[k];
      statusMsg = 'Ищу: ' + src.name + '…'; render();
      try {
        const off = searchState.offsets[src.name] || 0;
        const arr = await srcMany(src, searchState.query, 5, off, searchAbortController);
        searchState.offsets[src.name] = off + 5;
        if (arr && arr.length) { acc = dedupeResults(acc.concat(arr)); }
      } catch (e) {
        if (e.message === 'aborted') { statusMsg = 'Поиск отменён'; searching = false; searchAbortController = null; render(); return; }
      }
    }
    results = acc.slice(0, 200);
    statusMsg = (results.length > before) ? '' : 'Больше нет результатов';
    if (results.length === before) searchState.exhausted = true;
    searching = false; searchAbortController = null; render();
  }

  function searchMore() {
    if (searchState.scope === 'all') moreAll(); else moreOneSource();
  }

  function runSearch(query, scope) {
    if (!query) return;
    const exact = hasDash(query);
    if (scope === 'all') {
      if (cfg.source === 'ytlink') { searchOneSource(YouTubeLink, query); return; }
      if (exact) findExactAll(query); else topAll(query);
    } else {
      const src = activeSource();
      if (src === YouTubeLink) { searchOneSource(src, query); return; }
      if (exact) searchOneSource(src, query); else topOneSource(src, query);
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
    results = []; resultsTitle = ''; resultsRp = false; statusMsg = 'Найдите трек'; searching = false;
    searchState = { query: '', scope: 'all', srcIdx: 0, offsets: {}, ytTokens: {}, exhausted: false };
    if (searchAbortController) { searchAbortController.abort(); searchAbortController = null; }
    render();
  }

  function enqueueResult(r, play) {
    const copy = JSON.parse(JSON.stringify(r));
    queue.push(copy);
    saveQueue();
    if (resultsRp) { addToRpPlaylist(copy); clearRpPulse(); }
    if (play) playIndex(queue.length - 1); else render();
  }

  async function findTrackForRp(query, controller) {
    for (let k = 0; k < ALL_SOURCES.length; k++) {
      const src = ALL_SOURCES[k];
      try {
        const r = await withTimeout(src.search(query, controller), 6000, controller);
        if (r) return r;
      } catch (e) { if (e.message === 'aborted') throw e; }
    }
    return null;
  }

  function isYtTrack(t) { return t && (t.kind === 'yt' || t.kind === 'ytlist'); }
  function curTrack() { return curIdx >= 0 ? queue[curIdx] : null; }

  function ytEmbedSrc(t) {
    if (!t) return '';
    let origin = '';
    try { origin = window.location.origin || ''; } catch (_) {}
    const q = '?autoplay=1&playsinline=1&rel=0' + (origin ? '&origin=' + encodeURIComponent(origin) : '');
    if (t.kind === 'ytlist') {
      return 'https://www.youtube.com/embed/' + (t.ytid || 'videoseries') + q + '&listType=playlist&list=' + encodeURIComponent(t.ytlist);
    }
    return 'https://www.youtube.com/embed/' + encodeURIComponent(t.ytid) + q;
  }

  function stopAudio() { try { audio.pause(); } catch (_) {} }
  function stopYt() { ytCurrentEmbed = null; }

  function playIndex(i) {
    if (i < 0 || i >= queue.length) return;
    curIdx = i; saveQueue();
    const t = queue[i];
    statusMsg = '';
    if (isYtTrack(t)) {
      stopAudio();
      isPlaying = true;
      ytCurrentEmbed = ytEmbedSrc(t);
      render();
    } else {
      stopYt();
      audio.src = t.url;
      audio.play().then(function () { isPlaying = true; render(); })
        .catch(function (e) { isPlaying = false; statusMsg = 'Ошибка воспроизведения'; render(); });
      render();
    }
  }

  function togglePlay() {
    if (curIdx < 0) {
      if (window.__rpRadioNow) { if (isPlaying) { audio.pause(); isPlaying = false; } else { audio.play(); isPlaying = true; } updatePlayBtn(); return; }
      statusMsg = 'Сначала найдите трек'; render(); return;
    }
    const t = queue[curIdx];
    if (isYtTrack(t)) { statusMsg = ''; return; }
    if (isPlaying) { audio.pause(); isPlaying = false; } else { audio.play(); isPlaying = true; }
    updatePlayBtn();
  }
  function nextTrack() { if (queue.length) playIndex((curIdx + 1) % queue.length); }
  function prevTrack() { if (queue.length) playIndex((curIdx - 1 + queue.length) % queue.length); }
  function removeFromQueue(i) {
    if (i < 0 || i >= queue.length) return;
    const wasCur = (i === curIdx);
    queue.splice(i, 1);
    if (i < curIdx) curIdx--;
    else if (wasCur) {
      if (queue.length === 0) { curIdx = -1; stopAudio(); stopYt(); isPlaying = false; statusMsg = 'Очередь пуста'; saveQueue(); render(); return; }
      else { if (curIdx >= queue.length) curIdx = 0; saveQueue(); playIndex(curIdx); return; }
    }
    saveQueue(); render();
  }
  function renameItem(i) {
    if (i < 0 || i >= queue.length) return;
    const cur = queue[i].title || '';
    let nv = null;
    try { nv = window.prompt('Название:', cur); } catch (_) {}
    if (nv !== null && String(nv).trim()) { queue[i].title = String(nv).trim(); saveQueue(); render(); }
  }

  function flashPlaylist(id) {
    flashPlId = id;
    render();
    setTimeout(function () { flashPlId = null; render(); }, 1200);
  }
  function addTrackToManual(plId, track) {
    const p = lib.manual.find(function (x) { return x.id === plId; });
    if (!p || !track) return;
    if (!Array.isArray(p.tracks)) p.tracks = [];
    p.tracks.push(JSON.parse(JSON.stringify(track)));
    saveLib(); flashPlaylist(plId);
  }
  function createManualFromQueue() {
    if (!queue.length) { statusMsg = 'Очередь пуста'; render(); return; }
    let nm = null;
    try { nm = window.prompt('Название плейлиста:', 'Мой плейлист'); } catch (_) {}
    if (nm === null || !String(nm).trim()) return;
    lib.manual.push({ id: 'm' + Date.now(), name: String(nm).trim(), tracks: JSON.parse(JSON.stringify(queue)) });
    saveLib(); render();
  }
  function createManualFromTrack(track) {
    if (!track) return;
    let nm = null;
    try { nm = window.prompt('Название нового плейлиста:', 'Мой плейлист'); } catch (_) {}
    if (nm === null || !String(nm).trim()) return;
    lib.manual.push({ id: 'm' + Date.now(), name: String(nm).trim(), tracks: [JSON.parse(JSON.stringify(track))] });
    saveLib(); render();
  }
  function saveCurrentAsRp() {
    if (!queue.length) { statusMsg = 'Очередь пуста'; render(); return; }
    const cid = getChatId();
    if (!lib.rp[cid]) lib.rp[cid] = { name: getChatName() + ' ' + dateStamp(), tracks: [] };
    lib.rp[cid].tracks = JSON.parse(JSON.stringify(queue));
    saveLib(); render();
  }
  function addToRpPlaylist(track) {
    if (!track) return;
    const cid = getChatId();
    if (!lib.rp[cid]) lib.rp[cid] = { name: getChatName() + ' ' + dateStamp(), tracks: [] };
    if (!Array.isArray(lib.rp[cid].tracks)) lib.rp[cid].tracks = [];
    const exists = lib.rp[cid].tracks.some(function (x) {
      return (x.kind === 'yt' ? x.ytid === track.ytid : x.url === track.url);
    });
    if (!exists) { lib.rp[cid].tracks.push(JSON.parse(JSON.stringify(track))); saveLib(); }
  }
  function loadPlaylist(tracks) {
    if (!Array.isArray(tracks) || !tracks.length) return;
    queue = JSON.parse(JSON.stringify(tracks));
    saveQueue();
    playIndex(0);
  }
  function renamePlaylistManual(id) {
    const p = lib.manual.find(function (x) { return x.id === id; });
    if (!p) return;
    let nv = null;
    try { nv = window.prompt('Название плейлиста:', p.name); } catch (_) {}
    if (nv !== null && String(nv).trim()) { p.name = String(nv).trim(); saveLib(); render(); }
  }
  function renamePlaylistRp(cid) {
    const p = lib.rp[cid];
    if (!p) return;
    let nv = null;
    try { nv = window.prompt('Название плейлиста:', p.name); } catch (_) {}
    if (nv !== null && String(nv).trim()) { p.name = String(nv).trim(); saveLib(); render(); }
  }
  function deleteManual(id) { lib.manual = lib.manual.filter(function (p) { return p.id !== id; }); saveLib(); render(); }
  function deleteRp(cid) { delete lib.rp[cid]; saveLib(); render(); }
  function deleteTrackFromManual(plId, idx) {
    const p = lib.manual.find(function (x) { return x.id === plId; });
    if (!p || !Array.isArray(p.tracks)) return;
    p.tracks.splice(idx, 1);
    saveLib(); render();
  }
  function deleteTrackFromRp(cid, idx) {
    const p = lib.rp[cid];
    if (!p || !Array.isArray(p.tracks)) return;
    p.tracks.splice(idx, 1);
    saveLib(); render();
  }

  function clearRpPulse() {
    if (rpPulse) { rpPulse = false; if (root) root.classList.remove(PFX + '-pulse'); }
  }
  function setRpPulse() {
    rpPulse = true; if (root) root.classList.add(PFX + '-pulse');
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
  function profileName(id) {
    if (!id) return 'Текущий профиль';
    const p = getProfiles().find(function (x) { return x.id === id; });
    return p ? (p.name || id) : 'Текущий профиль';
  }

  function getRecentMessages(n) {
    const c = stContext();
    if (!c || !Array.isArray(c.chat)) return [];
    const arr = c.chat.filter(function (m) { return m && !m.is_system && typeof m.mes === 'string' && m.mes.trim(); });
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

  function getRecentlyPicked() {
    const cid = getChatId();
    const out = [];
    try {
      const p = lib.rp[cid];
      if (p && Array.isArray(p.tracks)) {
        p.tracks.slice(-40).forEach(function (t) {
          const a = (t.artist || '').trim();
          const ti = (t.title || '').trim();
          if (ti) out.push((a ? a + ' — ' : '') + ti);
        });
      }
    } catch (_) {}
    return out;
  }

  function buildRpPrompt(count, messages, avoidList) {
    let lang = cfg.rpLang;
    if (lang === 'custom') lang = (cfg.rpLangCustom || '').trim();

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

    let avoidReq = '';
    if (avoidList && avoidList.length) {
      avoidReq = '\nDO NOT REPEAT these already-suggested tracks (pick completely different ones):\n' +
        avoidList.map(function (x) { return '- ' + x; }).join('\n') + '\n';
    }
    const seed = Math.floor(Math.random() * 100000);

    const sys =
      langTop +
      'You are a music curator for an immersive roleplay session.\n' +
      'Analyze the mood, emotions, atmosphere, tempo, narrative and the DIRECT SPEECH of the characters (User and Char) in the recent messages.\n' +
      'Suggest ' + count + ' real, existing music track(s) that capture the EMOTIONAL TONE of the current scene.\n\n' +
      'Rules:\n' +
      '- Only REAL, well-known existing tracks (artist + title), findable on YouTube. Never invent tracks.\n' +
      '- ONLY actual songs or instrumental pieces. NEVER jingles, ringtones, sound effects, ad music, memes, children songs, novelty audio.\n' +
      '- Emotional tone of the track MUST match the scene (dramatic=intense, sad=melancholic, tense=dark, romantic=tender).\n' +
      '- Use different artists.\n' +
      (lang ? '- REMINDER: ALL tracks MUST be in ' + lang + '. No exceptions.\n' : '') +
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
    try { obj = JSON.parse(s); } catch (_) {
      const m = s.match(/\{[\s\S]*\}/);
      if (m) { try { obj = JSON.parse(m[0]); } catch (_) {} }
    }
    if (!obj || !Array.isArray(obj.tracks)) return [];
    return obj.tracks.filter(function (t) { return t && t.artist && t.track; }).map(function (t) {
      return { artist: String(t.artist).trim(), track: String(t.track).trim(), why: String(t.why || '').trim() };
    });
  }

    async function callModel(prompt) {
    const c = stContext();
    if (!c) throw new Error('no ST context');
    const profId = selectedProfileId();
    
    const maxTok = cfg.rpTokenLimitOn ? (parseInt(cfg.rpTokenLimit, 10) || 6000) : undefined;

    if (profId && c.ConnectionManagerRequestService && c.ConnectionManagerRequestService.sendRequest) {
      try {
        const resp = await c.ConnectionManagerRequestService.sendRequest(profId, prompt, maxTok);
        if (typeof resp === 'string') return resp;
        if (resp && typeof resp.content === 'string') return resp.content;
        if (resp && resp.choices && resp.choices[0]) {
          return (resp.choices[0].message && resp.choices[0].message.content) || resp.choices[0].text || '';
        }
        return '';
      } catch (e) { console.warn('[RP_Player] CMRS error, fallback', e); }
    }
    if (c.generateQuietPrompt) {
      const r = await c.generateQuietPrompt(prompt, false, false);
      return (typeof r === 'string') ? r : '';
    }
    throw new Error('no generation method');
  }
  async function runRpAnalysis(count, msgCount, mode) {
    if (rpBusy) return;
    rpBusy = true; searching = true;
    if (!collapsed) { rpOpen = true; }
    statusMsg = 'ИИ подбирает музыку…'; resultsRp = true; results = [];
    rpAbortController = new AbortController();
    render();
    try {
      const messages = getRecentMessages(msgCount);
      if (!messages.length) { statusMsg = 'Нет сообщений для анализа'; rpBusy = false; searching = false; rpAbortController = null; render(); return; }
      const avoid = getRecentlyPicked();
      const prompt = buildRpPrompt(count, messages, avoid);
      const raw = await callModel(prompt);
      const picks = parseRpJson(raw);
      if (!picks.length) { statusMsg = 'ИИ не вернул треки (проверьте профиль)'; rpBusy = false; searching = false; rpAbortController = null; render(); return; }

      results = []; resultsTitle = 'Вайб сцены';
      statusMsg = 'Ищу треки (' + picks.length + ')…'; render();
      const found = await Promise.all(picks.map(function (p) {
        return findTrackForRp(p.artist + ' — ' + p.track, rpAbortController).then(function (r) {
          if (r) { r.why = p.why; }
          return r;
        }).catch(function (e) {
          if (e.message === 'aborted') throw e;
          return null;
        });
      }));
      results = found.filter(Boolean);
      render();
      if (!results.length) { statusMsg = 'ИИ предложил треки, но их не нашли в источниках'; }
      else {
        statusMsg = '';
        setRpPulse();
        if (mode === 'quick' && cfg.rpQuickAutoplay && results.length) {
          enqueueResult(results[0], true);
        }
      }
    } catch (e) {
      if (e.message === 'aborted') statusMsg = 'Операция отменена';
      else statusMsg = 'Ошибка ИИ: ' + (e && e.message ? e.message : 'unknown');
    }
    rpBusy = false; searching = false; rpAbortController = null; render();
  }

  function rpQuickVibe() {
    if (!cfg.rpQuick) { if (!collapsed) { rpOpen = true; statusMsg = 'Включите быстрый режим в РП-настройках'; } render(); return; }
    runRpAnalysis(1, 3, 'quick');
  }
  function rpAutoTrigger() {
    if (!cfg.rpAuto || rpBusy) return;
    runRpAnalysis(Math.max(1, cfg.rpCount || 5), Math.max(2, cfg.rpEvery || 10), 'auto');
  }

  function cancelRp() {
    if (rpAbortController) {
      rpAbortController.abort();
      rpAbortController = null;
    }
    rpBusy = false;
    searching = false;
    statusMsg = 'Операция отменена';
    render();
  }

  let rpMsgCounter = 0;
  function onChatMessage() {
    if (!cfg.rpAuto) return;
    rpMsgCounter++;
    if (rpMsgCounter >= Math.max(2, cfg.rpEvery || 10)) {
      rpMsgCounter = 0;
      rpAutoTrigger();
    }
  }

  audio.addEventListener('ended', function () {
    if (curIdx >= 0 && queue[curIdx] && queue[curIdx].kind === 'audio') {
      if (queue.length > 1) nextTrack(); else { isPlaying = false; updatePlayBtn(); }
    }
  });
  audio.addEventListener('pause', function () { isPlaying = false; updatePlayBtn(); });
  audio.addEventListener('play', function () { isPlaying = true; updatePlayBtn(); });

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
    cancelX: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="${PFX}-ic"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  function saveTheme() { cfg.theme = theme; saveCfg(); }
  (function migrateBg() {
    try {
      if ((cfg.bgBase64 || cfg.bgUrl) && (!cfg.bgByTheme[theme])) {
        cfg.bgByTheme[theme] = { base64: cfg.bgBase64 || '', url: cfg.bgUrl || '' };
      }
      cfg.bgBase64 = ''; cfg.bgUrl = ''; cfg.bgType = 'none';
      saveCfg();
    } catch (e) {}
  })();

  function validHex(v) { return /^#?[0-9a-fA-F]{6}$/.test(String(v || '').trim()); }
  function normHex(v) { v = String(v || '').trim(); if (v[0] !== '#') v = '#' + v; return v.toLowerCase(); }
  function accentColor() { return validHex(cfg.accent) ? normHex(cfg.accent) : ''; }
  function setAccent(v) {
    if (!v) { cfg.accent = ''; }
    else if (validHex(v)) { cfg.accent = normHex(v); }
    saveCfg();
  }

  function applyAccentVar() {
    if (!root) return;
    const a = accentColor();
    if (a) root.style.setProperty('--rp-accent', a);
    else root.style.removeProperty('--rp-accent');

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

  function rpEnabled() { return cfg.rpAuto || cfg.rpQuick; }

  const CSS = `
  .${PFX}-root { position: fixed; z-index: 99998; box-sizing: border-box; font-family: ...; color: #f0f0f5; -webkit-user-select: none; user-select: none; touch-action: none; overflow: visible; border-radius: 16px; display: flex; flex-direction: column; }
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
  
  .${PFX}-progress-container { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .${PFX}-time-lbl { font-size: 10px; opacity: 0.6; min-width: 28px; text-align: center; font-family: monospace; }
  .${PFX}-progress-slider { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.18); border-radius: 2px; outline: none; }
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
  .${PFX}-search input { flex: 1; min-width: 0; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 9px; color: #f0f0f5; font-size: 13px; padding: 8px 10px; outline: none; font-family: inherit; }
  .${PFX}-search input::placeholder { color: rgba(255,255,255,0.35); }
  .${PFX}-search-btn { width: 38px; height: 38px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); border: none; border-radius: 9px; color: #f0f0f5; cursor: pointer; }
  .${PFX}-search-btn:active { background: rgba(255,255,255,0.26); }
  .${PFX}-search-btn .${PFX}-ic { width: 16px; height: 16px; pointer-events: none; }
  .${PFX}-controls { display: flex; align-items: center; justify-content: center; gap: 16px; flex-shrink: 0; }
  .${PFX}-cbtn { background: rgba(255,255,255,0.1); border: none; cursor: pointer; color: #f0f0f5; display: flex; align-items:center; justify-content:center; padding: 8px; border-radius: 50%; }
  .${PFX}-cbtn:active { transform: scale(.86); background: rgba(255,255,255,0.24); }
  .${PFX}-cbtn .${PFX}-ic { width: 17px; height: 17px; pointer-events: none; }
  .${PFX}-cbtn.play { background: rgba(255,255,255,0.16); padding: 10px; }
  .${PFX}-cbtn.play .${PFX}-ic { width: 20px; height: 20px; }
  .${PFX}-cbtn-sm { padding: 6px; background: rgba(255,255,255,0.1); }
  .${PFX}-cbtn-sm .${PFX}-ic { width: 14px; height: 14px; }
  .${PFX}-ymin-ctrls { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .${PFX}-vol { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .${PFX}-vol .${PFX}-ic { width: 15px; height: 15px; opacity: .55; flex-shrink: 0; }
  .${PFX}-vol input { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.18); border-radius: 2px; outline: none; }
  .${PFX}-vol input::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: #fff; cursor: pointer; }
  .${PFX}-vol input::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: #fff; border: none; cursor: pointer; }
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
  .${PFX}-row-add { opacity: .55; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-add:active { opacity: 1; }
  .${PFX}-row-add .${PFX}-ic { width: 15px; height: 15px; pointer-events: none; }
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
  .${PFX}-pop { position: absolute; left: 8px; right: 8px; z-index: 5; background: rgba(20,20,30,0.98); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); padding: 10px; display: flex; flex-direction: column; gap: 5px; max-height: 260px; overflow-y: auto; }
  .${PFX}-pop-h { font-size: 11px; font-weight: 700; opacity: .7; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
  .${PFX}-pop-h .${PFX}-row-act { opacity: .6; }
  .${PFX}-pop-item { display: flex; align-items: center; gap: 6px; padding: 8px 9px; border-radius: 8px; background: rgba(255,255,255,0.06); cursor: pointer; font-size: 12px; border: 1px solid transparent; transition: border-color .2s; }
  .${PFX}-pop-item:active { background: rgba(255,255,255,0.18); }
  .${PFX}-pop-item.flash { border-color: #3ad97f; box-shadow: 0 0 6px rgba(58,217,127,0.5); }
  .${PFX}-pop-item .${PFX}-ic { width: 14px; height: 14px; flex-shrink: 0; pointer-events: none; }
  .${PFX}-pop-new { background: var(--rp-accent, rgba(120,170,255,0.25)); font-weight: 600; }
  .${PFX}-drawer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 9px; display: flex; flex-direction: column; gap: 7px; }
  .${PFX}-srcrow { display: flex; flex-wrap: wrap; gap: 6px; }
  .${PFX}-srcbtn { flex: 1 1 28%; text-align: center; font-size: 10px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-srcbtn.on { background: var(--rp-accent, rgba(120,170,255,0.28)); border-color: var(--rp-accent, rgba(120,170,255,0.5)); }
  .${PFX}-keybox { display: flex; flex-direction: column; gap: 5px; padding: 8px; border-radius: 8px; background: rgba(0,0,0,0.18); }
  .${PFX}-flabel { font-size: 10px; opacity: .6; text-transform: uppercase; letter-spacing: .03em; margin-top: 2px; }
  .${PFX}-finput { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f0f0f5; font-size: 12px; padding: 7px 9px; outline: none; font-family: inherit; width: 100%; }
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
  .${PFX}-toggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); cursor: pointer; }
  .${PFX}-toggle-label { font-size: 12px; font-weight: 600; }
  .${PFX}-toggle-sub { font-size: 9px; opacity: .5; margin-top: 1px; }
  .${PFX}-sw-track { width: 38px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.18); position: relative; flex-shrink: 0; transition: background .2s; }
  .${PFX}-sw-track.on { background: var(--rp-accent, rgba(120,170,255,0.7)); }
  .${PFX}-sw-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; }
  .${PFX}-sw-track.on .${PFX}-sw-knob { left: 18px; }
  .${PFX}-numrow { display: flex; gap: 8px; }
  .${PFX}-numbox { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .${PFX}-numbox input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f0f0f5; font-size: 13px; padding: 7px; outline: none; text-align: center; font-family: inherit; width: 100%; }
  .${PFX}-profsel { display: flex; align-items: center; justify-content: space-between; gap: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 10px; cursor: pointer; font-size: 12px; }
  .${PFX}-profsel .${PFX}-ic { width: 13px; height: 13px; opacity: .6; }
  .${PFX}-quickbtn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 8px; background: var(--rp-accent, rgba(120,170,255,0.22)); cursor: pointer; font-size: 12px; font-weight: 600; }
  .${PFX}-quickbtn:active { opacity: .8; }
  .${PFX}-quickbtn .${PFX}-ic { width: 15px; height: 15px; }
  .${PFX}-colorpop { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; background: rgba(0,0,0,0.28); margin-top: 4px; }
  .${PFX}-colorpop-h { font-size: 10px; font-weight: 700; opacity: .6; text-transform: uppercase; letter-spacing: .04em; }
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
  .${PFX}-cbtn2 { flex: 1; font-size: 11px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.1); cursor: pointer; text-align: center; }
  .${PFX}-cbtn2:active { background: rgba(255,255,255,0.24); }

  .${PFX}-resize, .${PFX}-resize-left {
    position: absolute;
    width: 22px;
    height: 22px;
    z-index: 10;
    opacity: 0;
    cursor: nwse-resize;
    touch-action: none;
  }
  .${PFX}-resize:hover, .${PFX}-resize-left:hover,
  .${PFX}-root.resizing .${PFX}-resize,
  .${PFX}-root.resizing .${PFX}-resize-left {
    opacity: 0.6;
  }
  .${PFX}-resize {
    right: 2px;
    bottom: 2px;
  }
  .${PFX}-resize-left {
    left: 2px;
    bottom: 2px;
    cursor: nesw-resize;
  }

  .${PFX}-root[data-theme="neon"] .${PFX}-glass {
    background: rgba(10,10,18,var(--rp-bg-alpha, 1));
    border: 1px solid var(--rp-accent, #ff2fd0);
    box-shadow: 0 0 8px var(--rp-accent, rgba(255,47,208,0.4)), 0 0 18px var(--rp-accent, rgba(255,47,208,0.15));
  }

  .${PFX}-root[data-theme="glass"] .${PFX}-glass { background: rgba(255,255,255,var(--rp-bg-alpha, 0.08)); backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%); border: 1px solid rgba(255,255,255,0.22); box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18); }
  .${PFX}-root[data-theme="neon"] .${PFX}-head-btn, .${PFX}-root[data-theme="neon"] .${PFX}-cbtn, .${PFX}-root[data-theme="neon"] .${PFX}-note-btn, .${PFX}-root[data-theme="neon"] .${PFX}-theme-btn, .${PFX}-root[data-theme="neon"] .${PFX}-pill-theme, .${PFX}-root[data-theme="neon"] .${PFX}-pill-icon { box-shadow: 0 0 6px var(--rp-accent, rgba(255,47,208,0.6)); }
  .${PFX}-root[data-theme="neon"] .${PFX}-ic { filter: drop-shadow(0 0 2px var(--rp-accent, rgba(255,47,208,0.7))); }
  .${PFX}-root[data-theme="paper"] .${PFX}-glass { background: rgba(244,236,216,var(--rp-bg-alpha, 1)); border: 1px solid #c9b48a; box-shadow: 0 4px 14px rgba(80,60,30,0.25); color: #3a2f1c; }
  .${PFX}-root[data-theme="paper"] { color: #3a2f1c; }
  .${PFX}-root[data-theme="paper"] .${PFX}-note-btn, .${PFX}-root[data-theme="paper"] .${PFX}-head-btn, .${PFX}-root[data-theme="paper"] .${PFX}-cbtn, .${PFX}-root[data-theme="paper"] .${PFX}-theme-btn, .${PFX}-root[data-theme="paper"] .${PFX}-pill-icon, .${PFX}-root[data-theme="paper"] .${PFX}-pill-theme, .${PFX}-root[data-theme="paper"] .${PFX}-srcbtn, .${PFX}-root[data-theme="paper"] .${PFX}-savebtn, .${PFX}-root[data-theme="paper"] .${PFX}-row, .${PFX}-root[data-theme="paper"] .${PFX}-tab, .${PFX}-root[data-theme="paper"] .${PFX}-chip, .${PFX}-root[data-theme="paper"] .${PFX}-toggle { background: rgba(120,90,40,0.1); }
  .${PFX}-root[data-theme="paper"] .${PFX}-search input, .${PFX}-root[data-theme="paper"] .${PFX}-finput, .${PFX}-root[data-theme="paper"] .${PFX}-numbox input, .${PFX}-root[data-theme="paper"] .${PFX}-profsel { background: rgba(120,90,40,0.08); color: #3a2f1c; border-color: rgba(120,90,40,0.25); }
  .${PFX}-root[data-theme="paper"] .${PFX}-pop { background: #f4ecd8; color: #3a2f1c; border-color: #c9b48a; }
  .${PFX}-root[data-theme="paper"] .${PFX}-pop-item { background: rgba(120,90,40,0.1); }
  .${PFX}-root[data-theme="minimal"] .${PFX}-glass { background: color-mix(in srgb, var(--SmartThemeBodyColor, #888) calc(var(--rp-bg-alpha, 0.06) * 100%), transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid color-mix(in srgb, var(--SmartThemeBodyColor, #888) 16%, transparent); box-shadow: none; color: var(--SmartThemeBodyColor, #eee); }
  .${PFX}-root[data-theme="minimal"] { color: var(--SmartThemeBodyColor, #eee); }
  .${PFX}-root[data-theme="minimal"] .${PFX}-note-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-head-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-cbtn, .${PFX}-root[data-theme="minimal"] .${PFX}-theme-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-pill-icon, .${PFX}-root[data-theme="minimal"] .${PFX}-pill-theme, .${PFX}-root[data-theme="minimal"] .${PFX}-row, .${PFX}-root[data-theme="minimal"] .${PFX}-srcbtn, .${PFX}-root[data-theme="minimal"] .${PFX}-savebtn, .${PFX}-root[data-theme="minimal"] .${PFX}-tab, .${PFX}-root[data-theme="minimal"] .${PFX}-chip, .${PFX}-root[data-theme="minimal"] .${PFX}-toggle { background: color-mix(in srgb, var(--SmartThemeBodyColor, #888) 8%, transparent); }
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

  function cleanupAll() {
    const sid = scriptId();
    try { if ($j && sid) { $j('body > div[script_id="' + sid + '"]').remove(); $j('head > div[script_id="' + sid + '"]').remove(); } } catch (_) {}
    try {
      document.querySelectorAll('[class*="' + PFX + '"], .lg-widget').forEach(function (el) { el.remove(); });
      document.querySelectorAll('style').forEach(function (st) { if (st.id === PFX + '-css' || (st.textContent && st.textContent.indexOf(PFX) !== -1)) st.remove(); });
    } catch (_) {}
    try { if ($j) $j(window).off('.' + PFX); } catch (_) {}
  }
  function getMount() {
    const sid = scriptId();
    if ($j && sid) { const host = $j('<div>').attr('script_id', sid); $j('body').append(host); return host[0]; }
    return document.body;
  }
  function injectStyles() {
    const st = document.createElement('style'); st.id = PFX + '-css'; st.textContent = CSS;
    const sid = scriptId();
    if ($j && sid) { const wrap = $j('<div>').attr('script_id', sid).append(st); $j('head').append(wrap); }
    else { (document.head || document.documentElement).appendChild(st); }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

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
    ytCurrentEmbed = null;
    if (ytLayer) { ytLayer.innerHTML = ''; ytLayer.className = PFX + '-ytlayer'; }
    const t = curTrack();
    if (isYtTrack(t)) { isPlaying = false; }
    render();
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
    h += '<div class="' + PFX + '-pill-icon" data-notebtn>' + (isPlaying ? ICONS.pause : ICONS.play) + '</div>';
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
          '<div class="' + PFX + '-note-btn" data-notebtn>' + (isPlaying ? ICONS.pause : ICONS.play) + '</div>' +
          '<div class="' + PFX + '-head-btn" data-themebtn>' + ICONS.palette + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function resultsHTML() {
    let h = '<div class="' + PFX + '-sec-h"><span>' + esc(resultsTitle || 'Результаты') + ' (' + results.length + ')</span>' +
      '<span class="' + PFX + '-sec-h-actions">' +
        '<span class="' + PFX + '-sec-h-btn" data-restoggle>' + (resCollapsed ? ICONS.chevron : ICONS.chevronUp) + '</span>' +
        '<span class="' + PFX + '-sec-h-btn" data-resclear>' + ICONS.close + '</span>' +
      '</span></div>';
    if (resCollapsed) return h;
    h += '<div class="' + PFX + '-sec" data-scrollsec>';
    results.forEach(function (t, i) {
      h += '<div class="' + PFX + '-row' + (t.why ? ' rprow' : '') + '" data-resplay="' + i + '">' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(t.title) + '</div><div class="' + PFX + '-row-a">' + esc(t.artist) + '</div></div>' +
        (t.source ? '<span class="' + PFX + '-row-src">' + esc(t.source) + '</span>' : '') +
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
    if (searchTab === 'src') {
      h += '<div class="' + PFX + '-flabel">Источник</div>' +
        '<div class="' + PFX + '-srcrow">' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'jamendo' ? 'on' : '') + '" data-src="jamendo">Jamendo</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'youtube' ? 'on' : '') + '" data-src="youtube">YouTube API</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'ytlink' ? 'on' : '') + '" data-src="ytlink">YouTube</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'baibai' ? 'on' : '') + '" data-src="baibai">baibai</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'ccmixter' ? 'on' : '') + '" data-src="ccmixter">ccMixter</div>' +
          '<div class="' + PFX + '-srcbtn ' + (cfg.source === 'fma' ? 'on' : '') + '" data-src="fma">FMA</div>' +
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
  function libHTML() {
    let h = '<div class="' + PFX + '-sec" data-scrollsec>';
    if (editId !== null) {
      let pl = null;
      if (editKind === 'm') pl = lib.manual.find(function (x) { return x.id === editId; });
      else pl = lib.rp[editId];
      if (!pl) { editId = null; editKind = null; }
      else {
        h += '<div class="' + PFX + '-sec-h">' + esc(pl.name) + ' · ред.</div>';
        if (!pl.tracks || !pl.tracks.length) h += '<div class="' + PFX + '-empty">Пусто</div>';
        else pl.tracks.forEach(function (t, i) {
          h += '<div class="' + PFX + '-row" data-pltrack="' + i + '">' +
            '<span class="' + PFX + '-row-num">' + (i + 1) + '</span>' +
            '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(t.title) + '</div><div class="' + PFX + '-row-a">' + esc(t.artist) + '</div></div>' +
            (t.source ? '<span class="' + PFX + '-row-src">' + esc(t.source) + '</span>' : '') +
            '<span class="' + PFX + '-row-act" data-trkdel="' + i + '">' + ICONS.close + '</span>' +
          '</div>';
        });
        h += '<div class="' + PFX + '-savebar"><div class="' + PFX + '-savebtn" data-editback>' + ICONS.chevron + '<span>Назад</span></div></div>';
        h += '</div>';
        return h;
      }
    }
    h += '<div class="' + PFX + '-sec-h">Ручные плейлисты</div>';
    if (!lib.manual.length) h += '<div class="' + PFX + '-empty">Нет сохранённых</div>';
    else lib.manual.forEach(function (p) {
      h += '<div class="' + PFX + '-row" data-loadm="' + p.id + '">' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(p.name) + '</div><div class="' + PFX + '-row-a">' + (p.tracks ? p.tracks.length : 0) + ' треков</div></div>' +
        '<span class="' + PFX + '-row-act" data-renm="' + p.id + '">' + ICONS.edit + '</span>' +
        '<span class="' + PFX + '-row-act" data-editm="' + p.id + '">' + ICONS.list + '</span>' +
        '<span class="' + PFX + '-row-act" data-delm="' + p.id + '">' + ICONS.close + '</span>' +
      '</div>';
    });
    h += '<div class="' + PFX + '-sec-h">Плейлисты РП (по чатам)</div>';
    const keys = Object.keys(lib.rp);
    if (!keys.length) h += '<div class="' + PFX + '-empty">Нет сохранённых</div>';
    else keys.forEach(function (cid) {
      const p = lib.rp[cid];
      h += '<div class="' + PFX + '-row" data-loadrp="' + esc(cid) + '">' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t">' + esc(p.name) + '</div><div class="' + PFX + '-row-a">' + (p.tracks ? p.tracks.length : 0) + ' треков</div></div>' +
        '<span class="' + PFX + '-row-act" data-renrp="' + esc(cid) + '">' + ICONS.edit + '</span>' +
        '<span class="' + PFX + '-row-act" data-editrp="' + esc(cid) + '">' + ICONS.list + '</span>' +
        '<span class="' + PFX + '-row-act" data-delrp="' + esc(cid) + '">' + ICONS.close + '</span>' +
      '</div>';
    });
    h += '</div>';
    return h;
  }

  function queueHTML() {
    let h = '<div class="' + PFX + '-sec-h"><span>Очередь (' + queue.length + ')</span>' +
      '<span class="' + PFX + '-sec-h-actions">' +
        '<span class="' + PFX + '-sec-h-btn" data-queuetoggle>' + (queueCollapsed ? ICONS.chevron : ICONS.chevronUp) + '</span>' +
      '</span></div>';
    if (queueCollapsed) return h;
    if (!queue.length) return h + '<div class="' + PFX + '-sec"><div class="' + PFX + '-empty">Очередь пуста</div></div>';
    h += '<div class="' + PFX + '-sec" data-scrollsec>';
    queue.forEach(function (t, i) {
      const act = (i === curIdx);
      h += '<div class="' + PFX + '-row' + (act ? ' active' : '') + '" data-pl="' + i + '">' +
        '<span class="' + PFX + '-row-num">' + (i + 1) + '</span>' +
        '<div class="' + PFX + '-row-meta"><div class="' + PFX + '-row-t' + (act ? ' ' + PFX + '-marq' : '') + '">' + (act ? '<span class="' + PFX + '-marq-inner">' + esc(t.title) + '</span>' : esc(t.title)) + '</div><div class="' + PFX + '-row-a">' + esc(t.artist) + '</div></div>' +
        (t.source ? '<span class="' + PFX + '-row-src">' + esc(t.source) + '</span>' : '') +
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
      h += '<div class="' + PFX + '-sec" data-scrollsec>';
      SOMA_STATIONS.forEach(function (s) { h += stationRow(s); });
      h += '</div>';
    } else if (radioTab === 'browser') {
      h += '<div class="' + PFX + '-search" style="margin-top:7px">' +
        '<input type="text" data-rq placeholder="Жанр, страна, язык...">' +
        '<button class="' + PFX + '-search-btn" data-rfind>' + ICONS.search + '</button>' +
        '</div>';
      h += '<div class="' + PFX + '-chips">';
      RADIO_CHIPS.forEach(function (c) { h += '<div class="' + PFX + '-chip" data-rchip="' + c + '">' + c + '</div>'; });
      h += '</div>';
      h += '<div class="' + PFX + '-sec" data-scrollsec>';
      if (!radioResults.length) h += '<div class="' + PFX + '-empty">' + (statusMsg && statusMsg.indexOf('адио') >= 0 ? esc(statusMsg) : 'Введите запрос или тапните тег') + '</div>';
      else radioResults.forEach(function (s) { h += stationRow(s); });
      h += '</div>';
    } else {
      h += '<div class="' + PFX + '-sec" data-scrollsec>';
      if (!radioFav.length) h += '<div class="' + PFX + '-empty">Нет избранных станций</div>';
      else radioFav.forEach(function (s) { h += stationRow(s, '<span class="' + PFX + '-row-act" data-rdelfav="' + esc(s.url) + '">' + ICONS.close + '</span>'); });
      h += '</div>';
    }
    return h + '</div>';
  }

  function rpHTML() {
    let h = '<div class="' + PFX + '-drawer">';
    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpAuto"><div><div class="' + PFX + '-toggle-label">Авто-режим</div><div class="' + PFX + '-toggle-sub">подбор каждые N сообщений</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpAuto ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';
    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpQuick"><div><div class="' + PFX + '-toggle-label">Быстрый режим</div><div class="' + PFX + '-toggle-sub">кнопка «Вайб сцены» появится во вкладке «Поиск»</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpQuick ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';

    if (cfg.rpAuto) {
      h += '<div class="' + PFX + '-numrow">' +
        '<div class="' + PFX + '-numbox"><div class="' + PFX + '-flabel">Каждые (сообщ.)</div><input type="number" min="2" max="100" data-rpnum="rpEvery" value="' + (cfg.rpEvery || 10) + '"></div>' +
        '<div class="' + PFX + '-numbox"><div class="' + PFX + '-flabel">Треков</div><input type="number" min="1" max="10" data-rpnum="rpCount" value="' + (cfg.rpCount || 5) + '"></div>' +
      '</div>';
    }
    if (cfg.rpQuick) {
      h += '<div class="' + PFX + '-toggle" data-rptoggle="rpQuickAutoplay"><div><div class="' + PFX + '-toggle-label">Авто-играть (быстрый)</div><div class="' + PFX + '-toggle-sub">сразу включать найденный трек</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpQuickAutoplay ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';
      h += '<div class="' + PFX + '-quickbtn" data-quickvibe>' + (rpBusy ? '<span class="' + PFX + '-spin"></span>' : ICONS.wand) + 'Вайб сцены</div>';
      if (rpBusy) h += '<div class="' + PFX + '-savebtn" data-cancel-rp style="margin-top:6px;">' + ICONS.cancelX + '<span>Отменить</span></div>';
    }

    h += '<div class="' + PFX + '-flabel">Профиль подключения</div>';
    h += '<div class="' + PFX + '-profsel" data-profsel><span>' + esc(profileName(cfg.rpProfile)) + '</span>' + ICONS.chevron + '</div>';

    h += '<div class="' + PFX + '-flabel">Язык музыки</div>';
    h += '<div class="' + PFX + '-chips">';
    RP_LANGS.forEach(function (l) {
      h += '<div class="' + PFX + '-chip ' + (cfg.rpLang === l.id ? 'on' : '') + '" data-rplang="' + l.id + '">' + l.label + '</div>';
    });
    h += '<div class="' + PFX + '-chip ' + (cfg.rpLang === 'custom' ? 'on' : '') + '" data-rplang="custom">+ свой</div>';
    h += '</div>';
    if (cfg.rpLang === 'custom') {
      h += '<input class="' + PFX + '-finput" data-cfg="rpLangCustom" placeholder="напр. Korean, Spanish..." value="' + esc(cfg.rpLangCustom) + '">';
    }

    h += '<div class="' + PFX + '-toggle" data-rptoggle="rpTokenLimitOn"><div><div class="' + PFX + '-toggle-label">Лимит контекста</div><div class="' + PFX + '-toggle-sub">ограничить объём сканирования</div></div><div class="' + PFX + '-sw-track ' + (cfg.rpTokenLimitOn ? 'on' : '') + '"><div class="' + PFX + '-sw-knob"></div></div></div>';
    if (cfg.rpTokenLimitOn) {
      h += '<div class="' + PFX + '-numbox"><div class="' + PFX + '-flabel">Лимит токенов (≈)</div><input type="number" min="1000" step="1000" data-rpnum="rpTokenLimit" value="' + (cfg.rpTokenLimit || 6000) + '"></div>';
    }

    h += '</div>';
    return h;
  }

  function colorPopHTML() {
    const cur = accentColor() || '#7aa6ff';
    let opv;
    if (bgPending && typeof bgPending.opacity === 'number') opv = bgPending.opacity;
    else {
      const b = currentBg();
      if (b && typeof b.opacity === 'number') opv = b.opacity;
      else opv = (typeof cfg.opacity === 'number' && cfg.opacity >= 0) ? cfg.opacity : 92;
    }
    let sw = '';
    SWATCHES.forEach(function (c) { sw += '<div class="' + PFX + '-sw" data-swatch="' + c + '" style="background:' + c + '"></div>'; });
    return '<div class="' + PFX + '-colorpop">' +
      '<div class="' + PFX + '-colorpop-h">Акцентный цвет</div>' +
      '<div class="' + PFX + '-colorrow">' +
        '<input type="color" data-colorpick value="' + cur + '">' +
        '<input class="' + PFX + '-finput" data-colorhex placeholder="#RRGGBB" value="' + esc(accentColor()) + '">' +
      '</div>' +
      '<div class="' + PFX + '-swatches">' + sw + '</div>' +
      '<div class="' + PFX + '-colorpop-h">Прозрачность фона</div>' +
      '<div class="' + PFX + '-oprow">' + ICONS.palette + '<input type="range" min="0" max="100" value="' + opv + '" data-opacity><span class="' + PFX + '-opval">' + opv + '%</span></div>' +
      '<div class="' + PFX + '-colorpop-h">Фон виджета</div>' +
      '<div class="' + PFX + '-bgrow">' +
        '<input class="' + PFX + '-finput" placeholder="URL изображения" data-bg-url value="' + esc((bgPending && bgPending.url) || '') + '">' +
        '<label class="' + PFX + '-bgfile-label">Выбрать файл<input type="file" accept="image/*" data-bg-file class="' + PFX + '-bgfile-input"></label>' +
      '</div>' +
      '<div class="' + PFX + '-bgfile-name" data-bgfile-name>' + (bgPending ? (bgPending.base64 ? 'Файл выбран' : (bgPending.url ? 'URL: ' + esc(bgPending.url) : '')) : '') + '</div>' +
      '<div class="' + PFX + '-colorbtns">' +
        '<div class="' + PFX + '-cbtn2" data-bgapplytheme>Применить к этой теме</div>' +
        '<div class="' + PFX + '-cbtn2" data-bgapplyall>Применить ко всем</div>' +
      '</div>' +
      '<div class="' + PFX + '-colorbtns">' +
        '<div class="' + PFX + '-cbtn2" data-bgdeltheme>Удалить фон (тема)</div>' +
        '<div class="' + PFX + '-cbtn2" data-bgdelall>Удалить фон (все)</div>' +
      '</div>' +
      '<div class="' + PFX + '-colorbtns">' +
        '<div class="' + PFX + '-cbtn2" data-sizereset>Размер сброс</div>' +
        '<div class="' + PFX + '-cbtn2" data-colorreset>Сброс</div>' +
        '<div class="' + PFX + '-cbtn2" data-colorclose>Готово</div>' +
      '</div>' +
    '</div>';
  }

  function plPopHTML() {
    let h = '<div class="' + PFX + '-pop" data-plpop>';
    h += '<div class="' + PFX + '-pop-h"><span>В плейлист</span><span class="' + PFX + '-row-act" data-plpopclose>' + ICONS.close + '</span></div>';
    h += '<div class="' + PFX + '-pop-item ' + PFX + '-pop-new" data-plnew>' + ICONS.plus + '<span>Создать новый</span></div>';
    if (lib.manual.length) lib.manual.forEach(function (p) {
      const fl = (flashPlId === p.id) ? ' flash' : '';
      h += '<div class="' + PFX + '-pop-item' + fl + '" data-pladd="' + p.id + '">' + ICONS.folder + '<span>' + esc(p.name) + '</span><span class="' + PFX + '-row-src" style="margin-left:auto">' + (p.tracks ? p.tracks.length : 0) + '</span></div>';
    });
    h += '</div>';
    return h;
  }

  function profPopHTML() {
    let h = '<div class="' + PFX + '-pop" data-profpop>';
    h += '<div class="' + PFX + '-pop-h"><span>Профиль</span><span class="' + PFX + '-row-act" data-profpopclose>' + ICONS.close + '</span></div>';
    h += '<div class="' + PFX + '-pop-item' + (!cfg.rpProfile ? ' ' + PFX + '-pop-new' : '') + '" data-profpick="">' + ICONS.gear + '<span>Текущий профиль Таверны</span></div>';
    const profs = getProfiles();
    if (!profs.length) h += '<div class="' + PFX + '-empty">Нет сохранённых профилей</div>';
    else profs.forEach(function (p) {
      h += '<div class="' + PFX + '-pop-item' + (cfg.rpProfile === p.id ? ' ' + PFX + '-pop-new' : '') + '" data-profpick="' + esc(p.id) + '">' + ICONS.wand + '<span>' + esc(p.name || p.id) + '</span></div>';
    });
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
    if (cur && !yt && !radioNow) {
      progressBlock = '<div class="' + PFX + '-progress-container">' +
        '<span class="' + PFX + '-time-lbl ' + PFX + '-cur-time">' + formatTime(audioCurrentTime) + '</span>' +
        '<input type="range" class="' + PFX + '-progress-slider" min="0" step="0.1" max="' + (audioDuration || 100) + '" value="' + audioCurrentTime + '" data-progress-seek>' +
        '<span class="' + PFX + '-time-lbl ' + PFX + '-dur-time">' + formatTime(audioDuration) + '</span>' +
      '</div>';
    }

    return '<div class="' + PFX + '-glass ' + PFX + '-panel">' +
      '<div class="' + PFX + '-head">' +
        '<div class="' + PFX + '-note-btn" data-handle data-notebtn title="Свернуть">' + ICONS.music + '</div>' +
        '<div class="' + PFX + '-theme-btn" data-themebtn>' + ICONS.palette + '</div>' +
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
        (yt ? '' : '<button class="' + PFX + '-cbtn play" data-play>' + (isPlaying ? ICONS.pause : ICONS.play) + '</button>') +
        '<button class="' + PFX + '-cbtn" data-next>' + ICONS.next + '</button>' +
      '</div>' +
      progressBlock +
      (yt ? '<div class="' + PFX + '-ythint">Управление плеем — в окошке YouTube</div>' : '') +
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
    if (userH > 0) {
      maxH = Math.max(180, Math.min(userH, maxPossible));
    } else {
      maxH = Math.max(200, Math.min(maxPossible, Math.floor(H * 0.7)));
    }
    root.style.maxHeight = maxH + 'px';
    root.style.removeProperty('height');
    root.style.minHeight = '180px';

    root.style.removeProperty('--rp-sec-max');
  }

  function render() {
    if (!shell) return;
    refreshTopbar();
    syncYtLayer();

    const active = document.activeElement;
    const keepQ = active && active.hasAttribute && active.hasAttribute('data-q') ? active.value : null;
    const keepRq = active && active.hasAttribute && active.hasAttribute('data-rq') ? active.value : null;
    const keepCfg = active && active.hasAttribute && active.hasAttribute('data-cfg') ? { k: active.getAttribute('data-cfg'), v: active.value } : null;
    const keepNum = active && active.hasAttribute && active.hasAttribute('data-rpnum') ? { k: active.getAttribute('data-rpnum'), v: active.value } : null;
    const keepHex = active && active.hasAttribute && active.hasAttribute('data-colorhex') ? active.value : null;

    const prevSec = bodyEl && bodyEl.querySelector('[data-scrollsec]');
    if (prevSec) secScroll = prevSec.scrollTop;

    const cur = curTrack();
    const ytNow = isYtTrack(cur);
    root.setAttribute('data-theme', theme);
    applyAccentVar();
    if (rpPulse) root.classList.add(PFX + '-pulse'); else root.classList.remove(PFX + '-pulse');

    let html;
    if (collapsed) html = (ytNow ? yminHTML() : pillHTML());
    else html = panelHTML();
    bodyEl.innerHTML = html;

    applyUserSize();
    applyPos();

    const newSec = bodyEl.querySelector('[data-scrollsec]');
    if (newSec && secScroll) newSec.scrollTop = secScroll;

    if (keepQ !== null) { const i = bodyEl.querySelector('[data-q]'); if (i) { i.value = keepQ; i.focus(); } }
    if (keepRq !== null) { const i = bodyEl.querySelector('[data-rq]'); if (i) { i.value = keepRq; i.focus(); } }
    if (keepCfg) { const i = bodyEl.querySelector('[data-cfg="' + keepCfg.k + '"]'); if (i) { i.value = keepCfg.v; i.focus(); } }
    if (keepNum) { const i = bodyEl.querySelector('[data-rpnum="' + keepNum.k + '"]'); if (i) { i.value = keepNum.v; i.focus(); } }
    if (keepHex !== null) { const i = bodyEl.querySelector('[data-colorhex]'); if (i) { i.value = keepHex; i.focus(); } }

    applyMarquee();

    setTimeout(function() {
      applyUserSize();
      applyPos();
    }, 50);
  }

  function updatePlayBtn() {
    if (!bodyEl) return;
    bodyEl.querySelectorAll('[data-play]').forEach(function (b) { b.innerHTML = isPlaying ? ICONS.pause : ICONS.play; });
    bodyEl.querySelectorAll('[data-notebtn]').forEach(function (b) {
      if (collapsed) b.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    });
    if (collapsed) {
      const cur = curTrack();
      const wantYmin = isYtTrack(cur);
      const haveYmin = !!bodyEl.querySelector('.' + PFX + '-ymin');
      if (wantYmin !== haveYmin) render();
    }
  }

  function applyPos() {
    if (!root) return;
    const w = root.offsetWidth || 110, h = root.offsetHeight || 46;
    const W = VW(), H = VH();
    const minY = TOPBAR;
    if (posX < 0 || posY < 0) { posX = Math.max(8, W - w - 12); posY = Math.max(minY + 14, H - h - 80); }
    const maxX = W - w - 4, maxY = H - h - 4;
    if (posX < 4) posX = 4; if (maxX > 4 && posX > maxX) posX = maxX;
    if (posY < minY) posY = minY; if (maxY > minY && posY > maxY) posY = maxY;
    root.style.left = posX + 'px'; root.style.top = posY + 'px';
  }

  let down = false, moved = false, fromHandle = false, sx = 0, sy = 0, bl = 0, bt = 0, bw = 0, bh = 0, lockUntil = 0;
  let lpTimer = null, lpFired = false;
  let activePointerId = null;
  let resizing = false, rsx = 0, rsy = 0, rsW = 0, rsH = 0, leftResize = false, startLeft = 0;

  function clearLongPress() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }

  const INTER_SEL = '[data-find],[data-q],[data-play],[data-prev],[data-next],[data-stab],[data-src],[data-rplay],[data-pl],[data-qadd],[data-resplay],[data-resadd],[data-resclear],[data-restoggle],[data-more],[data-queuetoggle],[data-rfind],[data-rchip],[data-rtab],[data-radiotoggle],[data-libtoggle],[data-pltoggle],[data-searchtab],[data-rptab],[data-savemanual],[data-saverp],[data-loadm],[data-loadrp],[data-vol],[data-plnew],[data-pladd],[data-plpopclose],[data-swatch],[data-colorreset],[data-colorclose],[data-sizereset],[data-opacity],[data-editm],[data-editrp],[data-renm],[data-renrp],[data-trkdel],[data-pltrack],[data-editback],[data-delm],[data-delrp],[data-pledit],[data-pldel],[data-rfav],[data-rdelfav],[data-yteye],[data-ytclose],[data-expandfull],[data-quickvibe],[data-rptoggle],[data-rpnum],[data-rplang],[data-profsel],[data-profpick],[data-profpopclose],[data-cfg],[data-resize],[data-resize-left],[data-cancel-search],[data-cancel-rp],[data-link],[data-bgapplytheme],[data-bgapplyall],[data-bgdeltheme],[data-bgdelall]';

  function onPointerDown(e) {
    const target = e.target;

    const rz = target.closest('[data-resize]');
    const lz = target.closest('[data-resize-left]');
    if (rz || lz) {
      resizing = true;
      leftResize = !!lz;
      activePointerId = e.pointerId;
      const rect = root.getBoundingClientRect();
      rsx = e.clientX; rsy = e.clientY; rsW = rect.width; rsH = rect.height;
      startLeft = rect.left;
      root.classList.add('resizing');
      try { (rz || lz).setPointerCapture(e.pointerId); } catch (_) {}
      if (e.cancelable) e.preventDefault();
      return;
    }

    const themeBtn = target.closest('[data-themebtn]');
    if (themeBtn) {
      lpFired = false;
      clearLongPress();
      sx = e.clientX; sy = e.clientY;
      lpTimer = setTimeout(function () {
        lpFired = true;
        clearLongPress();
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
        bgPending = currentBg() ? JSON.parse(JSON.stringify(currentBg())) : null;
        colorPopOpen = true; render();
        lockUntil = Date.now() + 400;
      }, 500);
      return;
    }

    if (target.closest(INTER_SEL)) return;

    const handle = target.closest('[data-handle]');
    if (!handle) return;
    if (e.button === 2) return;

    down = true; moved = false; fromHandle = true;
    activePointerId = e.pointerId;
    sx = e.clientX; sy = e.clientY;
    const rect = root.getBoundingClientRect();
    bl = rect.left; bt = rect.top; bw = rect.width; bh = rect.height;
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
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) clearLongPress();
    }
    if (!down) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 6) return;
    if (e.cancelable) e.preventDefault();
    moved = true; root.classList.add('dragging');
    const W = VW(), H = VH();
    const minY = TOPBAR;
    let nx = bl + dx, ny = bt + dy;
    const maxX = W - bw - 4, maxY = H - bh - 4;
    if (nx < 4) nx = 4; if (maxX > 4 && nx > maxX) nx = maxX;
    if (ny < minY) ny = minY; if (maxY > minY && ny > maxY) ny = maxY;
    posX = nx; posY = ny;
    root.style.left = nx + 'px'; root.style.top = ny + 'px';
  }

  function onPointerUp(e) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    if (resizing) {
      resizing = false;
      leftResize = false;
      root.classList.remove('resizing');
      activePointerId = null;
      saveSize();
      lockUntil = Date.now() + 250;
      return;
    }

    if (lpTimer) {
      clearLongPress();
      const tb = e.target && e.target.closest && e.target.closest('[data-themebtn]');
      if (tb && !lpFired) {
        if (Date.now() >= lockUntil) {
          theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]; saveTheme(); applyBackground(); render();
          lockUntil = Date.now() + 600;
        }
      }
      activePointerId = null;
      lockUntil = Date.now() + 600;
      return;
    }
    if (!down) { activePointerId = null; return; }
    down = false; root.classList.remove('dragging');
    activePointerId = null;
    const wasMoved = moved, wasHandle = fromHandle;
    moved = false; fromHandle = false;
    if (wasMoved) { savePos(); lockUntil = Date.now() + 400; return; }
    if (wasHandle) {
      if (Date.now() < lockUntil) return;
      if (e && e.cancelable) e.preventDefault();
      lockUntil = Date.now() + 400;
      try {
        if (root) {
          const r = root.getBoundingClientRect();
          if (collapsed) { posCollapsedX = Math.round(r.left); posCollapsedY = Math.round(r.top); }
          else { posExpandedX = Math.round(r.left); posExpandedY = Math.round(r.top); }
        }
      } catch (_) {}
      const prevRect = root.getBoundingClientRect();
      const W = VW(), H = VH();
      
      const minX = 4, maxX_old = Math.max(0, W - prevRect.width - 4);
      const minY = TOPBAR, maxY_old = Math.max(0, H - prevRect.height - 4);
      
      let ratioX = 0;
      if (maxX_old > minX) {
        ratioX = (prevRect.left - minX) / (maxX_old - minX);
        ratioX = Math.max(0, Math.min(1, ratioX));
      }
      
      let ratioY = 0;
      if (maxY_old > minY) {
        ratioY = (prevRect.top - minY) / (maxY_old - minY);
        ratioY = Math.max(0, Math.min(1, ratioY));
      }

      collapsed = !collapsed;
      userW = (collapsed ? sizeCollapsedW : sizeExpandedW) || userW;
      userH = (collapsed ? sizeCollapsedH : sizeExpandedH) || userH;
      
      try { 
        const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); 
        s.collapsed = collapsed; 
        localStorage.setItem(LS_KEY, JSON.stringify(s)); 
      } catch (_) {}
      
      render();
      
      const newRect = root.getBoundingClientRect();
      const maxX_new = Math.max(0, W - newRect.width - 4);
      const maxY_new = Math.max(0, H - newRect.height - 4);
      
      posX = minX + ratioX * (maxX_new - minX);
      posY = minY + ratioY * (maxY_new - minY);
      
      applyPos();
      savePos();
    }
  }

  function onPointerCancel(e) {
    clearLongPress();
    if (resizing) { resizing = false; leftResize = false; root.classList.remove('resizing'); saveSize(); }
    if (down) { down = false; root.classList.remove('dragging'); }
    activePointerId = null;
  }

  function doSearch(q) {
    if (!q) return;
    if (cfg.source === 'ytlink') { searchOneSource(YouTubeLink, q); return; }
    runSearch(q, searchTab === 'all' ? 'all' : 'src');
  }

  function onClick(e) {
    if (Date.now() < lockUntil) return;
    const t = e.target;
    const inter = t.closest && t.closest(INTER_SEL);
    if (!inter) return;
    const link = t.closest('[data-link]'); if (link) { window.open(link.getAttribute('data-link'), '_blank'); return; }
    if (t.closest('[data-resize]') || t.closest('[data-resize-left]')) return;
    if (t.closest('[data-quickvibe]')) { clearRpPulse(); rpQuickVibe(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-yteye]')) { ytHidden = !ytHidden; applyEyeState(); return; }
    if (t.closest('[data-ytclose]')) { closeYt(); return; }
    if (t.closest('[data-expandfull]')) { collapsed = false; clearRpPulse(); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-themebtn]')) {
      if (e.pointerType === 'mouse' || !e.pointerType) {
        theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]; saveTheme(); applyBackground(); render();
        lockUntil = Date.now() + 400;
      }
      return;
    }
    const sw = t.closest('[data-swatch]'); if (sw) { setAccent(sw.getAttribute('data-swatch')); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-sizereset]')) { userW = 0; userH = 0; saveSize(); applyUserSize(); applyPos(); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-colorreset]')) { setAccent(''); cfg.opacity = -1; saveCfg(); bgPending = null; applyAccentVar(); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-colorclose]')) { colorPopOpen = false; bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-bgapplytheme]')) { applyBgToTheme(theme, bgPending); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-bgapplyall]')) { applyBgToAllThemes(bgPending); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-bgdeltheme]')) { applyBgToTheme(theme, null); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-bgdelall]')) { applyBgToAllThemes(null); bgPending = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-plpopclose]')) { plPop = null; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-profpopclose]')) { profPop = false; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-profsel]')) { profPop = !profPop; render(); lockUntil = Date.now() + 300; return; }
    const pp = t.closest('[data-profpick]'); if (pp) { cfg.rpProfile = pp.getAttribute('data-profpick'); saveCfg(); profPop = false; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-resclear]')) { clearSearch(); clearRpPulse(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-restoggle]')) { resCollapsed = !resCollapsed; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-more]')) { searchMore(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-queuetoggle]')) { queueCollapsed = !queueCollapsed; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-searchtab]')) { searchOpen = !searchOpen; if (searchOpen) { radioOpen = false; rpOpen = false; libOpen = false; plOpen = false; } secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-rptab]')) { rpOpen = !rpOpen; if (rpOpen) { searchOpen = false; radioOpen = false; libOpen = false; plOpen = false; } secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    const rptg = t.closest('[data-rptoggle]'); if (rptg) {
      const k = rptg.getAttribute('data-rptoggle');
      cfg[k] = !cfg[k]; saveCfg();
      if (k === 'rpAuto' && cfg.rpAuto) rpMsgCounter = 0;
      render(); lockUntil = Date.now() + 300; return;
    }
    const rpl2 = t.closest('[data-rplang]'); if (rpl2) { cfg.rpLang = rpl2.getAttribute('data-rplang'); saveCfg(); render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-plnew]')) {
      if (plPop === 'queue') createManualFromQueue();
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'qtrack') createManualFromTrack(queue[plPop.i]);
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'restrack') { createManualFromTrack(results[plPop.i]); if (resultsRp) { addToRpPlaylist(results[plPop.i]); clearRpPulse(); } }
      else createManualFromTrack(results[plPop]);
      plPop = null; lockUntil = Date.now() + 300; return;
    }
    const pa = t.closest('[data-pladd]'); if (pa) {
      let trk = null;
      if (plPop === 'queue') trk = curTrack();
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'qtrack') trk = queue[plPop.i];
      else if (typeof plPop === 'object' && plPop && plPop.kind === 'restrack') { trk = results[plPop.i]; if (resultsRp) { addToRpPlaylist(trk); clearRpPulse(); } }
      else trk = results[plPop];
      addTrackToManual(pa.getAttribute('data-pladd'), trk); lockUntil = Date.now() + 300; return;
    }
    const stab = t.closest('[data-stab]'); if (stab) { searchTab = stab.getAttribute('data-stab'); render(); lockUntil = Date.now() + 300; return; }
    const ra = t.closest('[data-resadd]'); if (ra) { enqueueResult(results[parseInt(ra.getAttribute('data-resadd'), 10)], false); lockUntil = Date.now() + 300; return; }
    const rpl = t.closest('[data-resplay]'); if (rpl) { enqueueResult(results[parseInt(rpl.getAttribute('data-resplay'), 10)], true); lockUntil = Date.now() + 300; return; }
    const qadd = t.closest('[data-qadd]'); if (qadd) { plPop = { kind: 'qtrack', i: parseInt(qadd.getAttribute('data-qadd'), 10) }; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-radiotoggle]')) { radioOpen = !radioOpen; if (radioOpen) { searchOpen = false; rpOpen = false; libOpen = false; plOpen = false; } secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    const rt = t.closest('[data-rtab]'); if (rt) { radioTab = rt.getAttribute('data-rtab'); secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    const rch = t.closest('[data-rchip]'); if (rch) { searchRadioBrowser(rch.getAttribute('data-rchip')); lockUntil = Date.now() + 300; return; }
    const rfb = t.closest('[data-rfind]'); if (rfb) { const inp = bodyEl.querySelector('[data-rq]'); const q = inp ? inp.value.trim() : ''; if (q) searchRadioBrowser(q); lockUntil = Date.now() + 300; return; }
    const rfav = t.closest('[data-rfav]'); if (rfav) { toggleRadioFav({ name: rfav.getAttribute('data-rfname'), url: rfav.getAttribute('data-rfav'), tag: rfav.getAttribute('data-rftag') }); lockUntil = Date.now() + 300; return; }
    const rdf = t.closest('[data-rdelfav]'); if (rdf) { radioFav = radioFav.filter(function (s) { return s.url !== rdf.getAttribute('data-rdelfav'); }); saveRadioFav(); render(); lockUntil = Date.now() + 300; return; }
    const rp = t.closest('[data-rplay]'); if (rp) { playRadio({ name: rp.getAttribute('data-rname'), url: rp.getAttribute('data-rplay'), tag: rp.getAttribute('data-rtag') }); lockUntil = Date.now() + 300; return; }
    const sb = t.closest('[data-src]'); if (sb) { cfg.source = sb.getAttribute('data-src'); searchTab = 'src'; results = []; saveCfg(); render(); lockUntil = Date.now() + 300; return; }
    const ren = t.closest('[data-renm]'); if (ren) { renamePlaylistManual(ren.getAttribute('data-renm')); lockUntil = Date.now() + 300; return; }
    const renr = t.closest('[data-renrp]'); if (renr) { renamePlaylistRp(renr.getAttribute('data-renrp')); lockUntil = Date.now() + 300; return; }
    const ed = t.closest('[data-pledit]'); if (ed) { renameItem(parseInt(ed.getAttribute('data-pledit'), 10)); lockUntil = Date.now() + 300; return; }
    const del = t.closest('[data-pldel]'); if (del) { removeFromQueue(parseInt(del.getAttribute('data-pldel'), 10)); lockUntil = Date.now() + 300; return; }
    const em = t.closest('[data-editm]'); if (em) { editId = em.getAttribute('data-editm'); editKind = 'm'; secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    const er = t.closest('[data-editrp]'); if (er) { editId = er.getAttribute('data-editrp'); editKind = 'rp'; secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    const td = t.closest('[data-trkdel]'); if (td) {
      const i = parseInt(td.getAttribute('data-trkdel'), 10);
      if (editKind === 'm') deleteTrackFromManual(editId, i); else deleteTrackFromRp(editId, i);
      lockUntil = Date.now() + 300; return;
    }
    const plt = t.closest('[data-pltrack]'); if (plt) {
      const i = parseInt(plt.getAttribute('data-pltrack'), 10);
      let pl = null;
      if (editKind === 'm') pl = lib.manual.find(function (x) { return x.id === editId; });
      else pl = lib.rp[editId];
      if (pl && pl.tracks && pl.tracks[i]) { enqueueResult(pl.tracks[i], true); }
      lockUntil = Date.now() + 300; return;
    }
    if (t.closest('[data-editback]')) { editId = null; editKind = null; secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    const dm = t.closest('[data-delm]'); if (dm) { deleteManual(dm.getAttribute('data-delm')); lockUntil = Date.now() + 300; return; }
    const dr = t.closest('[data-delrp]'); if (dr) { deleteRp(dr.getAttribute('data-delrp')); lockUntil = Date.now() + 300; return; }
    const lm = t.closest('[data-loadm]'); if (lm) { const p = lib.manual.find(function (x) { return x.id === lm.getAttribute('data-loadm'); }); if (p) loadPlaylist(p.tracks); lockUntil = Date.now() + 300; return; }
    const lr = t.closest('[data-loadrp]'); if (lr) { const p = lib.rp[lr.getAttribute('data-loadrp')]; if (p) loadPlaylist(p.tracks); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-savemanual]')) { plPop = 'queue'; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-saverp]')) { saveCurrentAsRp(); lockUntil = Date.now() + 300; return; }
    const it = t.closest('[data-pl]'); if (it) { playIndex(parseInt(it.getAttribute('data-pl'), 10)); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-cancel-search]')) { cancelSearch(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-cancel-rp]')) { cancelRp(); lockUntil = Date.now() + 300; return; }

    if (t.closest('[data-notebtn]')) {
      if (moved) { lockUntil = Date.now() + 300; return; }
      if (!collapsed) {
        try {
          if (root) {
            const r = root.getBoundingClientRect();
            if (collapsed) { posCollapsedX = Math.round(r.left); posCollapsedY = Math.round(r.top); }
            else { posExpandedX = Math.round(r.left); posExpandedY = Math.round(r.top); }
          }
        } catch (_) {}
        const prevRect = root.getBoundingClientRect();
        collapsed = true;
        posX = prevRect.left;
        posY = prevRect.top;
        userW = sizeCollapsedW || userW;
        userH = sizeCollapsedH || userH;
        try { const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); s.collapsed = collapsed; localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (_) {}
        render(); lockUntil = Date.now() + 300; return;
      } else {
        const cur = curTrack();
        if (curIdx < 0) {
          if (window.__rpRadioNow) {
            if (isPlaying) { try { audio.pause(); } catch(_){} isPlaying = false; }
            else { try { audio.play(); } catch(_){} isPlaying = true; }
            updatePlayBtn(); lockUntil = Date.now() + 300; return;
          }
          statusMsg = 'Сначала найдите трек'; render(); lockUntil = Date.now() + 300; return;
        }
        if (isYtTrack(cur)) { return; }
        if (isPlaying) { try { audio.pause(); } catch(_){} isPlaying = false; }
        else { try { audio.play(); } catch(_){} isPlaying = true; }
        updatePlayBtn(); lockUntil = Date.now() + 300; return;
      }
    }

    if (t.closest('[data-libtoggle]')) { libOpen = !libOpen; if (libOpen) { searchOpen = false; radioOpen = false; rpOpen = false; plOpen = false; editId = null; editKind = null; } secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-pltoggle]')) { plOpen = !plOpen; if (plOpen) { searchOpen = false; radioOpen = false; rpOpen = false; libOpen = false; } secScroll = 0; render(); lockUntil = Date.now() + 300; return; }
    if (t.closest('[data-play]')) { togglePlay(); lockUntil = Date.now() + 300; return; }
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
    } else if (el.hasAttribute('data-progress-seek')) {
      audio.currentTime = Number(el.value);
      audioCurrentTime = audio.currentTime;
      updateProgressBarUI();
    } else if (el.hasAttribute('data-opacity')) {
      const val = Math.max(0, Math.min(100, parseInt(el.value, 10) || 0));
      if (!bgPending) bgPending = {};
      bgPending.opacity = val;
      applyAccentVar();
      const lbl = bodyEl.querySelector('.' + PFX + '-opval');
      if (lbl) lbl.textContent = val + '%';
    } else if (el.hasAttribute('data-colorpick')) {
      setAccent(el.value);
      applyAccentVar();
      const hx = bodyEl.querySelector('[data-colorhex]');
      if (hx) hx.value = accentColor();
    } else if (el.hasAttribute('data-colorhex')) {
      const v = el.value.trim();
      if (!v || validHex(v)) {
        setAccent(v);
        applyAccentVar();
        const cp = bodyEl.querySelector('[data-colorpick]');
        if (cp && validHex(v)) cp.value = normHex(v);
      }
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
    }
  }

  function bindChatEvents() {
    const c = stContext();
    if (!c || !c.eventSource || !c.eventTypes) return;
    try {
      const et = c.eventTypes;
      const evRecv = et.MESSAGE_RECEIVED || et.message_received;
      const evChat = et.CHAT_CHANGED || et.chat_changed;
      if (evRecv) c.eventSource.on(evRecv, function () { onChatMessage(); });
      if (evChat) c.eventSource.on(evChat, function () { rpMsgCounter = 0; clearRpPulse(); });
    } catch (e) { console.warn('[RP_Player] bindChatEvents fail', e); }
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
        if (isYtTrack(t)) { ytCurrentEmbed = ytEmbedSrc(t); isPlaying = false; }
      }

            render();

      setInterval(function () {
        const wandMenu = $j('#extensionsMenu');
        if (wandMenu.length > 0 && $j('#rp-player-wand-container').length === 0) {
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

      const extMenu = $j('#extensions_popup .list-group');
      if (extMenu.length > 0 && $j('#rp-player-ext-btn').length === 0) {
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

      if ($j('#rp-player-extension-settings').length === 0) {
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
          if (isChecked) {
            root.style.display = 'flex';
          } else {
            root.style.display = 'none';
          }
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
        if (tb) { e.preventDefault(); colorPopOpen = true; render(); }
      });

      bindChatEvents();

      try { if ($j) $j(window).on('pagehide.' + PFX + ' beforeunload.' + PFX, cleanupAll); } catch (_) {}
      try {
        if ($j) $j(window).on('resize.' + PFX, function () { refreshTopbar(); applyUserSize(); applyPos(); });
        else window.addEventListener('resize', function () { refreshTopbar(); applyUserSize(); applyPos(); });
      } catch (_) {}

      setTimeout(function () { refreshTopbar(); applyPos(); }, 200);
      setTimeout(function () { refreshTopbar(); applyPos(); }, 800);
      setTimeout(function () { refreshTopbar(); applyPos(); }, 2000);
    } catch (err) { console.error('[RP_Player] init error:', err); }
  }

  $j = jq();
  if ($j) { $j(start); }
  else if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); }
  else { start(); }
})();
