<template>
  <footer class="punk-footer">
    <!-- Faixa decorativa superior -->
    <div class="footer-tape">
      <div class="tape-content">
        <span>PLAY LOUD</span>
        <span>•</span>
        <span>VOTE HARD</span>
        <span>•</span>
        <span>NO MAINSTREAM</span>
        <span>•</span>
        <span>PLAY LOUD</span>
        <span>•</span>
        <span>VOTE HARD</span>
        <span>•</span>
        <span>NO MAINSTREAM</span>
      </div>
    </div>

    <div class="footer-content">
      <!-- Lado Esquerdo: Imagem e Identidade -->
      <div class="footer-brand">
        <div class="image-container">
          <img 
            src="https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764105698/Atelieur_Fashion_Designer_-_Redo-removebg-preview_dlmjut.png" 
            alt="PlayOff Mascote" 
            class="footer-mascot"
          />
          <div class="glitch-effect"></div>
        </div>
        <img 
          src="https://res.cloudinary.com/dzwfuzxxw/image/upload/v1764087001/playoff_2_yvagtx.png" 
          alt="PlayOff Logo" 
          class="footer-logo"
        />
        <p class="footer-slogan">DEMOCRACIA SONORA RADICAL</p>
      </div>

      <!-- Centro: Links Rápidos -->
      <div class="footer-links">
        <h3 class="links-title">NAVEGAÇÃO</h3>
        <ul class="punk-list">
          <li><a href="#" class="punk-link" @click.prevent>INÍCIO</a></li>
          <li><a href="#" class="punk-link" @click.prevent>VOTAÇÃO</a></li>
          <li><a href="#" class="punk-link" @click.prevent>RANKING</a></li>
          <li><a href="#" class="punk-link" @click.prevent>SOBRE</a></li>
        </ul>
      </div>

      <!-- Lado Direito: Social e Info -->
      <div class="footer-social">
        <h3 class="links-title">CONECTE-SE</h3>
        <div class="social-icons">
          <a href="#" class="social-btn"><i class="fab fa-spotify"></i></a>
          <a href="#" class="social-btn"><i class="fab fa-github"></i></a>
          <a href="#" class="social-btn"><i class="fab fa-instagram"></i></a>
        </div>
        <div class="footer-credit">
          <p>FEITO COM ⚡ E CÓDIGO</p>
          <p class="copy">© 2025 // SEM DIREITOS RESERVADOS</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.punk-footer {
  background-color: #0a0a0a;
  color: #fff;
  position: relative;
  margin-top: 5rem;
  padding-bottom: 0.5rem;
  margin-bottom: 0;
  border-top: 5px solid #fff;
  overflow: hidden;
  width: 100%;
}

/* Faixa estilo "fita de isolamento" */
.footer-tape {
  background: #ff6b6b;
  color: #000;
  font-family: 'Impact', sans-serif;
  font-size: 1.2rem;
  padding: 0.5rem 0;
  transform: rotate(-1deg) scale(1.05);
  width: 110%;
  margin-left: -5%;
  margin-bottom: 3rem;
  border-top: 2px solid #fff;
  border-bottom: 2px solid #fff;
  box-shadow: 0 5px 15px rgba(0,0,0,0.5);
  white-space: nowrap;
  overflow: hidden;
}

.tape-content {
  animation: tapeScroll 20s linear infinite;
  display: inline-block;
  padding-left: 100%;
}

@keyframes tapeScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 4rem;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
}

/* Brand Section */
.footer-brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.image-container {
  position: relative;
  margin-bottom: 1rem;
  transition: transform 0.3s ease;
}

.footer-mascot {
  height: 180px;
  width: auto;
  filter: drop-shadow(5px 5px 0 rgba(255, 107, 107, 0.5));
  transition: all 0.3s ease;
  transform: rotate(-5deg);
}

.image-container:hover .footer-mascot {
  transform: rotate(0deg) scale(1.1);
  filter: drop-shadow(8px 8px 0 #ff6b6b) brightness(1.2);
}

.footer-logo {
  max-width: 200px;
  height: auto;
  filter: drop-shadow(3px 3px 0 #ff6b6b);
  transform: skewX(-5deg);
  margin: 0.5rem 0;
}

.footer-slogan {
  font-family: 'Cingire', sans-serif;
  color: #888;
  font-size: 0.9rem;
  letter-spacing: 0.2em;
  margin-top: 0.5rem;
  margin-left: 0.5rem;
}

/* Links Section */
.links-title {
  font-family: 'Cingire', sans-serif;
  color: #ff6b6b;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #333;
  padding-bottom: 0.5rem;
  display: inline-block;
  transform: skewX(-5deg);
}

.punk-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.punk-link {
  display: block;
  color: #fff;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  padding: 0.5rem 0;
  transition: all 0.2s;
  position: relative;
}

.punk-link:hover {
  color: #ff6b6b;
  padding-left: 1rem;
  text-shadow: 2px 2px 0 rgba(255,255,255,0.2);
}

.punk-link::before {
  content: '>';
  position: absolute;
  left: 0;
  opacity: 0;
  transition: all 0.2s;
  color: #ff6b6b;
}

.punk-link:hover::before {
  opacity: 1;
  left: -10px;
}

/* Social Section */
.social-icons {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.social-btn {
  width: 50px;
  height: 50px;
  background: #222;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 2px solid #fff;
  transition: all 0.2s;
  transform: skewX(-5deg);
}

.social-btn:hover {
  background: #fff;
  color: #000;
  transform: skewX(-5deg) translate(-3px, -3px);
  box-shadow: 3px 3px 0 #ff6b6b;
}

.footer-credit {
  font-family: 'Cingire', sans-serif;
  font-size: 0.8rem;
  color: #666;
  line-height: 1.5;
}

.copy {
  color: #444;
  margin-top: 0.5rem;
}

/* Responsividade */
@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }

  .footer-brand {
    align-items: center;
  }

  .links-title {
    margin: 0 auto 1.5rem;
  }

  .punk-link:hover {
    padding-left: 0;
  }

  .punk-link:hover::before {
    display: none;
  }

  .social-icons {
    justify-content: center;
  }
}
</style>
