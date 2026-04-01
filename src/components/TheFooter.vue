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
          <li><a href="#" class="punk-link" @click.prevent="$emit('open-about')">SOBRE</a></li>
        </ul>
      </div>

      <!-- Lado Direito: Social e Info -->
      <div class="footer-social">
        <h3 class="links-title">CONECTE-SE</h3>
        <div class="social-icons">
          <a href="https://open.spotify.com/playlist/42M6rb3j1xWn9IhfmM2MX6" target="_blank" rel="noopener noreferrer" class="social-btn spotify-btn" title="Playlist Oficial do PlayOff"><i class="fab fa-spotify"></i></a>
          <a href="https://github.com/jotavtech" target="_blank" rel="noopener noreferrer" class="social-btn" title="GitHub"><i class="fab fa-github"></i></a>
          <a href="https://instagram.com/jotavtech" target="_blank" rel="noopener noreferrer" class="social-btn" title="Instagram"><i class="fab fa-instagram"></i></a>
        </div>
        <div class="footer-credit">
          <p>FEITO COM ⚡ E CÓDIGO</p>
          <p class="copy">© 2025 // SEM DIREITOS RESERVADOS</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
defineEmits(['open-about'])
</script>

<style scoped>
/* ============= FOOTER - Persona 5 Angular ============= */
.punk-footer {
  background-color: var(--p5-black, #0a0a0a);
  color: var(--p5-white, #fff);
  position: relative;
  margin-top: auto;
  padding-bottom: 2rem;
  margin-bottom: 0;
  border-top: 4px solid var(--p5-white, #fff);
  overflow: visible;
  width: 100%;
  z-index: 10;
}

.punk-footer::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: var(--p5-black, #0a0a0a);
  transform: translateY(100%);
  z-index: -1;
  pointer-events: none;
}

/* Tape Banner - Persona 5 Dynamic */
.footer-tape {
  background: var(--accent-rgb, #ff6b6b);
  color: var(--p5-black, #0a0a0a);
  font-family: 'Cingire', 'Space Grotesk', sans-serif;
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: 3px;
  padding: 0.5rem 0;
  transform: rotate(-1deg) scale(1.05);
  width: 110%;
  margin-left: -5%;
  margin-bottom: 3rem;
  border-top: 3px solid var(--p5-white, #fff);
  border-bottom: 3px solid var(--p5-white, #fff);
  box-shadow: 0 5px 15px var(--shadow-color);
  white-space: nowrap;
  overflow: hidden;
  transition: background var(--color-transition), box-shadow var(--color-transition);
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

/* Brand Section - Persona 5 */
.footer-brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.image-container {
  position: relative;
  margin-bottom: 1rem;
  transition: transform 0.2s ease;
}

.footer-mascot {
  height: 180px;
  width: auto;
  filter: drop-shadow(5px 5px 0 rgba(var(--accent-color, 255, 107, 107), 0.5));
  transition: all 0.2s ease;
  transform: rotate(-5deg);
}

.image-container:hover .footer-mascot {
  transform: rotate(0deg) scale(1.1) skewX(-2deg);
  filter: drop-shadow(8px 8px 0 var(--accent-rgb, #ff6b6b)) brightness(1.2);
}

.footer-logo {
  max-width: 200px;
  height: auto;
  filter: drop-shadow(4px 4px 0 var(--accent-rgb, #ff6b6b));
  transform: skewX(-5deg);
  margin: 0.5rem 0;
}

.footer-slogan {
  font-family: 'Cingire', 'Space Grotesk', sans-serif;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 3px;
  margin-top: 0.5rem;
  margin-left: 0.5rem;
  text-transform: uppercase;
}

/* Links Section - Persona 5 */
.links-title {
  font-family: 'Cingire', 'Space Grotesk', sans-serif;
  color: var(--accent-rgb, #ff6b6b);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 3px solid rgba(255, 255, 255, 0.15);
  padding-bottom: 0.5rem;
  display: inline-block;
  transform: skewX(var(--p5-skew, -3deg));
  transition: color var(--color-transition);
  letter-spacing: 2px;
}

.punk-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.punk-link {
  display: block;
  color: var(--p5-white, #fff);
  text-decoration: none;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  padding: 0.5rem 0;
  transition: all 0.15s ease;
  position: relative;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.punk-link:hover {
  color: var(--accent-rgb, #ff6b6b);
  padding-left: 1rem;
  text-shadow: 2px 2px 0 rgba(var(--accent-color, 255, 107, 107), 0.2);
}

.punk-link::before {
  content: '\f714';
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
  position: absolute;
  left: 0;
  opacity: 0;
  transition: all 0.15s ease, color var(--color-transition);
  color: var(--accent-rgb, #ff6b6b);
  font-size: 0.9em;
}

.punk-link:hover::before {
  opacity: 1;
  left: -20px;
}

/* Social Section - Persona 5 */
.social-icons {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.social-btn {
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--p5-white, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 2px solid var(--p5-white, #fff);
  transition: all 0.15s ease;
  transform: skewX(-5deg);
}

.social-btn:hover {
  background: var(--p5-white, #fff);
  color: var(--p5-black, #0a0a0a);
  transform: skewX(-5deg) translate(-3px, -3px);
  box-shadow: 4px 4px 0 var(--accent-rgb, #ff6b6b);
}

.social-btn.spotify-btn:hover {
  background: #1DB954;
  color: var(--p5-white, #fff);
  border-color: #1DB954;
  box-shadow: 4px 4px 0 var(--p5-white, #fff);
}

.footer-credit {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1.5;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.copy {
  color: rgba(255, 255, 255, 0.2);
  margin-top: 0.5rem;
}

/* Responsive - Persona 5 */
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
    transform: none;
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

  .social-btn {
    transform: none;
  }

  .social-btn:hover {
    transform: translate(-2px, -2px);
  }
}
</style>
