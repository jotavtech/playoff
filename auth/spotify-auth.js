// ========================================
// PlayOff - Spotify OAuth Authentication
// Implementa OAuth 2.0 Authorization Code Flow
// ========================================

const crypto = require('crypto');

// Configuração do Spotify App
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '1fd9e79e2e074a33b258c30747f74e6b';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '3bc40e26370c43818ec3612d25fcbf96';
// Usando 127.0.0.1 para evitar problemas com localhost e IPv6
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5175/auth/spotify/callback';

// Scopes necessários para tocar músicas e acessar dados do usuário
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative'
].join(' ');

// Gera state aleatório para segurança OAuth
function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

// Gera URL de autorização do Spotify
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state: state,
    show_dialog: 'false' // false para não mostrar dialog sempre
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Troca o código por access token
async function exchangeCodeForToken(code) {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return await response.json();
}

// Renova access token usando refresh token
async function refreshAccessToken(refreshToken) {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return await response.json();
}

// Busca perfil do usuário no Spotify
async function getUserProfile(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user profile: ${error}`);
  }

  return await response.json();
}

// Busca dispositivos disponíveis para reprodução
async function getUserDevices(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return { devices: [] };
  }

  return await response.json();
}

// Toca música no Spotify do usuário
async function playTrackOnSpotify(accessToken, spotifyUri, deviceId = null) {
  const url = deviceId 
    ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
    : 'https://api.spotify.com/v1/me/player/play';

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: [spotifyUri]
    })
  });

  // 204 = sucesso sem corpo de resposta
  if (response.status === 204 || response.ok) {
    return { success: true };
  }

  // Se falhou, tenta obter erro
  const error = await response.text();
  throw new Error(`Failed to play track: ${error}`);
}

// Pausa reprodução no Spotify
async function pausePlayback(accessToken, deviceId = null) {
  const url = deviceId
    ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
    : 'https://api.spotify.com/v1/me/player/pause';

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  return response.status === 204 || response.ok;
}

// Retoma reprodução no Spotify
async function resumePlayback(accessToken, deviceId = null) {
  const url = deviceId
    ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
    : 'https://api.spotify.com/v1/me/player/play';

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  return response.status === 204 || response.ok;
}

// Busca estado atual da reprodução
async function getCurrentPlayback(accessToken) {
  const response = await fetch('https://api.spotify.com/v1/me/player', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 204) {
    return null; // Nada tocando
  }

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

module.exports = {
  SPOTIFY_CLIENT_ID,
  REDIRECT_URI,
  SCOPES,
  generateState,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getUserProfile,
  getUserDevices,
  playTrackOnSpotify,
  pausePlayback,
  resumePlayback,
  getCurrentPlayback
};
