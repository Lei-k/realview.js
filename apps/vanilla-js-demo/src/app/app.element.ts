import './app.element.css';
import { Player } from '@realview/core';

export class AppElement extends HTMLElement {
  private player: Player | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private statsInterval: number | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initializePlayer();
    this.setupEventListeners();
    this.startStatsUpdate();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  private render() {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
          }
        </style>
        <div>
          <!-- Content will be handled by the main HTML -->
        </div>
      `;
    }
  }

  private initializePlayer() {
    this.canvas = document.getElementById('video') as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Initialize player with WebSocket URL
    this.player = new Player('ws://localhost:8080', this.canvas, {
      width: 736,
      height: 460
    });

    // Add event listeners
    this.player.addEventListener('onPlaying', () => {
      this.updateStatus('Connected', true);
    });

    this.player.addEventListener('onError', () => {
      this.updateStatus('Error', false);
    });
  }

  private setupEventListeners() {
    // Play button
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.player?.play();

        this.updateStatus('Connecting...', false);
      });
    }

    // Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.player?.pause();
        this.updateStatus('Paused', false);
      });
    }

    // Stop button
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.player?.stop();
        this.updateStatus('Disconnected', false);
      });
    }

    // Video overlay play button
    const playButton = document.getElementById('playButton');
    if (playButton) {
      playButton.addEventListener('click', () => {
        this.player?.play();
        this.updateStatus('Connecting...', false);
      });
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.player?.fullscreen();
      });
    }

    // resize player when video-container is resized
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === videoContainer) {
            this.player?.resize(entry.contentRect.width, entry.contentRect.height);
          }
        }
      });
      observer.observe(videoContainer);
    }
  }

  private startStatsUpdate() {
    this.statsInterval = window.setInterval(() => {
      if (this.player) {
        const stats = this.player.getStats();
        this.updateStats(stats);
      }
    }, 100);
  }

  private updateStats(stats: any) {
    // Update FPS
    const fpsElement = document.getElementById('fps');
    if (fpsElement) {
      fpsElement.textContent = stats.fps.toFixed(2);
    }

    // Update latency
    const latencyElement = document.getElementById('latency');
    if (latencyElement) {
      latencyElement.textContent = `${Math.round(stats.latency)}ms`;
    }

    // Update bytes received
    const bytesElement = document.getElementById('bytesReceived');
    if (bytesElement) {
      const kb = Math.round(stats.bytesReceived / 1024);
      bytesElement.textContent = `${kb} KB`;
    }

    // Update frame count
    const frameElement = document.getElementById('frameCount');
    if (frameElement) {
      frameElement.textContent = stats.frameCount.toString();
    }
  }

  private updateStatus(text: string, connected: boolean) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusIndicator')?.querySelector('.status-dot');
    
    if (statusText) {
      statusText.textContent = text;
    }
    
    if (statusDot) {
      if (connected) {
        statusDot.classList.add('connected');
      } else {
        statusDot.classList.remove('connected');
      }
    }
  }

  private cleanup() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    if (this.player) {
      this.player.destroy();
    }
  }
}

customElements.define('realview-root', AppElement);
