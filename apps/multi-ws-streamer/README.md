# Multi WebSocket Streamer

A WebSocket server that supports streaming multiple video sources with real-time H.264 encoding.

## Features

- 🎬 **Multiple Video Sources**: Support for 13 different sample videos
- ⚡ **Real-time Streaming**: Low-latency H.264 video streaming
- 📦 **Automatic Caching**: Videos are cached locally after first download
- 🔄 **Dynamic Video Selection**: Clients can request different videos via WebSocket
- 🎯 **Optimized Encoding**: FFmpeg with ultra-low latency settings
- 🛣️ **Path-based Streaming**: Stream specific videos directly via URL path

## Available Videos

The server includes 13 sample videos from Google's sample video collection:

1. **Big Buck Bunny** - Animated short film by Blender Foundation
2. **Elephant Dream** - First Blender Open Movie
3. **For Bigger Blazes** - Chromecast demo video
4. **For Bigger Escape** - Chromecast demo video
5. **For Bigger Fun** - Chromecast demo video
6. **For Bigger Joyrides** - Chromecast demo video
7. **For Bigger Meltdowns** - Chromecast demo video
8. **Sintel** - Independent animated short film
9. **Subaru Outback** - Car review video
10. **Tears of Steel** - Sci-fi short film
11. **Volkswagen GTI Review** - Car review video
12. **We Are Going On Bullrun** - Car rally video
13. **What care can you get for a grand?** - Car buying guide

## Usage

### Starting the Server

```bash
npx nx serve multi-ws-streamer
```

The server will start on port 8081.

### Connection Methods

#### 1. Path-based Connection (Recommended)
Connect directly to a specific video stream using the video ID in the URL path:

```javascript
// Stream Big Buck Bunny directly
const ws = new WebSocket('ws://localhost:8081/big-buck-bunny');

// Stream Elephant Dream directly
const ws = new WebSocket('ws://localhost:8081/elephants-dream');
```

#### 2. Query Parameter Connection
Use query parameters to specify the video:

```javascript
// Stream using query parameter
const ws = new WebSocket('ws://localhost:8081?videoId=big-buck-bunny');
```

#### 3. Traditional Connection
Connect without specifying video and request stream via message:

```javascript
const ws = new WebSocket('ws://localhost:8081');

ws.onopen = () => {
  // Request video list
  ws.send(JSON.stringify({
    type: 'stream',
    videoId: 'big-buck-bunny'
  }));
};
```

### WebSocket Protocol

#### Connection
Connect to `ws://localhost:8081` or `ws://localhost:8081/{videoId}`

#### Video List Request
Upon connection, the server automatically sends the list of available videos:

```json
{
  "type": "videoList",
  "videos": [
    {
      "id": "big-buck-bunny",
      "title": "Big Buck Bunny",
      "description": "...",
      "sources": ["http://..."],
      "subtitle": "By Blender Foundation",
      "thumb": "http://..."
    }
  ]
}
```

#### Stream Request (for traditional connections)
To start streaming a video, send:

```json
{
  "type": "stream",
  "videoId": "big-buck-bunny"
}
```

#### Response
- **Success**: Binary video stream data (MPEG-TS format)
- **Error**: JSON error message

```json
{
  "type": "error",
  "message": "Video with ID invalid-id not found"
}
```

### Testing

Run the test client to verify the server:

```bash
npx ts-node apps/multi-ws-streamer/src/test-client.ts
```

Run the path-based test client:

```bash
npx ts-node apps/multi-ws-streamer/src/test-path-client.ts
```

## Technical Details

### FFmpeg Settings
- **Codec**: H.264 (libx264)
- **Preset**: ultrafast
- **Tune**: zerolatency
- **Profile**: baseline
- **Frame Rate**: 30fps
- **Bitrate**: 1000k max
- **Buffer**: 500k
- **GOP Size**: 30 frames

### Caching
Videos are automatically downloaded and cached in `/tmp/video-cache/` directory. Each video is stored as `{videoId}.mp4`.

### Performance
- **Latency**: Optimized for real-time streaming
- **Bandwidth**: Configurable bitrate limits
- **Memory**: Efficient streaming with minimal buffering

## Integration with RealView.js

### Path-based Integration
To use this server with RealView.js using path-based streaming:

```typescript
// Get videoId from URL path
const pathSegments = window.location.pathname.split('/').filter(Boolean);
const videoId = pathSegments[0];

if (videoId) {
  // Connect directly to specific video stream
  const wsUrl = `ws://localhost:8081/${videoId}`;
  const player = new Player(wsUrl, canvas, {
    enableWebGL: true
  });
  player.play();
} else {
  // Fallback to traditional method
  const ws = new WebSocket('ws://localhost:8081');
  // ... handle video selection
}
```

### Traditional Integration
To use this server with RealView.js using the traditional method:

```typescript
const ws = new WebSocket('ws://localhost:8081');

// Request video list
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'videoList') {
    // Display video selection UI
    console.log('Available videos:', data.videos);
  }
};

// Start streaming specific video
function playVideo(videoId: string) {
  ws.send(JSON.stringify({
    type: 'stream',
    videoId: videoId
  }));
}
```

## Requirements

- Node.js 18+
- FFmpeg installed and available in PATH
- Network access to download sample videos

## License

This project is part of RealView.js and follows the same license terms. 