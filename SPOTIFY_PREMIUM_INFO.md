# 🎵 Informações Importantes sobre Playback no PlayOff

## ⚠️ Música Completa Requer Spotify Premium

O **Spotify Web Playback SDK** (usado para tocar música completa) tem as seguintes limitações:

### ✅ Com Spotify Premium:
- ✅ Música completa (duração total)
- ✅ Controle total (play, pause, seek, volume)
- ✅ Disco girando e tempo da música na UI
- ✅ Qualidade de áudio alta

### ❌ Sem Spotify Premium (Conta Free):
- ❌ **Não pode usar Web Playback SDK**
- ❌ Erro 404 "Device not found"
- ❌ Música completa não disponível
- ✅ **Apenas Preview de 30s** (via botão 🎧)

## 🔧 Como Funciona no PlayOff

### Botões e Ações:

| Botão/Ação | Com Premium | Sem Premium |
|------------|-------------|-------------|
| ⚡ **Super Voto** | Música completa | ⏸️ Não toca (aviso) |
| 🎧 **Preview** | Preview 30s | Preview 30s |
| 🎵 **Adicionar música** | Música completa | Preview 30s |
| ⏭️ **Próxima/Anterior** | Música completa | Preview 30s |

### Status do Player:

Se você vê no console:
```
❌ Falha ao tocar no Spotify SDK
⚠️ Device not found
```

**Isso significa:**
1. Você não tem Spotify Premium, OU
2. O Web Playback SDK não conseguiu se conectar

## 💡 Soluções

### Para ter música completa:
1. **Assine Spotify Premium** (R$ 21,90/mês)
2. Faça login no app
3. O SDK se conectará automaticamente

### Sem Premium:
- Use o botão **🎧 Preview** para ouvir 30s
- Ou ouça no app do Spotify (fora do PlayOff)

## 📊 Verificando seu Status

No console do navegador (F12), você verá:

```
🔐 Estado Spotify:
   - isAuthenticated: true
   - spotifyPlayerReady: false ❌ (Sem Premium)
   - deviceId: (nenhum)
```

Se `spotifyPlayerReady: false` = **Sem Premium ou SDK não conectou**

## 🎯 Resumo

**O PlayOff não pode burlar as limitações do Spotify!**

- Música completa = Spotify Premium obrigatório
- Preview 30s = Sempre disponível (não requer Premium)

Esta é uma limitação da API do Spotify, não do PlayOff.
