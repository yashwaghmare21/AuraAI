class RecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channel = input[0];
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.bufferIndex++] = channel[i];
        if (this.bufferIndex >= this.buffer.length) {
          const pcm16 = new Int16Array(this.buffer.length);
          for (let j = 0; j < this.buffer.length; j++) {
            let s = Math.max(-1, Math.min(1, this.buffer[j]));
            pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          // Transfer the buffer to the main thread
          this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
          this.buffer = new Float32Array(2048);
          this.bufferIndex = 0;
        }
      }
    }
    // Keep the processor alive
    return true;
  }
}
registerProcessor('recorder-worklet', RecorderWorklet);
