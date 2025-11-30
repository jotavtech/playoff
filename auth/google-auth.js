// ========================================
// PlayOff - Google/YouTube OAuth & API
// Gerencia autenticação e busca no YouTube
// ========================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:5175/auth/google/callback';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Log de debug para verificar se as credenciais estão carregadas
console.log('🔑 Google Auth Config:');
console.log(`   Client ID: ${GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ FALTANDO'}`);
console.log(`   Client Secret: ${GOOGLE_CLIENT_SECRET ? '✅ Configurado' : '❌ FALTANDO'}`);
console.log(`   Redirect URI: ${GOOGLE_REDIRECT_URI}`);
console.log(`   YouTube API Key: ${YOUTUBE_API_KEY ? '✅ Configurado' : '❌ FALTANDO'}`);

// Scopes para YouTube Data API
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/youtube.readonly'
].join(' ');

// Gera URL de login do Google
function getGoogleAuthUrl(state) {
  if (!GOOGLE_CLIENT_ID) return null;
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // Para receber refresh_token
    state: state,
    prompt: 'consent'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Troca código por token
async function exchangeCodeForToken(code) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Client ID/Secret não configurados');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao trocar token Google: ${error}`);
  }

  return await response.json();
}

// Busca perfil do usuário Google
async function getUserProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Falha ao buscar perfil Google');
  }

  return await response.json();
}

// Busca músicas no YouTube (Usando API Key)
async function searchYouTube(query, limit = 10) {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YOUTUBE_API_KEY não configurada');
    return [];
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10', // Categoria Música
      maxResults: limit,
      key: YOUTUBE_API_KEY
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Erro na API do YouTube:', error);
      return [];
    }

    const data = await response.json();
    
    return data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle, // Aproximação
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      source: 'youtube'
    }));
  } catch (error) {
    console.error('Erro ao buscar no YouTube:', error);
    return [];
  }
}

module.exports = {
  getGoogleAuthUrl,
  exchangeCodeForToken,
  getUserProfile,
  searchYouTube
};
