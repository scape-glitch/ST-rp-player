export function createPlayerStreams({ fetchTimeout, dbg, warn }) {
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

  function getCachedInvidious() {
    return cachedInvidious;
  }

  return {
    getNetEaseStream,
    tryInvidiousStream,
    tryPipedStream,
    getTrackAudioStream,
    getCachedInvidious
  };
}