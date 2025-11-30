// ========================================
// PlayOff - Authentication & API Routes
// Rotas para autenticação OAuth e gestão de usuários
// ========================================

const express = require('express');
const spotifyAuth = require('../auth/spotify-auth');
const googleAuth = require('../auth/google-auth');
const lastfmAuth = require('../auth/lastfm-auth');

module.exports = (db) => {
  const router = express.Router();

  // Store de states temporários para validação OAuth
  const states = new Map();

  // Middleware para verificar se usuário está autenticado
  const requireAuth = async (req, res, next) => {
    const spotifyId = req.headers.authorization?.replace('Bearer ', '');
    const spotifyToken = req.headers['x-spotify-token'] || null;
    
    if (!spotifyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      // Tenta buscar usuário do banco
      let user = await db.getUserBySpotifyId(spotifyId);
      
      if (user) {
        req.user = user;
        return next();
      }
      
      // Se não encontrou no banco, tenta criar automaticamente buscando do Spotify
      console.log('🔄 Usuário não encontrado no banco, tentando criar...');
      
      if (spotifyToken) {
        try {
          // Busca perfil do Spotify
          const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${spotifyToken}` }
          });
          
          if (response.ok) {
            const profile = await response.json();
            
            // Cria usuário no banco
            user = await db.upsertUser({
              spotify_id: profile.id,
              email: profile.email || `${profile.id}@spotify.user`,
              display_name: profile.display_name,
              profile_image: profile.images?.[0]?.url || null,
              country: profile.country,
              access_token: spotifyToken,
              refresh_token: null,
              token_expires_at: new Date(Date.now() + 3600000).toISOString()
            });
            
            console.log(`✅ Usuário criado automaticamente: ${profile.display_name}`);
            req.user = user;
            return next();
          }
        } catch (spotifyError) {
          console.warn('⚠️ Não foi possível buscar perfil do Spotify:', spotifyError.message);
        }
      }
      
      // Fallback: modo sem persistência
      console.log('⚠️ Usando modo sem persistência');
      req.user = {
        id: null,
        spotify_id: spotifyId,
        display_name: spotifyId,
        spotify_access_token: spotifyToken || null
      };
      next();
    } catch (error) {
      // Banco indisponível - cria usuário mínimo para continuar
      console.warn('⚠️ Banco indisponível no requireAuth:', error.message);
      req.user = {
        id: null,
        spotify_id: spotifyId,
        display_name: spotifyId,
        spotify_access_token: req.headers['x-spotify-token'] || null
      };
      next();
    }
  };

  // ============= AUTH ROUTES =============

  // Inicia processo de login com Spotify
  router.get('/login', (req, res) => {
    const state = spotifyAuth.generateState();
    
    // Usa variável de ambiente se disponível, removendo espaços
    let redirectUri = process.env.SPOTIFY_REDIRECT_URI ? process.env.SPOTIFY_REDIRECT_URI.trim() : null;
    
    // Se não houver variável, tenta construir dinamicamente
    if (!redirectUri) {
      let protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      
      // Força HTTPS se não for localhost
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        protocol = 'https';
      }
      
      redirectUri = `${protocol}://${host}/auth/spotify/callback`;
    }
    
    console.log('--- DEBUG SPOTIFY AUTH ---');
    console.log(`1. Host: ${req.get('host')}`);
    console.log(`2. Protocol detectado: ${req.headers['x-forwarded-proto'] || req.protocol}`);
    console.log(`3. URI Final enviada para Spotify: [${redirectUri}]`);
    console.log(`4. Variável de ambiente definida? ${!!process.env.SPOTIFY_REDIRECT_URI}`);
    console.log('--------------------------');

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
    console.log('📥 Callback do Spotify recebido');
    const { code, state, error } = req.query;

    if (error) {
      console.error('❌ Erro recebido do Spotify no callback:', error);
      return res.redirect(`/?error=${error}`);
    }

    // Valida state para prevenir CSRF
    const stateData = states.get(state);
    if (!state || !stateData) {
      console.error('❌ State inválido ou expirado. States em memória:', states.size);
      return res.redirect('/?error=invalid_state');
    }

    states.delete(state);

    try {
      console.log(`🔄 Trocando código por token. URI usada: ${stateData.redirectUri}`);
      // Troca código por tokens usando a mesma redirect URI do login
      const tokenData = await spotifyAuth.exchangeCodeForToken(code, stateData.redirectUri);
      console.log('✅ Token obtido com sucesso');
      
      // Busca perfil do usuário
      const profile = await spotifyAuth.getUserProfile(tokenData.access_token);
      console.log(`👤 Perfil obtido: ${profile.display_name} (${profile.id})`);

      // Calcula quando o token expira
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Tenta salvar no banco
      try {
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
        console.log('💾 Usuário salvo no banco.');
      } catch (dbError) {
        console.warn('⚠️ Banco de dados indisponível, continuando sem persistência:', dbError.message);
      }

      const redirectUrl = `/?spotify_id=${profile.id}&access_token=${tokenData.access_token}`;
      console.log(`✅ Redirecionando para frontend: ${redirectUrl}`);
      
      // Redireciona com token
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Erro fatal no callback:', error);
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

  // ============= GOOGLE AUTH ROUTES =============

  // Inicia processo de login com Google
  router.get('/google/login', (req, res) => {
    const state = spotifyAuth.generateState(); // Reutiliza gerador de state
    const authUrl = googleAuth.getGoogleAuthUrl(state);
    
    if (!authUrl) {
      // Se não tiver Client ID configurado, retorna erro ou url de teste se quiser
      return res.status(500).json({ error: 'Google Auth não configurado (Client ID faltando)' });
    }

    states.set(state, { 
      timestamp: Date.now(),
      provider: 'google'
    });
    
    res.json({ authUrl, state });
  });

  // Callback do Google OAuth
  router.get('/google/callback', async (req, res) => {
    console.log('📥 Callback do Google recebido');
    const { code, state, error } = req.query;

    if (error) {
      console.error('❌ Erro recebido do Google:', error);
      return res.redirect(`/?error=${error}`);
    }

    if (!states.has(state)) {
      return res.redirect('/?error=invalid_state');
    }
    states.delete(state);

    try {
      const tokenData = await googleAuth.exchangeCodeForToken(code);
      const profile = await googleAuth.getUserProfile(tokenData.access_token);
      
      console.log(`👤 Perfil Google obtido: ${profile.name}`);

      // Salva no banco usando spotify_id como campo genérico (prefixo google:)
      const googleId = `google:${profile.id}`;
      
      try {
        await db.upsertUser({
          spotify_id: googleId, 
          email: profile.email,
          display_name: profile.name,
          profile_image: profile.picture,
          country: profile.locale || 'BR',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        });
      } catch (dbError) {
        console.warn('⚠️ Erro ao salvar usuário Google no banco:', dbError);
      }

      res.redirect(`/?spotify_id=${googleId}&access_token=${tokenData.access_token}&provider=google`);
    } catch (error) {
      console.error('❌ Erro no login Google:', error);
      res.redirect('/?error=google_auth_failed');
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
      // Tenta buscar stats do banco
      let stats = null;
      if (req.user.id) {
        try {
          stats = await db.getUserStats(req.user.id);
        } catch (e) {
          console.warn('⚠️ Não foi possível buscar stats do banco');
        }
      }
      res.json({
        ...req.user,
        stats: stats || { unique_songs: 0, total_plays: 0, total_listening_time: 0 }
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      // Retorna o usuário mesmo sem stats
      res.json({
        ...req.user,
        stats: { unique_songs: 0, total_plays: 0, total_listening_time: 0 }
      });
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

  // ============= LIKED SONGS ROUTES =============

  // Lista músicas curtidas do usuário
  router.get('/me/liked', requireAuth, async (req, res) => {
    try {
      if (!req.user.id) {
        return res.json([]);
      }
      const limit = parseInt(req.query.limit) || 100;
      const likedSongs = await db.getUserLikedSongs(req.user.id, limit);
      res.json(likedSongs);
    } catch (error) {
      console.error('Erro ao buscar músicas curtidas:', error);
      res.status(500).json({ error: 'Erro ao buscar músicas curtidas' });
    }
  });

  // Lista IDs das músicas curtidas (para verificar estado de like)
  router.get('/me/liked/ids', requireAuth, async (req, res) => {
    try {
      if (!req.user.id) {
        return res.json([]);
      }
      const likedIds = await db.getLikedSongIds(req.user.id);
      res.json(likedIds);
    } catch (error) {
      console.error('Erro ao buscar IDs curtidos:', error);
      res.status(500).json({ error: 'Erro ao buscar IDs curtidos' });
    }
  });

  // Curtir uma música
  router.post('/me/like', requireAuth, async (req, res) => {
    const { spotify_track_id, title, artist, album, album_cover, spotify_url, duration_ms } = req.body;

    if (!spotify_track_id || !title || !artist) {
      return res.status(400).json({ error: 'spotify_track_id, title e artist são obrigatórios' });
    }

    if (!req.user.id) {
      console.log('⚠️ Modo sem banco: like não persistido');
      return res.json({ success: true, persisted: false });
    }

    try {
      const liked = await db.likeSong(req.user.id, {
        spotify_track_id,
        title,
        artist,
        album,
        album_cover,
        spotify_url,
        duration_ms
      });

      console.log(`❤️ Usuário ${req.user.display_name} curtiu "${title}" de ${artist}`);
      res.json({ success: true, liked, persisted: true });
    } catch (error) {
      console.error('Erro ao curtir música:', error);
      res.status(500).json({ error: 'Erro ao curtir música' });
    }
  });

  // Descurtir uma música
  router.delete('/me/like/:spotifyTrackId', requireAuth, async (req, res) => {
    const { spotifyTrackId } = req.params;

    if (!spotifyTrackId) {
      return res.status(400).json({ error: 'spotifyTrackId é obrigatório' });
    }

    if (!req.user.id) {
      console.log('⚠️ Modo sem banco: unlike não persistido');
      return res.json({ success: true, persisted: false });
    }

    try {
      const removed = await db.unlikeSong(req.user.id, spotifyTrackId);
      console.log(`💔 Usuário ${req.user.display_name} descurtiu música ${spotifyTrackId}`);
      res.json({ success: true, removed, persisted: true });
    } catch (error) {
      console.error('Erro ao descurtir música:', error);
      res.status(500).json({ error: 'Erro ao descurtir música' });
    }
  });

  // Verificar se uma música está curtida
  router.get('/me/liked/:spotifyTrackId', requireAuth, async (req, res) => {
    const { spotifyTrackId } = req.params;

    if (!req.user.id) {
      return res.json({ isLiked: false });
    }

    try {
      const isLiked = await db.isLiked(req.user.id, spotifyTrackId);
      res.json({ isLiked });
    } catch (error) {
      console.error('Erro ao verificar like:', error);
      res.status(500).json({ error: 'Erro ao verificar like' });
    }
  });

  // ============= PLAYBACK ROUTES =============

  // Registra uma reprodução
  router.post('/play', requireAuth, async (req, res) => {
    const { song_id, spotify_id, duration_ms, completed, source } = req.body;

    // Se não tem user.id (modo sem banco), apenas retorna sucesso
    if (!req.user.id) {
      console.log('⚠️ Modo sem banco: reprodução não persistida, mas continuando...');
      return res.json({ success: true, persisted: false });
    }

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
        // Sem songId mas com spotify_id - retorna sucesso sem persistir
        return res.json({ success: true, persisted: false });
      }

      // Registra reprodução
      await db.addPlayHistory(req.user.id, songId, duration_ms || 0, completed || false, source || 'playoff');
      
      // Atualiza estatísticas
      await db.incrementSongPlays(songId);
      await db.incrementUserPlays(req.user.id);
      await db.incrementUserSongStats(req.user.id, songId, duration_ms || 0);

      res.json({ success: true, persisted: true });
    } catch (error) {
      console.error('Erro ao registrar reprodução:', error);
      // Retorna sucesso mesmo com erro de banco - a música ainda toca
      res.json({ success: true, persisted: false, error: 'Banco indisponível' });
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

  // ============= FRIENDS ROUTES =============

  // Busca usuários por nome
  router.get('/users/search', requireAuth, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) {
        return res.json([]);
      }
      const users = await db.searchUsers(q, req.user.id);
      res.json(users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  // Lista amigos do usuário
  router.get('/me/friends', requireAuth, async (req, res) => {
    try {
      const friends = await db.getFriends(req.user.id);
      res.json(friends);
    } catch (error) {
      console.error('Erro ao listar amigos:', error);
      res.status(500).json({ error: 'Erro ao listar amigos' });
    }
  });

  // Lista pedidos de amizade pendentes
  router.get('/me/friends/pending', requireAuth, async (req, res) => {
    try {
      const pending = await db.getPendingFriendRequests(req.user.id);
      res.json(pending);
    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
  });

  // Envia pedido de amizade
  router.post('/me/friends/request', requireAuth, async (req, res) => {
    try {
      const { friendId } = req.body;
      if (!friendId) {
        return res.status(400).json({ error: 'ID do amigo necessário' });
      }
      if (friendId === req.user.id) {
        return res.status(400).json({ error: 'Você não pode adicionar a si mesmo' });
      }
      const result = await db.sendFriendRequest(req.user.id, friendId);
      res.json(result);
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      res.status(500).json({ error: 'Erro ao enviar pedido de amizade' });
    }
  });

  // Aceita pedido de amizade
  router.post('/me/friends/accept', requireAuth, async (req, res) => {
    try {
      const { friendId } = req.body;
      if (!friendId) {
        return res.status(400).json({ error: 'ID do amigo necessário' });
      }
      const result = await db.acceptFriendRequest(req.user.id, friendId);
      res.json(result);
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      res.status(500).json({ error: 'Erro ao aceitar pedido' });
    }
  });

  // Recusa/remove amizade
  router.delete('/me/friends/:friendId', requireAuth, async (req, res) => {
    try {
      const { friendId } = req.params;
      await db.removeFriend(req.user.id, parseInt(friendId));
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao remover amigo:', error);
      res.status(500).json({ error: 'Erro ao remover amigo' });
    }
  });

  // Atividade recente de um amigo
  router.get('/users/:userId/activity', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verifica se são amigos
      const isFriend = await db.areFriends(req.user.id, parseInt(userId));
      if (!isFriend && req.user.id !== parseInt(userId)) {
        return res.status(403).json({ error: 'Vocês não são amigos' });
      }
      
      const activity = await db.getUserActivity(parseInt(userId));
      res.json(activity);
    } catch (error) {
      console.error('Erro ao buscar atividade:', error);
      res.status(500).json({ error: 'Erro ao buscar atividade' });
    }
  });

  // Status de amizade com um usuário específico
  router.get('/me/friends/status/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const status = await db.getFriendshipStatus(req.user.id, parseInt(userId));
      res.json({ status });
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      res.status(500).json({ error: 'Erro ao verificar status' });
    }
  });

  // ============= LAST.FM ROUTES =============

  // Conectar conta Last.fm
  router.get('/lastfm/connect', requireAuth, (req, res) => {
    const callbackUrl = `${req.protocol}://${req.get('host')}/auth/lastfm/callback`;
    const authUrl = lastfmAuth.getAuthUrl(callbackUrl);
    res.json({ authUrl });
  });

  // Callback do Last.fm
  router.get('/lastfm/callback', async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
      return res.redirect('/?error=lastfm_no_token');
    }

    try {
      const session = await lastfmAuth.getSession(token);
      // Redireciona com os dados da sessão
      res.redirect(`/?lastfm_user=${session.name}&lastfm_key=${session.key}`);
    } catch (error) {
      console.error('❌ Erro no callback Last.fm:', error);
      res.redirect('/?error=lastfm_auth_failed');
    }
  });

  // Top músicas globais
  router.get('/lastfm/charts/tracks', async (req, res) => {
    try {
      const { limit = 20, page = 1 } = req.query;
      const tracks = await lastfmAuth.getTopTracks(parseInt(limit), parseInt(page));
      res.json(tracks);
    } catch (error) {
      console.error('Erro ao buscar top tracks:', error);
      res.status(500).json({ error: 'Erro ao buscar charts' });
    }
  });

  // Top artistas globais
  router.get('/lastfm/charts/artists', async (req, res) => {
    try {
      const { limit = 20, page = 1 } = req.query;
      const artists = await lastfmAuth.getTopArtists(parseInt(limit), parseInt(page));
      res.json(artists);
    } catch (error) {
      console.error('Erro ao buscar top artists:', error);
      res.status(500).json({ error: 'Erro ao buscar charts' });
    }
  });

  // Top músicas por gênero/tag
  router.get('/lastfm/charts/tag/:tag', async (req, res) => {
    try {
      const { tag } = req.params;
      const { limit = 20 } = req.query;
      const tracks = await lastfmAuth.getTopTracksByTag(tag, parseInt(limit));
      res.json(tracks);
    } catch (error) {
      console.error('Erro ao buscar tracks por tag:', error);
      res.status(500).json({ error: 'Erro ao buscar por gênero' });
    }
  });

  // Artistas similares
  router.get('/lastfm/similar/artists/:artist', async (req, res) => {
    try {
      const { artist } = req.params;
      const { limit = 10 } = req.query;
      const similar = await lastfmAuth.getSimilarArtists(decodeURIComponent(artist), parseInt(limit));
      res.json(similar);
    } catch (error) {
      console.error('Erro ao buscar artistas similares:', error);
      res.status(500).json({ error: 'Erro ao buscar similares' });
    }
  });

  // Músicas similares
  router.get('/lastfm/similar/tracks', async (req, res) => {
    try {
      const { artist, track, limit = 10 } = req.query;
      if (!artist || !track) {
        return res.status(400).json({ error: 'artist e track são obrigatórios' });
      }
      const similar = await lastfmAuth.getSimilarTracks(artist, track, parseInt(limit));
      res.json(similar);
    } catch (error) {
      console.error('Erro ao buscar músicas similares:', error);
      res.status(500).json({ error: 'Erro ao buscar similares' });
    }
  });

  // Info do usuário Last.fm
  router.get('/lastfm/user/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const info = await lastfmAuth.getUserInfo(username);
      if (!info) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.json(info);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  });

  // Top músicas do usuário Last.fm
  router.get('/lastfm/user/:username/top/tracks', async (req, res) => {
    try {
      const { username } = req.params;
      const { period = '7day', limit = 10 } = req.query;
      const tracks = await lastfmAuth.getUserTopTracks(username, period, parseInt(limit));
      res.json(tracks);
    } catch (error) {
      console.error('Erro ao buscar top tracks do usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar top tracks' });
    }
  });

  // Top artistas do usuário Last.fm
  router.get('/lastfm/user/:username/top/artists', async (req, res) => {
    try {
      const { username } = req.params;
      const { period = '7day', limit = 10 } = req.query;
      const artists = await lastfmAuth.getUserTopArtists(username, period, parseInt(limit));
      res.json(artists);
    } catch (error) {
      console.error('Erro ao buscar top artistas do usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar top artistas' });
    }
  });

  // Músicas recentes do usuário
  router.get('/lastfm/user/:username/recent', async (req, res) => {
    try {
      const { username } = req.params;
      const { limit = 20 } = req.query;
      const tracks = await lastfmAuth.getUserRecentTracks(username, parseInt(limit));
      res.json(tracks);
    } catch (error) {
      console.error('Erro ao buscar recentes:', error);
      res.status(500).json({ error: 'Erro ao buscar recentes' });
    }
  });

  // Recomendações personalizadas
  router.get('/lastfm/user/:username/recommendations', async (req, res) => {
    try {
      const { username } = req.params;
      const { limit = 20 } = req.query;
      const recommendations = await lastfmAuth.getUserRecommendedTracks(username, parseInt(limit));
      res.json(recommendations);
    } catch (error) {
      console.error('Erro ao buscar recomendações:', error);
      res.status(500).json({ error: 'Erro ao buscar recomendações' });
    }
  });

  // Buscar músicas
  router.get('/lastfm/search/tracks', async (req, res) => {
    try {
      const { q, limit = 20 } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Query obrigatória' });
      }
      const tracks = await lastfmAuth.searchTracks(q, parseInt(limit));
      res.json(tracks);
    } catch (error) {
      console.error('Erro ao buscar:', error);
      res.status(500).json({ error: 'Erro na busca' });
    }
  });

  // Buscar artistas
  router.get('/lastfm/search/artists', async (req, res) => {
    try {
      const { q, limit = 20 } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Query obrigatória' });
      }
      const artists = await lastfmAuth.searchArtists(q, parseInt(limit));
      res.json(artists);
    } catch (error) {
      console.error('Erro ao buscar:', error);
      res.status(500).json({ error: 'Erro na busca' });
    }
  });

  // Info de uma música
  router.get('/lastfm/track/info', async (req, res) => {
    try {
      const { artist, track, username } = req.query;
      if (!artist || !track) {
        return res.status(400).json({ error: 'artist e track são obrigatórios' });
      }
      const info = await lastfmAuth.getTrackInfo(artist, track, username);
      if (!info) {
        return res.status(404).json({ error: 'Música não encontrada' });
      }
      res.json(info);
    } catch (error) {
      console.error('Erro ao buscar info:', error);
      res.status(500).json({ error: 'Erro ao buscar info' });
    }
  });

  // Scrobble uma música (registra que o usuário ouviu)
  router.post('/lastfm/scrobble', requireAuth, async (req, res) => {
    try {
      const { sessionKey, artist, track, album, duration } = req.body;
      
      if (!sessionKey || !artist || !track) {
        return res.status(400).json({ error: 'sessionKey, artist e track são obrigatórios' });
      }

      const result = await lastfmAuth.scrobble(
        sessionKey,
        artist,
        track,
        Date.now(),
        album,
        duration
      );
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao scrobblar:', error);
      res.status(500).json({ error: 'Erro ao registrar música' });
    }
  });

  // Update Now Playing
  router.post('/lastfm/nowplaying', requireAuth, async (req, res) => {
    try {
      const { sessionKey, artist, track, album, duration } = req.body;
      
      if (!sessionKey || !artist || !track) {
        return res.status(400).json({ error: 'sessionKey, artist e track são obrigatórios' });
      }

      const result = await lastfmAuth.updateNowPlaying(
        sessionKey,
        artist,
        track,
        album,
        duration
      );
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar now playing:', error);
      res.status(500).json({ error: 'Erro ao atualizar' });
    }
  });

  // Top tracks de um artista
  router.get('/lastfm/artist/:artist/top', async (req, res) => {
    try {
      const { artist } = req.params;
      const { limit = 10 } = req.query;
      const tracks = await lastfmAuth.getArtistTopTracks(decodeURIComponent(artist), parseInt(limit));
      res.json(tracks);
    } catch (error) {
      console.error('Erro ao buscar top do artista:', error);
      res.status(500).json({ error: 'Erro ao buscar' });
    }
  });

  return { router, requireAuth };
};
