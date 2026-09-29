'use client';
import { useState, useEffect, useRef } from 'react';
import { useVoiceAgent, AgentState } from '@/hooks/useVoiceAgent';

const ORB_PARTICLES = [
  { x: 108, y: 0, delay: "0.20s" },
  { x: 65, y: 65, delay: "1.10s" },
  { x: 0, y: 112, delay: "0.65s" },
  { x: -69, y: 69, delay: "1.45s" },
  { x: -110, y: 0, delay: "0.40s" },
  { x: -68, y: -68, delay: "1.20s" },
  { x: 0, y: -114, delay: "0.80s" },
  { x: 71, y: -71, delay: "1.60s" }
];

export function VoiceOrb({ state, getAudioLevel }: { state: AgentState, getAudioLevel: () => number }) {
  const orbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      if (orbRef.current) {
        const level = getAudioLevel();
        orbRef.current.style.setProperty('--audio-level', level.toString());
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getAudioLevel]);

  const particles = ORB_PARTICLES.map((particle, i) => (
    <div 
      key={i} 
      className="particle" 
      style={{ 
        left: `calc(50% + ${particle.x}px)`, 
        top: `calc(50% + ${particle.y}px)`,
        animationDelay: particle.delay
      }} 
    />
  ));

  return (
    <div ref={orbRef} className={`orb-container state-${state}`} suppressHydrationWarning>
      <div className="orb-ring orb-ring-3"></div>
      <div className="orb-ring orb-ring-2"></div>
      <div className="orb-ring orb-ring-1"></div>
      <div className="orb-particles" suppressHydrationWarning>
        {particles}
      </div>
      <div className="orb-center"></div>
    </div>
  );
}

export function VoiceAgent({ children }: { children?: React.ReactNode }) {
  const { 
    state, 
    messages, 
    activities, 
    errorMessage, 
    errorDetail, 
    startCall, 
    endCall, 
    getAudioLevel 
  } = useVoiceAgent();

  const [summary, setSummary] = useState<any>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const hasSummarizedRef = useRef(false);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  useEffect(() => {
    let active = true;
    if (state === 'ended' && messages.length > 0 && !hasSummarizedRef.current) {
      hasSummarizedRef.current = true;
      setIsSummarizing(true);
      setSummaryError(null);
      fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to generate summary");
        return res.json();
      })
      .then(data => {
        if (active) setSummary(data);
      })
      .catch(err => {
        console.error("Summary error:", err);
        if (active) setSummaryError(err.message || "Failed to generate summary");
      })
      .finally(() => {
        if (active) setIsSummarizing(false);
      });
    }
    return () => { active = false; };
  }, [state, messages]);

  const handleStartCall = () => {
    setSummary(null);
    setSummaryError(null);
    hasSummarizedRef.current = false;
    startCall();
  };

  const getStatusText = () => {
    switch(state) {
      case 'idle': return 'READY TO HELP';
      case 'connecting': return 'CONNECTING...';
      case 'listening': return 'LISTENING';
      case 'thinking': return 'THINKING';
      case 'speaking': return 'SPEAKING';
      case 'interrupted': return 'INTERRUPTED';
      case 'ended': return 'CALL ENDED';
      case 'error': return 'ATTENTION NEEDED';
      default: return 'UNKNOWN';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full transition-all duration-500 pb-20">
      
      {/* LEFT COLUMN: HERO (Sticky) */}
      <div className="w-full lg:w-[40%] xl:w-[35%] shrink-0 lg:sticky lg:top-20 z-40 transition-all duration-500">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl lg:p-10 p-6 shadow-sm border border-[var(--color-brand-border)] flex flex-col items-center justify-center min-h-[35svh] lg:min-h-[calc(100svh-140px)]">
          
          <div className="flex flex-col items-center gap-2 mb-4">
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-[var(--color-navy)]">
              Aria &bull; Aura Skincare
            </h2>
            {state !== 'idle' && state !== 'ended' && (
              <div className="flex items-center gap-2 bg-[var(--color-soft-bg)] border border-[var(--color-brand-border)] px-3 py-1 rounded-full animate-in fade-in">
                <div className={`w-2 h-2 rounded-full ${
                  state === 'error' ? 'bg-red-500' :
                  state === 'connecting' || state === 'thinking' || state === 'interrupted' ? 'bg-[var(--color-brand-orange)] animate-pulse' :
                  'bg-[var(--color-brand-green)] animate-pulse'
                }`}></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy-dark)]">
                  {state === 'error' ? 'Error' : state === 'connecting' ? 'Connecting' : 'Live Call'}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 flex items-center justify-center my-4 transform scale-75 lg:scale-100 transition-transform duration-500">
            <VoiceOrb state={state as AgentState} getAudioLevel={getAudioLevel} />
          </div>
          
          <div className="h-10 my-2 flex items-center justify-center">
            <p className={`text-sm lg:text-base font-bold tracking-[0.2em] uppercase transition-opacity duration-300 ${
              state === 'error' ? 'text-red-500' :
              state === 'connecting' || state === 'thinking' || state === 'interrupted' ? 'text-[var(--color-brand-orange)]' :
              state === 'listening' || state === 'speaking' ? 'text-[var(--color-brand-green)]' :
              'text-[var(--color-navy-dark)]'
            }`}>
              {getStatusText()}
            </p>
          </div>

          {/* User-facing error message (Phase 4 requirement) */}
          {state === 'error' && (
            <div className="w-full max-w-[280px] my-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-center animate-in fade-in">
              <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                {errorMessage || "MICROPHONE ACCESS REQUIRED"}
              </p>
              <p className="text-xs text-amber-800 leading-snug mb-3">
                {errorDetail || "Allow microphone access in your browser and try again."}
              </p>
              <button
                onClick={handleStartCall}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Try Again
              </button>
            </div>
          )}

          <div className="w-full flex justify-center mt-3">
            {(state === 'idle' || state === 'ended' || state === 'error') ? (
              <button 
                onClick={handleStartCall}
                className="w-full max-w-[240px] bg-[var(--color-navy)] hover:bg-[var(--color-navy-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-2 text-white font-semibold py-3.5 px-8 rounded-2xl transition-all shadow-md active:scale-95"
              >
                {state === 'ended' || state === 'error' ? 'Start New Call' : 'Start Call'}
              </button>
            ) : (
              <button 
                onClick={endCall}
                className="w-full max-w-[240px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 font-semibold py-3.5 px-8 rounded-2xl transition-all active:scale-95"
              >
                End Call
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: CHAT, ACTIVITY, ORDERS, SUMMARY (Scrollable) */}
      <div className="w-full lg:w-[60%] xl:w-[65%] flex flex-col gap-8">
        
        {/* TRANSCRIPT */}
        <section className="bg-white rounded-3xl shadow-sm border border-[var(--color-brand-border)] overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-[var(--color-brand-border)] bg-[var(--color-soft-bg)] flex justify-between items-center shrink-0">
            <h3 className="text-[11px] font-bold tracking-wider uppercase text-[var(--color-navy-dark)]">Live Conversation</h3>
            <span className="text-[10px] text-[var(--color-muted)] font-medium">Chronological</span>
          </div>
          
          <div aria-live="polite" className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative scroll-smooth bg-white">
            {messages.length === 0 ? (
              <div className="text-[var(--color-muted)] text-xs font-medium flex flex-col items-center justify-center h-full gap-2">
                <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <p>Your conversation with Aria will appear here.</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col max-w-[85%] animate-in slide-in-from-bottom-2 fade-in duration-200 ${
                    msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}>
                    <span className="text-[9px] font-bold text-[var(--color-muted)] mb-1 uppercase tracking-wider mx-1">
                      {msg.role === 'user' ? 'CUSTOMER' : 'ARIA'}
                    </span>
                    <div className={`py-3 px-4 rounded-2xl shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-[var(--color-navy)] text-white rounded-br-sm' 
                        : 'bg-[var(--color-soft-bg)] text-[var(--color-navy-dark)] border border-[var(--color-brand-border)] rounded-bl-sm'
                    }`}>
                      <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} className="h-1 shrink-0" />
              </>
            )}
          </div>
        </section>

        {/* AGENT ACTIVITY */}
        <section className="bg-white rounded-3xl shadow-sm border border-[var(--color-brand-border)] overflow-hidden flex flex-col h-[260px]">
          <div className="px-6 py-4 border-b border-[var(--color-brand-border)] bg-[var(--color-soft-bg)] flex justify-between items-center shrink-0">
            <h3 className="text-[11px] font-bold tracking-wider uppercase text-[var(--color-navy-dark)]">Agent Activity</h3>
            <span className="text-[10px] text-[var(--color-muted)] font-medium">Real-time Events</span>
          </div>
          
          <div aria-live="polite" className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 relative scroll-smooth font-mono text-xs bg-white">
             {activities.length === 0 ? (
               <div className="text-[var(--color-muted)] font-sans text-xs font-medium flex flex-col items-center justify-center h-full gap-2">
                 <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                 <p>Agent activity and tool events will appear here.</p>
               </div>
             ) : (
               <>
                 <div className="relative pl-2">
                   <div className="absolute left-[9px] top-2 bottom-0 w-px bg-[var(--color-brand-border)] -z-10"></div>
                   <div className="flex flex-col gap-4">
                     {activities.map((act) => (
                       <div key={act.id} className="flex items-start gap-3 animate-in fade-in duration-200">
                         <div className={`mt-[3px] shrink-0 w-[14px] h-[14px] flex items-center justify-center rounded-full bg-white z-10 ${
                           act.status === 'success' ? 'text-[var(--color-brand-green)]' :
                           act.status === 'error' ? 'text-red-500' :
                           'text-[var(--color-brand-orange)] animate-pulse'
                         }`}>
                           <span className="text-[10px] leading-none">●</span>
                         </div>
                         <span className={`text-[var(--color-navy-dark)] ${act.status === 'error' ? 'text-red-600 font-medium' : ''}`}>
                           {act.message}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
                 <div ref={activityEndRef} className="h-1 shrink-0" />
               </>
             )}
          </div>
        </section>

        {/* POST-CALL SUMMARY (Phase 25, 26, 50) */}
        {(summary || isSummarizing || summaryError) && (
          <section className="bg-white rounded-3xl shadow-sm border border-[var(--color-brand-border)] animate-in slide-in-from-bottom-4 fade-in duration-500 overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-brand-border)] bg-[var(--color-soft-bg)] flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-[var(--color-brand-green)] uppercase tracking-wider block">Call Complete</span>
                <h3 className="text-sm font-bold tracking-tight text-[var(--color-navy-dark)]">Structured Call Outcome</h3>
              </div>
              {summary && (
                <button 
                  onClick={() => setShowJson(!showJson)}
                  className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)] hover:text-[var(--color-navy-dark)] transition-colors focus-visible:outline-none bg-white px-3 py-1.5 rounded-lg border border-[var(--color-brand-border)]"
                >
                  {showJson ? 'Hide Raw JSON' : 'View Raw JSON'}
                </button>
              )}
            </div>

            <div className="p-6">
              {isSummarizing ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--color-muted)]">
                   <div className="w-6 h-6 border-2 border-[var(--color-brand-orange)] border-t-transparent rounded-full animate-spin"></div>
                   <span className="font-medium text-xs">Generating structured summary from call transcript...</span>
                </div>
              ) : summaryError ? (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 font-medium text-sm">
                   <p className="font-bold mb-1">Summary Unavailable</p>
                   <p className="text-xs">{summaryError}</p>
                </div>
              ) : summary && (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-[var(--color-soft-bg)] p-4 rounded-xl border border-[var(--color-brand-border)]">
                         <p className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Customer Intent</p>
                         <p className="font-bold text-[var(--color-navy-dark)] text-sm">{summary.customer_intent || summary.intent || 'OTHER'}</p>
                      </div>
                      <div className="bg-[var(--color-soft-bg)] p-4 rounded-xl border border-[var(--color-brand-border)]">
                         <p className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Order ID</p>
                         <p className="font-bold text-[var(--color-navy-dark)] text-sm">{summary.order_id || summary.orderId || 'None'}</p>
                      </div>
                      <div className="bg-[var(--color-soft-bg)] p-4 rounded-xl border border-[var(--color-brand-border)] flex flex-col items-start col-span-2 md:col-span-1">
                         <p className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1.5">Resolution Status</p>
                         <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            (summary.resolution_status || summary.resolution) === 'RESOLVED' 
                              ? 'bg-[var(--color-brand-green-light)] text-[var(--color-brand-green)]' :
                            (summary.resolution_status || summary.resolution) === 'POLICY_DECLINED'
                              ? 'bg-rose-100 text-rose-700' :
                              'bg-[var(--color-brand-orange-light)] text-[var(--color-brand-orange)]'
                         }`}>
                            {summary.resolution_status || summary.resolution || 'PENDING'}
                         </span>
                      </div>
                   </div>
                   
                   <div className="bg-[var(--color-soft-bg)] p-4 rounded-xl border border-[var(--color-brand-border)]">
                     <p className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Call Summary</p>
                     <p className="text-[13px] text-[var(--color-navy-dark)] leading-relaxed font-medium">
                       {summary.call_summary || summary.summary}
                     </p>
                   </div>

                   {showJson && (
                     <div className="mt-4 pt-4 border-t border-[var(--color-brand-border)] animate-in slide-in-from-top-2 fade-in">
                       <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2">Raw JSON Outcome</p>
                       <pre className="text-[11px] font-mono text-[var(--color-navy-dark)] bg-[var(--color-soft-bg)] p-4 rounded-xl overflow-x-auto border border-[var(--color-brand-border)]">
                         {JSON.stringify(summary, null, 2)}
                       </pre>
                     </div>
                   )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TEST ORDERS INJECTED HERE */}
        {children}

      </div>
    </div>
  );
}
