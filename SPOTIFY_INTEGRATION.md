# 🎵 Integração Spotify API - PlayOff

## Visão Geral

O PlayOff agora utiliza a **Spotify Web API** como fonte primária para busca de capas de álbuns, proporcionando:

- ✅ **Qualidade superior** de imagens (640x640px ou superior)
- ✅ **Metadados enriquecidos** (popularidade, data de lançamento, etc.)
- ✅ **Sistema de fallback** robusto para outras APIs
- ✅ **Links diretos** para o Spotify

## Configuração

### Credenciais Configuradas

```javascript
Client ID: 1fd9e79e2e074a33b258c30747f74e6b
Client Secret: 3bc40e26370c43818ec3612d25fcbf96
```

### Fluxo de Autenticação

O sistema utiliza o **Client Credentials Grant** do Spotify:

1. **Autenticação automática** na inicialização
2. **Cache de token** com renovação automática
3. **Gestão de expiração** (buffer de 1 minuto)

## Funcionalidades

### 🔍 Busca Inteligente

```javascript
// Processo de busca hierárquico:
1. Spotify API (fonte primária)
2. Last.fm track info (fallback)
3. Last.fm artist albums (fallback)
4. MusicBrainz + Cover Art Archive (último recurso)
```

### 📊 Dados Enriquecidos

Quando uma música é encontrada no Spotify, o sistema adiciona:

- **Capa do álbum** (alta qualidade)
- **Nome oficial do álbum**
- **Popularidade** (0-100)
- **Data de lançamento**
- **Link do Spotify**
- **Tipo de álbum** (album, single, compilation)
- **Número total de faixas**

### 🎨 Detecção de Cores

Sistema aprimorado de extração de cores:

- **ColorThief.js** para análise precisa
- **Temas dinâmicos** baseados nas cores dominantes
- **Background responsivo** que muda com a música

## Estrutura do Código

### Autenticação

```javascript
const authenticateSpotify = async () => {
  // Verifica token existente
  // Faz nova requisição se necessário
  // Retorna token válido ou null
}
```

### Busca de Tracks

```javascript
const searchSpotifyTrack = async (artist, track) => {
  // Limpa e codifica a query
  // Busca múltiplos resultados
  // Encontra o melhor match
  // Retorna dados enriquecidos
}
```

### Fallback Inteligente

```javascript
const searchAlbumCover = async (artist, track) => {
  // 1. Tenta Spotify
  // 2. Fallback Last.fm
  // 3. Fallback MusicBrainz
  // 4. Retorna null se nada encontrado
}
```

## Logs e Debug

### Console Logs Implementados

```
🎵 Autenticando com Spotify...
✅ Spotify autenticado com sucesso!
⏰ Token expira em: [timestamp]
🔍 Buscando no Spotify: [artist] - [track]
✅ Capa encontrada via Spotify: [url]
🎯 Match encontrado: "[track]" por [artist]
📅 Data de lançamento: [date]
📊 Popularidade Spotify: [percentage]%
🎵 Link Spotify: [url]
```

### Tratamento de Erros

```
❌ Erro na autenticação Spotify: [error]
⚠️ Continuando com APIs de fallback
⚠️ Token Spotify não disponível, usando fallback
❌ Nenhuma capa encontrada no Spotify para esta busca
```

## Performance

### Otimizações Implementadas

- **Cache de token** evita re-autenticações desnecessárias
- **Busca por 3 resultados** para melhor matching
- **Limpeza de queries** remove caracteres especiais
- **Timeout automático** para requests lentos

### Métricas Esperadas

- **Spotify Success Rate**: ~85-90%
- **Tempo médio de resposta**: 200-500ms
- **Qualidade de imagem**: 640x640px padrão
- **Fallback coverage**: ~95% total

## Como Testar

1. **Abra**: http://localhost:5173
2. **Clique** em qualquer música
3. **Abra o DevTools** (F12)
4. **Monitore** os logs no console
5. **Verifique** se a capa aparece no disco

### Exemplo de Busca Bem-Sucedida

```
🎵 playSong chamado para: Blinding Lights - The Weeknd
🔍 Buscando capa do álbum via APIs (Spotify prioritário)...
🎵 Autenticando com Spotify...
✅ Spotify autenticado com sucesso!
🔍 Buscando no Spotify: The Weeknd - Blinding Lights
✅ Capa encontrada via Spotify: https://i.scdn.co/image/...
🎯 Match encontrado: "Blinding Lights" por The Weeknd
📅 Data de lançamento: 2019-11-29
📊 Popularidade Spotify: 89%
🎵 Link Spotify: https://open.spotify.com/track/...
✅ Capa atualizada: https://i.scdn.co/image/...
📀 Álbum: After Hours
```

## Troubleshooting

### Problemas Comuns

1. **CORS Issues**: O Spotify API permite requests diretos do browser
2. **Rate Limiting**: Implementado retry automático
3. **Token Expiry**: Renovação automática implementada
4. **No Match Found**: System automaticamente usa fallback APIs

### Debug Steps

1. Verificar logs no console
2. Testar connection: `curl -s http://localhost:3000/api/health`
3. Verificar se token está sendo gerado
4. Testar com música popular primeiro

## Próximos Passos

- [ ] Cache local de capas já encontradas
- [ ] Suporte a playlists do Spotify
- [ ] Integração com usuário logado
- [ ] Metrics dashboard para success rates
- [ ] Preview de 30 segundos via Spotify

---

**Status**: ✅ **Implementado e Funcionando**  
**Última atualização**: 02/06/2025  
**Versão da API**: Spotify Web API v1 