import './app.element.css';
import { Player } from '@realview/core';

interface Video {
  id: string;
  title: string;
  description: string;
  sources: string[];
  subtitle: string;
  thumb: string;
}

interface VideoListResponse {
  type: 'videoList';
  videos: Video[];
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

interface VideoCell {
  id: string;
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  player: Player | null;
  video: Video;
  stats: {
    fps: number;
    latency: number;
    bytesReceived: number;
    frameCount: number;
  };
  connected: boolean;
}

export class AppElement extends HTMLElement {
  private videoCells: VideoCell[] = [];
  private availableVideos: Video[] = [];
  private streamCount: number = 4;
  private isPlaying: boolean = false;
  private statsInterval: number | null = null;
  private ws: WebSocket | null = null;
  private urlVideoId: string | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.initializeVideoWall();
    this.setupEventListeners();
    this.connectToServer();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  private initializeVideoWall() {
    this.createVideoCells();
    this.updateVideoWallLayout();
  }

  private createVideoCells() {
    const container = document.getElementById('videoWallContainer');
    if (!container) return;

    // Clear existing cells
    container.innerHTML = '';
    this.videoCells = [];

    // Create video cells
    for (let i = 0; i < this.streamCount; i++) {
      const cell = this.createVideoCell(i);
      this.videoCells.push(cell);
      container.appendChild(cell.element);
    }
  }

  private createVideoCell(index: number): VideoCell {
    const cellElement = document.createElement('div');
    cellElement.className = 'video-cell';
    cellElement.id = `video-cell-${index}`;

    const canvas = document.createElement('canvas');
    canvas.className = 'video-canvas';
    canvas.width = 640;
    canvas.height = 360;

    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';

    const info = document.createElement('div');
    info.className = 'video-info';
    info.textContent = `Stream ${index + 1}`;

    const status = document.createElement('div');
    status.className = 'video-status';

    cellElement.appendChild(canvas);
    cellElement.appendChild(overlay);
    cellElement.appendChild(info);
    cellElement.appendChild(status);

    return {
      id: `cell-${index}`,
      element: cellElement,
      canvas: canvas,
      player: null,
      video: {} as Video,
      stats: {
        fps: 0,
        latency: 0,
        bytesReceived: 0,
        frameCount: 0
      },
      connected: false
    };
  }

  private updateVideoWallLayout() {
    const container = document.getElementById('videoWallContainer');
    if (!container) return;

    // Calculate optimal grid layout
    const cols = Math.ceil(Math.sqrt(this.streamCount));
    const rows = Math.ceil(this.streamCount / cols);

    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  }

  private setupEventListeners() {
    // Stream count slider
    const slider = document.getElementById('streamCountSlider') as HTMLInputElement;
    if (slider) {
      slider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        this.updateStreamCount(value);
      });
    }

    // Playback controls
    const playAllBtn = document.getElementById('playAllBtn');
    const pauseAllBtn = document.getElementById('pauseAllBtn');
    const stopAllBtn = document.getElementById('stopAllBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const resetLayoutBtn = document.getElementById('resetLayoutBtn');

    playAllBtn?.addEventListener('click', () => this.playAll());
    pauseAllBtn?.addEventListener('click', () => this.pauseAll());
    stopAllBtn?.addEventListener('click', () => this.stopAll());
    fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
    resetLayoutBtn?.addEventListener('click', () => this.resetLayout());
  }

  private connectToServer() {
    // Get videoId from URL path
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const urlVideoId = pathSegments[0]; // First path segment as videoId
    
    if (urlVideoId) {
      console.log(`Video ID from path: ${urlVideoId}`);
    } else {
      console.log('No specific video ID in path, will use multiple videos');
    }
    
    // Store the videoId for later use
    this.urlVideoId = urlVideoId;
    
    // Always create WebSocket connection to get video list
    this.ws = new WebSocket('ws://localhost:8081');

    this.ws.onopen = () => {
      console.log('Connected to multi-ws-streamer server');
      this.updateStatus('Connected', true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'videoList') {
          this.availableVideos = data.videos;
          console.log('Received video list:', this.availableVideos.length, 'videos');
          this.assignVideosToCells();
        } else if (data.type === 'error') {
          console.error('Server error:', data.message);
          this.updateStatus('Error: ' + data.message, false);
        }
      } catch (error) {
        // Binary data (video stream) - handled by individual players
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateStatus('Connection Error', false);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.updateStatus('Disconnected', false);
    };
  }

  private assignVideosToCells() {
    if (this.urlVideoId) {
      // Path-based mode: assign the same video to all cells
      this.assignSpecificVideoToCells(this.urlVideoId);
    } else {
      // Traditional mode: assign different videos to cells
      this.videoCells.forEach((cell, index) => {
        const videoIndex = index % this.availableVideos.length;
        cell.video = this.availableVideos[videoIndex];
        
        const infoElement = cell.element.querySelector('.video-info');
        if (infoElement) {
          infoElement.textContent = cell.video.title;
        }
      });
    }
  }

  private assignSpecificVideoToCells(videoId: string) {
    const video = this.availableVideos.find(v => v.id === videoId);
    if (!video) {
      console.error(`Video with ID ${videoId} not found in available videos`);
      return;
    }
    
    this.videoCells.forEach((cell, index) => {
      cell.video = video;
      
      const infoElement = cell.element.querySelector('.video-info');
      if (infoElement) {
        infoElement.textContent = `${video.title} (Stream ${index + 1})`;
      }
    });
    
    console.log(`Assigned video ${video.title} to all cells`);
  }

  private updateStreamCount(count: number) {
    this.streamCount = count;
    
    // Update slider display
    const valueElement = document.getElementById('streamCountValue');
    if (valueElement) {
      valueElement.textContent = count.toString();
    }

    // Recreate video cells
    this.createVideoCells();
    this.updateVideoWallLayout();
    
    // Reassign videos if available
    if (this.availableVideos.length > 0) {
      this.assignVideosToCells();
    }

    // Restart playback if was playing
    if (this.isPlaying) {
      this.playAll();
    }
  }

  private playAll() {
    this.isPlaying = true;
    this.updateStatus('Playing', true);

    this.videoCells.forEach((cell, index) => {
      if (cell.video.id) {
        this.startStream(cell, index);
      }
    });

    this.startStatsUpdate();
  }

  private pauseAll() {
    this.isPlaying = false;
    this.updateStatus('Paused', false);

    this.videoCells.forEach(cell => {
      if (cell.player) {
        cell.player.pause();
      }
    });

    this.stopStatsUpdate();
  }

  private stopAll() {
    this.isPlaying = false;
    this.updateStatus('Stopped', false);

    this.videoCells.forEach(cell => {
      if (cell.player) {
        cell.player.destroy();
        cell.player = null;
      }
      cell.connected = false;
      this.updateCellStatus(cell, false);
    });

    this.stopStatsUpdate();
  }

  private startStream(cell: VideoCell, index: number) {
    if (!cell.video.id) {
      console.error('No video assigned to cell');
      return;
    }

    console.log(`Starting stream for cell ${index} with video: ${cell.video.title}`);

    // Construct WebSocket URL based on path or video ID
    let wsUrl: string;
    if (this.urlVideoId) {
      // Path-based mode: use the path from URL
      wsUrl = `ws://localhost:8081/${this.urlVideoId}`;
    } else {
      // Traditional mode: use the video ID from the cell
      wsUrl = `ws://localhost:8081/${cell.video.id}`;
    }

    // Create new player for this cell
    cell.player = new Player(wsUrl, cell.canvas, {
      enableWebGL: false
    });

    // Set up player event listeners
    cell.player.addEventListener('onPlaying', () => {
      cell.connected = true;
      this.updateCellStatus(cell, true);
    });

    cell.player.addEventListener('onError', () => {
      cell.connected = false;
      this.updateCellStatus(cell, false);
    });

    cell.player.play();
  }

  private updateCellStatus(cell: VideoCell, connected: boolean) {
    const statusElement = cell.element.querySelector('.video-status');
    if (statusElement) {
      statusElement.classList.toggle('connected', connected);
    }
  }

  private startStatsUpdate() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = window.setInterval(() => {
      this.updateStats();
    }, 100);
  }

  private stopStatsUpdate() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private updateStats() {
    let activeStreams = 0;
    let totalFps = 0;
    let totalData = 0;
    let totalFrames = 0;

    this.videoCells.forEach(cell => {
      if (cell.player && cell.connected) {
        activeStreams++;
        const stats = cell.player.getStats();
        cell.stats = stats;
        totalFps += stats.fps;
        totalData += stats.bytesReceived;
        totalFrames += stats.frameCount;
      }
    });

    // Update display
    const activeStreamsElement = document.getElementById('activeStreams');
    const avgFpsElement = document.getElementById('avgFps');
    const totalDataElement = document.getElementById('totalData');
    const totalFramesElement = document.getElementById('totalFrames');

    if (activeStreamsElement) {
      activeStreamsElement.textContent = activeStreams.toString();
    }
    if (avgFpsElement) {
      avgFpsElement.textContent = activeStreams > 0 ? Math.round(totalFps / activeStreams).toString() : '0';
    }
    if (totalDataElement) {
      totalDataElement.textContent = Math.round(totalData / (1024 * 1024)).toString() + ' MB';
    }
    if (totalFramesElement) {
      totalFramesElement.textContent = totalFrames.toString();
    }
  }

  private updateStatus(text: string, connected: boolean) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusIndicator')?.querySelector('.status-dot');

    if (statusText) {
      statusText.textContent = text;
    }
    if (statusDot) {
      statusDot.classList.toggle('connected', connected);
    }
  }

  private toggleFullscreen() {
    const container = document.getElementById('videoWallContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      container.classList.add('fullscreen');
    } else {
      document.exitFullscreen();
      container.classList.remove('fullscreen');
    }
  }

  private resetLayout() {
    this.updateStreamCount(4);
    this.stopAll();
    
    const slider = document.getElementById('streamCountSlider') as HTMLInputElement;
    if (slider) {
      slider.value = '4';
    }
  }

  private cleanup() {
    this.stopAll();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }
}

customElements.define('realview-video-wall', AppElement);
