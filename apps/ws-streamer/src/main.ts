import https from 'https';
import fs from 'fs';

import { spawn } from 'child_process';
import WebSocket from 'ws';
import { Writable } from 'stream';

// get video file from https://w3c.github.io/webcodecs/samples/data/bbb_video_avc_frag.mp4
const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const videoPath = '/tmp/BigBuckBunny.mp4';

// if file not exists, download video file using Node.js https module
if (!fs.existsSync(videoPath)) {
    const file = fs.createWriteStream(videoPath);
    console.log('Downloading video from:', videoUrl);
    https.get(videoUrl, (response: any) => {
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Video downloaded successfully');
    });
    }).on('error', (error: any) => {
        console.error('Error downloading video:', error);
    });
}


const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  (ws as any)._socket.setNoDelay(true);

  const ffmpeg = spawn('ffmpeg', [
    '-re',
    '-i', '/tmp/BigBuckBunny.mp4',
    '-vf', 'fps=30',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-vsync', 'cfr',
    '-f', 'mpegts',
    '-'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  //ffmpeg.stdout.setEncoding(null); 

  const wsStream = new Writable({
    write(chunk, encoding, callback) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk, callback);
      } else {
        callback();
      }
    }
  });
  
  ffmpeg.stdout.pipe(wsStream);

  ffmpeg.stderr.on('data', (data: Buffer) => {
    console.error(data.toString());
  });

  ffmpeg.on('close', () => {
    ws.close();
  });

  ws.on('close', () => {
    ffmpeg.kill('SIGINT');
  });
});
