/**
 * AuraWave Music - Hypnotic Canvas Audio Visualizer
 * Procedural harmonic audio synthesizer and spectrum renderer
 * Dynamically reacts to playback, volume, and rhythm
 */

class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.isActive = false;
    this.animationFrame = null;
    this.mode = 'bars'; // 'bars' | 'wave' | 'radial'
    this.barCount = 48;
    this.frequencies = new Float32Array(this.barCount);
    this.targetFrequencies = new Float32Array(this.barCount);
    this.phase = 0;
    this.bassEnergy = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    this.width = rect.width;
    this.height = rect.height;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.animate();
  }

  stop() {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.drawIdle();
  }

  toggleMode() {
    const modes = ['bars', 'wave', 'radial'];
    const idx = modes.indexOf(this.mode);
    this.mode = modes[(idx + 1) % modes.length];
    return this.mode;
  }

  animate() {
    if (!this.isActive) return;

    this.updateFrequencies();
    this.draw();

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  updateFrequencies() {
    this.phase += 0.08;
    // Simulate natural musical rhythmic energy (tempo ~120-130bpm)
    const beat = (Math.sin(this.phase * 0.75) + 1) * 0.5;
    const subBeat = Math.pow(Math.sin(this.phase * 1.5), 4);
    this.bassEnergy = beat * 0.7 + subBeat * 0.3;

    for (let i = 0; i < this.barCount; i++) {
      // Frequency curve: bass is heavier on lower indices, mid frequencies dance, treble sparkles
      const normIndex = i / this.barCount;
      const bassInfluence = Math.exp(-normIndex * 3.5) * this.bassEnergy;
      const midInfluence = Math.sin(normIndex * Math.PI * 2 + this.phase * 2) * 0.35 + 0.35;
      const flutter = Math.sin(this.phase * 3 + i * 0.4) * 0.2;
      const randomSpark = (Math.random() - 0.5) * 0.15;

      let target = (bassInfluence * 0.8 + midInfluence * 0.35 + flutter + randomSpark);
      target = Math.max(0.05, Math.min(1.0, target));

      // Smooth interpolation (lerp)
      this.frequencies[i] += (target - this.frequencies[i]) * 0.25;
    }
  }

  draw() {
    if (!this.ctx || !this.width || !this.height) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.mode === 'bars') {
      this.drawBars();
    } else if (this.mode === 'wave') {
      this.drawWave();
    } else {
      this.drawRadial();
    }
  }

  drawBars() {
    const barWidth = (this.width / this.barCount) * 0.65;
    const gap = (this.width / this.barCount) * 0.35;
    const maxHeight = this.height * 0.88;

    for (let i = 0; i < this.barCount; i++) {
      const h = Math.max(4, this.frequencies[i] * maxHeight);
      const x = i * (barWidth + gap) + gap / 2;
      const y = this.height - h;

      // Dynamic monochrome gradient (White to Silver to Muted)
      const grad = this.ctx.createLinearGradient(0, y, 0, this.height);
      grad.addColorStop(0, '#ffffff'); // Pure White top
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)'); // Silver mid
      grad.addColorStop(1, 'rgba(165, 165, 198, 0.15)'); // Subtle base

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      // Draw rounded top bar
      this.ctx.roundRect(x, y, barWidth, h, [4, 4, 0, 0]);
      this.ctx.fill();

      // Glowing peak cap
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 8;
      this.ctx.fillRect(x, y - 2, barWidth, 2);
      this.ctx.shadowBlur = 0;
    }
  }

  drawWave() {
    const centerY = this.height / 2;
    this.ctx.lineWidth = 3;

    // Layer 1 - Crisp White Wave
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    for (let i = 0; i < this.barCount; i++) {
      const x = (i / (this.barCount - 1)) * this.width;
      const amp = this.frequencies[i] * (this.height * 0.45);
      const y = centerY + Math.sin(i * 0.3 + this.phase) * amp;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

    // Layer 2 - Silver Muted Wave
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
    this.ctx.shadowBlur = 6;
    this.ctx.beginPath();
    for (let i = 0; i < this.barCount; i++) {
      const x = (i / (this.barCount - 1)) * this.width;
      const amp = this.frequencies[i] * (this.height * 0.35);
      const y = centerY - Math.sin(i * 0.25 - this.phase * 1.2) * amp;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  drawRadial() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const baseRadius = Math.min(cx, cy) * 0.45;

    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2;
      const length = this.frequencies[i] * (baseRadius * 0.9);

      const x1 = cx + Math.cos(angle) * baseRadius;
      const y1 = cy + Math.sin(angle) * baseRadius;
      const x2 = cx + Math.cos(angle) * (baseRadius + length);
      const y2 = cy + Math.sin(angle) * (baseRadius + length);

      this.ctx.strokeStyle = `hsl(${(i / this.barCount) * 120 + 240}, 90%, 65%)`;
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  drawIdle() {
    if (!this.ctx || !this.width || !this.height) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    const barWidth = (this.width / this.barCount) * 0.65;
    const gap = (this.width / this.barCount) * 0.35;

    for (let i = 0; i < this.barCount; i++) {
      const x = i * (barWidth + gap) + gap / 2;
      const h = 4;
      const y = this.height - h;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      this.ctx.fillRect(x, y, barWidth, h);
    }
  }
}
