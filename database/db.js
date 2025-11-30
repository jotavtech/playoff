// ========================================
// PlayOff - Database Connection & Models
// SQLite Database with better-sqlite3
// ========================================

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, 'playoff.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Inicializa conexão com SQLite
const db = new Database(DB_PATH, { 
  verbose: console.log,
  fileMustExist: false 
});

// Habilita foreign keys e WAL mode para melhor performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log('📊 Banco de dados SQLite conectado:', DB_PATH);

// Inicializa o schema se necessário
function initializeDatabase() {
  try {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('✅ Schema do banco de dados inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar schema:', error);
    throw error;
  }
}

// Inicializa o banco ANTES de criar as prepared statements
initializeDatabase();

// ============= USER OPERATIONS =============

const userQueries = {
  // Cria ou atualiza usuário do Spotify
  upsertUser: db.prepare(`
    INSERT INTO users (
      spotify_id, email, display_name, profile_image, country,
      spotify_access_token, spotify_refresh_token, token_expires_at, last_login
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(spotify_id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      profile_image = excluded.profile_image,
      spotify_access_token = excluded.spotify_access_token,
      spotify_refresh_token = excluded.spotify_refresh_token,
      token_expires_at = excluded.token_expires_at,
      last_login = CURRENT_TIMESTAMP
  `),

  getUserBySpotifyId: db.prepare(`
    SELECT * FROM users WHERE spotify_id = ?
  `),

  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

  updateUserTokens: db.prepare(`
    UPDATE users SET
      spotify_access_token = ?,
      spotify_refresh_token = ?,
      token_expires_at = ?
    WHERE id = ?
  `),

  incrementUserPlays: db.prepare(`
    UPDATE users SET total_plays = total_plays + 1 WHERE id = ?
  `)
};

// ============= SONG OPERATIONS =============

const songQueries = {
  // Insere ou retorna música existente
  upsertSong: db.prepare(`
    INSERT INTO songs (
      spotify_id, title, artist, album, album_cover,
      audio_url, preview_url, spotify_url, duration_ms,
      release_date, popularity, added_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(spotify_id) DO UPDATE SET
      album_cover = excluded.album_cover,
      preview_url = excluded.preview_url,
      spotify_url = excluded.spotify_url,
      popularity = excluded.popularity,
      added_by_user_id = COALESCE(songs.added_by_user_id, excluded.added_by_user_id)
    RETURNING *
  `),

  getSongById: db.prepare(`
    SELECT * FROM songs WHERE id = ?
  `),

  getSongBySpotifyId: db.prepare(`
    SELECT * FROM songs WHERE spotify_id = ?
  `),

  getAllSongs: db.prepare(`
    SELECT * FROM songs ORDER BY created_at DESC
  `),

  incrementSongPlays: db.prepare(`
    UPDATE songs SET total_plays = total_plays + 1 WHERE id = ?
  `),

  getTopSongs: db.prepare(`
    SELECT * FROM songs ORDER BY total_plays DESC, popularity DESC LIMIT ?
  `),

  getUserAddedSongs: db.prepare(`
    SELECT * FROM songs WHERE added_by_user_id = ? ORDER BY created_at DESC
  `)
};

// ============= PLAY HISTORY OPERATIONS =============

const historyQueries = {
  addPlayHistory: db.prepare(`
    INSERT INTO play_history (user_id, song_id, play_duration_ms, completed, source)
    VALUES (?, ?, ?, ?, ?)
  `),

  getUserHistory: db.prepare(`
    SELECT 
      ph.*,
      s.title, s.artist, s.album, s.album_cover
    FROM play_history ph
    JOIN songs s ON ph.song_id = s.id
    WHERE ph.user_id = ?
    ORDER BY ph.played_at DESC
    LIMIT ?
  `),

  getRecentPlays: db.prepare(`
    SELECT 
      ph.*,
      s.title, s.artist, s.album_cover,
      u.display_name as user_name
    FROM play_history ph
    JOIN songs s ON ph.song_id = s.id
    JOIN users u ON ph.user_id = u.id
    ORDER BY ph.played_at DESC
    LIMIT ?
  `)
};

// ============= USER STATS OPERATIONS =============

const statsQueries = {
  // Incrementa contador de reproduções de uma música para um usuário
  incrementUserSongStats: db.prepare(`
    INSERT INTO user_song_stats (user_id, song_id, play_count, total_duration_ms, last_played_at)
    VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, song_id) DO UPDATE SET
      play_count = play_count + 1,
      total_duration_ms = total_duration_ms + excluded.total_duration_ms,
      last_played_at = CURRENT_TIMESTAMP
  `),

  getUserTopSongs: db.prepare(`
    SELECT 
      s.*,
      uss.play_count,
      uss.total_duration_ms,
      uss.last_played_at
    FROM user_song_stats uss
    JOIN songs s ON uss.song_id = s.id
    WHERE uss.user_id = ?
    ORDER BY uss.play_count DESC, uss.last_played_at DESC
    LIMIT ?
  `),

  getUserStats: db.prepare(`
    SELECT 
      COUNT(DISTINCT song_id) as unique_songs,
      SUM(play_count) as total_plays,
      SUM(total_duration_ms) as total_listening_time
    FROM user_song_stats
    WHERE user_id = ?
  `)
};

// ============= VOTE OPERATIONS =============

const voteQueries = {
  addVote: db.prepare(`
    INSERT INTO votes (user_id, song_id, votes)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id, song_id) DO UPDATE SET
      votes = votes + 1,
      voted_at = CURRENT_TIMESTAMP
  `),

  getUserVotes: db.prepare(`
    SELECT 
      v.*,
      s.title, s.artist, s.album_cover
    FROM votes v
    JOIN songs s ON v.song_id = s.id
    WHERE v.user_id = ?
    ORDER BY v.votes DESC
  `),

  getSongVotes: db.prepare(`
    SELECT COALESCE(SUM(votes), 0) as total_votes
    FROM votes
    WHERE song_id = ?
  `)
};

// ============= FRIENDSHIP OPERATIONS =============

const friendshipQueries = {
  // Busca usuários por nome (para adicionar amigos)
  searchUsers: db.prepare(`
    SELECT 
      u.id, u.display_name, u.profile_image, u.spotify_id,
      (
        SELECT status FROM friendships 
        WHERE (user_id = ? AND friend_id = u.id) 
           OR (user_id = u.id AND friend_id = ?)
        LIMIT 1
      ) as friendship_status
    FROM users u
    WHERE u.id != ? 
      AND (u.display_name LIKE ? OR u.spotify_id LIKE ?)
    LIMIT 20
  `),

  // Lista amigos aceitos
  getFriends: db.prepare(`
    SELECT 
      u.id, u.display_name, u.profile_image, u.spotify_id, u.total_plays,
      f.accepted_at,
      (SELECT title FROM songs s 
       JOIN user_song_stats uss ON s.id = uss.song_id 
       WHERE uss.user_id = u.id 
       ORDER BY uss.last_played_at DESC LIMIT 1) as last_played_title
    FROM users u
    INNER JOIN friendships f ON (
      (f.user_id = ? AND f.friend_id = u.id) OR 
      (f.friend_id = ? AND f.user_id = u.id)
    )
    WHERE f.status = 'accepted'
    ORDER BY f.accepted_at DESC
  `),

  // Lista pedidos de amizade pendentes (recebidos)
  getPendingRequests: db.prepare(`
    SELECT 
      u.id, u.display_name, u.profile_image, u.spotify_id,
      f.requested_at
    FROM users u
    INNER JOIN friendships f ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.requested_at DESC
  `),

  // Envia pedido de amizade
  sendRequest: db.prepare(`
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (?, ?, 'pending')
    ON CONFLICT(user_id, friend_id) DO UPDATE SET
      status = CASE 
        WHEN friendships.status = 'rejected' THEN 'pending'
        ELSE friendships.status
      END,
      requested_at = CASE 
        WHEN friendships.status = 'rejected' THEN CURRENT_TIMESTAMP
        ELSE friendships.requested_at
      END
  `),

  // Aceita pedido de amizade
  acceptRequest: db.prepare(`
    UPDATE friendships 
    SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND friend_id = ? AND status = 'pending'
  `),

  // Remove amizade ou rejeita pedido
  removeFriendship: db.prepare(`
    DELETE FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `),

  // Verifica se são amigos
  areFriends: db.prepare(`
    SELECT id FROM friendships 
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
    LIMIT 1
  `),

  // Status da amizade entre dois usuários
  getFriendshipStatus: db.prepare(`
    SELECT status, user_id, friend_id FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    LIMIT 1
  `)
};

// ============= EXPORTED FUNCTIONS =============

module.exports = {
  db,
  
  // User operations
  upsertUser: (userData) => userQueries.upsertUser.run(
    userData.spotify_id,
    userData.email,
    userData.display_name,
    userData.profile_image,
    userData.country,
    userData.access_token,
    userData.refresh_token,
    userData.token_expires_at
  ),
  
  getUserBySpotifyId: (spotifyId) => userQueries.getUserBySpotifyId.get(spotifyId),
  getUserById: (id) => userQueries.getUserById.get(id),
  updateUserTokens: (accessToken, refreshToken, expiresAt, userId) => 
    userQueries.updateUserTokens.run(accessToken, refreshToken, expiresAt, userId),
  incrementUserPlays: (userId) => userQueries.incrementUserPlays.run(userId),
  
  // Song operations
  upsertSong: (songData) => {
    try {
      const result = songQueries.upsertSong.get(
        songData.spotify_id,
        songData.title,
        songData.artist,
        songData.album,
        songData.album_cover,
        songData.audio_url,
        songData.preview_url,
        songData.spotify_url,
        songData.duration_ms,
        songData.release_date,
        songData.popularity,
        songData.added_by_user_id || null
      );
      return result || songQueries.getSongBySpotifyId.get(songData.spotify_id);
    } catch (error) {
      console.error('Erro ao upsert song:', error);
      throw error;
    }
  },
  
  getSongById: (id) => songQueries.getSongById.get(id),
  getSongBySpotifyId: (spotifyId) => songQueries.getSongBySpotifyId.get(spotifyId),
  getAllSongs: () => songQueries.getAllSongs.all(),
  incrementSongPlays: (songId) => songQueries.incrementSongPlays.run(songId),
  getTopSongs: (limit = 50) => songQueries.getTopSongs.all(limit),
  getUserAddedSongs: (userId) => songQueries.getUserAddedSongs.all(userId),
  
  // Play history
  addPlayHistory: (userId, songId, durationMs, completed, source = 'playoff') =>
    historyQueries.addPlayHistory.run(userId, songId, durationMs, completed ? 1 : 0, source),
  getUserHistory: (userId, limit = 50) => historyQueries.getUserHistory.all(userId, limit),
  getRecentPlays: (limit = 20) => historyQueries.getRecentPlays.all(limit),
  
  // User stats
  incrementUserSongStats: (userId, songId, durationMs) =>
    statsQueries.incrementUserSongStats.run(userId, songId, durationMs),
  getUserTopSongs: (userId, limit = 20) => statsQueries.getUserTopSongs.all(userId, limit),
  getUserStats: (userId) => statsQueries.getUserStats.get(userId),
  
  // Votes
  addVote: (userId, songId) => voteQueries.addVote.run(userId, songId),
  getUserVotes: (userId) => voteQueries.getUserVotes.all(userId),
  getSongVotes: (songId) => voteQueries.getSongVotes.get(songId),
  
  // Friendships
  searchUsers: (query, currentUserId) => {
    const searchPattern = `%${query}%`
    return friendshipQueries.searchUsers.all(
      currentUserId, currentUserId, currentUserId, searchPattern, searchPattern
    )
  },
  
  getFriends: (userId) => friendshipQueries.getFriends.all(userId, userId),
  
  getPendingFriendRequests: (userId) => friendshipQueries.getPendingRequests.all(userId),
  
  sendFriendRequest: (userId, friendId) => {
    try {
      // Verifica se já existe amizade no sentido inverso
      const existing = friendshipQueries.getFriendshipStatus.get(userId, friendId, friendId, userId)
      if (existing?.status === 'accepted') {
        return { success: false, message: 'Vocês já são amigos', status: 'accepted' }
      }
      if (existing?.status === 'pending') {
        // Se o outro já pediu, aceita automaticamente
        if (existing.user_id === friendId) {
          friendshipQueries.acceptRequest.run(friendId, userId)
          return { success: true, message: 'Amizade aceita!', status: 'accepted' }
        }
        return { success: false, message: 'Pedido já enviado', status: 'pending' }
      }
      
      friendshipQueries.sendRequest.run(userId, friendId)
      return { success: true, message: 'Pedido enviado!', status: 'pending' }
    } catch (error) {
      console.error('Erro ao enviar pedido de amizade:', error)
      return { success: false, message: 'Erro ao enviar pedido' }
    }
  },
  
  acceptFriendRequest: (userId, friendId) => {
    try {
      const result = friendshipQueries.acceptRequest.run(friendId, userId)
      return { success: result.changes > 0 }
    } catch (error) {
      console.error('Erro ao aceitar amizade:', error)
      return { success: false }
    }
  },
  
  removeFriend: (userId, friendId) => {
    try {
      friendshipQueries.removeFriendship.run(userId, friendId, friendId, userId)
      return { success: true }
    } catch (error) {
      console.error('Erro ao remover amigo:', error)
      return { success: false }
    }
  },
  
  areFriends: (userId, friendId) => {
    const result = friendshipQueries.areFriends.get(userId, friendId, friendId, userId)
    return !!result
  },
  
  getFriendshipStatus: (userId, friendId) => {
    const result = friendshipQueries.getFriendshipStatus.get(userId, friendId, friendId, userId)
    return result?.status || 'none'
  },
  
  // Busca atividade de um usuário (para amigos verem)
  getUserActivity: (userId) => {
    try {
      const stats = statsQueries.getUserStats.get(userId) || { unique_songs: 0, total_plays: 0, total_listening_time: 0 }
      const recentPlays = historyQueries.getUserHistory.all(userId, 10)
      
      // Busca músicas curtidas do amigo (se houver tabela liked_songs)
      let likedSongs = []
      try {
        const likedQuery = db.prepare(`
          SELECT spotify_track_id, title, artist, album, album_cover
          FROM liked_songs 
          WHERE user_id = ? 
          ORDER BY liked_at DESC 
          LIMIT 10
        `)
        likedSongs = likedQuery.all(userId)
      } catch (e) {
        // Tabela liked_songs pode não existir
      }
      
      return {
        stats: {
          total_plays: stats.total_plays || 0,
          total_likes: likedSongs.length,
          unique_songs: stats.unique_songs || 0
        },
        recentPlays,
        likedSongs
      }
    } catch (error) {
      console.error('Erro ao buscar atividade do usuário:', error)
      return { stats: { total_plays: 0, total_likes: 0, unique_songs: 0 }, recentPlays: [], likedSongs: [] }
    }
  },
  
  // Transaction helper
  transaction: (fn) => db.transaction(fn)
};
