<template>
  <div class="about-page">
    <!-- Botão Fechar (Canto Superior Esquerdo) -->
    <button class="close-about" @click="$emit('close')" title="Fechar">
      <span class="x-stroke"></span>
      <span class="x-stroke"></span>
    </button>

    <!-- Background Noise & Effects -->
    <div class="noise-bg"></div>
    <div class="gradient-orb"></div>

    <div class="content-container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="logo-wrapper">
          <img 
            src="https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764087001/playoff_2_yvagtx.png" 
            alt="PlayOff Logo" 
            class="giant-logo"
          />
          <div class="logo-glitch"></div>
        </div>
        
        <h1 class="main-title">
          DESENVOLVIDO EM <span class="highlight">JPA</span> <br>
          COM PURO <span class="highlight red">ÓDIO & CÓDIGO</span>
        </h1>
      </section>

      <!-- Texto Hardcore JPA -->
      <section class="text-section">
        <div class="card-glass">
          <p class="intro-text">
            Opa, mermão! Chega mais. 🤙
          </p>
          
          <p class="body-text">
            Tu tá ligado que aqui o sistema é bruto, né? O <strong>PlayOff</strong> não é só um playerzinho de música qualquer não, boy. É código sangrando na tela, é <span class="tech-term">Vue.js</span> torando no talo e design que bate na cara.
          </p>

          <p class="body-text">
            Feito por um dev de <strong>João Pessoa</strong> que não aguenta mais app lento e sem alma. Aqui a gente codap ouvindo <span class="band-name">Deftones</span> no talo e tomando aquele café que acorda até defunto. A missão é simples: fazer tu <strong>SENTIR</strong> a música, tá ligado? Não é só ouvir, é ver a letra pular na tua frente, é o grave tremer o CSS.
          </p>

          <p class="body-text highlight-box">
            Se tu curte som pesado, interface que não pede licença e performance de verdade, tu tá em casa. Se não curte... oxente, vai ouvir rádio AM! 🔥
          </p>
        </div>
      </section>

      <!-- Tech Stack (Visual) -->
      <section class="tech-stack">
        <h2>ARSENAL</h2>
        <div class="icons-grid">
          <div class="tech-item"><i class="fab fa-vuejs"></i> <span>VUE 3</span></div>
          <div class="tech-item"><i class="fab fa-js"></i> <span>JS PURO</span></div>
          <div class="tech-item"><i class="fas fa-fire"></i> <span>FIREBASE</span></div>
          <div class="tech-item"><i class="fas fa-wind"></i> <span>TAILWIND</span></div>
        </div>
      </section>

      <!-- Footer / Assinatura -->
      <footer class="about-footer">
        <p>CODADO COM RAIVA E AMOR POR <strong class="my-name">JOÃO VITOR</strong></p>
        <div class="social-links">
          <a href="#" class="social-btn"><i class="fab fa-github"></i></a>
          <a href="#" class="social-btn"><i class="fab fa-linkedin"></i></a>
          <a href="#" class="social-btn"><i class="fab fa-instagram"></i></a>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background-color: #050505;
  color: #fff;
  position: relative;
  overflow-x: hidden;
  font-family: 'Space Grotesk', sans-serif;
  padding-bottom: 100px; /* Espaço para o player */
}

/* Background Effects */
.noise-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
}

.gradient-orb {
  position: fixed;
  top: -20%;
  left: -10%;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(255, 107, 107, 0.15), transparent 70%);
  z-index: 0;
  animation: pulse-orb 10s infinite alternate;
}

@keyframes pulse-orb {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.2); opacity: 0.8; }
}

.content-container {
  position: relative;
  z-index: 1;
  max-width: 1000px;
  margin: 0 auto;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 6rem;
}

/* Hero Section */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 4rem;
}

.logo-wrapper {
  position: relative;
  margin-bottom: 3rem;
}

.giant-logo {
  width: 300px;
  height: auto;
  filter: drop-shadow(0 0 30px rgba(255, 107, 107, 0.3));
  animation: float-logo 6s ease-in-out infinite;
}

@keyframes float-logo {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(2deg); }
}

.main-title {
  font-family: 'Cingire', sans-serif;
  font-size: 4rem;
  line-height: 0.9;
  text-transform: uppercase;
  margin: 0;
  transform: skewX(-5deg);
}

.highlight {
  color: #fff;
  text-shadow: 0 0 20px rgba(255,255,255,0.5);
}

.highlight.red {
  color: #ff6b6b;
  text-shadow: 4px 4px 0px #fff;
}

/* Text Section */
.text-section {
  display: flex;
  justify-content: center;
}

.card-glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.1);
  padding: 3rem;
  border-radius: 0;
  max-width: 800px;
  box-shadow: 6px 6px 0 var(--accent-rgb, #ff6b6b);
  transform: rotate(-1deg);
  transition: all 0.15s ease;
}

.card-glass:hover {
  transform: rotate(0deg) scale(1.02);
  border-color: var(--accent-rgb, #ff6b6b);
}

.intro-text {
  font-family: 'Cingire', sans-serif;
  font-size: 3rem;
  color: #ff6b6b;
  margin-bottom: 1.5rem;
  line-height: 1;
}

.body-text {
  font-size: 1.2rem;
  line-height: 1.6;
  color: #ccc;
  margin-bottom: 1.5rem;
}

.body-text strong {
  color: #fff;
  font-weight: 700;
}

.tech-term {
  font-family: 'Space Grotesk', 'Space Mono', monospace;
  color: #42b883;
  background: rgba(66, 184, 131, 0.1);
  padding: 2px 6px;
  border-radius: 0;
}

.band-name {
  font-family: 'Impact', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 2px solid #ff6b6b;
}

.highlight-box {
  border-left: 4px solid #ff6b6b;
  padding-left: 1.5rem;
  font-style: italic;
  color: #fff;
  margin-top: 2rem;
}

/* Tech Stack */
.tech-stack {
  text-align: center;
}

.tech-stack h2 {
  font-family: 'Cingire', sans-serif;
  font-size: 3rem;
  margin-bottom: 2rem;
  color: #fff;
  text-shadow: 2px 2px 0 #333;
}

.icons-grid {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.tech-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  font-family: 'Space Grotesk', 'Space Mono', monospace;
  font-weight: bold;
  color: #666;
  transition: all 0.3s;
}

.tech-item i {
  font-size: 3rem;
  color: #fff;
}

.tech-item:hover {
  color: #ff6b6b;
  transform: translateY(-10px);
}

.tech-item:hover i {
  color: #ff6b6b;
  filter: drop-shadow(0 0 15px #ff6b6b);
}

/* Footer */
.about-footer {
  text-align: center;
  margin-top: 4rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 3rem;
}

.my-name {
  color: #ff6b6b;
  font-family: 'Cingire', sans-serif;
  font-size: 1.5rem;
  margin-left: 5px;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.social-btn {
  width: 50px;
  height: 50px;
  border-radius: 0;
  border: 2px solid var(--p5-white, #fff);
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--p5-white, #fff);
  font-size: 1.5rem;
  transition: all 0.15s ease;
  transform: skewX(-5deg);
}

.social-btn:hover {
  background: var(--p5-white, #fff);
  color: var(--p5-black, #000);
  transform: skewX(-5deg) translate(-2px, -2px);
  box-shadow: 3px 3px 0 var(--accent-rgb, #ff6b6b);
}

/* Botão Fechar */
.close-about {
  position: fixed;
  top: 2rem;
  left: 2rem;
  width: 60px;
  height: 60px;
  background: rgba(0,0,0,0.5);
  border: 2px solid var(--accent-rgb, #ff6b6b);
  border-radius: 0;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  backdrop-filter: blur(5px);
  transform: skewX(-5deg);
}

.close-about .x-stroke {
  position: absolute;
  width: 30px;
  height: 3px;
  background-color: #fff;
  transition: all 0.3s ease;
}

.close-about .x-stroke:first-child {
  transform: rotate(45deg);
}

.close-about .x-stroke:last-child {
  transform: rotate(-45deg);
}

.close-about:hover {
  background: var(--accent-rgb, #ff6b6b);
  transform: skewX(-5deg) rotate(90deg) scale(1.1);
  box-shadow: 3px 3px 0 var(--p5-white, #fff);
}

.close-about:hover .x-stroke {
  background-color: #000;
}

/* Mobile */
@media (max-width: 768px) {
  .close-about {
    top: 1.5rem;
    left: 1.5rem;
    width: 50px;
    height: 50px;
  }
  
  .giant-logo { width: 200px; }
  .main-title { font-size: 2.5rem; }
  .card-glass { padding: 1.5rem; }
  .intro-text { font-size: 2rem; }
  .icons-grid { gap: 1.5rem; }
}
</style>
