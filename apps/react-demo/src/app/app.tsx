import { useEffect, useState } from 'react';
import { usePlayer } from './usePlayer';
import styles from './app.module.css';

export function App() {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [videoContainer, setVideoContainer] = useState<HTMLDivElement | null>(null);
  const { stats, status, play, pause, stop, toggleFullscreen, resize } = usePlayer(canvas);

  useEffect(() => {
    let observer: ResizeObserver | null = null;

    if(videoContainer) {
      observer = new ResizeObserver((entries) => {
        for(const entry of entries) {
          if(entry.target === videoContainer) {
            resize(entry.contentRect.width, entry.contentRect.height);
          }
        }
      });

      observer.observe(videoContainer);
    }

    return () => {
      if(observer) {
        observer.disconnect();
      }
    }
  }, [videoContainer]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.logo}>🎬</span>
          RealView.js
        </h1>
        <p className={styles.subtitle}>Real-time H.264 streaming with WebCodecs</p>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.videoContainer} ref={setVideoContainer}>
          <canvas 
            ref={setCanvas}
            className={styles.videoCanvas}
          >
            <p className={styles.fallbackText}>Your browser doesn't support canvas video playback.</p>
          </canvas>
          
          <div className={styles.videoOverlay}>
            <div className={styles.playButton} onClick={play}>
              <span className={styles.playIcon}>▶</span>
            </div>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={play}>
              <span className={styles.btnIcon}>▶</span>
              Play
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={pause}>
              <span className={styles.btnIcon}>⏸</span>
              Pause
            </button>
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={stop}>
              <span className={styles.btnIcon}>⏹</span>
              Stop
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={toggleFullscreen}>
              <span className={styles.btnIcon}>🔍</span>
              Fullscreen
            </button>
          </div>
        </div>

        <div className={styles.statsContainer}>
          <h3 className={styles.statsTitle}>Stream Statistics</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>FPS</div>
                <div className={styles.statValue}>{stats.fps}</div>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⚡</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Latency</div>
                <div className={styles.statValue}>{stats.latency}ms</div>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Data Received</div>
                <div className={styles.statValue}>{stats.bytesReceived} KB</div>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Frames</div>
                <div className={styles.statValue}>{stats.frameCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.connectionStatus}>
          <div className={styles.statusIndicator}>
            <span className={`${styles.statusDot} ${status.connected ? styles.connected : ''}`}></span>
            <span className={styles.statusText}>{status.text}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
