import { useEffect, useRef, useState, useCallback } from 'react';
import { Player } from '@realview/core';

interface PlayerStats {
  fps: number;
  latency: number;
  bytesReceived: number;
  frameCount: number;
}

interface PlayerStatus {
  text: string;
  connected: boolean;
}

export function usePlayer(canvas: HTMLCanvasElement | null) {
  const playerRef = useRef<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    fps: 0,
    latency: 0,
    bytesReceived: 0,
    frameCount: 0
  });
  const [status, setStatus] = useState<PlayerStatus>({
    text: 'Disconnected',
    connected: false
  });

  // Initialize player
  useEffect(() => {
    if (!canvas) return;

    let playerLater = setTimeout(() => {
      playerRef.current = new Player('ws://localhost:8080', canvas, {
        enableWebGL: true
      });

      // Add event listeners
      playerRef.current.addEventListener('onPlaying', () => {
        setStatus({ text: 'Connected', connected: true });
      });

      playerRef.current.addEventListener('onError', () => {
        setStatus({ text: 'Error', connected: false });
      });
      
    }, 0);

    // Start stats update
    const statsInterval = setInterval(() => {
      if (playerRef.current) {
        const playerStats = playerRef.current.getStats();
        setStats({
          fps: Math.round(playerStats.fps),
          latency: Math.round(playerStats.latency),
          bytesReceived: Math.round(playerStats.bytesReceived / 1024),
          frameCount: playerStats.frameCount
        });
      }
    }, 100);

    return () => {

      clearTimeout(playerLater);

      clearInterval(statsInterval);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [canvas]);

  // Player controls
  const play = useCallback(() => {
    playerRef.current?.play();
    setStatus({ text: 'Connecting...', connected: false });
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setStatus({ text: 'Paused', connected: false });
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    setStatus({ text: 'Disconnected', connected: false });
  }, []);

  const toggleFullscreen = () => {
    if(playerRef.current) {
      playerRef.current.fullscreen();
    }
  }

  const resize = (width: number, height: number) => {
    if(playerRef.current) {
      playerRef.current.resize(width, height);
    }
  }

  return {
    stats,
    status,
    play,
    pause,
    stop,
    toggleFullscreen,
    resize
  };
} 