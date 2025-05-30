# 🎵 PlayOff - Music Voting App

Uma aplicação moderna de votação musical desenvolvida em **JavaScript vanilla** com animações 3D e interface responsiva. Funciona 100% no frontend, sem necessidade de backend!

## ✨ Funcionalidades

### 🎧 Interface Musical
- **Animações 3D do disco de vinil** - Efeitos visuais impressionantes durante as transições
- **Extração automática de cores** - Background adapta-se às cores da capa do álbum
- **Controles de reprodução** - Play, pause, avançar e voltar
- **Progressão de música** - Barra de progresso em tempo real

### 🗳️ Sistema de Votação
- **Busca de músicas** - Sistema de busca integrado com banco de dados local
- **Votação interativa** - Vote nas músicas e veja os resultados em tempo real
- **Playlist PlayOff** - Acesso direto à playlist oficial com rock/metal
- **Músicas Curtidas** - Simula reprodução de suas músicas favoritas

### 💬 Chat ao Vivo
- **Mensagens em tempo real** - Interaja com outros usuários simulados
- **Comandos especiais** - Digite "PlayOff" ou "curtidas" para tocar playlists
- **Interface moderna** - Design minimalista com efeitos glassmorphism

### 🎨 Design
- **Interface responsiva** - Funciona perfeitamente em desktop e mobile
- **Tema escuro moderno** - Visual elegante com gradientes e efeitos
- **Animações fluidas** - Transições suaves e feedback visual
- **Armazenamento local** - Dados salvos no localStorage do navegador

## 🚀 Instalação e Uso

### Pré-requisitos
- **Node.js** 14+ (apenas para servidor de desenvolvimento)
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/playoff-music-voting.git
cd playoff-music-voting
```

### 2. Inicie a aplicação
```bash
npm start
```

### 3. Acesse a aplicação
- **Frontend**: http://localhost:3000

### Alternativa: Abrir diretamente no navegador
Você também pode abrir o arquivo `index.html` diretamente no seu navegador, pois não há dependências de servidor!

## 🎮 Como Usar

### 1. Interface Principal
- A aplicação carrega automaticamente com a música "My Own Summer" do Deftones
- Use os controles de reprodução para play/pause/avançar/voltar
- A barra de progresso mostra o tempo da música

### 2. Sistema de Votação
- Clique nas músicas na seção de votação para votar
- Quando uma música atinge 15 votos, ela toca automaticamente
- Use a busca para encontrar e adicionar novas músicas

### 3. Chat Interativo
- Digite mensagens no chat para interagir
- Use comandos especiais:
  - Digite "PlayOff" para tocar a playlist oficial
  - Digite "curtidas" para tocar músicas curtidas
  - Digite "playlist" para outras opções

### 4. Conexão Spotify (Demo)
- Clique em "Conectar ao Seu Spotify" para simular autenticação
- Use o botão "Tocar PlayOff" para navegar pela playlist

## 📁 Estrutura do Projeto

```
playoff-music-voting/
├── index.html              # Página principal
├── style.css              # Estilos CSS
├── server.js              # Servidor Node.js (opcional)
├── package.json           # Configurações do projeto
├── js/                    # Scripts JavaScript
│   ├── app.js            # Aplicação principal
│   ├── spotify.js        # Helper do Spotify (demo)
│   └── colorThief.min.js # Extração de cores
└── README.md             # Este arquivo
```

## 🔧 Tecnologias Utilizadas

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Animações e Flexbox/Grid
- **JavaScript ES6+** - Lógica da aplicação (100% vanilla)
- **ColorThief** - Extração de cores
- **localStorage** - Persistência de dados local

### Servidor (Opcional)
- **Node.js** - Servidor de arquivos estáticos
- **HTTP nativo** - Sem dependências externas

## 🎵 Funcionalidades Implementadas

### ✅ Sistema Local
- [x] Reprodução de música simulada
- [x] Sistema de votação funcional
- [x] Chat com mensagens automáticas
- [x] Busca de músicas em banco local
- [x] Playlist PlayOff com 4 músicas
- [x] Animações 3D do disco de vinil
- [x] Extração de cores das capas
- [x] Armazenamento no localStorage
- [x] Interface responsiva completa

### 🔮 Futuras Melhorias (Opcional)
- [ ] Integração real com Spotify Web API
- [ ] Backend para sincronização multiplayer
- [ ] Sistema de usuários
- [ ] Playlists personalizadas
- [ ] Histórico de reprodução

## 🚀 Deploy

### GitHub Pages
1. Faça push do código para GitHub
2. Ative GitHub Pages nas configurações do repositório
3. Configure para usar a branch main
4. Acesse via `https://seu-usuario.github.io/playoff-music-voting`

### Netlify
1. Conecte seu repositório no Netlify
2. Configure build command: `echo "Static site"`
3. Publish directory: `./`
4. Deploy automático!

### Vercel
```bash
npm install -g vercel
vercel
```

### Servidor Local
O projeto funciona perfeitamente abrindo `index.html` diretamente no navegador!

## 🎯 Banco de Dados Local

A aplicação inclui um banco de dados simulado com:
- **10 músicas famosas** para busca
- **4 músicas na playlist PlayOff**
- **Chat com mensagens automáticas**
- **Persistência via localStorage**

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🎵 Créditos

- **Spotify** - Inspiração para a interface
- **ColorThief** - Extração de cores de imagens
- **Design** - Inspirado em players de música modernos
- **Músicas Demo** - Queen, Led Zeppelin, Eagles, Nirvana, Deftones, Audioslave, QOTSA, Soundgarden

---

**Desenvolvido com ❤️ pela equipe PlayOff**

*Agora 100% JavaScript - Sem backend necessário!* 🎸 