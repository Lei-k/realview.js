import WebSocket from 'ws';

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

// Test the multi-ws-streamer server
async function testServer() {
  console.log('Connecting to multi-ws-streamer server...');
  
  const ws = new WebSocket('ws://localhost:8081');
  
  ws.on('open', () => {
    console.log('Connected to server');
  });
  
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'videoList') {
        const videoList = message as VideoListResponse;
        console.log('\nAvailable videos:');
        videoList.videos.forEach((video, index) => {
          console.log(`${index + 1}. ${video.title} (ID: ${video.id})`);
        });
        
        // Test streaming the first video
        console.log('\nTesting stream for first video...');
        const testRequest = {
          type: 'stream',
          videoId: videoList.videos[0].id
        };
        ws.send(JSON.stringify(testRequest));
      } else if (message.type === 'error') {
        const error = message as ErrorResponse;
        console.error('Server error:', error.message);
      } else {
        console.log('Received binary data (video stream)');
      }
    } catch (error) {
      console.log('Received binary data (video stream)');
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('Connection closed');
  });
  
  // Close after 10 seconds
  setTimeout(() => {
    console.log('Test completed, closing connection');
    ws.close();
    process.exit(0);
  }, 10000);
}

testServer().catch(console.error); 