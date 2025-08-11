import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import { Writable } from 'stream';
import path from 'path';
import url from 'url';

// Read videos data from JSON file
const videosDataPath = path.join(process.cwd(), 'apps/multi-ws-streamer/src/videos.json');
const videosData = JSON.parse(fs.readFileSync(videosDataPath, 'utf8'));

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

// Extract all videos from the data
const allVideos: Video[] = videosData.categories[0].videos;

// Create video cache directory
const videoCacheDir = '/tmp/video-cache';
if (!fs.existsSync(videoCacheDir)) {
    fs.mkdirSync(videoCacheDir, { recursive: true });
}

// Download video if not exists
async function downloadVideo(videoId: string, videoUrl: string): Promise<string> {
    const videoPath = `${videoCacheDir}/${videoId}.mp4`;

    if (fs.existsSync(videoPath)) {
        // Check if file is complete by checking file size
        const stats = fs.statSync(videoPath);
        if (stats.size > 1000000) { // If file is larger than 1MB, assume it's complete
            console.log(`Video ${videoId} already exists in cache`);
            return videoPath;
        } else {
            console.log(`Video ${videoId} exists but seems incomplete, re-downloading...`);
            fs.unlinkSync(videoPath);
        }
    }

    console.log(`Downloading video ${videoId} from ${videoUrl}`);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(videoPath);

        const request = http.get(videoUrl, (response) => {
            // Check if response is successful
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`Video ${videoId} downloaded successfully`);
                resolve(videoPath);
            });

            file.on('error', (error) => {
                fs.unlinkSync(videoPath); // Delete incomplete file
                reject(error);
            });
        });

        request.on('error', (error) => {
            console.error(`Error downloading video ${videoId}:`, error);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath); // Delete incomplete file
            }
            reject(error);
        });

        // Set timeout for the request
        request.setTimeout(30000, () => {
            request.destroy();
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
            reject(new Error(`Download timeout for ${videoId}`));
        });
    });
}

// Create WebSocket server
const wss = new WebSocket.Server({
    port: 8081,
    // Add path handling for WebSocket connections
    verifyClient: (info: { req: http.IncomingMessage }) => {
        console.log('WebSocket connection request:', info.req.url);
        return true;
    }
});

wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
    console.log('Client connected');

    // Parse the URL to extract path parameters
    const parsedUrl = url.parse(request.url || '', true);
    const pathSegments = parsedUrl.pathname?.split('/').filter(Boolean) || [];
    const queryParams = parsedUrl.query;

    // Extract videoId from path or query parameters
    let pathVideoId: string | undefined;
    if (pathSegments.length > 0) {
        pathVideoId = pathSegments[0]; // First path segment as videoId
    } else if (queryParams.videoId) {
        pathVideoId = queryParams.videoId as string;
    }

    console.log('Path videoId:', pathVideoId);
    console.log('Query params:', queryParams);

    (ws as any)._socket.setNoDelay(true);

    async function sendVideoData(videoId: string) {
        try {
            if (!videoId) {
                const errorResponse: ErrorResponse = {
                    type: 'error',
                    message: 'No videoId provided in path or message'
                };
                ws.send(JSON.stringify(errorResponse));
                return;
            }

            const video = allVideos.find(v => v.id === videoId);

            if (!video) {
                const errorResponse: ErrorResponse = {
                    type: 'error',
                    message: `Video with ID ${videoId} not found`
                };
                ws.send(JSON.stringify(errorResponse));
                return;
            }

            console.log(`Starting stream for video: ${video.title} (ID: ${videoId})`);

            // Download video if needed
            const videoPath = await downloadVideo(video.id, video.sources[0]);

            // Check if video file exists and is readable
            if (!fs.existsSync(videoPath)) {
                const errorResponse: ErrorResponse = {
                    type: 'error',
                    message: `Video file not found: ${video.title}`
                };
                ws.send(JSON.stringify(errorResponse));
                return;
            }

            // Check file size to ensure it's not empty
            const stats = fs.statSync(videoPath);
            if (stats.size === 0) {
                const errorResponse: ErrorResponse = {
                    type: 'error',
                    message: `Video file is empty: ${video.title}`
                };
                ws.send(JSON.stringify(errorResponse));
                return;
            }

            console.log(`Streaming video: ${video.title} (${stats.size} bytes)`);

            // Start FFmpeg stream
            const ffmpeg = spawn('ffmpeg', [
                '-re',                    // Read input at native frame rate
                '-i', videoPath,
                '-vf', 'fps=30',          // Force 30fps output
                '-c:v', 'libx264',        // Use H.264 encoder
                '-preset', 'ultrafast',   // Fastest encoding for low latency
                '-tune', 'zerolatency',   // Optimize for zero latency
                '-profile:v', 'baseline', // Use baseline profile for compatibility
                '-bufsize', '500k',       // Smaller buffer for lower latency
                '-maxrate', '1000k',      // Maximum bitrate
                '-g', '30',               // GOP size (keyframe interval)
                '-keyint_min', '30',      // Minimum keyframe interval
                '-sc_threshold', '0',     // Disable scene change detection
                '-fflags', 'nobuffer',    // Disable input buffering
                '-flags', 'low_delay',    // Enable low delay mode
                '-vsync', 'cfr',          // Constant frame rate
                '-f', 'mpegts',
                '-'
            ], { stdio: ['ignore', 'pipe', 'pipe'] });

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
                const errorMsg = data.toString();
                // Only log actual errors, not info messages
                if (errorMsg.includes('Error') || errorMsg.includes('error')) {
                    console.error(`FFmpeg error for ${video.title}:`, errorMsg);
                }
            });

            ffmpeg.on('error', (error) => {
                console.error(`FFmpeg process error for ${video.title}:`, error);
                const errorResponse: ErrorResponse = {
                    type: 'error',
                    message: `FFmpeg error: ${error.message}`
                };
                ws.send(JSON.stringify(errorResponse));
            });

            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    console.error(`FFmpeg process exited with code ${code} for ${video.title}`);
                } else {
                    console.log(`Stream ended for ${video.title}`);
                }
                ws.close();
            });

            ws.on('close', () => {
                console.log(`Client disconnected, stopping stream for ${video.title}`);
                ffmpeg.kill('SIGINT');
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for ${video.title}:`, error);
                ffmpeg.kill('SIGINT');
            });
        } catch (error) {
            console.error('Error processing message:', error);
            const errorResponse: ErrorResponse = {
                type: 'error',
                message: 'Invalid request format'
            };
            ws.send(JSON.stringify(errorResponse));
        }
    }

    if (pathVideoId) {
        sendVideoData(pathVideoId);
    } else {
        // Send video list on connection
        const videoListResponse: VideoListResponse = {
            type: 'videoList',
            videos: allVideos
        };
        ws.send(JSON.stringify(videoListResponse));
    }

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

console.log('Multi WebSocket Streamer server running on port 8081');
console.log('Available videos:');
allVideos.forEach(video => {
    console.log(`  - ${video.id}: ${video.title}`);
});
console.log('');
console.log('Connection examples:');
console.log('  - ws://localhost:8081/big-buck-bunny (stream specific video)');
console.log('  - ws://localhost:8081?videoId=big-buck-bunny (stream via query param)');
console.log('  - ws://localhost:8081 (get video list and stream via message)');
