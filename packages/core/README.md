# RealView.js

A high-performance, browser-native video decoder optimized for real-time streaming. Powered by the WebCodecs API and hardware acceleration, it delivers ultra-low latency and smooth playback—no plugins required.

## Installation

```bash
npm install realview.js
```

## Quick Start

```typescript
import { Player } from 'realview.js';

const canvas = document.getElementById('videoCanvas') as HTMLCanvasElement;
const player = new Player('ws://localhost:8081/stream', canvas);
player.play();
```

## Features

- **Real-time Video Decoding**: Hardware-accelerated decoding using WebCodecs API
- **MPEG-TS Demuxing**: Complete MPEG Transport Stream parsing
- **Multi-stream Support**: Handle multiple video streams simultaneously
- **Ultra-low Latency**: < 10ms typical decoding latency
- **High Frame Rate**: Supports up to 60fps and beyond

## Documentation

For full documentation, examples, and demos, visit the main project repository.

## License

MIT License 