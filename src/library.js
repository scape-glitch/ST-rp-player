export function createLibrary(deps) {
  const getLib = deps.getLib;
  const getQueue = deps.getQueue;
  const getRpRejected = deps.getRpRejected;
  const saveLib = deps.saveLib;
  const saveRpRejected = deps.saveRpRejected;
  const getChatId = deps.getChatId;
  const getChatName = deps.getChatName;
  const getResultsRp = deps.getResultsRp;
  const dateStamp = deps.dateStamp;
  const rpTrackSig = deps.rpTrackSig;
  const rpTrackHuman = deps.rpTrackHuman;
  const dbg = deps.dbg;
  const render = deps.render;
  const flashPlaylist = deps.flashPlaylist;

  function trackSigForFav(t) {
    if (!t) return '';
    if (t.ytid) return 'yt:' + t.ytid;
    if (t.url) return 'url:' + t.url;
    return rpTrackSig(t);
  }

  function isFav(t) {
    const sig = trackSigForFav(t);
    if (!sig) return false;
    return getLib().favorites.some(function (x) { return trackSigForFav(x) === sig; });
  }

  function toggleFav(t) {
    if (!t) return;
    const sig = trackSigForFav(t);
    if (!sig) return;
    const lib = getLib();
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
    const lib = getLib();
    function has(arr) {
      if (!Array.isArray(arr)) return false;
      return arr.some(function (t) {
        return t && t !== exclude && trackSigForFav(t) === sig;
      });
    }
    if (has(getQueue())) return true;
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
    const rpRejected = getRpRejected();
    if (!rpRejected[cid]) rpRejected[cid] = [];
    if (rpRejected[cid].indexOf(rsig) < 0) {
      rpRejected[cid].push(rsig);
      rpRejected[cid] = rpRejected[cid].slice(-300);
      saveRpRejected();
      dbg('dislike', 'global dislike recorded', rpTrackHuman(track));
    }
  }

  function addTrackToManual(plId, track) {
    const lib = getLib();
    const p = lib.manual.find(function (x) { return x.id === plId; });
    if (!p || !track) return;

    if (!Array.isArray(p.tracks)) p.tracks = [];

    const copy = JSON.parse(JSON.stringify(track));
    if (getResultsRp()) {
      copy._rpSuggestedChat = getChatId();
      if (copy.why && !copy._rpWhy) copy._rpWhy = copy.why;
    }

    p.tracks.push(copy);
    saveLib();
    flashPlaylist(plId);
  }

  function addToRpPlaylist(track) {
    if (!track) return;

    const lib = getLib();
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

  return {
    trackSigForFav: trackSigForFav,
    isFav: isFav,
    toggleFav: toggleFav,
    trackExistsAnywhereExceptRemoval: trackExistsAnywhereExceptRemoval,
    markGlobalDislike: markGlobalDislike,
    addTrackToManual: addTrackToManual,
    addToRpPlaylist: addToRpPlaylist
  };
}
