// ========================================
// PlayOff - Authentication & API Routes
// Rotas para autenticação OAuth e gestão de usuários
// ========================================

const express = require('express');
const spotifyAuth = require('../auth/spotify-auth');

module.exports = (db) => {
  const router = express.Router();

  // Store de states temporários para validação OAuth
  const states = new Map();

  // Middleware para verificar se usuário está autenticado
  const requireAuth = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      // Valida o token e busca usuário
      const user = await db.getUserBySpotifyId(token);
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Erro no middleware de auth:', error);
      return res.status(500).json({ error: 'Erro de autenticação' });
    }
  };

  // ============= AUTH ROUTES =============

  // Inicia processo de login com Spotify
  router.get('/login', (req, res) => {
    const state = spotifyAuth.generateState();
    
    // Usa variável de ambiente se disponível, senão constrói dinamicamente
    let redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    
    if (!redirectUri) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      redirectUri = `${protocol}://${host}/auth/spotify/callback`;
    }
    
    console.log(`🔐 Iniciando login via: ${redirectUri}`);

    // Armazena state e a redirect URI usada para validação no callback
    states.set(state, { 
      timestamp: Date.now(),
      redirectUri: redirectUri
    });
    
    // Limpa states antigos (mais de 10 minutos)
    for (const [key, data] of states.entries()) {
      if (Date.now() - data.timestamp > 600000) {
        states.delete(key);
      }
    }

    const authUrl = spotifyAuth.getAuthorizationUrl(state, redirectUri);
    res.json({ authUrl, state });
  });

  // Callback do Spotify OAuth
  router.get('/spotify/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/?error=${error}`);
    }

    // Valida state para prevenir CSRF
    const stateData = states.get(state);
    if (!state || !stateData) {
      return res.redirect('/?error=invalid_state');
    }

    states.delete(state);

    try {
      // Troca código por tokens usando a mesma redirect URI do login
      const tokenData = await spotifyAuth.exchangeCodeForToken(code, stateData.redirectUri);
      
      // Busca perfil do usuário
      const profile = await spotifyAuth.getUserProfile(tokenData.access_token);

      // Calcula quando o token expira
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Salva ou atualiza usuário no banco
      await db.upsertUser({
        spotify_id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        profile_image: profile.images?.[0]?.url || null,
        country: profile.country,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString()
      });

      // Redireciona com token (em produção, usar cookie httpOnly ou session)
      res.redirect(`/?spotify_id=${profile.id}&access_token=${tokenData.access_token}`);
    } catch (error) {
      console.error('Erro no callback:', error);
      res.redirect(`/?error=auth_failed`);
    }
  });

  // Renova access token
  router.post('/refresh', async (req, res) => {
    const { spotify_id } = req.body;

    if (!spotify_id) {
      return res.status(400).json({ error: 'spotify_id obrigatório' });
    }

    try {
      const user = await db.getUserBySpotifyId(spotify_id);
      
      if (!user || !user.spotify_refresh_token) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const tokenData = await spotifyAuth.refreshAccessToken(user.spotify_refresh_token);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await db.updateUserTokens(
        tokenData.access_token,
        tokenData.refresh_token || user.spotify_refresh_token,
        expiresAt.toISOString(),
        user.id
      );

      res.json({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in
      });
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(500).json({ error: 'Falha ao renovar token' });
    }
  });

  // Logout
  router.post('/logout', requireAuth, (req, res) => {
    // Em produção, invalidar token/session
    res.json({ success: true });
  });

  // ============= USER ROUTES =============

  // Busca perfil do usuário atual
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const stats = await db.getUserStats(req.user.id);
      res.json({
        ...req.user,
        stats
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  });

  // Top músicas do usuário
  router.get('/me/top-songs', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const topSongs = await db.getUserTopSongs(req.user.id, limit);
      res.json(topSongs);
    } catch (error) {
      console.error('Erro ao buscar top songs:', error);
      res.status(500).json({ error: 'Erro ao buscar top songs' });
    }
  });

  // Músicas adicionadas pelo usuário
  router.get('/me/added-songs', requireAuth, async (req, res) => {
    try {
      const songs = await db.getUserAddedSongs(req.user.id);
      res.json(songs);
    } catch (error) {
      console.error('Erro ao buscar músicas adicionadas:', error);
      res.status(500).json({ error: 'Erro ao buscar músicas' });
    }
  });

  // Histórico de reprodução do usuário
  router.get('/me/history', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const history = await db.getUserHistory(req.user.id, limit);
      res.json(history);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  });

  // ============= PLAYBACK ROUTES =============

  // Registra uma reprodução
  router.post('/play', requireAuth, async (req, res) => {
    const { song_id, spotify_id, duration_ms, completed, source } = req.body;

    try {
      let songId = song_id;

      // Se forneceu spotify_id, busca ou cria a música
      if (spotify_id && !song_id) {
        let song = await db.getSongBySpotifyId(spotify_id);
        
        if (!song) {
          // Busca informações da música no Spotify
          const user = req.user;
          const response = await fetch(`https://api.spotify.com/v1/tracks/${spotify_id}`, {
            headers: { 'Authorization': `Bearer ${user.spotify_access_token}` }
          });

          if (response.ok) {
            const trackData = await response.json();
            song = await db.upsertSong({
              spotify_id: trackData.id,
              title: trackData.name,
              artist: trackData.artists[0]?.name,
              album: trackData.album.name,
              album_cover: trackData.album.images[0]?.url,
              audio_url: null,
              preview_url: trackData.preview_url,
              spotify_url: trackData.external_urls.spotify,
              duration_ms: trackData.duration_ms,
              release_date: trackData.album.release_date,
              popularity: trackData.popularity
            });
          }
        }

        songId = song?.id;
      }

      if (!songId) {
        return res.status(400).json({ error: 'song_id ou spotify_id obrigatório' });
      }

      // Registra reprodução
      await db.addPlayHistory(req.user.id, songId, duration_ms || 0, completed || false, source || 'playoff');
      
      // Atualiza estatísticas
      await db.incrementSongPlays(songId);
      await db.incrementUserPlays(req.user.id);
      await db.incrementUserSongStats(req.user.id, songId, duration_ms || 0);

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao registrar reprodução:', error);
      res.status(500).json({ error: 'Falha ao registrar reprodução' });
    }
  });

  // Toca música no Spotify do usuário
  router.post('/play-on-spotify', requireAuth, async (req, res) => {
    const { spotify_uri, device_id } = req.body;

    try {
      await spotifyAuth.playTrackOnSpotify(
        req.user.spotify_access_token,
        spotify_uri,
        device_id
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao tocar no Spotify:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Pausa reprodução no Spotify
  router.post('/pause-spotify', requireAuth, async (req, res) => {
    try {
      await spotifyAuth.pausePlayback(req.user.spotify_access_token);
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao pausar:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Retoma reprodução no Spotify
  router.post('/resume-spotify', requireAuth, async (req, res) => {
    try {
      await spotifyAuth.resumePlayback(req.user.spotify_access_token);
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao retomar:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Busca dispositivos disponíveis
  router.get('/devices', requireAuth, async (req, res) => {
    try {
      const devices = await spotifyAuth.getUserDevices(req.user.spotify_access_token);
      res.json(devices);
    } catch (error) {
      console.error('Erro ao buscar dispositivos:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= SONG ROUTES =============

  // Lista todas as músicas
  router.get('/songs', async (req, res) => {
    try {
      const songs = await db.getAllSongs();
      res.json({ songs });
    } catch (error) {
      console.error('Erro ao listar músicas:', error);
      res.status(500).json({ error: 'Erro ao listar músicas' });
    }
  });

  // Top músicas globais
  router.get('/songs/top', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const topSongs = await db.getTopSongs(limit);
      res.json(topSongs);
    } catch (error) {
      console.error('Erro ao buscar top songs:', error);
      res.status(500).json({ error: 'Erro ao buscar top songs' });
    }
  });

  return { router, requireAuth };
};
