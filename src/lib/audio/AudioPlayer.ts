export class AudioPlayer {
  private context: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private analyser: AnalyserNode | null = null;

  async init() {
    if (typeof window === 'undefined') return;

    if (!this.context) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioCtx({ sampleRate: 24000 });
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    
    if (!this.analyser) {
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.context.destination);
    }
    
    // Only reset start time if we are not currently playing something
    if (this.context.currentTime >= this.nextStartTime) {
      this.nextStartTime = this.context.currentTime;
    }
  }

  playChunk(pcm16Data: Int16Array) {
    if (!this.context) return;

    // Convert PCM16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
    const float32Data = new Float32Array(pcm16Data.length);
    for (let i = 0; i < pcm16Data.length; i++) {
      float32Data[i] = pcm16Data[i] / 32768.0;
    }

    const buffer = this.context.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    if (this.analyser) {
      source.connect(this.analyser);
    } else {
      source.connect(this.context.destination);
    }

    const currentTime = this.context.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.activeSources.push(source);

    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };

    this.nextStartTime += buffer.duration;
  }

  flush() {
    // Stop all active sources to immediately halt playback on barge-in or end
    this.activeSources.forEach(source => {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore errors if source is already stopped
      }
    });
    this.activeSources = [];
    if (this.context) {
      this.nextStartTime = this.context.currentTime;
    }
  }

  close() {
    this.flush();
    if (this.context) {
      try { this.context.close(); } catch (e) {}
      this.context = null;
    }
    this.analyser = null;
  }

  getVolume(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    return Math.min(1, rms * 5);
  }
}
