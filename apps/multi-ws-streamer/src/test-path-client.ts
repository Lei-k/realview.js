import WebSocket from 'ws';

// Test different connection methods
const testCases = [
  {
    name: 'Path-based connection',
    url: 'ws://localhost:8081/big-buck-bunny',
    description: 'Connect directly to a specific video stream via path'
  },
  {
    name: 'Query parameter connection',
    url: 'ws://localhost:8081?videoId=elephants-dream',
    description: 'Connect using query parameter to specify video'
  },
  {
    name: 'Default connection',
    url: 'ws://localhost:8081',
    description: 'Connect without specifying video, get video list first'
  }
];

async function testConnection(testCase: typeof testCases[0]) {
  console.log(`\n=== Testing: ${testCase.name} ===`);
  console.log(`URL: ${testCase.url}`);
  console.log(`Description: ${testCase.description}`);
  
  return new Promise<void>((resolve) => {
    const ws = new WebSocket(testCase.url);
    
    ws.on('open', () => {
      console.log('✅ Connected successfully');
      
      // For default connection, we need to request a stream
      if (testCase.url === 'ws://localhost:8081') {
        setTimeout(() => {
          console.log('📤 Sending stream request for big-buck-bunny...');
          ws.send(JSON.stringify({
            type: 'stream',
            videoId: 'big-buck-bunny'
          }));
        }, 1000);
      }
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'videoList') {
          console.log('📋 Received video list:', message.videos.length, 'videos available');
        } else if (message.type === 'error') {
          console.log('❌ Server error:', message.message);
        }
      } catch (error) {
        // Binary data - video stream
        console.log('🎥 Receiving video stream data...');
      }
    });
    
    ws.on('error', (error) => {
      console.log('❌ Connection error:', error.message);
    });
    
    ws.on('close', () => {
      console.log('🔌 Connection closed');
      resolve();
    });
    
    // Close connection after 3 seconds
    setTimeout(() => {
      ws.close();
    }, 3000);
  });
}

async function runTests() {
  console.log('🚀 Starting path-based streaming tests...\n');
  
  for (const testCase of testCases) {
    await testConnection(testCase);
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Usage Examples:');
  console.log('  - ws://localhost:8081/big-buck-bunny (direct path)');
  console.log('  - ws://localhost:8081?videoId=elephants-dream (query param)');
  console.log('  - ws://localhost:8081 (get video list first)');
}

// Run the tests
runTests().catch(console.error); 