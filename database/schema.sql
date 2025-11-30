-- ========================================
-- PlayOff - Database Schema
-- Sistema de Votação Musical com Autenticação Spotify
-- ========================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  profile_image VARCHAR(500),
  country VARCHAR(10),
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  token_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_plays INTEGER DEFAULT 0
);

-- Tabela de Músicas (catálogo)
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_id VARCHAR(255) UNIQUE,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  album_cover TEXT,
  audio_url TEXT,
  preview_url TEXT,
  spotify_url TEXT,
  duration_ms INTEGER,
  release_date VARCHAR(50),
  popularity INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_plays INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  added_by_user_id INTEGER,
  FOREIGN KEY (added_by_user_id) REFERENCES users(id)
);

-- Tabela de Histórico de Reprodução
CREATE TABLE IF NOT EXISTS play_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  play_duration_ms INTEGER,
  completed BOOLEAN DEFAULT 0,
  source VARCHAR(50) DEFAULT 'playoff',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

-- Tabela de Votos (sistema de votação)
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  votes INTEGER DEFAULT 1,
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE(user_id, song_id)
);

-- Tabela de Estatísticas de Usuários por Música
CREATE TABLE IF NOT EXISTS user_song_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  play_count INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  last_played_at DATETIME,
  first_played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE(user_id, song_id)
);

-- Tabela de Amizades (sistema social)
CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);

-- Índices para amizades
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_play_history_user ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_song ON play_history(song_id);
CREATE INDEX IF NOT EXISTS idx_play_history_date ON play_history(played_at);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_song ON votes(song_id);
CREATE INDEX IF NOT EXISTS idx_user_song_stats ON user_song_stats(user_id, song_id);
CREATE INDEX IF NOT EXISTS idx_songs_spotify ON songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_users_spotify ON users(spotify_id);

-- Views para estatísticas

-- Top músicas globais
CREATE VIEW IF NOT EXISTS top_songs_global AS
SELECT 
  s.id,
  s.title,
  s.artist,
  s.album_cover,
  s.total_plays,
  s.unique_listeners,
  COUNT(DISTINCT ph.user_id) as current_listeners
FROM songs s
LEFT JOIN play_history ph ON s.id = ph.song_id
GROUP BY s.id
ORDER BY s.total_plays DESC;

-- Top músicas por usuário
CREATE VIEW IF NOT EXISTS user_top_songs AS
SELECT 
  uss.user_id,
  s.id as song_id,
  s.title,
  s.artist,
  s.album_cover,
  uss.play_count,
  uss.total_duration_ms,
  uss.last_played_at
FROM user_song_stats uss
JOIN songs s ON uss.song_id = s.id
ORDER BY uss.user_id, uss.play_count DESC;
