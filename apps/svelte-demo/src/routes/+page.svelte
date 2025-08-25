<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Player } from 'realview.js';

  let player: Player | null = null;
  let canvas: HTMLCanvasElement;
  let statsInterval: number | null = null;
  
  // Stats
  let fps = 0;
  let latency = 0;
  let bytesReceived = 0;
  let frameCount = 0;
  let status = 'Disconnected';
  let isConnected = false;

  onMount(() => {
    initializePlayer();
    setupEventListeners();
    startStatsUpdate();
  });

  onDestroy(() => {
    cleanup();
  });

  function initializePlayer() {
    if (!canvas) return;

    // Initialize player with WebSocket URL
    player = new Player('ws://localhost:8080', canvas, {
      width: 736,
      height: 460
    });

    // Add event listeners
    player.addEventListener('onPlaying', () => {
      updateStatus('Connected', true);
    });

    player.addEventListener('onError', () => {
      updateStatus('Error', false);
    });
  }

  function setupEventListeners() {
    // Video overlay play button
    canvas?.addEventListener('click', () => {
      player?.play();
      updateStatus('Connecting...', false);
    });
  }

  function startStatsUpdate() {
    statsInterval = setInterval(() => {
      if (player) {
        fps = Math.round(player.smoothedFps || 0);
        latency = Math.round(player.latency || 0);
        bytesReceived = Math.round((player.bytesReceived || 0) / 1024);
        frameCount = player.frameCount || 0;
      }
    }, 100);
  }

  function cleanup() {
    if (statsInterval) {
      clearInterval(statsInterval);
    }
    player?.stop();
  }

  function updateStatus(newStatus: string, connected: boolean) {
    status = newStatus;
    isConnected = connected;
  }

  function play() {
    player?.play();
    updateStatus('Connecting...', false);
  }

  function pause() {
    player?.pause();
    updateStatus('Paused', false);
  }

  function stop() {
    player?.stop();
    updateStatus('Disconnected', false);
  }

  function toggleFullscreen() {
    if (!canvas) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvas.requestFullscreen();
    }
  }
</script>

<svelte:head>
  <title>RealView.js Demo</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="container">
  <header class="header">
    <h1 class="title">
      <span class="logo">🎬</span>
      RealView.js
    </h1>
    <p class="subtitle">Real-time H.264 streaming with WebCodecs</p>
  </header>

  <main class="main-content">
    <div class="video-container">
      <canvas 
        bind:this={canvas}
        width="1280" 
        height="720" 
        class="video-canvas"
      >
        <p class="fallback-text">Your browser doesn't support canvas video playback.</p>
      </canvas>
      
      <div class="video-overlay">
        <div class="play-button" on:click={play}>
          <span class="play-icon">▶</span>
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="control-group">
        <button class="btn btn-primary" on:click={play}>
          <span class="btn-icon">▶</span>
          Play
        </button>
        <button class="btn btn-secondary" on:click={pause}>
          <span class="btn-icon">⏸</span>
          Pause
        </button>
        <button class="btn btn-danger" on:click={stop}>
          <span class="btn-icon">⏹</span>
          Stop
        </button>

        <button class="btn btn-primary" on:click={toggleFullscreen}>
          <span class="btn-icon">🔍</span>
          Fullscreen
        </button>
      </div>
    </div>

    <div class="stats-container">
      <h3 class="stats-title">Stream Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-label">FPS</div>
            <div class="stat-value">{fps}</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <div class="stat-label">Latency</div>
            <div class="stat-value">{latency}ms</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-label">Data Received</div>
            <div class="stat-value">{bytesReceived} KB</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-label">Frames</div>
            <div class="stat-value">{frameCount}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="connection-status">
      <div class="status-indicator">
        <span class="status-dot" class:connected={isConnected}></span>
        <span class="status-text">{status}</span>
      </div>
    </div>
  </main>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Inter', sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
  }

  .title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
  }

  .logo {
    font-size: 2.8rem;
    margin-right: 10px;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #666;
    margin: 10px 0 0 0;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .video-container {
    position: relative;
    display: flex;
    justify-content: center;
    background: #000;
    border-radius: 12px;
    overflow: hidden;
  }

  .video-canvas {
    max-width: 100%;
    height: auto;
    display: block;
  }

  .fallback-text {
    color: white;
    text-align: center;
    padding: 20px;
  }

  .video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .video-container:hover .video-overlay {
    opacity: 1;
  }

  .play-button {
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .play-button:hover {
    transform: scale(1.1);
  }

  .play-icon {
    font-size: 2rem;
    color: #333;
    margin-left: 5px;
  }

  .controls {
    display: flex;
    justify-content: center;
    gap: 15px;
  }

  .control-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #545b62;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover {
    background: #c82333;
  }

  .btn-icon {
    font-size: 1.1rem;
  }

  .stats-container {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
  }

  .stats-title {
    margin: 0 0 20px 0;
    font-size: 1.3rem;
    color: #333;
    text-align: center;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }

  .stat-card {
    background: white;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    font-size: 1.5rem;
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
  }

  .connection-status {
    display: flex;
    justify-content: center;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #dc3545;
    transition: background 0.3s ease;
  }

  .status-dot.connected {
    background: #28a745;
  }

  .status-text {
    font-weight: 500;
    color: #333;
  }

  @media (max-width: 768px) {
    .container {
      padding: 10px;
    }

    .title {
      font-size: 2rem;
    }

    .controls {
      flex-direction: column;
      align-items: center;
    }

    .control-group {
      flex-direction: column;
      width: 100%;
      max-width: 300px;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
