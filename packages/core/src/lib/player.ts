import { Packet, TSDemuxer } from "./dumuxer";
import { VideoStream, VideoTrack } from "./video";

const MAX_FRAME_BUFFER_SIZE = 30;

function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  console.log("dpr", dpr);

  ctx.scale(dpr, dpr);
}

export enum PlayerEvent {
  OnPlaying = "onPlaying",
  OnPaused = "onPaused",
  OnError = "onError",
}

export interface PlayerOptions {
  enableWebGL?: boolean;
  width?: number;
  height?: number;
}

export enum PlayerState {
  Playing = "playing",
  Paused = "paused",
  Stopped = "stopped",
  Error = "error",
}

export class Player extends EventTarget {
  private demuxer: TSDemuxer;
  private videoStream: VideoStream;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private url: string;

  private ws: WebSocket | null = null;
  private videoDecoder: VideoDecoder;
  private isDecoderConfigured = false;
  private videoTrack: VideoTrack | null = null;
  private hasSeenKeyFrame = false; // Track if we've seen the first key frame

  private bytesReceived = 0;
  private latency = 0;
  private lastFrameTime = 0;

  // WebGL support
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private webGLEnabled = false; // Flag to enable/disable WebGL

  private frameCount = 0;
  private pixelRatio = 1;
  private frameBuffer: VideoFrame[] = [];
  private fps = 30;

  private width = 1280;
  private height = 720;

  private videoWidth = 1280;
  private videoHeight = 720;

  private beforeFullscreenWidth = 0;
  private beforeFullscreenHeight = 0;

  private state: PlayerState = PlayerState.Stopped;
  private renderLoop: number | null = null;

  private lastDecodeTime = 0;
  private smoothedFps = 0;

  constructor(
    url: string,
    canvas: HTMLCanvasElement,
    options: PlayerOptions = {},
  ) {
    super();
    this.bytesReceived = 0;
    this.url = url;
    this.canvas = canvas;
    this.width = options.width || 1280;
    this.height = options.height || 720;

    this.webGLEnabled = options.enableWebGL === true;

    this.fps = 30;

    // Initialize WebGL if enabled
    if (this.webGLEnabled) {
      this.initWebGL();
    }

    if (!this.webGLEnabled) {
      setupCanvas(canvas);
      this.ctx = canvas.getContext("2d")!;

      this.ctx.imageSmoothingEnabled = false;
      this.ctx.imageSmoothingQuality = "low";
    }

    this.demuxer = new TSDemuxer(this.onPacket.bind(this));
    this.videoStream = new VideoStream();
    this.videoDecoder = new VideoDecoder({
      output: (frame) => {
        const currentTime = performance.now();
        const decodeTime = currentTime - this.lastDecodeTime;
        // latency is the low pass filtered decode time with a time constant of 1 / (2 * fps)
        this.latency = (1 / (2 * this.fps)) * decodeTime + (1 - (1 / (2 * this.fps))) * this.latency;
        this.lastDecodeTime = currentTime;

        if (this.frameBuffer.length <= this.getFrameBufferSize()) {
          this.frameBuffer.push(frame);
        } else {
          frame.close();
        }
      },
      error: (error) => {
        console.error("VideoDecoder error:", error);
      },
    });

    this.setupCanvas();
  }

  private getFrameBufferSize() {
    return Math.min(MAX_FRAME_BUFFER_SIZE, this.fps);
  }

  private initWebGL() {
    try {
      this.gl = (this.canvas.getContext("webgl") ||
        this.canvas.getContext(
          "experimental-webgl",
        )) as WebGLRenderingContext | null;
      if (!this.gl) {
        console.warn("WebGL not supported, falling back to 2D canvas");
        this.webGLEnabled = false;
        return;
      }

      // Create shaders with proper video frame handling
      const vertexShader = this.createShader(
        this.gl.VERTEX_SHADER,
        `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;

        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `,
      );

      const fragmentShader = this.createShader(
        this.gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_texCoord;

        void main() {
          vec4 texColor = texture2D(u_texture, v_texCoord);
          // Ensure proper color output
          gl_FragColor = vec4(texColor.rgb, 1.0);
        }
      `,
      );

      // Create program
      this.program = this.gl.createProgram();
      if (!this.program || !vertexShader || !fragmentShader) {
        throw new Error("Failed to create WebGL program");
      }

      this.gl.attachShader(this.program, vertexShader);
      this.gl.attachShader(this.program, fragmentShader);
      this.gl.linkProgram(this.program);

      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        throw new Error("Failed to link WebGL program");
      }

      // Create texture with proper settings
      this.texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_S,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_T,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.LINEAR,
      );

      this.webGLEnabled = true;
      console.log("WebGL initialized successfully");
    } catch (error) {
      console.warn("WebGL initialization failed:", error);
      this.webGLEnabled = false;
    }
  }

  private setupCanvas() {
    this.resize(this.width, this.height);
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        "Shader compilation error:",
        this.gl.getShaderInfoLog(shader),
      );
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private onPacket(packet: Packet) {
    try {
      // Check if this is a video stream (stream_id 0xE0-0xEF for video)
      if (packet.stream_id >= 0xe0 && packet.stream_id <= 0xef) {
        this.videoStream.process(packet);
      }
    } catch (error) {
      console.error("Error processing packet:", error);
    }
  }

  private configureDecoder() {
    if (!this.videoTrack || this.isDecoderConfigured) return;

    const { sps, pps, width, height, duration } = this.videoTrack;

    this.fps = 90000 / duration;

    this.videoWidth = width;
    this.videoHeight = height;

    // Extract codec string from SPS
    const codec = `avc1.${sps[1].toString(16).padStart(2, "0")}${sps[2].toString(16).padStart(2, "0")}${sps[3].toString(16).padStart(2, "0")}`;

    const config = {
      codec,
      codedWidth: width,
      codedHeight: height,
      description: this.createCodecDescription(sps, pps),
    };

    console.log(config);

    this.videoDecoder.configure(config);
    this.isDecoderConfigured = true;
    this.hasSeenKeyFrame = false; // Reset key frame flag when reconfiguring

    this.startRendering();
  }

  private createCodecDescription(sps: Uint8Array, pps: Uint8Array): Uint8Array {
    // AVCC format: [version][profile][compat][level][reserved+length][numSPS][SPS length][SPS][numPPS][PPS length][PPS]
    const spsLength = sps.length;
    const ppsLength = pps.length;
    const totalLength = 7 + 2 + spsLength + 1 + 2 + ppsLength; // 7 header, 2 for SPS length, 1 for numPPS, 2 for PPS length

    const description = new Uint8Array(totalLength);
    let offset = 0;

    // AVCC header
    description[offset++] = 1; // configurationVersion
    description[offset++] = sps[1]; // AVCProfileIndication
    description[offset++] = sps[2]; // profile_compatibility
    description[offset++] = sps[3]; // AVCLevelIndication
    description[offset++] = 0xff; // lengthSizeMinusOne (NAL length = 4 bytes)
    description[offset++] = 0xe1; // numOfSequenceParameterSets (1)

    // SPS
    description[offset++] = (spsLength >> 8) & 0xff;
    description[offset++] = spsLength & 0xff;
    description.set(sps, offset);
    offset += spsLength;

    // PPS
    description[offset++] = 1; // numOfPictureParameterSets (1)
    description[offset++] = (ppsLength >> 8) & 0xff;
    description[offset++] = ppsLength & 0xff;
    description.set(pps, offset);

    return description;
  }

  private startRendering() {
    if(this.renderLoop) {
      clearInterval(this.renderLoop);
    }

    this.renderLoop = setInterval(() => {
      if (this.state != PlayerState.Playing) return;

      const frame = this.frameBuffer.shift();

      if (frame) {
        this.renderFrame(frame);
      }
    }, 1000 / this.fps);
  }

  private processVideoTrack() {
    if (!this.videoTrack || !this.isDecoderConfigured) return;

    const track = this.videoStream.getTrack();

    if(!track) {
      return;
    }

    const { samples, data } = track;

    // Process all samples for real-time streaming
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const sampleData = data.subarray(
        sample.offset,
        sample.offset + sample.size,
      );

      // Convert 90kHz ticks to microseconds for VideoDecoder
      const timestamp = (sample.dts * 1000) / 90; // Convert to microseconds

      const chunk = new EncodedVideoChunk({
        timestamp,
        duration: (sample.duration * 1000) / 90, // Convert to microseconds
        data: sampleData,
        type: sample.isIDR ? "key" : "delta",
      });

      // For real-time streaming, wait for first key frame
      if (!this.hasSeenKeyFrame) {
        if (sample.isIDR) {
          // First key frame found, start decoding
          this.hasSeenKeyFrame = true;
          this.videoDecoder.decode(chunk);
          
          this.dispatchEvent(new Event(PlayerEvent.OnPlaying));
        } else {
          // Skip non-key frames until we get a key frame
          continue;
        }
      } else {
        // After first key frame, decode all frames
        this.videoDecoder.decode(chunk);
      }
    }
  }

  private renderFrame(frame: VideoFrame) {
    this.frameCount++;
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.smoothedFps = (1 / (2 * this.fps)) * (1000 / frameTime) + (1 - (1 / (2 * this.fps))) * this.smoothedFps;

    if (this.webGLEnabled && this.gl && this.program && this.texture) {
      this.renderFrameWebGL(frame);
    } else {
      this.renderFrame2D(frame);
    }

    frame.close();
  }

  private renderFrameWebGL(frame: VideoFrame) {
    if (!this.gl || !this.program || !this.texture) return;

    const gl = this.gl;
    const canvas = this.canvas;

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    gl.useProgram(this.program);

    // Bind texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Upload frame data to texture with proper format
    // VideoFrame from WebCodecs is typically in RGBA format
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);

    // Create vertex buffer for full-screen quad
    const positions = new Float32Array([
      -1,
      -1,
      0,
      1, // bottom left
      1,
      -1,
      1,
      1, // bottom right
      -1,
      1,
      0,
      0, // top left
      1,
      1,
      1,
      0, // top right
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(this.program!, "a_position");
    const texCoordLocation = gl.getAttribLocation(this.program!, "a_texCoord");

    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(texCoordLocation);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Check for WebGL errors
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error("WebGL error:", error);
    }
  }

  private renderFrame2D(frame: VideoFrame) {
    const ctx = this.ctx;

    // Clear canvas
    //ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    // Draw frame stretched to fit canvas exactly
    ctx!.drawImage(frame, 0, 0, this.width, this.height);
  }

  public play() {
    if (this.state === PlayerState.Playing) return;

    if(this.state === PlayerState.Paused) {
      this.state = PlayerState.Playing;

      setTimeout(() => {
        this.dispatchEvent(new Event(PlayerEvent.OnPlaying));
      }, 0);

      return;
    }

    this.state = PlayerState.Playing;    

    // Create WebSocket connection
    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (event) => {
      // Handle both ArrayBuffer and Blob data
      let data: Uint8Array;

      if (event.data instanceof ArrayBuffer) {
        data = new Uint8Array(event.data);
        this.bytesReceived += data.length;
      } else if (event.data instanceof Blob) {
        // Convert Blob to ArrayBuffer
        event.data.arrayBuffer().then((buffer) => {
          this.bytesReceived += buffer.byteLength;
          this.processData(new Uint8Array(buffer));
        });
        return;
      } else {
        console.error("Unsupported data type:", typeof event.data);
        return;
      }

      this.processData(data);
    };

    this.ws.onopen = () => {
      console.log("Connected to stream server");
    };

    this.ws.onclose = () => {
      console.log("Disconnected from stream server");
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private processData(data: Uint8Array) {
    // Process the TS data through the demuxer
    this.demuxer.process(data);

    // Check if we have enough data to get a complete video track
    if (this.videoStream.byteLength > 0 && !this.videoTrack) {
      this.videoTrack = this.videoStream.getTrack();
      if(!this.videoTrack) {
        return;
      }
      this.configureDecoder();
    }

    // Process video track for real-time streaming
    if (this.videoTrack && this.isDecoderConfigured) {
      this.processVideoTrack();
    }
  }

  public pause() {
    this.state = PlayerState.Paused;
  }

  public stop() {
    this.state = PlayerState.Stopped;

    this.ws?.close();
    this.videoDecoder.reset();
    this.isDecoderConfigured = false;
    this.videoTrack = null;
    this.hasSeenKeyFrame = false;
    this.frameCount = 0;
    this.latency = 0;
    this.lastFrameTime = 0;
  }

  public destroy() {
    this.ws?.close();
    this.videoDecoder.close();
    this.isDecoderConfigured = false;
    this.videoTrack = null;
    this.hasSeenKeyFrame = false;
    this.frameCount = 0;
    this.latency = 0;
    this.lastFrameTime = 0;
  }

  public getStats() {
    return {
      bytesReceived: this.bytesReceived,
      webGLEnabled: this.webGLEnabled,
      frameCount: this.frameCount,
      latency: this.latency,
      fps: this.smoothedFps,
    };
  }

  public getState() {
    return this.state;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * this.pixelRatio);
    this.canvas.height = Math.floor(height * this.pixelRatio);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx?.reset();

    if (this.webGLEnabled) {
      this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx?.scale(this.pixelRatio, this.pixelRatio);
  }

  public fullscreen() {
    this.beforeFullscreenWidth = this.width;
    this.beforeFullscreenHeight = this.height;

    this.resize(this.videoWidth, this.videoHeight);

    this.canvas.requestFullscreen();
  }

  public exitFullscreen() {
    this.resize(this.beforeFullscreenWidth, this.beforeFullscreenHeight);

    document.exitFullscreen();
  }
}
