# 🎵 PlayOff - Sistema de Votação Musical

![PlayOff Logo](https://via.placeholder.com/600x200/0f0f23/ffffff?text=🎵+PlayOff+Music+Voting)

## 🌟 Visão Geral

**PlayOff** é uma aplicação web interativa de votação musical que combina áudio de alta qualidade, detecção dinâmica de cores e uma interface moderna com efeitos de vidro fosco. Os usuários podem votar em suas músicas favoritas através de cards visuais intuitivos, com o revolucionário **Super Voto** que reproduz a música imediatamente.

## ✨ Funcionalidades Principais

### 🎨 Design e Interface
- **Título "PlayOff"** em fonte Pattaya com gradiente animado
- **Vinil gigante** posicionado no canto da tela com rotação suave
- **Efeito granulado** de vidro embaçado em todo o fundo
- **Cores dinâmicas** que mudam baseadas na capa do álbum
- **Interface glassmorphism** com blur e transparências
- **Fontes modernas** (Inter para texto, Pattaya para título)
- **Cards de música** com design elegante e responsivo

### 🎵 Reprodução de Áudio
- **Player de áudio integrado** com controles completos
- **Aumento gradual de volume** (fade-in de 2 segundos)
- **Visualização em tempo real** do progresso da música
- **Detecção automática** de capa de álbum via múltiplas APIs
- **Integração Cloudinary** para streaming de áudio

### 🎨 Detecção de Cores
- **ColorThief.js** para extração precisa de cores dominantes
- **Temas dinâmicos** baseados na paleta do álbum (warm, cool, vibrant, neutral)
- **Fundo dinâmico** que muda com a música atual
- **Sincronização visual** entre capa do álbum e interface

### 🗳️ Sistema de Votação Simplificado
- **⚡ Super Voto**: Vota E reproduz a música imediatamente
- **Votação por cards**: Interface visual intuitiva
- **Ranking dinâmico** das músicas mais votadas
- **Feedback visual instantâneo** com animações
- **Persistência no backend** com API RESTful

### 🎯 Funcionalidades da Versão 3.1.0
- **Interface simplificada** focada na experiência musical
- **Super Voto com reprodução imediata** - sem espera!
- **Cards visuais** para votação intuitiva
- **Performance otimizada** sem sobrecarga de chat
- **Design mais limpo** e responsivo

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Vue.js 3** - Framework reativo
- **Vite** - Build tool moderno
- **JavaScript ES6+** - Lógica da aplicação
- **CSS3** - Estilização avançada com glassmorphism
- **ColorThief.js** - Detecção de cores de imagem
- **Font Awesome** - Ícones
- **Google Fonts** - Tipografia (Inter, Pattaya)

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **CORS** - Política de origem cruzada
- **RESTful API** - Arquitetura de API

### APIs Externas
- **Last.fm API** - Metadados musicais e capas de álbum
- **MusicBrainz + Cover Art Archive** - Dados musicais alternativos
- **Cloudinary** - Streaming e armazenamento de áudio

## 🚀 Como Executar

### Método Rápido (Recomendado)
```bash
# Clone o repositório
git clone <repository-url>
cd playoff-1

# Execute o script de inicialização
./start-playoff.sh
```

### Método Manual
```bash
# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm start
```

### Acesso
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

## ⚡ Como Usar o Super Voto

1. **Navegue pelos cards** de música na interface
2. **Clique no botão "⚡ Super Voto"** na música desejada
3. **A música será votada E começará a tocar imediatamente!**
4. **Aproveite** sua música favorita sem espera

## 📡 Endpoints da API

### Músicas
- `GET /api/songs` - Lista todas as músicas
- `POST /api/songs` - Adiciona nova música
- `POST /api/vote` - Registra voto para uma música

### Sistema
- `GET /api/health` - Status do servidor

## 🎯 Funcionalidades Detalhadas

### Sistema de Áudio
- **Fade-in automático**: Volume aumenta gradualmente de 0% a 70% em 2 segundos
- **Controles completos**: Play/pause, anterior, próximo
- **Barra de progresso**: Visualização em tempo real com animações
- **Cross-origin support**: Reprodução de áudios externos

### Detecção de Cores
```javascript
// Exemplo de detecção automática
const colorInfo = await extractDominantColor(albumCoverUrl);
// Retorna: { dominant: [r,g,b], palette: [[r,g,b]...], theme: 'warm' }
```

### Temas Dinâmicos
- **Warm**: Tons alaranjados e vermelhos
- **Cool**: Tons azuis e frios
- **Vibrant**: Cores saturadas e vibrantes
- **Neutral**: Tons neutros e escuros

### Efeitos Visuais
- **Granulado de vidro**: Textura sutil em múltiplas camadas
- **Blur dinâmico**: backdrop-filter com diferentes intensidades
- **Animações suaves**: Transições de 2-3 segundos
- **Hover effects**: Feedbacks visuais em todos os elementos interativos

## 📱 Responsividade

### Breakpoints
- **Desktop**: > 1200px - Layout completo com vinil no canto
- **Tablet**: 768px - 1200px - Layout adaptado em coluna
- **Mobile**: < 768px - Interface compacta e otimizada

### Adaptações Mobile
- Vinil redimensionado automaticamente
- Controles de áudio simplificados
- Layout em coluna única
- Tipografia ajustada
- Cards otimizados para toque

## 🎨 Customização de Temas

### CSS Custom Properties
```css
:root {
  --primary-color: #ff6b6b;
  --secondary-color: #feca57;
  --accent-color: #48dbfb;
  --background-blur: blur(40px);
  --glass-opacity: 0.08;
}
```

### Temas Dinâmicos
Os temas são aplicados automaticamente baseados na análise da capa do álbum:
- **body.theme-warm**: Tons quentes
- **body.theme-cool**: Tons frios
- **body.theme-vibrant**: Alta saturação
- **body.theme-neutral**: Baixa saturação

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```bash
PORT=3000                    # Porta do servidor backend
VITE_PORT=5173              # Porta do servidor de desenvolvimento
LASTFM_API_KEY=your_key     # Chave da API Last.fm
CLOUDINARY_NAME=your_name   # Nome do Cloudinary
```

### Configuração de Áudio
```javascript
// Configurações no useCloudinaryAudio.js
const audioConfig = {
  targetVolume: 0.7,        // Volume máximo (70%)
  fadeTime: 2000,           // Tempo de fade-in (2s)
  crossOrigin: 'anonymous'  // CORS para áudio
};
```

## 🎵 Adicionando Novas Músicas

### Via API
```javascript
POST /api/songs
{
  "title": "Nome da Música",
  "artist": "Nome do Artista",
  "audioUrl": "https://cloudinary.com/audio.mp3",
  "albumCover": "https://example.com/cover.jpg",
  "album": "Nome do Álbum"
}
```

### Busca Automática de Capas
O sistema tenta automaticamente encontrar capas de álbum usando múltiplas APIs.

## 🌟 Próximas Funcionalidades

- [ ] Integração completa com Spotify Web Playback SDK
- [ ] Sistema de playlist personalizada
- [ ] Modo DJ automático
- [ ] Integração com redes sociais
- [ ] Sistema de usuários e perfis
- [ ] Análise de sentimento no chat
- [ ] Recomendações musicais por IA
- [ ] PWA (Progressive Web App)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **Last.fm** - Pela API de metadados musicais
- **MusicBrainz** - Pelo banco de dados musical aberto
- **Cloudinary** - Pelo serviço de mídia na nuvem
- **ColorThief** - Pela biblioteca de extração de cores
- **Vue.js Team** - Pelo framework incrível

---

**Desenvolvido com ❤️ pela equipe PlayOff**

🎵 *"Onde a música encontra a democracia!"* 🎵 