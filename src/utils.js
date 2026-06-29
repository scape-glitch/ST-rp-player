// RP Music Player — pure utils (zero-loss modular split)
// Чистые функции, перенесённые 1-в-1 из исходного index.js. Реализация/regex/форматирование не менялись.

export function formatTime(secs) {
  if (isNaN(secs) || secs === Infinity) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function dateStamp() {
  const d = new Date();
  const p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2);
}

export function extractYtVideo(s) {
  s = String(s || '').trim();
  let m = s.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

export function extractYtList(s) {
  s = String(s || '').trim();
  let m = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

export function hasDash(s) {
  return /[-—–]/.test(String(s || ''));
}

export function fetchWithCancel(url, options = {}, controller) {
  const opts = Object.assign({}, options);
  if (controller) opts.signal = controller.signal;
  return fetch(url, opts);
}

export async function fetchTimeout(url, ms = 4500) {
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

export function withTimeout(promise, ms, controller) {
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

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function validHex(v) {
  return /^#?[0-9a-fA-F]{6}$/.test(String(v || '').trim());
}

export function normHex(v) {
  v = String(v || '').trim();
  if (v[0] !== '#') v = '#' + v;
  return v.toLowerCase();
}

export function hexToRgb(hex) {
  hex = normHex(hex).replace('#', '');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function safeFileName(s) {
  return String(s || 'playlist').replace(/[^\p{L}\p{N}\-_ ]+/gu, '').replace(/\s+/g, '_').slice(0, 40) || 'playlist';
}

export function cleanTrackText(s) {
  return String(s || '')
    .replace(/\b(official|music video|audio|hd|hq|lyrics|video|visualizer|remaster(ed)?|full album)\b/gi, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normTrackPart(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/\b(official|music video|audio|hd|hq|lyrics|video|visualizer|remaster(ed)?|feat\.?|ft\.)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function rpTrackSigFromParts(artist, title) {
  const a = normTrackPart(artist);
  const t = normTrackPart(title);
  if (!a && !t) return '';
  return a + ' — ' + t;
}

export function rpTrackSig(track) {
  if (!track) return '';
  return rpTrackSigFromParts(track.artist || '', track.title || track.track || '');
}

export function rpTrackHuman(track) {
  if (!track) return '';
  const a = String(track.artist || '').trim();
  const t = String(track.title || track.track || '').trim();
  if (a && t) return a + ' — ' + t;
  return t || a;
}
