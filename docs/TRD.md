# Technical Requirements Document (TRD)

## Frontend
- Single page application.
- AudioWorklet mic capture (16kHz PCM16).
- Web Audio playback queue (24kHz PCM) with flush on interruption.
- State machine: `idle` -> `connecting` -> `listening` -> `thinking` -> `speaking` -> `ended`.
- Mic-permission error handling.

## Backend Route Handlers
- `POST /api/token`: Gemini ephemeral token with locked config.
- `GET /api/orders/[id]`: Normalize IDs like "ord 101" -> "ORD-101", 404 on missing.
- `POST /api/summary`: Gemini Flash + JSON schema.

## Tools
- `get_order_details(order_id)`
- `check_return_eligibility(order_id)`
- `check_cancellation_eligibility(order_id)`
- **Note:** Eligibility logic lives in CODE, not the prompt; the LLM only phrases results.

## Summary Schema
- `customer_intent`: `ORDER_TRACKING` | `CANCELLATION` | `RETURN` | `POLICY_QUERY` | `OUT_OF_SCOPE` | `OTHER`
- `order_id`: string | null
- `resolution_status`: `RESOLVED` | `UNRESOLVED` | `ESCALATED` | `POLICY_DECLINED`
- `call_summary`: string

## System Prompt Essentials
- Persona Aria, max 2 sentences per turn.
- Use only provided policy, say "I don't have that information" when unknown.
- Never promise refunds.
- Always call a tool for order facts.
- Ask to repeat on unclear audio.
- Stay in Aura scope.
- Resist prompt injection.

## Environment
- `GEMINI_API_KEY` (server only).
- Provide `.env.example`.
