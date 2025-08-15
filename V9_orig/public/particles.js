// Particle system for enhanced visual effects
class ParticleSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    this.createCanvas();
    this.setupEventListeners();
    this.generateParticles();
    this.animate();
    this.isInitialized = true;
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -3;
      opacity: 0.6;
    `;
    
    this.ctx = this.canvas.getContext('2d');
    
    // Insert canvas into particles container
    const container = document.getElementById('particles-container');
    if (container) {
      container.appendChild(this.canvas);
    } else {
      document.body.appendChild(this.canvas);
    }

    this.resize();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());
    
    // Mouse interaction
    let mouse = { x: null, y: null, radius: 150 };
    
    document.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
      this.updateMouseInteraction(mouse);
    });

    document.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  generateParticles() {
    this.particles = [];
    const numberOfParticles = Math.floor((this.canvas.width * this.canvas.height) / 15000);
    
    for (let i = 0; i < numberOfParticles; i++) {
      this.particles.push(new Particle(this.canvas.width, this.canvas.height));
    }
  }

  updateMouseInteraction(mouse) {
    this.particles.forEach(particle => {
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          particle.vx += (dx / distance) * force * 0.5;
          particle.vy += (dy / distance) * force * 0.5;
        }
      }
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update and draw particles
    this.particles.forEach(particle => {
      particle.update(this.canvas.width, this.canvas.height);
      particle.draw(this.ctx);
    });

    // Draw connections
    this.drawConnections();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  pause() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    if (!this.animationId) {
      this.animate();
    }
  }

  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const particle1 = this.particles[i];
        const particle2 = this.particles[j];
        
        const dx = particle1.x - particle2.x;
        const dy = particle1.y - particle2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const opacity = (100 - distance) / 100 * 0.3;
          this.ctx.strokeStyle = `rgba(102, 126, 234, ${opacity})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(particle1.x, particle1.y);
          this.ctx.lineTo(particle2.x, particle2.y);
          this.ctx.stroke();
        }
      }
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.isInitialized = false;
  }
}

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.radius = Math.random() * 2 + 1;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.hue = Math.random() * 60 + 200; // Blue-purple range
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(canvasWidth, canvasHeight) {
    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Boundary collision
    if (this.x < 0 || this.x > canvasWidth) {
      this.vx *= -0.8;
      this.x = Math.max(0, Math.min(canvasWidth, this.x));
    }
    if (this.y < 0 || this.y > canvasHeight) {
      this.vy *= -0.8;
      this.y = Math.max(0, Math.min(canvasHeight, this.y));
    }

    // Apply friction
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Update pulse for glow effect
    this.pulse += 0.02;
  }

  draw(ctx) {
    const glowIntensity = Math.sin(this.pulse) * 0.3 + 0.7;
    
    ctx.save();
    ctx.globalAlpha = this.opacity * glowIntensity;
    
    // Create gradient for glow effect
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 3
    );
    gradient.addColorStop(0, `hsla(${this.hue}, 70%, 60%, 0.8)`);
    gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 50%, 0.4)`);
    gradient.addColorStop(1, `hsla(${this.hue}, 70%, 40%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Core particle
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = `hsl(${this.hue}, 70%, 70%)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// Floating animation particles for specific elements
class FloatingParticles {
  constructor(element) {
    this.element = element;
    this.particles = [];
    this.isActive = false;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.createParticles();
    this.animate();
  }

  stop() {
    this.isActive = false;
    this.particles = [];
  }

  createParticles() {
    const rect = this.element.getBoundingClientRect();
    const particleCount = 6;
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: rect.left + Math.random() * rect.width,
        y: rect.top + Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        decay: Math.random() * 0.02 + 0.01,
        size: Math.random() * 4 + 2,
        hue: Math.random() * 60 + 200
      });
    }
  }

  animate() {
    if (!this.isActive) return;

    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.decay;
      particle.vy -= 0.05; // Gravity effect
      
      return particle.life > 0;
    });

    // Create new particles
    if (Math.random() < 0.1) {
      this.createParticles();
    }

    requestAnimationFrame(() => this.animate());
  }
}

// Initialize particle system
function initializeParticles() {
  const prefersReducedMotion = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const saveData = (typeof navigator !== 'undefined' && navigator.connection && typeof navigator.connection.saveData !== 'undefined') ? navigator.connection.saveData : false;
  if (prefersReducedMotion || saveData) {
    return null;
  }

  const particleSystem = new ParticleSystem();
  particleSystem.init();

  // Add hover effects to interactive elements
  document.querySelectorAll('.submit-btn, .youtube-btn, .btn').forEach(element => {
    const floatingParticles = new FloatingParticles(element);
    
    element.addEventListener('mouseenter', () => {
      floatingParticles.start();
    });
    
    element.addEventListener('mouseleave', () => {
      floatingParticles.stop();
    });
  });

  // Performance optimization: pause particles when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      particleSystem.pause();
    } else {
      setTimeout(() => {
        particleSystem.resume();
      }, 100);
    }
  });

  return particleSystem;
}

// Enhanced loading particles
class LoadingParticles {
  constructor(element) {
    this.element = element;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;
    
    this.ctx = this.canvas.getContext('2d');
    this.element.style.position = 'relative';
    this.element.appendChild(this.canvas);
    
    this.resize();
    this.generateParticles();
    this.animate();
  }

  resize() {
    const rect = this.element.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  generateParticles() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      this.particles.push({
        angle: angle,
        radius: 20,
        x: centerX + Math.cos(angle) * 20,
        y: centerY + Math.sin(angle) * 20,
        size: 3,
        opacity: 1 - (i / particleCount) * 0.8
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.particles.forEach((particle, index) => {
      particle.angle += 0.1;
      particle.x = centerX + Math.cos(particle.angle) * particle.radius;
      particle.y = centerY + Math.sin(particle.angle) * particle.radius;
      
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fillStyle = '#667eea';
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ParticleSystem, FloatingParticles, LoadingParticles };
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  window.particleSystem = null;
  window.initializeParticles = initializeParticles;
}
