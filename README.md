# RealView.js

RealView.js is a high-performance, browser-native video decoder optimized for real-time streaming. Powered by the WebCodecs API and hardware acceleration, it delivers ultra-low latency and smooth playback—no plugins required.

## 🚀 Features

- **🎬 Real-time Video Decoding**: Hardware-accelerated decoding using WebCodecs API
- **⚡ MPEG-TS Demuxing**: Complete MPEG Transport Stream parsing and demuxing
- **🔄 Multi-stream Support**: Handle multiple video streams simultaneously
- **📱 Browser Native**: Pure JavaScript implementation, no additional plugins required
- **🎯 Canvas Rendering**: Direct canvas output with optional WebGL acceleration
- **📊 Real-time Statistics**: Provides FPS, latency, and frame count metrics

## 📦 Installation

### Install from npm
```bash
npm install realview.js
```

## 🎯 Quick Start

### Basic Video Decoding
```typescript
import { Player } from 'realview.js';

const canvas = document.getElementById('videoCanvas') as HTMLCanvasElement;
const player = new Player('ws://localhost:8081/stream', canvas, {
  width: 1280,
  height: 720
});

player.play();
```

## 🎮 Demo Applications

### 1. **vanilla-js-video-wall** - Multi-stream Video Wall
- Decode and display 1-64 video streams simultaneously
- Dynamic layout adjustment
- Real-time decoding statistics
- Fullscreen support

```bash
npx nx serve vanilla-js-video-wall
```

### 2. **multi-ws-streamer** - Multi-stream Server
- 13 sample video sources for testing
- WebSocket streaming with H.264 encoding
- Real-time video delivery

```bash
npx nx serve multi-ws-streamer
```

### 3. **react-demo** - React Integration
- React component wrapper for the video decoder
- State management integration
- Event handling examples

```bash
npx nx serve react-demo
```

### 4. **vanilla-js-demo** - Basic Decoder Demo
- Simple video decoding example
- Basic controls and statistics
- Performance monitoring

```bash
npx nx serve vanilla-js-demo
```

### 5. **ws-streamer** - Single Stream Server
- Basic WebSocket video streaming
- FFmpeg integration for H.264 encoding
- Low-latency configuration

```bash
npx nx serve ws-streamer
```

## 🔧 API Reference

### Player Class

#### Constructor
```typescript
new Player(url: string, canvas: HTMLCanvasElement, options?: PlayerOptions)
```

#### Options
```typescript
interface PlayerOptions {
  enableWebGL?: boolean;    // Enable WebGL rendering (default: false)
  width?: number;           // Canvas width (default: 1280)
  height?: number;          // Canvas height (default: 720)
}
```

#### Methods
- `play()`: Start video decoding and playback
- `pause()`: Pause decoding and rendering
- `stop()`: Stop decoding and cleanup
- `destroy()`: Destroy player instance
- `getStats()`: Get decoding statistics
- `resize(width, height)`: Resize canvas
- `fullscreen()`: Enter fullscreen mode
- `exitFullscreen()`: Exit fullscreen mode

#### Events
- `onPlaying`: Fired when decoding starts
- `onPaused`: Fired when paused
- `onError`: Fired when decoding error occurs
- `onStopped`: Fired when stopped

#### Statistics
```typescript
interface PlayerStats {
  fps: number;              // Current decoding frame rate
  latency: number;          // Decoding latency (ms)
  bytesReceived: number;    // Bytes received from stream
  frameCount: number;       // Total frames decoded
}
```

## 🌐 Browser Support

- **Chrome**: 94+ (Full VideoDecoder support)
- **Firefox**: 113+ (Full VideoDecoder support)
- **Safari**: 16.4+ (Full VideoDecoder support)
- **Edge**: 94+ (Full VideoDecoder support)

**Note**: VideoDecoder API is required for video decoding functionality. Older browsers will not work.

## ⚡ Performance Features

- **Decoding Latency**: < 10ms typical
- **Frame Rate**: Supports up to 60fps and beyond
- **CPU**: Hardware-accelerated decoding when available
- **Concurrency**: Multiple player instances supported

## 🛠️ Development

### Requirements
- Node.js 18+
- npm or yarn
- FFmpeg (for demo streaming servers)

### Development Commands
```bash
# Install dependencies
npm install

# Build core library
nx build core

# Run tests
nx test core

# Start demo servers
nx serve vanilla-js-video-wall
nx serve multi-ws-streamer
```

## 📚 Usage Examples

### Basic Video Decoding
```typescript
import { Player } from 'realview.js';

const canvas = document.getElementById('videoCanvas') as HTMLCanvasElement;
const player = new Player('ws://localhost:8081/video', canvas);

player.addEventListener('onPlaying', () => {
  console.log('Video decoding started');
});

player.addEventListener('onError', (error) => {
  console.error('Decoding error:', error);
});

player.play();
```

### Multi-stream Decoding
```typescript
import { Player } from 'realview.js';

class VideoWall {
  private players: Player[] = [];
  
  constructor(container: HTMLElement, streamCount: number) {
    for (let i = 0; i < streamCount; i++) {
      const canvas = document.createElement('canvas');
      const player = new Player(`ws://localhost:8081/stream-${i}`, canvas);
      this.players.push(player);
      container.appendChild(canvas);
    }
  }
  
  startAll() {
    this.players.forEach(player => player.play());
  }
  
  stopAll() {
    this.players.forEach(player => player.stop());
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. Follow existing code style
2. Add appropriate tests
3. Update relevant documentation
4. Check third-party component credits

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

This project includes components from:
- [HLS.js](https://github.com/gliese1337/HLS.js/) by gliese1337 (MPL-2.0)
- [tsdemuxer](https://github.com/clark15b/tsdemuxer) by Anton Burdinuk

See [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) for full details

## 📞 Support

- [GitHub Issues](https://github.com/your-org/realview.js/issues)
- [Documentation](https://github.com/your-org/realview.js#readme)
- [Examples](https://github.com/your-org/realview.js/examples)

---

**RealView.js** - High-performance video decoding for the browser 🚀 