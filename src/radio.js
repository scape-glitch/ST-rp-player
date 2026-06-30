export function createRadio({ getRadioFav, setRadioFav, saveRadioFav, setRadioResults, setStatusMsg, render, fetchTimeout, SOMA_STATIONS, dbg, warn }) {
  let somaLoading = false;
  let somaLoadedFromApi = false;

  function isRadioFav(url) {
    return getRadioFav().some(function (s) { return s.url === url; });
  }

  function toggleRadioFav(station) {
    if (isRadioFav(station.url)) {
      setRadioFav(getRadioFav().filter(function (s) { return s.url !== station.url; }));
    } else {
      const next = getRadioFav().slice();
      next.push({ name: station.name, url: station.url, tag: station.tag || '' });
      setRadioFav(next);
    }
    saveRadioFav();
    render();
  }

  async function loadMoreSomaStations() {
    if (somaLoading) return;
    somaLoading = true;
    setStatusMsg('Загружаю станции SomaFM…');
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
      setStatusMsg(added ? ('Добавлено станций: ' + added) : 'Все станции SomaFM уже загружены');
      dbg('soma', 'loaded', added, 'new stations');
    } catch (e) {
      setStatusMsg('Не удалось загрузить SomaFM');
      warn('soma load fail', e);
    }

    somaLoading = false;
    render();
  }

  async function searchRadioBrowser(q) {
    setStatusMsg('Поиск радио…');
    setRadioResults([]);
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
      const results = (data || []).filter(function (s) {
        return s.url_resolved;
      }).slice(0, 18).map(function (s) {
        return {
          name: s.name || 'станция',
          url: s.url_resolved,
          tag: (s.country || '') + (s.tags ? ' · ' + String(s.tags).split(',').slice(0, 2).join(',') : '')
        };
      });
      setRadioResults(results);
      setStatusMsg(results.length ? '' : 'Ничего не найдено');
      dbg('radio', 'browser search', q, '->', results.length);
    } catch (e) {
      setStatusMsg('Ошибка поиска радио');
      warn('radio browser fail', e);
    }
    render();
  }

  function isSomaLoading() {
    return somaLoading;
  }

  function isSomaLoadedFromApi() {
    return somaLoadedFromApi;
  }

  return {
    loadMoreSomaStations,
    searchRadioBrowser,
    isRadioFav,
    toggleRadioFav,
    isSomaLoading,
    isSomaLoadedFromApi
  };
}