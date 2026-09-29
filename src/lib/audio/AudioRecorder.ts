export class MicrophoneError extends Error {
  public code: string;
  public userMessage: string;

  constructor(code: string, userMessage: string, originalMessage?: string) {
    super(originalMessage || userMessage);
    this.name = 'MicrophoneError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export class AudioRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  public onAudioData: ((data: Int16Array) => void) | null = null;

  async start() {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new MicrophoneError(
        'BROWSER_UNSUPPORTED',
        'Your browser does not support audio recording or microphone access is restricted (requires HTTPS or localhost).'
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
    } catch (e: any) {
      console.error("[AudioRecorder] getUserMedia error:", e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        throw new MicrophoneError(
          'NotAllowedError',
          'Microphone access was denied. Please allow microphone permissions in your browser and try again.'
        );
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        throw new MicrophoneError(
          'NotFoundError',
          'No microphone was detected on your device. Please plug in a microphone and try again.'
        );
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        throw new MicrophoneError(
          'NotReadableError',
          'Microphone is already in use by another application. Please close other audio applications and try again.'
        );
      } else if (e.name === 'SecurityError') {
        throw new MicrophoneError(
          'SecurityError',
          'Microphone access is blocked due to security restrictions. Ensure the site is served over HTTPS.'
        );
      } else {
        throw new MicrophoneError(
          'GENERIC_MICROPHONE_ERROR',
          'Unable to access your microphone. Please check your browser settings and try again.',
          e.message
        );
      }
    }

    // Force context to 16kHz for Google Gemini Live compatibility
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioCtx({ sampleRate: 16000 });
    
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    
    // Add worklet
    await this.context.audioWorklet.addModule('/worklets/recorder-worklet.js');
    
    this.sourceNode = this.context.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.context, 'recorder-worklet');
    
    this.workletNode.port.onmessage = (event) => {
      if (this.onAudioData) {
        this.onAudioData(new Int16Array(event.data));
      }
    };

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;

    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.workletNode);

    // Keep worklet alive in WebKit browsers with muted gain
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0;
    this.workletNode.connect(gainNode);
    gainNode.connect(this.context.destination);
  }

  stop() {
    if (this.workletNode) {
      try { this.workletNode.disconnect(); } catch (e) {}
      this.workletNode = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      this.stream = null;
    }
    if (this.context) {
      try { this.context.close(); } catch (e) {}
      this.context = null;
    }
    this.analyser = null;
    this.onAudioData = null;
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
