# RealView.js Video Wall

A multi-stream video wall application that displays multiple video streams simultaneously using RealView.js and WebCodecs.

## Features

- 🎬 **Multi-Stream Display**: Show up to 64 different video streams simultaneously
- 📺 **Dynamic Layout**: Automatically adjusts grid layout based on stream count
- 🎮 **Interactive Controls**: Play, pause, stop all streams with single buttons
- 📊 **Real-time Statistics**: Monitor performance across all streams
- 🔄 **Stream Count Slider**: Adjust number of streams from 1 to 64
- 🖥️ **Fullscreen Mode**: Immersive viewing experience
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Prerequisites

Before running the video wall, make sure you have:

1. **Multi WebSocket Streamer** running on port 8081
2. **FFmpeg** installed and available in PATH
3. **Node.js** 18+ installed

## Quick Start

### 1. Start the Multi WebSocket Streamer

```bash
# In one terminal
npx nx serve multi-ws-streamer
```

### 2. Start the Video Wall

```bash
# In another terminal
npx nx serve vanilla-js-video-wall
```

### 3. Open the Application

Navigate to `http://localhost:4200` in your browser.

## Usage

### Basic Controls

1. **Stream Count Slider**: Adjust the number of video streams (1-64)
2. **Play All**: Start all video streams simultaneously
3. **Pause All**: Pause all video streams
4. **Stop All**: Stop and reset all video streams
5. **Fullscreen**: Enter/exit fullscreen mode
6. **Reset Layout**: Reset to default 4-stream layout

### Video Wall Layout

The video wall automatically calculates the optimal grid layout:
- **1-4 streams**: 2x2 grid
- **5-9 streams**: 3x3 grid
- **10-16 streams**: 4x4 grid
- And so on...

### Statistics Panel

Monitor real-time performance:
- **Active Streams**: Number of currently playing streams
- **Average FPS**: Average frame rate across all streams
- **Total Data**: Combined data received from all streams
- **Total Frames**: Total frames processed across all streams

## Technical Details

### Architecture

- **Frontend**: Vanilla JavaScript with Web Components
- **Video Processing**: RealView.js core library with WebCodecs
- **Streaming**: WebSocket connection to multi-ws-streamer
- **Layout**: CSS Grid with responsive design

### Performance Considerations

- **Memory Usage**: Each stream creates a separate Player instance
- **CPU Usage**: Multiple video decoders running simultaneously
- **Network**: Multiple WebSocket connections to the streamer
- **Browser Limits**: Some browsers may limit concurrent video decoders

### Browser Compatibility

- **Chrome/Edge**: Full support with WebCodecs
- **Firefox**: Limited support (WebCodecs not available)
- **Safari**: Limited support (WebCodecs not available)

## Configuration

### Customizing Video Sources

Edit `apps/multi-ws-streamer/src/videos.json` to add or modify video sources:

```json
{
  "id": "custom-video",
  "title": "Custom Video",
  "sources": ["https://example.com/video.mp4"],
  "subtitle": "Custom Source",
  "thumb": "https://example.com/thumb.jpg"
}
```

### Adjusting Performance

For better performance with many streams:

1. **Reduce Stream Count**: Use fewer streams for lower-end devices
2. **Lower Resolution**: Modify FFmpeg settings in multi-ws-streamer
3. **Close Other Tabs**: Free up browser resources
4. **Use Hardware Acceleration**: Ensure WebGL is enabled

## Troubleshooting

### Common Issues

1. **"Cannot connect to server"**
   - Ensure multi-ws-streamer is running on port 8081
   - Check firewall settings

2. **"Video not playing"**
   - Verify FFmpeg is installed and in PATH
   - Check browser console for WebCodecs errors

3. **"Poor performance"**
   - Reduce stream count
   - Close other applications
   - Check system resources

4. **"Layout issues"**
   - Refresh the page
   - Check browser compatibility
   - Try different screen resolutions

### Debug Mode

Open browser developer tools to see:
- WebSocket connection status
- Video decoder errors
- Performance metrics
- Network activity

## Development

### Project Structure

```
apps/vanilla-js-video-wall/
├── src/
│   ├── app/
│   │   ├── app.element.ts    # Main application logic
│   │   └── app.element.css   # Component styles
│   ├── styles.css            # Global styles
│   └── main.ts              # Entry point
├── index.html               # HTML template
└── README.md               # This file
```

### Building

```bash
# Build for production
npx nx build vanilla-js-video-wall

# Build with watch mode
npx nx build vanilla-js-video-wall --watch
```

### Testing

```bash
# Run unit tests
npx nx test vanilla-js-video-wall

# Run e2e tests
npx nx e2e vanilla-js-video-wall-e2e
```

## License

This project is part of RealView.js and follows the same license terms. 