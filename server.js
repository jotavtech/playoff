const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ============= DATABASE SETUP (PostgreSQL) =============
// Configurado para Railway PostgreSQL

// URL do banco de dados (Railway fornece automaticamente)
const DATABASE_URL = process.env.DATABASE_URL;

// Pool de conexões PostgreSQL - SÓ CRIA SE TIVER DATABASE_URL
let pool = null;
if (DATABASE_URL) {
  const { Pool } = require('pg');
  console.log('📊 Tentando configurar Pool PostgreSQL...');
  console.log(`   URL presente? ${!!DATABASE_URL}`);
  
  // Configuração SSL robusta para produção
  const sslConfig = !DATABASE_URL.includes('localhost') 
    ? { rejectUnauthorized: false } 
    : false;

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: sslConfig,
    connectionTimeoutMillis: 5000, // Timeout de 5s para conexão
  });
  console.log('📊 Pool PostgreSQL configurado');
} else {
  console.log('⚠️ DATABASE_URL não configurada - rodando SEM banco de dados');
}

// Schema do banco de dados PostgreSQL
const DB_SCHEMA = `
-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  profile_image VARCHAR(500),
  country VARCHAR(10),
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_plays INTEGER DEFAULT 0
);

-- Tabela de Músicas (catálogo)
CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_plays INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  added_by_user_id INTEGER REFERENCES users(id)
);

-- Tabela de Histórico de Reprodução
CREATE TABLE IF NOT EXISTS play_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  play_duration_ms INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  source VARCHAR(50) DEFAULT 'playoff'
);

-- Tabela de Votos (sistema de votação)
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  votes INTEGER DEFAULT 1,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, song_id)
);

-- Tabela de Estatísticas de Usuários por Música
CREATE TABLE IF NOT EXISTS user_song_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  play_count INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  last_played_at TIMESTAMP,
  first_played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, song_id)
);

-- Tabela de Músicas Curtidas pelo Usuário
CREATE TABLE IF NOT EXISTS liked_songs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  spotify_track_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  album_cover TEXT,
  spotify_url TEXT,
  duration_ms INTEGER,
  liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, spotify_track_id)
);

-- Tabela de Amizades
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_liked_songs_user ON liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_spotify ON liked_songs(spotify_track_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
`;

// Inicializa o banco de dados
async function checkConnection() {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    console.log('📊 Conectado ao PostgreSQL com sucesso!');
    
    // Inicializa schema se necessário
    await client.query(DB_SCHEMA);
    console.log('✅ Schema do banco de dados verificado/inicializado');
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ CRÍTICO: Erro ao conectar ao banco de dados!');
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
    if (error.code) console.error('   Code:', error.code);
    return false;
  }
}

// Objeto db com funções async para PostgreSQL
// Todas as funções verificam se pool existe antes de executar
const db = {
  pool,
  
  async upsertUser(d) {
    if (!pool) return null;
    const query = `
      INSERT INTO users (spotify_id, email, display_name, profile_image, country, spotify_access_token, spotify_refresh_token, token_expires_at, last_login) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT(spotify_id) DO UPDATE SET
        email = EXCLUDED.email, display_name = EXCLUDED.display_name, profile_image = EXCLUDED.profile_image,
        spotify_access_token = EXCLUDED.spotify_access_token, spotify_refresh_token = EXCLUDED.spotify_refresh_token,
        token_expires_at = EXCLUDED.token_expires_at, last_login = CURRENT_TIMESTAMP
      RETURNING *`;
    const result = await pool.query(query, [d.spotify_id, d.email, d.display_name, d.profile_image, d.country, d.access_token, d.refresh_token, d.token_expires_at]);
    return result.rows[0];
  },
  
  async getUserBySpotifyId(id) {
    if (!pool) return null;
    const result = await pool.query('SELECT * FROM users WHERE spotify_id = $1', [id]);
    return result.rows[0];
  },
  
  async getUserById(id) {
    if (!pool) return null;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async updateUserTokens(at, rt, exp, id) {
    if (!pool) return;
    await pool.query('UPDATE users SET spotify_access_token = $1, spotify_refresh_token = $2, token_expires_at = $3 WHERE id = $4', [at, rt, exp, id]);
  },
  
  async incrementUserPlays(id) {
    if (!pool) return;
    await pool.query('UPDATE users SET total_plays = total_plays + 1 WHERE id = $1', [id]);
  },
  
  async upsertSong(d) {
    if (!pool) return null;
    const query = `
      INSERT INTO songs (spotify_id, title, artist, album, album_cover, audio_url, preview_url, spotify_url, duration_ms, release_date, popularity, added_by_user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(spotify_id) DO UPDATE SET
        album_cover = EXCLUDED.album_cover, preview_url = EXCLUDED.preview_url, spotify_url = EXCLUDED.spotify_url,
        popularity = EXCLUDED.popularity, added_by_user_id = COALESCE(songs.added_by_user_id, EXCLUDED.added_by_user_id)
      RETURNING *`;
    try {
      const result = await pool.query(query, [d.spotify_id, d.title, d.artist, d.album, d.album_cover, d.audio_url, d.preview_url, d.spotify_url, d.duration_ms, d.release_date, d.popularity, d.added_by_user_id || null]);
      return result.rows[0];
    } catch (e) { console.error(e); throw e; }
  },
  
  async getSongById(id) {
    if (!pool) return null;
    const result = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async getSongBySpotifyId(id) {
    if (!pool) return null;
    const result = await pool.query('SELECT * FROM songs WHERE spotify_id = $1', [id]);
    return result.rows[0];
  },
  
  async getAllSongs() {
    if (!pool) return [];
    const result = await pool.query('SELECT * FROM songs ORDER BY created_at DESC');
    return result.rows;
  },
  
  async incrementSongPlays(id) {
    if (!pool) return;
    await pool.query('UPDATE songs SET total_plays = total_plays + 1 WHERE id = $1', [id]);
  },
  
  async getTopSongs(limit) {
    if (!pool) return [];
    const result = await pool.query('SELECT * FROM songs ORDER BY total_plays DESC, popularity DESC LIMIT $1', [limit]);
    return result.rows;
  },
  
  async getUserAddedSongs(id) {
    if (!pool) return [];
    const result = await pool.query('SELECT * FROM songs WHERE added_by_user_id = $1 ORDER BY created_at DESC', [id]);
    return result.rows;
  },
  
  async addPlayHistory(uid, sid, dur, comp, src = 'playoff') {
    if (!pool) return;
    await pool.query('INSERT INTO play_history (user_id, song_id, play_duration_ms, completed, source) VALUES ($1, $2, $3, $4, $5)', [uid, sid, dur, comp, src]);
  },
  
  async getUserHistory(uid, limit) {
    if (!pool) return [];
    const result = await pool.query('SELECT ph.*, s.title, s.artist, s.album, s.album_cover FROM play_history ph JOIN songs s ON ph.song_id = s.id WHERE ph.user_id = $1 ORDER BY ph.played_at DESC LIMIT $2', [uid, limit]);
    return result.rows;
  },
  
  async getRecentPlays(limit) {
    if (!pool) return [];
    const result = await pool.query('SELECT ph.*, s.title, s.artist, s.album_cover, u.display_name as user_name FROM play_history ph JOIN songs s ON ph.song_id = s.id JOIN users u ON ph.user_id = u.id ORDER BY ph.played_at DESC LIMIT $1', [limit]);
    return result.rows;
  },
  
  async incrementUserSongStats(uid, sid, dur) {
    if (!pool) return;
    const query = `
      INSERT INTO user_song_stats (user_id, song_id, play_count, total_duration_ms, last_played_at) VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, song_id) DO UPDATE SET play_count = user_song_stats.play_count + 1, total_duration_ms = user_song_stats.total_duration_ms + $3, last_played_at = CURRENT_TIMESTAMP`;
    await pool.query(query, [uid, sid, dur]);
  },
  
  async getUserTopSongs(uid, limit) {
    if (!pool) return [];
    const result = await pool.query('SELECT s.*, uss.play_count, uss.total_duration_ms, uss.last_played_at FROM user_song_stats uss JOIN songs s ON uss.song_id = s.id WHERE uss.user_id = $1 ORDER BY uss.play_count DESC, uss.last_played_at DESC LIMIT $2', [uid, limit]);
    return result.rows;
  },
  
  async getUserStats(uid) {
    if (!pool) return { unique_songs: 0, total_plays: 0, total_listening_time: 0 };
    const result = await pool.query('SELECT COUNT(DISTINCT song_id) as unique_songs, SUM(play_count) as total_plays, SUM(total_duration_ms) as total_listening_time FROM user_song_stats WHERE user_id = $1', [uid]);
    return result.rows[0];
  },
  
  async addVote(uid, sid) {
    if (!pool) return;
    await pool.query('INSERT INTO votes (user_id, song_id, votes) VALUES ($1, $2, 1) ON CONFLICT(user_id, song_id) DO UPDATE SET votes = votes.votes + 1, voted_at = CURRENT_TIMESTAMP', [uid, sid]);
  },
  
  async getUserVotes(uid) {
    if (!pool) return [];
    const result = await pool.query('SELECT v.*, s.title, s.artist, s.album_cover FROM votes v JOIN songs s ON v.song_id = s.id WHERE v.user_id = $1 ORDER BY v.votes DESC', [uid]);
    return result.rows;
  },
  
  async getSongVotes(sid) {
    if (!pool) return { total_votes: 0 };
    const result = await pool.query('SELECT COALESCE(SUM(votes), 0) as total_votes FROM votes WHERE song_id = $1', [sid]);
    return result.rows[0];
  },
  
  // ============= LIKED SONGS =============
  
  async likeSong(userId, songData) {
    if (!pool) return null;
    const query = `
      INSERT INTO liked_songs (user_id, song_id, spotify_track_id, title, artist, album, album_cover, spotify_url, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT(user_id, spotify_track_id) DO UPDATE SET
        title = EXCLUDED.title, artist = EXCLUDED.artist, album = EXCLUDED.album,
        album_cover = EXCLUDED.album_cover, spotify_url = EXCLUDED.spotify_url,
        duration_ms = EXCLUDED.duration_ms, liked_at = CURRENT_TIMESTAMP
      RETURNING *`;
    const result = await pool.query(query, [
      userId, songData.song_id || null, songData.spotify_track_id,
      songData.title, songData.artist, songData.album || null,
      songData.album_cover || null, songData.spotify_url || null, songData.duration_ms || 0
    ]);
    return result.rows[0];
  },
  
  async unlikeSong(userId, spotifyTrackId) {
    if (!pool) return false;
    const result = await pool.query('DELETE FROM liked_songs WHERE user_id = $1 AND spotify_track_id = $2 RETURNING id', [userId, spotifyTrackId]);
    return result.rowCount > 0;
  },
  
  async getUserLikedSongs(userId, limit = 100) {
    if (!pool) return [];
    const result = await pool.query(
      'SELECT * FROM liked_songs WHERE user_id = $1 ORDER BY liked_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  },
  
  async isLiked(userId, spotifyTrackId) {
    if (!pool) return false;
    const result = await pool.query(
      'SELECT id FROM liked_songs WHERE user_id = $1 AND spotify_track_id = $2',
      [userId, spotifyTrackId]
    );
    return result.rowCount > 0;
  },
  
  async getLikedSongIds(userId) {
    if (!pool) return [];
    const result = await pool.query(
      'SELECT spotify_track_id FROM liked_songs WHERE user_id = $1',
      [userId]
    );
    return result.rows.map(r => r.spotify_track_id);
  },
  
  // ============= FRIENDS SYSTEM =============
  
  // Busca usuários por nome (exclui o usuário atual)
  async searchUsers(query, currentUserId) {
    if (!pool) return [];
    const result = await pool.query(`
      SELECT id, display_name, profile_image, spotify_id,
        (SELECT status FROM friendships WHERE 
          (user_id = $2 AND friend_id = u.id) OR 
          (user_id = u.id AND friend_id = $2)
        LIMIT 1) as friendship_status
      FROM users u
      WHERE u.id != $2 
        AND (LOWER(display_name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1))
      LIMIT 20
    `, [`%${query}%`, currentUserId]);
    return result.rows;
  },
  
  // Lista amigos aceitos
  async getFriends(userId) {
    if (!pool) return [];
    const result = await pool.query(`
      SELECT u.id, u.display_name, u.profile_image, u.spotify_id, u.last_login,
        f.accepted_at,
        (SELECT COUNT(*) FROM play_history ph WHERE ph.user_id = u.id) as total_plays,
        (SELECT json_build_object(
          'title', ls.title, 'artist', ls.artist, 'album_cover', ls.album_cover
        ) FROM liked_songs ls WHERE ls.user_id = u.id ORDER BY ls.liked_at DESC LIMIT 1) as last_liked
      FROM users u
      JOIN friendships f ON (
        (f.user_id = $1 AND f.friend_id = u.id) OR 
        (f.friend_id = $1 AND f.user_id = u.id)
      )
      WHERE f.status = 'accepted' AND u.id != $1
      ORDER BY u.last_login DESC NULLS LAST
    `, [userId]);
    return result.rows;
  },
  
  // Lista pedidos de amizade pendentes (recebidos)
  async getPendingFriendRequests(userId) {
    if (!pool) return [];
    const result = await pool.query(`
      SELECT u.id, u.display_name, u.profile_image, u.spotify_id, f.created_at as requested_at
      FROM users u
      JOIN friendships f ON f.user_id = u.id
      WHERE f.friend_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userId]);
    return result.rows;
  },
  
  // Envia pedido de amizade
  async sendFriendRequest(userId, friendId) {
    if (!pool) return null;
    
    // Verifica se já existe uma relação
    const existing = await pool.query(`
      SELECT id, status FROM friendships 
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [userId, friendId]);
    
    if (existing.rowCount > 0) {
      const status = existing.rows[0].status;
      if (status === 'accepted') {
        return { success: false, message: 'Vocês já são amigos!' };
      }
      if (status === 'pending') {
        // Se o outro já mandou pedido, aceita automaticamente
        const check = await pool.query(`
          SELECT id FROM friendships WHERE user_id = $2 AND friend_id = $1 AND status = 'pending'
        `, [userId, friendId]);
        if (check.rowCount > 0) {
          await pool.query(`
            UPDATE friendships SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
            WHERE user_id = $2 AND friend_id = $1
          `, [userId, friendId]);
          return { success: true, message: 'Amizade confirmada!', status: 'accepted' };
        }
        return { success: false, message: 'Pedido já enviado' };
      }
    }
    
    // Cria novo pedido
    await pool.query(`
      INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')
      ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP
    `, [userId, friendId]);
    
    return { success: true, message: 'Pedido de amizade enviado!', status: 'pending' };
  },
  
  // Aceita pedido de amizade
  async acceptFriendRequest(userId, friendId) {
    if (!pool) return null;
    const result = await pool.query(`
      UPDATE friendships SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
      RETURNING *
    `, [friendId, userId]);
    
    if (result.rowCount > 0) {
      return { success: true, message: 'Amizade aceita!' };
    }
    return { success: false, message: 'Pedido não encontrado' };
  },
  
  // Remove amizade ou recusa pedido
  async removeFriend(userId, friendId) {
    if (!pool) return false;
    const result = await pool.query(`
      DELETE FROM friendships 
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [userId, friendId]);
    return result.rowCount > 0;
  },
  
  // Verifica se são amigos
  async areFriends(userId, friendId) {
    if (!pool) return false;
    const result = await pool.query(`
      SELECT id FROM friendships 
      WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
        AND status = 'accepted'
    `, [userId, friendId]);
    return result.rowCount > 0;
  },
  
  // Status de amizade entre dois usuários
  async getFriendshipStatus(userId, friendId) {
    if (!pool) return 'none';
    const result = await pool.query(`
      SELECT status, user_id FROM friendships 
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [userId, friendId]);
    if (result.rowCount === 0) return 'none';
    const row = result.rows[0];
    if (row.status === 'accepted') return 'friends';
    if (row.status === 'pending' && row.user_id === userId) return 'pending_sent';
    if (row.status === 'pending' && row.user_id === friendId) return 'pending_received';
    return 'none';
  },
  
  // Atividade recente de um usuário
  async getUserActivity(userId) {
    if (!pool) return { recentPlays: [], likedSongs: [], stats: {} };
    
    // Últimas músicas ouvidas
    const plays = await pool.query(`
      SELECT s.title, s.artist, s.album_cover, ph.played_at
      FROM play_history ph
      JOIN songs s ON s.id = ph.song_id
      WHERE ph.user_id = $1
      ORDER BY ph.played_at DESC
      LIMIT 10
    `, [userId]);
    
    // Músicas curtidas recentes
    const liked = await pool.query(`
      SELECT title, artist, album_cover, liked_at
      FROM liked_songs
      WHERE user_id = $1
      ORDER BY liked_at DESC
      LIMIT 10
    `, [userId]);
    
    // Estatísticas
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM play_history WHERE user_id = $1) as total_plays,
        (SELECT COUNT(*) FROM liked_songs WHERE user_id = $1) as total_likes,
        (SELECT COUNT(DISTINCT song_id) FROM play_history WHERE user_id = $1) as unique_songs
    `, [userId]);
    
    return {
      recentPlays: plays.rows,
      likedSongs: liked.rows,
      stats: stats.rows[0] || {}
    };
  }
};
const authRoutes = require('./routes/auth-routes')(db);

// Importação do fetch para versões do Node.js que não possuem suporte nativo
// Isso garante compatibilidade com APIs externas independente da versão do Node
let fetch;
(async () => {
  if (typeof globalThis.fetch === 'undefined') {
    const { default: nodeFetch } = await import('node-fetch');
    fetch = nodeFetch;
  } else {
    fetch = globalThis.fetch;
  }
})();

// Banco de dados já é inicializado automaticamente ao importar o módulo
console.log('✅ Banco de dados carregado!');

// ============= IMPLEMENTAÇÃO DO PADRÃO OBSERVER =============
// O padrão Observer é uma solução elegante que desenvolvi para este projeto
// Ele permite que diferentes componentes do sistema sejam notificados automaticamente
// quando algo importante acontece, como um novo voto ou mudança na música mais votada
// 
// Principais vantagens desta arquitetura:
// 1. Desacoplamento: Os componentes não precisam conhecer uns aos outros diretamente
// 2. Escalabilidade: Posso adicionar novos observadores sem modificar código existente  
// 3. Manutenibilidade: Cada classe tem uma responsabilidade específica e bem definida
// 4. Reatividade: O sistema reage automaticamente a mudanças de estado

// Interface Observer - Define o contrato que todos os observadores devem seguir
// Esta é a base do padrão Observer, garantindo que todos os observadores
// implementem o método update() que será chamado quando houver notificações
class Observer {
  update(data) {
    throw new Error('Método update do Observer deve ser implementado');
  }
}

// Classe Subject (Observable) - Gerencia a lista de observadores
// Esta classe é o núcleo do padrão Observer. Ela mantém uma lista de observadores
// e notifica todos eles quando algo importante acontece. É como um sistema de
// broadcasting onde o Subject é a estação de rádio e os Observers são os receptores
class Subject {
  constructor() {
    // Array que armazena todos os observadores registrados
    // Cada observador aqui será notificado quando notify() for chamado
    this.observers = [];
  }

  // Método para registrar um novo observador no sistema
  // Verifico se o objeto realmente implementa a interface Observer
  // para evitar erros em tempo de execução
  subscribe(observer) {
    if (observer instanceof Observer) {
      this.observers.push(observer);
      console.log(`👀 Observador registrado: ${observer.constructor.name}`);
    } else {
      throw new Error('Observador deve implementar a interface Observer');
    }
  }

  // Método para remover um observador da lista
  // Útil para cleanup e otimização de memória
  unsubscribe(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
      console.log(`👋 Observador removido: ${observer.constructor.name}`);
    }
  }

  // Método central do padrão - notifica todos os observadores
  // Este é o método mais importante, pois é ele que propaga as mudanças
  // por todo o sistema. Cada observador recebe os mesmos dados
  notify(data) {
    console.log(`🔔 Notificando ${this.observers.length} observadores com dados:`, data);
    this.observers.forEach(observer => {
      try {
        // Chamo o método update de cada observador com os dados
        // O try/catch garante que se um observador falhar, os outros continuem funcionando
        observer.update(data);
      } catch (error) {
        console.error(`❌ Erro ao notificar observador ${observer.constructor.name}:`, error);
      }
    });
  }
}

// VoteManager - Subject que gerencia votação e notifica observadores
// Esta é a classe mais importante do sistema. Ela herda de Subject e é responsável
// por gerenciar todos os votos e notificar os observadores sobre mudanças.
// É aqui que toda a lógica de votação acontece, incluindo:
// - Processamento de votos individuais e super votos
// - Determinação da música mais votada
// - Notificação automática quando há mudanças significativas
class VoteManager extends Subject {
  constructor() {
    super();
    // Armazeno a música atualmente mais votada para comparação
    // Isso me permite detectar quando há mudança de liderança
    this.currentHighestVoted = null;
  }

  // Método principal para processar votos - coração do sistema de votação
  // Este método é chamado sempre que alguém vota, seja voto simples ou super voto
  // Ele atualiza a contagem, verifica mudanças e notifica todos os observadores
  processVote(songId, newVoteCount) {
    console.log(`🗳️ VoteManager: Processando voto para música ${songId} com ${newVoteCount} votos`);
    
    // Encontro a música na lista e atualizo seus votos
    // Uso find() porque é mais eficiente para arrays pequenos
    const song = songs.find(s => s.id === songId);
    if (song) {
      song.votes = newVoteCount;
      console.log(`🗳️ Voto registrado para "${song.title}" - Total: ${song.votes} votos`);
      
      // Verifico se houve mudança na música mais votada
      // Esta é uma parte crítica pois determina se devo notificar sobre mudança de liderança
      const newHighestVoted = this.getHighestVotedSong();
      const hasChanged = !this.currentHighestVoted || 
                        this.currentHighestVoted.id !== newHighestVoted?.id;
      
      if (hasChanged && newHighestVoted) {
        // Nova música assumiu a liderança!
        this.currentHighestVoted = newHighestVoted;
        console.log(`👑 Nova música mais votada: "${newHighestVoted.title}" por ${newHighestVoted.artist} (${newHighestVoted.votes} votos)`);
        
        // Notifico todos os observadores sobre a mudança de liderança
        // Passo dados completos para que cada observador possa reagir adequadamente
        this.notify({
          type: 'VOTE_CHANGE',
          songId: songId,
          newVotes: newVoteCount,
          highestVoted: newHighestVoted,
          allSongs: this.getAllSongsSorted()
        });
      } else {
        // Apenas atualizo a contagem sem mudança de liderança
        // Mesmo assim notifico para manter a UI atualizada
        this.notify({
          type: 'VOTE_UPDATE',
          songId: songId,
          newVotes: newVoteCount,
          highestVoted: this.currentHighestVoted,
          allSongs: this.getAllSongsSorted()
        });
      }
    }
  }

  // Método utilitário para encontrar a música mais votada
  // Uso sort() para ordenar por votos e retorno o primeiro elemento
  // Se não houver músicas, retorno null para evitar erros
  getHighestVotedSong() {
    if (songs.length === 0) return null;
    return [...songs].sort((a, b) => b.votes - a.votes)[0];
  }

  // Método para obter todas as músicas ordenadas por votos
  // Uso spread operator [...songs] para criar uma nova array e não modificar a original
  // Isso é importante para evitar efeitos colaterais indesejados
  getAllSongsSorted() {
    return [...songs].sort((a, b) => b.votes - a.votes);
  }

  // Método para adicionar novas músicas ao sistema
  // Além de adicionar à lista, notifico todos os observadores
  // para que possam reagir à nova música (ex: atualizar UI)
  addSong(newSong) {
    songs.push(newSong);
    console.log(`🎵 VoteManager: Nova música adicionada: "${newSong.title}" por ${newSong.artist}`);
    
    // Notifico observadores sobre a nova música
    this.notify({
      type: 'SONG_ADDED',
      song: newSong,
      allSongs: this.getAllSongsSorted()
    });
  }
}

// MusicPlayer - Observador que reage a mudanças de votos
// Esta classe implementa a interface Observer e é responsável por gerenciar
// a reprodução automática de músicas baseada nos votos. É um exemplo perfeito
// de como o padrão Observer desacopla responsabilidades:
// - O VoteManager não precisa saber sobre reprodução de música
// - O MusicPlayer não precisa saber sobre lógica de votação
// - Ambos funcionam independentemente mas colaboram através do padrão Observer
class MusicPlayer extends Observer {
  constructor() {
    super();
    // Estado atual do player de música
    this.currentPlaying = null;  // Música sendo reproduzida atualmente
    this.isPlaying = false;      // Status de reprodução
  }

  // Método update obrigatório da interface Observer
  // É chamado automaticamente sempre que o VoteManager notifica mudanças
  // Analiso o tipo de evento e delego para o método apropriado
  update(data) {
    console.log(`🎵 MusicPlayer: Recebeu atualização:`, data.type);
    
    // Switch para tratar diferentes tipos de eventos
    // Isso me permite reagir de forma específica a cada situação
    switch (data.type) {
      case 'VOTE_CHANGE':
        // Mudança de liderança - possivelmente trocar música
        this.handleVoteChange(data.highestVoted);
        break;
      case 'VOTE_UPDATE':
        // Atualização de votos sem mudança de liderança
        this.handleVoteUpdate(data);
        break;
      case 'SONG_ADDED':
        // Nova música adicionada ao sistema
        this.handleSongAdded(data.song);
        break;
    }
  }

  // Lida com mudanças de liderança nas votações
  // Se uma nova música assumiu a liderança, automaticamente troco para ela
  // Esta é a funcionalidade que torna o sistema verdadeiramente reativo
  handleVoteChange(newHighestVoted) {
    if (newHighestVoted && (!this.currentPlaying || this.currentPlaying.id !== newHighestVoted.id)) {
      console.log(`🎵 MusicPlayer: Mudando para nova música mais votada: "${newHighestVoted.title}"`);
      this.playTrack(newHighestVoted);
    }
  }

  // Lida com atualizações de votos sem mudança de liderança
  // Apenas logo a informação para debug, mas não mudo a música atual
  handleVoteUpdate(data) {
    console.log(`🎵 MusicPlayer: Votos atualizados para música, líder atual ainda é: "${data.highestVoted?.title}"`);
  }

  // Lida com adição de novas músicas
  // Por enquanto apenas logo, mas poderia implementar lógica adicional
  // como adicionar à playlist ou verificar se deve tocar imediatamente
  handleSongAdded(song) {
    console.log(`🎵 MusicPlayer: Nova música disponível: "${song.title}" por ${song.artist}`);
  }

  // Método para reproduzir uma música específica
  // Em uma implementação real, isso controlaria um player de áudio
  // Por enquanto simulo a reprodução com logs e timeout
  playTrack(song) {
    this.currentPlaying = song;
    this.isPlaying = true;
    console.log(`▶️ MusicPlayer: Tocando agora "${song.title}" por ${song.artist}`);
    console.log(`🔗 URL do áudio: ${song.audioUrl}`);
    
    // Simulo reprodução (em implementação real, controlaria reprodução de áudio real)
    // O timeout simula o fim da música após 3 segundos para demo
    setTimeout(() => {
      console.log(`⏸️ MusicPlayer: Terminou de tocar "${song.title}"`);
      this.isPlaying = false;
    }, 3000); // Simulo preview de 3 segundos
  }

  // Método para obter estado atual do player
  // Útil para APIs que precisam informar sobre o que está tocando
  getCurrentPlaying() {
    return {
      song: this.currentPlaying,
      isPlaying: this.isPlaying
    };
  }
}

// UIObserver - Observador que reage a mudanças e atualiza estado da interface
// Esta classe é responsável por manter o estado da interface usuário sincronizado
// com as mudanças no sistema. É outro exemplo do poder do padrão Observer:
// - A UI se atualiza automaticamente sem polling
// - Não preciso acoplar lógica de UI com lógica de negócio
// - O estado da UI é sempre consistent com o estado do sistema
class UIObserver extends Observer {
  constructor() {
    super();
    // Estado da interface do usuário
    // Mantenho uma cópia local dos dados para responder rapidamente às consultas
    this.uiState = {
      songs: [],           // Lista de músicas ordenada
      highestVoted: null,  // Música mais votada atual
      lastUpdate: null     // Timestamp da última atualização
    };
  }

  // Método update obrigatório da interface Observer
  // Atualizo o timestamp e delego para métodos específicos baseado no tipo de evento
  update(data) {
    console.log(`🖥️ UIObserver: Recebeu atualização:`, data.type);
    
    // Marco quando foi a última atualização para debugging e cache
    this.uiState.lastUpdate = new Date().toISOString();
    
    // Delego para métodos específicos baseado no tipo de evento
    switch (data.type) {
      case 'VOTE_CHANGE':
        this.handleVoteChange(data);
        break;
      case 'VOTE_UPDATE':
        this.handleVoteUpdate(data);
        break;
      case 'SONG_ADDED':
        this.handleSongAdded(data);
        break;
    }
  }

  // Lida com mudanças de liderança nas votações
  handleVoteChange(data) {
    this.uiState.songs = data.allSongs;
    this.uiState.highestVoted = data.highestVoted;
    console.log(`🖥️ UIObserver: UI atualizado - nova música mais votada: "${data.highestVoted.title}"`);
    console.log(`📊 UIObserver: Placar de votos atualizado`);
  }

  // Lida com atualizações de votos sem mudança de liderança
  handleVoteUpdate(data) {
    this.uiState.songs = data.allSongs;
    console.log(`🖥️ UIObserver: UI atualizado - votos atualizados para música ID: ${data.songId}`);
  }

  // Lida com adição de novas músicas
  handleSongAdded(data) {
    this.uiState.songs = data.allSongs;
    console.log(`🖥️ UIObserver: UI atualizado - nova música adicionada: "${data.song.title}"`);
  }

  // Método para obter estado atual da interface
  getUIState() {
    return this.uiState;
  }
}

// Função para buscar capa de álbum (implementação simples para o mock)
const searchAlbumCover = async (artist, album, title) => {
  // Simula busca de capa - retorna null para usar placeholder
  console.log(`🎨 Simulando busca de capa para: ${artist} - ${title}`);
  return null;
};

// Função para gerar placeholder de capa
const generatePlaceholderCover = (artist, title) => {
  // Retorna uma imagem placeholder
  return `https://via.placeholder.com/300x300/1a1a1a/ffffff?text=${encodeURIComponent(artist)}`;
};

// ============= INICIALIZAÇÃO DO PADRÃO OBSERVER =============

// Cria instâncias
const voteManager = new VoteManager();
const musicPlayer = new MusicPlayer();
const uiObserver = new UIObserver();

// Inscreve observadores no vote manager
voteManager.subscribe(musicPlayer);
voteManager.subscribe(uiObserver);

// ============= EXPRESS APP SETUP =============

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// ============= ROTAS DE AUTENTICAÇÃO E API =============
// Registra as novas rotas de autenticação OAuth e API de usuários
console.log('🔐 Registrando rotas de autenticação e API...');
app.use('/auth', authRoutes.router);
app.use('/api/user', authRoutes.router);

// Endpoint de Health Check para diagnóstico
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'PlayOff API', 
    port: PORT,
    timestamp: new Date().toISOString(),
    auth_routes: true
  });
});

console.log('✅ Rotas registradas com sucesso!');

// Número máximo de músicas permitidas na votação (REMOVIDO a pedido do usuário)
// const MAX_SONGS = 12;

// Armazenamento de dados em memória (substituir por banco de dados em produção)
let songs = [
  {
    id: 'audioslave-cochise',
    title: 'Cochise',
    artist: 'Audioslave',
    audioUrl: '', // Usa Spotify
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/Audioslave-2002-capa-album-min_iicsnx.webp',
    album: 'Audioslave',
    year: 2002,
    votes: 5,
    addedAt: new Date('2024-01-01').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/4OCzAGgyWsUKpdWufYywZm', // ID correto do Cochise
    duration_ms: 222000
  },
  {
    id: 'deftones-change',
    title: 'Change (In the House of Flies)',
    artist: 'Deftones',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879300/Deftones_-_Change_In_The_House_Of_Flies_oSDNIINcK08_ejs6hn.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/Deftones-WhitePony_af94d8a7-be8b-41ea-8f62-8a6410ace2d2_vbfqyq.webp',
    album: 'White Pony',
    year: 2000,
    votes: 8,
    addedAt: new Date('2024-01-02').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/51c94ac31swyDQj9B3Lzs3',
    duration_ms: 300000
  },
  {
    id: 'qotsa-bronze',
    title: 'The Bronze',
    artist: 'Queens of the Stone Age',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879302/Queens_Of_The_Stone_Age_The_Bronze_P3kM58n2ceE_x9m9kx.mp3',
    albumCover: 'https://i.scdn.co/image/ab67616d0000b273e8dd4db47e7177c63b031a23',
    album: 'Queens of the Stone Age',
    year: 1998,
    votes: 3,
    addedAt: new Date('2024-01-03').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/6y20BV5L33R8YQMtzdCWy6',
    duration_ms: 278000
  },
  {
    id: 'deftones-my-own-summer',
    title: 'My Own Summer (Shove It)',
    artist: 'Deftones',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879303/Deftones_-_My_Own_Summer_vLjOwAPzt4o_xdemns.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/3e6814b457a9087e0c46d5a949de2766_ik37wx.webp',
    album: 'Around the Fur',
    year: 1997,
    votes: 6,
    addedAt: new Date('2024-01-04').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/1158ugMadMHjyQU6G1j4F',
    duration_ms: 215000
  },
  {
    id: 'soundgarden-outshined',
    title: 'Outshined',
    artist: 'Soundgarden',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748879304/Soundgarden_-_Outshined_Studio_Version_uLZBhlTXHuo_cfqaw1.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/71rRNAnVW6L_cpn09c.webp',
    album: 'Badmotorfinger',
    year: 1991,
    votes: 2,
    addedAt: new Date('2024-01-05').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/3t365tTYiwszqaXZb2LajN', // ID correto do Outshined
    duration_ms: 311000
  },
  {
    id: 'qotsa-avon',
    title: 'Avon',
    artist: 'Queens of the Stone Age',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893838/Queens_of_the_Stone_Age_-_Avon_Official_Audio_aimHMr-Ee4o_ay6jsw.mp3',
    albumCover: 'https://i.scdn.co/image/ab67616d0000b273e8dd4db47e7177c63b031a23',
    album: 'Queens of the Stone Age',
    year: 2005,
    votes: 4,
    addedAt: new Date('2024-01-06').toISOString()
  },
  {
    id: 'qotsa-if-only',
    title: 'If Only',
    artist: 'Queens of the Stone Age',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893839/Queens_of_the_Stone_Age_-_If_Only_Official_Audio_1HqTh0nd9GE_rojfrl.mp3',
    albumCover: 'https://i.scdn.co/image/ab67616d0000b273e8dd4db47e7177c63b031a23',
    album: 'Queens of the Stone Age',
    year: 2005,
    votes: 1,
    addedAt: new Date('2024-01-07').toISOString()
  },
  {
    id: 'gorillaz-feel-good-inc',
    title: 'Feel Good Inc.',
    artist: 'Gorillaz',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893840/Gorillaz_-_Feel_Good_Inc_Lyrics_IbpOfzrNjTY_cwzxnh.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/2025-06-02_17-48_adhnkt.png',
    album: 'Demon Days',
    year: 2005,
    votes: 7,
    addedAt: new Date('2024-01-08').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/0d28khcov6AiegSCpG5TuT',
    duration_ms: 223000
  },
  {
    id: 'rhcp-around-the-world',
    title: 'Around The World',
    artist: 'Red Hot Chili Peppers',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893841/Red_Hot_Chili_Peppers_-_Around_The_World_Official_Music_Video_HD_UPGRADE_a9eNQZbjpJk_d2oido.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897364/304b3f84-9c1f-4620-bd1d-60d6d63ff7fc_fgs0hh.webp',
    album: 'Californication',
    year: 1999,
    votes: 9,
    addedAt: new Date('2024-01-09').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/1ic15NF7Dk7AAq79B92gY9',
    duration_ms: 238000
  },
  {
    id: 'gorillaz-dare',
    title: 'DARE',
    artist: 'Gorillaz',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893841/DARE_rIq6i4-8Nww_hfwl3r.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/2025-06-02_17-48_adhnkt.png',
    album: 'Demon Days',
    year: 2005,
    votes: 3,
    addedAt: new Date('2024-01-10').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/4Hff1IjqlLimT2KCxu05TS',
    duration_ms: 244000
  },
  {
    id: 'soundgarden-black-hole-sun',
    title: 'Black Hole Sun',
    artist: 'Soundgarden',
    audioUrl: 'https://res.cloudinary.com/dzwfuzxxw/video/upload/v1748893842/Soundgarden_-_Black_Hole_Sun_HQ_Y6Kz6aXsBSs_lvcs9q.mp3',
    albumCover: 'https://res.cloudinary.com/dzwfuzxxw/image/upload/v1748897363/soundgarden-superunknown_rvcxuo.webp',
    album: 'Superunknown',
    year: 1994,
    votes: 6,
    addedAt: new Date('2024-01-11').toISOString(),
    spotifyUrl: 'https://open.spotify.com/track/2EoOZnxNgtmZaD8uUmzXyo',
    duration_ms: 318000
  }
];

const mapDbSongToMemory = (dbSong) => {
  const releaseYear = dbSong.release_date ? parseInt(dbSong.release_date.substring(0, 4), 10) : null;

  return {
    id: dbSong.spotify_id || `db-song-${dbSong.id}`,
    title: dbSong.title,
    artist: dbSong.artist,
    album: dbSong.album || 'Álbum Desconhecido',
    audioUrl: dbSong.audio_url || '',
    albumCover: dbSong.album_cover,
    year: Number.isNaN(releaseYear) ? null : releaseYear,
    votes: dbSong.votes || 0,
    addedAt: dbSong.created_at || new Date().toISOString(),
    spotifyUrl: dbSong.spotify_url || '',
    duration_ms: dbSong.duration_ms || 0,
    previewUrl: dbSong.preview_url || null,
    added_by_user_id: dbSong.added_by_user_id || null,
    addedBy: dbSong.added_by_user_id ? 'User' : 'Database'
  };
};

const bootstrapSongsFromDatabase = async () => {
  try {
    const storedSongs = await db.getAllSongs();

    if (!storedSongs || storedSongs.length === 0) {
      console.log('📭 Nenhuma música salva no banco. Mantendo apenas o seed em memória.');
      return;
    }

    const mappedSongs = storedSongs.map(mapDbSongToMemory);
    const currentSongsMap = new Map(songs.map(song => [song.id, song]));

    mappedSongs.forEach((song) => {
      currentSongsMap.set(song.id, { ...currentSongsMap.get(song.id), ...song });
    });

    songs = Array.from(currentSongsMap.values());
    
    // Correções de spotifyUrl incorretos
    const corrections = [
      { id: 'audioslave-cochise', title: 'Cochise', artist: 'Audioslave', correctUrl: 'https://open.spotify.com/track/4OCzAGgyWsUKpdWufYywZm' },
      { id: 'soundgarden-outshined', title: 'Outshined', artist: 'Soundgarden', correctUrl: 'https://open.spotify.com/track/3t365tTYiwszqaXZb2LajN' }
    ];
    
    corrections.forEach(({ id, title, artist, correctUrl }) => {
      const song = songs.find(s => s.id === id || (s.title === title && s.artist === artist));
      if (song && song.spotifyUrl !== correctUrl) {
        song.spotifyUrl = correctUrl;
        console.log(`🔧 Corrigido spotifyUrl de "${title}"`);
      }
    });
    
    voteManager.currentHighestVoted = voteManager.getHighestVotedSong();

    console.log(`💾 ${mappedSongs.length} música(s) sincronizadas do banco de dados (total atual: ${songs.length}).`);
  } catch (error) {
    console.error('❌ Erro ao carregar músicas do banco de dados:', error);
  }
};

let chatMessages = [
  {
    user: 'Sistema',
    message: 'Bem-vindos ao PlayOff! Vote nas suas músicas favoritas! 🎵',
    timestamp: new Date().toISOString()
  }
];

// Função utilitária para manter o limite máximo de músicas no sistema
// Este controle é importante para evitar que a lista cresça indefinidamente
// e para manter a performance da aplicação. Quando o limite é excedido,
// removo as músicas mais antigas (por data de adição) mantendo as mais recentes
const maintainSongsLimit = () => {
  if (songs.length > MAX_SONGS) {
    // Ordeno por data de adição (mais antigas primeiro) e removo o excesso
    // Uso toISOString() para garantir comparação correta de datas
    songs.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
    const removedSongs = songs.splice(0, songs.length - MAX_SONGS);
    
    console.log(`🧹 Limite de ${MAX_SONGS} músicas atingido. Removendo ${removedSongs.length} música(s) mais antiga(s):`);
    removedSongs.forEach(song => {
      console.log(`   - Removida: "${song.title}" por ${song.artist} (adicionada em ${song.addedAt})`);
    });
  }
};

// Função auxiliar para obter a música mais votada
// Esta função é um wrapper conveniente que usa o VoteManager
// Mantenho para compatibilidade com código legado
const getHighestVotedSong = () => {
  return voteManager.getHighestVotedSong();
};

// ============= ROTAS DA API REST =============
// Implementei uma API RESTful completa para gerenciar o sistema de votação
// Cada rota tem tratamento de erro adequado e logging detalhado para debugging
// As respostas seguem um padrão consistente com status de sucesso/erro

// Rota para buscar todas as músicas (ordenadas por votos, maior primeiro)
// Esta é a rota mais importante do sistema pois fornece todos os dados necessários
// para a interface do usuário. Incluo informações do estado atual dos observadores
app.get('/api/songs', (req, res) => {
  try {
    console.log('📡 GET /api/songs - Enviando lista de músicas ordenada por votos');
    
    // Uso o VoteManager para obter músicas ordenadas (padrão Observer em ação)
    const sortedSongs = voteManager.getAllSongsSorted();
    const highestVoted = voteManager.getHighestVotedSong();
    
    // Obtenho estado dos observadores para debugging e monitoring
    const uiState = uiObserver.getUIState();
    const playerState = musicPlayer.getCurrentPlaying();
    
    // Resposta completa com todos os dados necessários para o frontend
    res.json({ 
      songs: sortedSongs,              // Lista ordenada por votos
      highestVoted: highestVoted,      // Música líder atual
      totalSongs: songs.length,        // Total de músicas no sistema
      currentPlaying: playerState,     // Estado do player de música
      uiState: uiState,                // Estado da interface
      success: true                    // Flag de sucesso
    });
    
    console.log(`✅ Enviadas ${sortedSongs.length} músicas. Líder: "${highestVoted?.title || 'Nenhuma'}" com ${highestVoted?.votes || 0} votos`);
  } catch (error) {
    console.error('❌ Erro ao buscar músicas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar músicas', 
      success: false 
    });
  }
});

// Rota para registrar um voto simples em uma música
// Esta rota utiliza o padrão Observer para notificar automaticamente
// todos os componentes interessados sobre o novo voto
// Fix #12: Rate limit de votos por IP (1 voto por música a cada 5 segundos)
const voteRateLimit = new Map(); // key: `${ip}:${songId}` -> timestamp

app.post('/api/vote', (req, res) => {
  try {
    const { songId, votes } = req.body;
    
    if (!songId) {
      return res.status(400).json({ 
        error: 'ID da música é obrigatório para votação', 
        success: false 
      });
    }
    
    // Fix #12: Verifica rate limit por IP
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const rateLimitKey = `${clientIp}:${songId}`;
    const lastVoteTime = voteRateLimit.get(rateLimitKey) || 0;
    const now = Date.now();
    
    if (now - lastVoteTime < 5000) {
      return res.status(429).json({
        error: 'Aguarde antes de votar novamente nesta música',
        success: false
      });
    }
    voteRateLimit.set(rateLimitKey, now);
    
    // Limpa entradas antigas do rate limit a cada 1000 votos
    if (voteRateLimit.size > 1000) {
      const cutoff = now - 10000;
      for (const [key, time] of voteRateLimit) {
        if (time < cutoff) voteRateLimit.delete(key);
      }
    }
    
    const song = songs.find(s => s.id === songId);
    if (!song) {
      return res.status(404).json({ 
        error: 'Música não encontrada no sistema', 
        success: false 
      });
    }
    
    const newVoteCount = (song.votes || 0) + 1;
    console.log(`🗳️ Processando voto para "${song.title}" - novo total: ${newVoteCount}`);
    voteManager.processVote(songId, newVoteCount);
    
    // Fix #11: Persiste votos no banco de dados em background
    if (pool) {
      pool.query(
        'UPDATE songs SET votes = $1 WHERE id = $2 OR spotify_id = $2',
        [song.votes, songId]
      ).catch(err => console.warn('⚠️ Falha ao persistir voto no DB:', err.message));
    }
    
    const highestVoted = voteManager.getHighestVotedSong();
    const playerState = musicPlayer.getCurrentPlaying();
    
    res.json({ 
      song: song,
      highestVoted: highestVoted,
      currentPlaying: playerState,
      message: `Voto registrado para "${song.title}"! Total: ${song.votes} votos`,
      success: true 
    });
    
    console.log(`✅ Voto registrado para "${song.title}" (IP: ${clientIp.substring(0, 10)}...)`);
  } catch (error) {
    console.error('❌ Erro ao registrar voto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao processar voto', 
      success: false 
    });
  }
});

// Rota para super voto - adiciona votos suficientes para assumir a liderança
// O super voto é uma funcionalidade especial que garante que a música escolhida
// ficará em primeiro lugar, adicionando votos suficientes para superar a líder atual
app.post('/api/super-vote', (req, res) => {
  try {
    const { songId, totalVotes, votesAdded } = req.body;
    
    // Validação de entrada
    if (!songId) {
      console.log('❌ Tentativa de super voto sem songId');
      return res.status(400).json({ 
        error: 'ID da música é obrigatório para super voto', 
        success: false 
      });
    }
    
    // Verifico se a música existe
    const song = songs.find(s => s.id === songId);
    if (!song) {
      console.log(`❌ Tentativa de super voto em música inexistente: ${songId}`);
      return res.status(404).json({ 
        error: 'Música não encontrada no sistema', 
        success: false 
      });
    }
    
    console.log(`⚡ Super voto recebido para "${song.title}" - adicionando ${votesAdded} votos (total: ${totalVotes})`);
    
    // Uso o VoteManager para processar o super voto
    // O padrão Observer garantirá que todos os componentes sejam notificados
    voteManager.processVote(songId, totalVotes);
    
    // Obtenho estados atualizados
    const highestVoted = voteManager.getHighestVotedSong();
    const playerState = musicPlayer.getCurrentPlaying();
    
    // Resposta detalhada sobre o super voto
    res.json({ 
      song: song,
      highestVoted: highestVoted,
      currentPlaying: playerState,
      votesAdded: votesAdded,
      message: `⚡ Super Voto executado! "${song.title}" agora tem ${song.votes} votos e está em 1º lugar!`,
      success: true 
    });
    
    console.log(`✅ Super voto processado com sucesso! "${song.title}" agora lidera com ${song.votes} votos`);
  } catch (error) {
    console.error('❌ Erro ao registrar super voto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao processar super voto', 
      success: false 
    });
  }
});

// Rota para corrigir URL de áudio incorreta
app.post('/api/fix-audio-url', (req, res) => {
  try {
    const { songId, audioUrl } = req.body;
    const song = songs.find(s => s.id === songId);
    if (song) {
      song.audioUrl = audioUrl || '';
      console.log(`🔧 URL de áudio corrigida para: "${song.title}"`);
      res.json({ success: true, song });
    } else {
      res.status(404).json({ error: 'Música não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para adicionar nova música ao sistema
// Esta rota permite que usuários adicionem músicas através da API
// Inclui validações e integração com APIs externas para obter metadados
app.post('/api/songs', async (req, res) => {
  try {
    const { title, artist, audioUrl, albumCover, album, year, spotifyUrl, duration_ms } = req.body;
    
    // Validações obrigatórias
    if (!title || !artist) {
      console.log('❌ Tentativa de adicionar música sem dados obrigatórios');
      return res.status(400).json({ 
        error: 'Título e artista são obrigatórios', 
        success: false 
      });
    }
    
    // Verifico se a música já existe para evitar duplicatas
    const existingSong = songs.find(s => 
      s.title.toLowerCase() === title.toLowerCase() && 
      s.artist.toLowerCase() === artist.toLowerCase()
    );
    
    if (existingSong) {
      console.log(`❌ Música já existe: "${title}" por ${artist}`);
      return res.status(409).json({ 
        error: `"${title}" por ${artist} já está na lista de votação`, 
        success: false 
      });
    }
    
    // REMOVIDO: Limite de músicas
    // if (songs.length >= MAX_SONGS) { ... }
    
    console.log(`🎵 Adicionando nova música: "${title}" por ${artist}`);
    
    // Busco capa do álbum se não foi fornecida
    let finalAlbumCover = albumCover;
    if (!finalAlbumCover) {
      console.log(`🎨 Buscando capa do álbum para: ${artist} - ${title}`);
      finalAlbumCover = await searchAlbumCover(artist, album, title);
      
      // Se não encontrar, uso placeholder
      if (!finalAlbumCover) {
        finalAlbumCover = generatePlaceholderCover(artist, title);
        console.log(`🎨 Usando capa placeholder para "${title}"`);
      }
    }
    
    // Tenta identificar usuário pelo token (opcional)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const user = await db.getUserBySpotifyId(token); // Assume que token é spotify_id ou access_token
      // O requireAuth usa getUserBySpotifyId(token) onde token é passado no header
      // No frontend, precisamos enviar o token correto
      if (user) userId = user.id;
    }

    // Crio nova música com dados completos
    const newSong = {
      id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único
      title: title.trim(),
      artist: artist.trim(),
      album: album || 'Álbum Desconhecido',
      audioUrl: audioUrl || '',  // Deixa vazio se não tiver (Spotify SDK vai tocar)
      albumCover: finalAlbumCover,
      spotifyUrl: spotifyUrl || '', // URL do Spotify para reprodução via SDK
      duration_ms: duration_ms || 0,
      year: year || new Date().getFullYear(),
      votes: 0,                                    // Começa com zero votos
      addedAt: new Date().toISOString(),          // Timestamp de adição
      addedBy: userId ? 'User' : 'API',           // Fonte da adição
      added_by_user_id: userId
    };
    
    // Uso o VoteManager para adicionar (padrão Observer)
    voteManager.addSong(newSong);
    
    // Persiste no banco de dados
    try {
      await db.upsertSong({
        spotify_id: newSong.id,
        title: newSong.title,
        artist: newSong.artist,
        album: newSong.album,
        album_cover: newSong.albumCover,
        audio_url: newSong.audioUrl,
        preview_url: null,
        spotify_url: newSong.spotifyUrl,
        duration_ms: duration_ms || 0,
        release_date: `${newSong.year}-01-01`,
        popularity: 0,
        added_by_user_id: userId
      });
      console.log('💾 Música persistida no banco de dados');
    } catch (dbError) {
      console.error('❌ Erro ao persistir no banco:', dbError);
      // Não falha a requisição, pois a música está em memória
    }
    
    // Mantenho o limite de músicas
    // maintainSongsLimit(); // REMOVIDO
    
    console.log(`✅ Música adicionada com sucesso: "${newSong.title}" (ID: ${newSong.id})`);
    
    res.status(201).json({ 
      song: newSong,
      message: `"${newSong.title}" por ${newSong.artist} foi adicionada com sucesso!`,
      totalSongs: songs.length,
      success: true 
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar música:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao adicionar música', 
      success: false 
    });
  }
});

// Rota para health check - verifica se o servidor está funcionando
// Útil para monitoring e debugging da aplicação
app.get('/api/health', (req, res) => {
  console.log('🔍 Health check requisitado');
  
  // Informações detalhadas sobre o estado do sistema
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalSongs: songs.length,
    maxSongs: 'unlimited',
    observersRegistered: voteManager.observers.length,
    highestVoted: voteManager.getHighestVotedSong(),
    playerStatus: musicPlayer.getCurrentPlaying(),
    uiState: uiObserver.getUIState(),
    memoryUsage: process.memoryUsage(),
    version: '3.1.0'
  };
  
  res.json(healthInfo);
  console.log('✅ Health check respondido - Sistema funcionando normalmente');
});

// ============= Fix #7: PROXY SPOTIFY CLIENT CREDENTIALS =============
// Endpoint backend para obter token Spotify sem expor secrets no frontend
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '1fd9e79e2e074a33b258c30747f74e6b';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '3bc40e26370c43818ec3612d25fcbf96';
let cachedClientToken = null;
let cachedClientTokenExpiry = 0;

app.get('/api/spotify/client-token', async (req, res) => {
  try {
    // Retorna token em cache se ainda válido
    if (cachedClientToken && cachedClientTokenExpiry > Date.now()) {
      return res.json({ access_token: cachedClientToken, expires_in: Math.floor((cachedClientTokenExpiry - Date.now()) / 1000) });
    }
    
    const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.status}`);
    }
    
    const data = await response.json();
    cachedClientToken = data.access_token;
    cachedClientTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
    
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    console.error('❌ Erro no proxy Spotify client token:', error.message);
    res.status(500).json({ error: 'Falha ao obter token Spotify' });
  }
});

// ============= Fix #7: PROXY SPOTIFY SEARCH =============
// Busca no Spotify sem expor client secret no frontend
app.get('/api/spotify/search', async (req, res) => {
  try {
    // Garante token válido
    if (!cachedClientToken || cachedClientTokenExpiry <= Date.now()) {
      const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        cachedClientToken = tokenData.access_token;
        cachedClientTokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000;
      }
    }
    
    const { q, type, limit, market } = req.query;
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type || 'track'}&limit=${limit || 3}&market=${market || 'BR'}`;
    
    const response = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${cachedClientToken}` }
    });
    
    if (!response.ok) throw new Error(`Spotify search failed: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ Erro no proxy Spotify search:', error.message);
    res.status(500).json({ error: 'Falha na busca Spotify' });
  }
});

// ============= Fix #16: PROXY CORS PARA IMAGENS =============
// Substitui dependência do allorigins.win por proxy próprio
app.get('/api/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).json({ error: 'URL obrigatória' });
    
    // Valida que é uma URL de imagem conhecida (Spotify, Last.fm, etc.)
    const allowedDomains = ['i.scdn.co', 'mosaic.scdn.co', 'lastfm.freetls.fastly.net', 'coverartarchive.org', 'is1-ssl.mzstatic.com'];
    const url = new URL(imageUrl);
    if (!allowedDomains.some(d => url.hostname.includes(d))) {
      return res.status(403).json({ error: 'Domínio não permitido' });
    }
    
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('❌ Erro no proxy de imagem:', error.message);
    res.status(500).json({ error: 'Falha ao buscar imagem' });
  }
});

// ============= ROTA DE TESTE TEMPORÁRIA =============
// Fix #17: Protegida com verificação de autenticação admin
app.get('/api/admin/create-test-friend', async (req, res) => {
  // Fix #17: Requer header de admin ou query param secret
  const adminSecret = process.env.ADMIN_SECRET || 'playoff-admin-2024';
  if (req.query.secret !== adminSecret && req.headers['x-admin-secret'] !== adminSecret) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }
  
  const targetUsername = req.query.target || 'Jotaa';
  
  console.log(`🧪 Criando usuário de teste para enviar amizade para: ${targetUsername}`);
  
  if (!pool) {
    return res.status(500).json({ error: 'Banco de dados não conectado' });
  }
  
  try {
    // 1. Cria usuário de teste
    const testUser = {
      spotify_id: 'test_user_' + Date.now(),
      email: 'testuser@playoff.test',
      display_name: 'Amigo Teste 🧪',
      profile_image: 'https://i.pravatar.cc/150?u=testuser',
      country: 'BR'
    };
    
    const createResult = await pool.query(`
      INSERT INTO users (spotify_id, email, display_name, profile_image, country)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(spotify_id) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING *
    `, [testUser.spotify_id, testUser.email, testUser.display_name, testUser.profile_image, testUser.country]);
    
    const newTestUser = createResult.rows[0];
    console.log(`✅ Usuário de teste criado: ${newTestUser.display_name} (ID: ${newTestUser.id})`);
    
    // 2. Busca o usuário alvo pelo display_name
    const targetResult = await pool.query(`
      SELECT id, display_name, spotify_id FROM users 
      WHERE LOWER(display_name) LIKE LOWER($1)
      LIMIT 1
    `, [`%${targetUsername}%`]);
    
    if (targetResult.rowCount === 0) {
      return res.status(404).json({ 
        error: `Usuário "${targetUsername}" não encontrado`,
        testUserCreated: testUser.display_name
      });
    }
    
    const targetUser = targetResult.rows[0];
    console.log(`👤 Usuário alvo encontrado: ${targetUser.display_name} (ID: ${targetUser.id})`);
    
    // 3. Envia pedido de amizade
    await pool.query(`
      INSERT INTO friendships (user_id, friend_id, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP
    `, [newTestUser.id, targetUser.id]);
    
    console.log(`📨 Pedido de amizade enviado de "${newTestUser.display_name}" para "${targetUser.display_name}"`);
    
    res.json({
      success: true,
      message: `Pedido de amizade enviado!`,
      testUser: {
        id: newTestUser.id,
        display_name: newTestUser.display_name,
        profile_image: newTestUser.profile_image
      },
      targetUser: {
        id: targetUser.id,
        display_name: targetUser.display_name
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota catch-all para servir o frontend (SPA)
// Qualquer rota não definida anteriormente será redirecionada para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Inicialização do servidor e configuração final
// Esta seção é responsável por inicializar todo o sistema e configurar
// o estado inicial da aplicação. É aqui que toda a arquitetura se junta
const startServer = async () => {
  // Inicializa o banco de dados PostgreSQL com retries
  let dbReady = false;
  const maxRetries = 5;
  
  console.log('🔄 Iniciando tentativas de conexão com o banco...');
  
  for (let i = 1; i <= maxRetries; i++) {
    dbReady = await checkConnection();
    if (dbReady) break;
    
    if (i < maxRetries) {
      console.log(`⏳ Tentativa ${i}/${maxRetries} falhou. Aguardando 5s para tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (!dbReady) {
    console.warn('⚠️ AVISO: Não foi possível conectar ao banco de dados após múltiplas tentativas.');
    console.warn('⚠️ O sistema iniciará usando apenas memória RAM (dados serão perdidos ao reiniciar).');
  }
  
  // Sincroniza músicas do banco
  if (dbReady) {
    await bootstrapSongsFromDatabase();
    
    // Persiste músicas iniciais no banco de dados
    console.log('📥 Sincronizando banco de dados com lista de músicas...');
    for (const song of songs) {
      try {
        await db.upsertSong({
          spotify_id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          album_cover: song.albumCover,
          audio_url: song.audioUrl,
          preview_url: null,
          spotify_url: song.spotifyUrl || null,
          duration_ms: song.duration_ms || 0,
          release_date: `${song.year}-01-01`,
          popularity: 50,
          added_by_user_id: null
        });
      } catch (err) {
        console.error(`❌ Erro ao persistir música inicial ${song.title}:`, err);
      }
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`📀 Carregadas ${songs.length} músicas com URLs do Cloudinary`);
    console.log(`🎵 PlayOff Music Voting App - Sistema de Votação Musical`);
    console.log(`📱 Frontend: http://localhost:${PORT}/`);
    console.log(`🎧 Backend com Padrão Observer ativo!`);
    console.log(`👀 Observadores registrados: ${voteManager.observers.length}`);
    console.log(`   - ${musicPlayer.constructor.name}: Gerencia reprodução de música`);
    console.log(`   - ${uiObserver.constructor.name}: Gerencia atualizações de estado da UI`);
    console.log(`🗳️ Vote Manager: Pronto para receber votos`);
    console.log(`🎵 Music Player: Pronto para reproduzir músicas`);
    console.log(`💬 Sistema de Chat: Pronto para conversas`);
    
    const initialHighestVoted = voteManager.getHighestVotedSong();
    if (initialHighestVoted) {
      voteManager.currentHighestVoted = initialHighestVoted;
      console.log(`👑 Música inicial mais votada: "${initialHighestVoted.title}" por ${initialHighestVoted.artist} (${initialHighestVoted.votes} votos)`);
      musicPlayer.playTrack(initialHighestVoted);
    }
    
    console.log(`🚀 Sistema pronto para funcionar! Que comecem as votações!`);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Servidor sendo desligado graciosamente...');
    server.close(() => {
      console.log('✅ Servidor fechado com sucesso');
      console.log('👋 Até mais! Obrigado por usar o PlayOff!');
      if (pool) pool.end();
    });
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;