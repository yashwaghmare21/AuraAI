import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AudioRecorder, MicrophoneError } from '@/lib/audio/AudioRecorder';
import { AudioPlayer } from '@/lib/audio/AudioPlayer';
import { normalizeOrderId } from '@/lib/orders';

export type AgentState = 
  | 'idle' 
  | 'connecting' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'interrupted' 
  | 'ended' 
  | 'error';

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface AgentActivity {
  id: string;
  message: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

export function useVoiceAgent() {
  const [state, setState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const autoEndTimerRef = useRef<any>(null);
  const isIntentionalEndRef = useRef<boolean>(false);
  const abortedRef = useRef<boolean>(false);
  const isConnectingRef = useRef<boolean>(false);
  const stateRef = useRef<AgentState>('idle');

  // Keep stateRef in sync for audio callbacks
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const addMessage = useCallback((role: 'user' | 'model', text: string) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    setMessages((prev) => {
      // Avoid duplicate consecutive identical messages from speech recognition / stream chunks
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.role === role && last.text === cleanText) {
          return prev;
        }
      }
      return [...prev, { role, text: cleanText }];
    });
  }, []);

  const addActivity = useCallback((message: string, status: 'pending' | 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setActivities((prev) => [...prev, { id, message, status, timestamp: Date.now() }]);
    return id;
  }, []);

  const updateActivity = useCallback((id: string, status: 'pending' | 'success' | 'error') => {
    setActivities((prev) => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  const endCall = useCallback(() => {
    isIntentionalEndRef.current = true;
    abortedRef.current = true;
    isConnectingRef.current = false;

    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    if (recorderRef.current) {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }

    if (playerRef.current) {
      try { playerRef.current.close(); } catch { /* ignore */ }
    }

    if (sessionRef.current) {
      try { sessionRef.current.close?.(); } catch { /* ignore */ }
      sessionRef.current = null;
    }

    setState('ended');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  // Setup Browser SpeechRecognition for high-accuracy customer transcript
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) {
              addMessage('user', transcript);
            }
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn("[SpeechRecognition] warning:", e.error);
        }
      };

      recognition.onend = () => {
        // Restart recognition if call is still active
        if (!isIntentionalEndRef.current && stateRef.current !== 'ended' && stateRef.current !== 'error') {
          try {
            recognition.start();
          } catch { /* ignore */ }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("[SpeechRecognition] initialization skipped:", e);
    }
  }, [addMessage]);

  const startCall = async () => {
    if (isConnectingRef.current) return;
    if (state === 'connecting' || state === 'listening' || state === 'speaking' || state === 'thinking') {
      return;
    }

    isConnectingRef.current = true;
    isIntentionalEndRef.current = false;
    abortedRef.current = false;
    setErrorMessage(null);
    setErrorDetail(null);

    try {
      setState('connecting');
      setMessages([]);
      setActivities([]);
      
      const connectAct = addActivity('Connecting to voice session...', 'pending');

      // 1. Initialize AudioPlayer
      if (!playerRef.current) playerRef.current = new AudioPlayer();
      await playerRef.current.init();
      if (abortedRef.current) return;

      // 2. Initialize AudioRecorder
      if (!recorderRef.current) recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
      if (abortedRef.current) {
        recorderRef.current?.stop();
        return;
      }

      // 3. Start local speech recognition for user transcript
      startSpeechRecognition();

      // 4. Fetch ephemeral token from server
      const tokenRes = await fetch('/api/token', { method: 'POST' });
      if (abortedRef.current) return;
      if (!tokenRes.ok) {
        throw new Error(`Token endpoint returned error (${tokenRes.status})`);
      }
      const data = await tokenRes.json();
      if (data.error) throw new Error(data.error);
      
      const token = data.token;

      // Auto-end timer after 10 minutes to protect session limits
      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = setTimeout(() => {
        endCall();
      }, 10 * 60 * 1000);

      // 5. Connect to Gemini Live
      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
      
      sessionRef.current = await (ai as any).live.connect({
        model: "gemini-2.0-flash-exp",
        callbacks: {
          onmessage: async (message: any) => {
            const sc = message.serverContent;
            if (sc) {
              // Interruption from Gemini Live VAD
              if (sc.interrupted) {
                playerRef.current?.flush();
                setState('interrupted');
                setTimeout(() => {
                  if (stateRef.current === 'interrupted') setState('listening');
                }, 300);
              }
              
              if (sc.turnComplete) {
                setState('listening');
              }
              
              // Handle spoken audio response
              if (sc.modelTurn) {
                const parts = sc.modelTurn.parts || [];
                for (const part of parts) {
                  if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                    setState('speaking');
                    const binary = atob(part.inlineData.data);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                      bytes[i] = binary.charCodeAt(i);
                    }
                    const pcm16 = new Int16Array(bytes.buffer);
                    playerRef.current?.playChunk(pcm16);
                  }
                  if (part.text) {
                    addMessage('model', part.text);
                  }
                }
              }

              // Handle server-side user transcription if present
              if (sc.userTurn) {
                const userParts = sc.userTurn.parts || [];
                for (const p of userParts) {
                  if (p.text) addMessage('user', p.text);
                }
              }
            }

            // Handle function/tool calls
            const toolCall = message.toolCall || (sc && sc.toolCall);
            if (toolCall && toolCall.functionCalls) {
              setState('thinking');
              const functionCalls = toolCall.functionCalls;
              
              const functionResponses = await Promise.all(functionCalls.map(async (call: any) => {
                const rawOrderId = call.args?.order_id || '';
                const orderId = normalizeOrderId(rawOrderId);
                let result: any = null;
                let activityId = '';
                
                try {
                  if (call.name === 'get_order_details') {
                    activityId = addActivity(`Looking up order ${orderId || rawOrderId}`, 'pending');
                    if (!orderId) {
                      result = { found: false, error: 'MISSING_ORDER_ID', message: 'No valid order ID was provided. Please ask the customer for their order ID.' };
                    } else {
                      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
                      result = await res.json();
                      if (res.status === 404 || !result.found) {
                        result = { found: false, error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found. Please verify the order ID with the customer.` };
                      }
                    }
                    updateActivity(activityId, result.found !== false ? 'success' : 'error');

                  } else if (call.name === 'check_return_eligibility') {
                    activityId = addActivity(`Checking return eligibility for ${orderId || rawOrderId}`, 'pending');
                    if (!orderId) {
                      result = { success: false, error: 'MISSING_ORDER_ID', message: 'Order ID is required.' };
                    } else {
                      const res = await fetch(`/api/tools?action=return&orderId=${encodeURIComponent(orderId)}`);
                      result = await res.json();
                      if (!result.eligible && result.reason === 'Order not found.') {
                        result = { found: false, error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found.` };
                      }
                    }
                    updateActivity(activityId, result.eligible ? 'success' : 'error');

                  } else if (call.name === 'check_cancellation_eligibility') {
                    activityId = addActivity(`Checking cancellation eligibility for ${orderId || rawOrderId}`, 'pending');
                    if (!orderId) {
                      result = { success: false, error: 'MISSING_ORDER_ID', message: 'Order ID is required.' };
                    } else {
                      const res = await fetch(`/api/tools?action=cancel&orderId=${encodeURIComponent(orderId)}`);
                      result = await res.json();
                      if (!result.eligible && result.reason === 'Order not found.') {
                        result = { found: false, error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found.` };
                      }
                    }
                    updateActivity(activityId, result.eligible ? 'success' : 'error');

                  } else {
                    activityId = addActivity(`Executing ${call.name}`, 'pending');
                    result = { success: false, error: `Unknown tool: ${call.name}` };
                    updateActivity(activityId, 'error');
                  }
                  
                  return {
                    id: call.id,
                    name: call.name,
                    response: result
                  };
                } catch (e: any) {
                  return {
                    id: call.id,
                    name: call.name,
                    response: { success: false, error: 'TOOL_EXECUTION_FAILED', message: e.message }
                  };
                }
              }));
              
              if (sessionRef.current) {
                sessionRef.current.send({
                  toolResponse: {
                    functionResponses
                  }
                });
              }
            }
          },
          onclose: () => {
            console.log("[Aura] Gemini Live connection closed");
            if (!isIntentionalEndRef.current && stateRef.current !== 'ended') {
              setState('ended');
            }
          },
          onerror: (err: unknown) => {
            console.error("[Aura] Gemini Live Error:", err);
            if (!isIntentionalEndRef.current) {
              setErrorMessage("Connection issue with voice session.");
              setErrorDetail("The AI voice connection encountered a network error. You can start a new call.");
              setState('error');
            }
          }
        }
      });

      // 6. Connect microphone audio data to Gemini Live WebSocket
      if (recorderRef.current) {
        recorderRef.current.onAudioData = (pcm16Data: Int16Array) => {
          let sum = 0;
          for (let i = 0; i < pcm16Data.length; i++) {
            sum += pcm16Data[i] * pcm16Data[i];
          }
          const rms = Math.sqrt(sum / pcm16Data.length);

          // Local client-side Barge-In: If user speaks loudly while agent is speaking, flush immediately
          if (rms > 1200 && stateRef.current === 'speaking') {
            playerRef.current?.flush();
            setState('interrupted');
            setTimeout(() => {
              if (stateRef.current === 'interrupted') setState('listening');
            }, 300);
          } else if (stateRef.current !== 'speaking' && stateRef.current !== 'connecting' && stateRef.current !== 'interrupted') {
            setState('listening');
          }
          
          if (sessionRef.current) {
            const uint8 = new Uint8Array(pcm16Data.buffer);
            let binary = '';
            for (let i = 0; i < uint8.byteLength; i++) {
              binary += String.fromCharCode(uint8[i]);
            }
            const base64 = btoa(binary);
            
            sessionRef.current.send({
              realtimeInput: {
                mediaChunks: [{
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64
                }]
              }
            });
          }
        };
      }
      
      updateActivity(connectAct, 'success');
      addActivity('Voice session ready — Listening', 'success');
      setState('listening');

    } catch (err: unknown) {
      console.error("[Aura] startCall failure:", err);
      if (err instanceof MicrophoneError) {
        setErrorMessage("MICROPHONE ACCESS REQUIRED");
        setErrorDetail(err.userMessage);
      } else if (err instanceof Error) {
        setErrorMessage("UNABLE TO START CALL");
        setErrorDetail(err.message);
      } else {
        setErrorMessage("UNABLE TO START CALL");
        setErrorDetail("An unexpected error occurred while starting the call.");
      }
      setState('error');
    } finally {
      isConnectingRef.current = false;
    }
  };

  const getAudioLevel = useCallback(() => {
    if (state === 'speaking') {
      return playerRef.current?.getVolume() || 0;
    } else if (state === 'listening' || state === 'connecting' || state === 'thinking') {
      return recorderRef.current?.getVolume() || 0;
    }
    return 0;
  }, [state]);

  return { 
    state, 
    messages, 
    activities, 
    errorMessage, 
    errorDetail, 
    startCall, 
    endCall, 
    getAudioLevel 
  };
}
