# Architecture

## Diagram

```mermaid
sequenceDiagram
    participant Browser
    participant API
    participant GeminiLive
    participant MockDB

    Browser->>AudioWorklet: Mic capture (PCM)
    AudioWorklet->>GeminiLive: WebSocket (PCM)
    GeminiLive-->>Browser: VAD end-of-turn
    
    rect rgb(200, 220, 240)
        Note right of GeminiLive: Tool Call execution
        GeminiLive->>Browser: tool_call (e.g. get_order_details)
        Browser->>API: GET /api/orders/:id
        API->>MockDB: Query
        MockDB-->>API: Order Data
        API-->>Browser: Response
        Browser->>GeminiLive: tool_response
    end

    GeminiLive->>Browser: spoken answer (PCM playback)
    
    note over Browser,GeminiLive: On Interrupted event: flush playback queue

    Browser->>API: End Call -> POST /api/summary
    API->>GeminiFlash: Generate Summary + JSON
    GeminiFlash-->>API: Summary Result
    API-->>Browser: UI display
```

## Turn Flow
- VAD end-of-turn -> model decides tool -> toolCall -> API -> toolResponse -> spoken answer.
- On interrupted event: flush playback queue.

## Rationale
- Fewest network hops = lowest latency.
- Free tier hosting suitable.
- Secrets kept server-side.
- Deterministic business logic.

## Non-Functional Requirements (NFRs)
- First audio < 1.5s.
- Tool round trip < 300ms.
- Reconnect handling.
- Ephemeral tokens with short TTL.
- 5-min session cap.
- Per-turn latency logging.
- Chrome/Edge first.
- Safari AudioContext resume on click.

## Scale Notes (1,000 calls/day)
- Auth + rate limits.
- Cost caps.
- Telephony via SIP/Twilio.
- Postgres transcripts.
- Real order APIs.
- Automated eval suite.
- Human handoff.
- Monitoring.
- Provider failover.

## Hosting
- Hosted on Vercel.
