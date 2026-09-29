# Aura Skincare AI Voice CX Agent

A real-time, browser-based AI voice customer support agent built for **Aura Skincare** (a premium organic Indian skincare brand). The agent, **Aria**, conducts full-duplex conversational voice support in natural Indian English, executes deterministic order lookups, deterministically enforces company policies (returns, cancellations, shipping, and COD), supports client-side barge-in, and generates structured call summaries.

---

## Architecture Overview

```
                                  +-----------------------------+
                                  |    Customer Web Browser     |
                                  |                             |
                                  |  [Web Audio API (16kHz PCM)]|
                                  |  [AudioRecorder Worklet]    |
                                  |  [SpeechRecognition (Local)]|
                                  |  [VoiceOrb Component]       |
                                  +--------------+--------------+
                                                 |
                   +-----------------------------+----------------------------+
                   | (User gesture triggers init)|                            |
                   v                             v                            v
          POST /api/token              WebSocket (Audio Chunks)       POST /api/summary
         (Ephemeral Token)                       |                     (Post-call Outcome)
                   |                             v                            |
                   v                  +----------------------+                v
        Google GenAI SDK (Server)     |  Gemini Live Session |     Gemini Flash (Server)
       [GEMINI_API_KEY protected]     | (gemini-2.0-flash-exp|    [Structured JSON Schema]
                                      |  Voice: Aoede / PCM) |
                                      +----------+-----------+
                                                 |
                                         Tool Function Calls
                                        (e.g., get_order_details)
                                                 |
                                                 v
                                    +------------------------+
                                    | Next.js API & Services |
                                    | GET /api/orders/:id    |
                                    | GET /api/tools         |
                                    +-----------+------------+
                                                |
                                                v
                                    +------------------------+
                                    | Deterministic Policies |
                                    | & SQLite / Prisma DB   |
                                    +------------------------+
```

---

## Key Features & Assessment Requirements

1. **Full-Duplex Voice Conversation**:
   - Audio input captured at 16kHz PCM via an `AudioWorkletProcessor` (`recorder-worklet.js`) and streamed over WebSockets to Gemini Live.
   - 24kHz PCM audio received from Gemini Live, queued, and played through browser speakers via `AudioBufferSourceNode`.
2. **Deterministic Policy Enforcement**:
   - **Shipping**: Free delivery on orders ₹499 and above. ₹50 fee on orders below ₹499. Standard delivery in 3–5 business days.
   - **Returns**: Eligible within 7 days of delivery only. Items must be unopened, unused, and in original packaging. Damaged/defective items must be reported within 48 hours of delivery with photos for replacement.
   - **Cancellations**: Allowed ONLY when status is `Processing`. If `Out for Delivery` or `Shipped`, cancellation is strictly rejected, and the customer is advised to refuse delivery at the doorstep.
   - **Cash on Delivery (COD)**: Available up to ₹2,500 via cash or UPI at the doorstep.
   - **Out-of-Scope**: Politely declines non-Aura requests (e.g. flight bookings, general trivia).
3. **Deterministic Evaluation Fixtures (Mock DB)**:
   - `ORD-101`: Priya Sharma | Vitamin C Serum (30ml) | ₹699 | Status: `Out for Delivery` (BlueDart BD-982103, expected by 6 PM today). Cancellation is not allowed.
   - `ORD-102`: Rahul Verma | Hydrating Sunscreen SPF 50 | ₹499 | Status: `Delivered` (Delivered 14 days ago). Return is not allowed (past 7-day return window).
   - `ORD-103`: Ananya Patel | Green Tea Face Wash + Toner | ₹850 | Status: `Processing`. Cancellation is allowed.
4. **Barge-in / Interruption Handling**:
   - If the user interrupts Aria while she is speaking, local mic energy triggers immediate audio queue flushing (`flush()`) and transitions the state to `INTERRUPTED` before returning to `LISTENING`.
   - Also integrates with Gemini Live's `serverContent.interrupted` event.
5. **Real-time Dual Transcript**:
   - Captures customer speech in real time alongside Aria's spoken responses into a chronological transcript.
6. **Structured Post-Call Summary**:
   - Uses server-side Gemini Flash with strict JSON Schema output (`customer_intent`, `order_id`, `resolution_status`, `call_summary`).
7. **Production Security**:
   - Master `GEMINI_API_KEY` is kept strictly server-side. Ephemeral tokens are minted via `/api/token`.

---

## Local Setup

### Prerequisites
- Node.js 18+ (tested on Node 22+)
- npm or pnpm
- Valid Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd aura-voice-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   Add your Gemini API Key in `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Initialize Database**:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000) in Google Chrome, Microsoft Edge, or Safari.

6. **Run Automated Tests**:
   ```bash
   npm test
   ```

---

## Architectural Questions & Deep Dive

### 1. Why this architecture and technology stack?
- **Next.js (App Router)**: Combines a performant React 19 UI with secure serverless API routes. This allows keeping the master `GEMINI_API_KEY` and SQLite/Prisma operations server-side while exposing ephemeral tokens and lightweight endpoints to the client.
- **Direct WebSocket to Gemini Live (`@google/genai`)**: Rather than inserting a server-side WebSocket proxy (which adds network hop latency and double bandwidth costs), the client connects directly to Google's Live endpoint using short-lived ephemeral session tokens.
- **Web Audio API & AudioWorklet**: Capturing audio inside an `AudioWorkletProcessor` prevents UI thread stalls from dropping audio packets. Rendering the Voice Orb via a decoupled `requestAnimationFrame` loop driven by `AnalyserNode` provides 60fps responsiveness without causing React state re-renders 60 times a second.
- **Deterministic Policy Layer**: Crucial business rules (shipping thresholds, cancellation eligibility based on order status, return window dates) are computed deterministically in TypeScript service code, rather than leaving policy decisions to LLM guesswork.

### 2. What was the most difficult part and how was it solved?
- **Browser Autoplay & AudioContext Gesture Policies**: Modern browsers aggressively suspend `AudioContext` instances created outside of direct user gestures (such as during SSR or `useEffect`). Initial attempts to pre-initialize audio failed silently. We solved this by strictly instantiating and resuming both the recording and playback `AudioContext` synchronously inside the `onClick` event handler of the "Start Call" button.
- **Barge-In (Interruption) Latency**: Waiting for the server to recognize user speech and send an `interrupted` packet caused noticeable audio overlap. We introduced a client-side RMS voice-activity detector on the incoming microphone stream that flushes the active `AudioBufferSourceNode` queue instantly when the user speaks over the agent, transitioning the UI state machine to `INTERRUPTED` without waiting for network round-trips.
- **Server/Client Hydration Safety**: React 19 hydration mismatches occurred due to non-deterministic math in floating orb particles and locale-dependent date formatting. We stabilized particle math with deterministic precomputed angles and radii, and routed all date rendering through a unified `formatDate.ts` utility locked to the `Asia/Kolkata` timezone.

### 3. What would be improved with one additional week?
- **WebRTC / Dedicated Voice Activity Detection (VAD) WASM**: Integrate Silero VAD as a WebAssembly module inside the AudioWorklet to gate microphone packet transmission, reducing unnecessary upstream token streaming during background silence.
- **Session Reconnection & Resilience**: Implement automatic session resumption with exponential backoff if the user experiences transient Wi-Fi drops.
- **CRM & Telephony Integration**: Connect order statuses to a live Shopify/WooCommerce webhook feed and add SIP/Twilio trunking for inbound telephone calls.
- **Multi-Turn Audio Feedback**: Add subtle haptic/audio chime cues when Aria enters the `LISTENING` and `THINKING` states.

### 4. What changes would be required for 1,000 conversations/day?
- **Database & State Scaling**: Migrate from local SQLite to a managed PostgreSQL cluster (e.g., Supabase / Neon) with connection pooling (Prisma Accelerate or PgBouncer).
- **Rate Limiting & Abuse Prevention**: Implement Redis-backed sliding-window rate limiting (Upstash Redis) on `/api/token` and `/api/summary` to limit calls per IP/session and prevent runaway API token bills.
- **Observability & Guardrails**: Add OpenTelemetry tracing and LangSmith/Helicone logging to track latency percentiles (TTFB, response latency), tool execution success rates, and token consumption per call.
- **Serverless Concurrency & Quotas**: Ensure Google Cloud Gemini API project quotas match peak concurrent WebSocket limits (1,000 calls/day translates to ~20–30 concurrent sessions at peak hours).
- **Automated Redaction (PII)**: Add automated PII masking on customer transcripts prior to storing summaries in database tables.

---

## Evaluation Scenarios Matrix

| Scenario | User Speech / Action | Expected Result | Policy / Tool |
| :--- | :--- | :--- | :--- |
| **1. Order Tracking** | *"Where is my order ORD-101?"* | Aria reports: Out for Delivery by BlueDart (BD-982103), expected by 6 PM today. | `get_order_details('ORD-101')` |
| **2. Cancellation (Declined)** | *"Can I cancel ORD-101?"* | Cancellation declined (Out for Delivery). Advises customer to refuse at door. | `check_cancellation_eligibility` |
| **3. Cancellation (Eligible)** | *"Can I cancel order ORD-103?"* | Cancellation allowed (Status: Processing). | `check_cancellation_eligibility` |
| **4. Return (Declined)** | *"I want to return ORD-102."* | Return declined (delivered 14 days ago, exceeds 7-day policy). | `check_return_eligibility` |
| **5. Missing Order ID** | *"Where is my order?"* | Aria asks customer to provide the order ID. Does not call tool with undefined. | Conversational guardrail |
| **6. Invalid Order ID** | *"Where is ORD-999?"* | Returns controlled `ORDER_NOT_FOUND`. Aria asks user to verify/repeat. | Graceful degradation |
| **7. Shipping Policy** | *"How much is shipping for ₹300?"* | Reports ₹50 shipping fee; free delivery only on orders above ₹499. | Shipping policy |
| **8. COD Policy** | *"Can I pay cash on delivery for ₹3,000?"*| Reports COD is only available up to ₹2,500 via Cash or UPI at doorstep. | COD policy |
| **9. Out-of-Scope** | *"Book me a flight to Goa."* | Politely declines; states she only assists with Aura Skincare support. | Out-of-scope guardrail |
| **10. End Call** | Click `[End Call]` | Session closes, microphone stops, transcript finalized, structured summary appears. | Call lifecycle |

---

## License
MIT
