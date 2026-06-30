export function createSources({ cfg, jamKey, ytKey, BAIBAI_JS, DEFAULT_YT_KEY, fetchTimeout, fetchWithCancel, extractYtVideo, extractYtList, getCachedInvidious, dbg, warn }) {
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
      const cachedInvidious = getCachedInvidious();
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

  return {
    Jamendo,
    YouTubeAPI,
    YouTubeLink,
    Baibai,
    CCMixter,
    FMA,
    ALL_SOURCES,
    srcByKey,
    loadBaibai
  };
}