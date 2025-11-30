// ========================================
// PlayOff - Last.fm API Integration
// Scrobbling, Charts, Recomendações
// ========================================

const crypto = require('crypto');

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_SHARED_SECRET = process.env.LASTFM_SHARED_SECRET;
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

// Log de debug
console.log('🎵 Last.fm Config:');
console.log(`   API Key: ${LASTFM_API_KEY ? '✅ Configurado' : '❌ FALTANDO'}`);
console.log(`   Shared Secret: ${LASTFM_SHARED_SECRET ? '✅ Configurado' : '❌ FALTANDO'}`);

// ============= HELPER FUNCTIONS =============

// Gera assinatura MD5 para chamadas autenticadas
function generateSignature(params) {
  const sortedKeys = Object.keys(params).sort();
  let signatureBase = '';
  
  for (const key of sortedKeys) {
    if (key !== 'format' && key !== 'callback') {
      signatureBase += key + params[key];
    }
  }
  
  signatureBase += LASTFM_SHARED_SECRET;
  return crypto.createHash('md5').update(signatureBase, 'utf8').digest('hex');
}

// Faz chamada à API do Last.fm
async function callLastFm(method, params = {}, signed = false) {
  const queryParams = {
    method,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...params
  };

  if (signed) {
    queryParams.api_sig = generateSignature(queryParams);
  }

  const url = `${LASTFM_API_URL}?${new URLSearchParams(queryParams)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error(`❌ Last.fm API Error [${method}]:`, data.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Last.fm API Error [${method}]:`, error);
    return null;
  }
}

// ============= AUTHENTICATION =============

// Gera URL para autenticação do usuário
function getAuthUrl(callbackUrl) {
  const params = new URLSearchParams({
    api_key: LASTFM_API_KEY,
    cb: callbackUrl
  });
  return `https://www.last.fm/api/auth/?${params}`;
}

// Obtém session key após autenticação
async function getSession(token) {
  const params = {
    method: 'auth.getSession',
    api_key: LASTFM_API_KEY,
    token: token
  };
  params.api_sig = generateSignature(params);
  params.format = 'json';

  const url = `${LASTFM_API_URL}?${new URLSearchParams(params)}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.session) {
    return data.session; // { name, key, subscriber }
  }
  
  throw new Error(data.message || 'Failed to get session');
}

// ============= SCROBBLING =============

// Registra que o usuário está ouvindo uma música (Now Playing)
async function updateNowPlaying(sessionKey, artist, track, album = null, duration = null) {
  const params = {
    method: 'track.updateNowPlaying',
    artist,
    track,
    api_key: LASTFM_API_KEY,
    sk: sessionKey
  };

  if (album) params.album = album;
  if (duration) params.duration = Math.floor(duration / 1000); // em segundos

  params.api_sig = generateSignature(params);
  params.format = 'json';

  const response = await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });

  return await response.json();
}

// Scrobble - registra que o usuário ouviu uma música
async function scrobble(sessionKey, artist, track, timestamp, album = null, duration = null) {
  const params = {
    method: 'track.scrobble',
    artist,
    track,
    timestamp: Math.floor(timestamp / 1000), // Unix timestamp em segundos
    api_key: LASTFM_API_KEY,
    sk: sessionKey
  };

  if (album) params.album = album;
  if (duration) params.duration = Math.floor(duration / 1000);

  params.api_sig = generateSignature(params);
  params.format = 'json';

  const response = await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });

  return await response.json();
}

// ============= CHARTS & DISCOVERY =============

// Top músicas globais
async function getTopTracks(limit = 20, page = 1) {
  const data = await callLastFm('chart.getTopTracks', { limit, page });
  if (!data || !data.tracks) return [];
  
  return data.tracks.track.map(t => ({
    name: t.name,
    artist: t.artist.name,
    playcount: parseInt(t.playcount),
    listeners: parseInt(t.listeners),
    url: t.url,
    image: t.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// Top artistas globais
async function getTopArtists(limit = 20, page = 1) {
  const data = await callLastFm('chart.getTopArtists', { limit, page });
  if (!data || !data.artists) return [];
  
  return data.artists.artist.map(a => ({
    name: a.name,
    playcount: parseInt(a.playcount),
    listeners: parseInt(a.listeners),
    url: a.url,
    image: a.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// Top músicas por tag/gênero
async function getTopTracksByTag(tag, limit = 20) {
  const data = await callLastFm('tag.getTopTracks', { tag, limit });
  if (!data || !data.tracks) return [];
  
  return data.tracks.track.map(t => ({
    name: t.name,
    artist: t.artist.name,
    url: t.url,
    image: t.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// ============= RECOMMENDATIONS =============

// Artistas similares
async function getSimilarArtists(artist, limit = 10) {
  const data = await callLastFm('artist.getSimilar', { artist, limit });
  if (!data || !data.similarartists) return [];
  
  return data.similarartists.artist.map(a => ({
    name: a.name,
    match: parseFloat(a.match),
    url: a.url,
    image: a.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// Músicas similares
async function getSimilarTracks(artist, track, limit = 10) {
  const data = await callLastFm('track.getSimilar', { artist, track, limit });
  if (!data || !data.similartracks) return [];
  
  return data.similartracks.track.map(t => ({
    name: t.name,
    artist: t.artist.name,
    match: parseFloat(t.match),
    url: t.url,
    playcount: parseInt(t.playcount) || 0
  }));
}

// ============= USER DATA =============

// Info do usuário Last.fm
async function getUserInfo(username) {
  const data = await callLastFm('user.getInfo', { user: username });
  if (!data || !data.user) return null;
  
  const u = data.user;
  return {
    name: u.name,
    realname: u.realname,
    playcount: parseInt(u.playcount),
    artist_count: parseInt(u.artist_count) || 0,
    track_count: parseInt(u.track_count) || 0,
    album_count: parseInt(u.album_count) || 0,
    country: u.country,
    registered: u.registered?.unixtime ? new Date(u.registered.unixtime * 1000) : null,
    image: u.image?.find(i => i.size === 'extralarge')?.['#text'] || null,
    url: u.url
  };
}

// Top músicas do usuário
async function getUserTopTracks(username, period = '7day', limit = 10) {
  // period: overall | 7day | 1month | 3month | 6month | 12month
  const data = await callLastFm('user.getTopTracks', { user: username, period, limit });
  if (!data || !data.toptracks) return [];
  
  return data.toptracks.track.map(t => ({
    name: t.name,
    artist: t.artist.name,
    playcount: parseInt(t.playcount),
    url: t.url,
    image: t.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// Top artistas do usuário
async function getUserTopArtists(username, period = '7day', limit = 10) {
  const data = await callLastFm('user.getTopArtists', { user: username, period, limit });
  if (!data || !data.topartists) return [];
  
  return data.topartists.artist.map(a => ({
    name: a.name,
    playcount: parseInt(a.playcount),
    url: a.url,
    image: a.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// Músicas recentes do usuário
async function getUserRecentTracks(username, limit = 20) {
  const data = await callLastFm('user.getRecentTracks', { user: username, limit });
  if (!data || !data.recenttracks) return [];
  
  return data.recenttracks.track.map(t => ({
    name: t.name,
    artist: t.artist['#text'],
    album: t.album?.['#text'] || null,
    nowplaying: t['@attr']?.nowplaying === 'true',
    date: t.date?.uts ? new Date(t.date.uts * 1000) : null,
    image: t.image?.find(i => i.size === 'extralarge')?.['#text'] || null,
    url: t.url
  }));
}

// Recomendações baseadas no usuário (músicas que ele pode gostar)
async function getUserRecommendedTracks(username, limit = 20) {
  // Estratégia: pegar top artistas do usuário e buscar músicas similares
  const topArtists = await getUserTopArtists(username, '1month', 5);
  if (!topArtists.length) return [];
  
  const recommendations = [];
  
  for (const artist of topArtists.slice(0, 3)) {
    const similar = await getSimilarArtists(artist.name, 3);
    for (const simArtist of similar) {
      const tracks = await getArtistTopTracks(simArtist.name, 3);
      recommendations.push(...tracks.map(t => ({
        ...t,
        reason: `Porque você gosta de ${artist.name}`
      })));
    }
  }
  
  // Remove duplicatas e limita
  const unique = [];
  const seen = new Set();
  for (const track of recommendations) {
    const key = `${track.artist}-${track.name}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(track);
    }
  }
  
  return unique.slice(0, limit);
}

// Top músicas de um artista
async function getArtistTopTracks(artist, limit = 10) {
  const data = await callLastFm('artist.getTopTracks', { artist, limit });
  if (!data || !data.toptracks) return [];
  
  return data.toptracks.track.map(t => ({
    name: t.name,
    artist: artist,
    playcount: parseInt(t.playcount) || 0,
    listeners: parseInt(t.listeners) || 0,
    url: t.url
  }));
}

// ============= SEARCH =============

// Busca músicas
async function searchTracks(query, limit = 20) {
  const data = await callLastFm('track.search', { track: query, limit });
  if (!data || !data.results?.trackmatches) return [];
  
  return data.results.trackmatches.track.map(t => ({
    name: t.name,
    artist: t.artist,
    listeners: parseInt(t.listeners) || 0,
    url: t.url,
    image: t.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// Busca artistas
async function searchArtists(query, limit = 20) {
  const data = await callLastFm('artist.search', { artist: query, limit });
  if (!data || !data.results?.artistmatches) return [];
  
  return data.results.artistmatches.artist.map(a => ({
    name: a.name,
    listeners: parseInt(a.listeners) || 0,
    url: a.url,
    image: a.image?.find(i => i.size === 'extralarge')?.['#text'] || null
  }));
}

// Info de uma música específica
async function getTrackInfo(artist, track, username = null) {
  const params = { artist, track };
  if (username) params.username = username; // Inclui se o user já ouviu
  
  const data = await callLastFm('track.getInfo', params);
  if (!data || !data.track) return null;
  
  const t = data.track;
  return {
    name: t.name,
    artist: t.artist.name,
    album: t.album?.title || null,
    duration: parseInt(t.duration) || 0,
    playcount: parseInt(t.playcount) || 0,
    listeners: parseInt(t.listeners) || 0,
    userplaycount: parseInt(t.userplaycount) || 0,
    userloved: t.userloved === '1',
    tags: t.toptags?.tag?.map(tag => tag.name) || [],
    wiki: t.wiki?.summary || null,
    url: t.url
  };
}

module.exports = {
  // Auth
  getAuthUrl,
  getSession,
  
  // Scrobbling
  updateNowPlaying,
  scrobble,
  
  // Charts
  getTopTracks,
  getTopArtists,
  getTopTracksByTag,
  
  // Recommendations
  getSimilarArtists,
  getSimilarTracks,
  getUserRecommendedTracks,
  
  // User
  getUserInfo,
  getUserTopTracks,
  getUserTopArtists,
  getUserRecentTracks,
  
  // Search & Info
  searchTracks,
  searchArtists,
  getTrackInfo,
  getArtistTopTracks
};
