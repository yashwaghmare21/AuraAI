# Agent Rules for Aura Voice Agent

- Follow `docs/PRD.md`, `docs/TRD.md`, `docs/ARCHITECTURE.md` strictly.
- Small steps, TypeScript strict, no unused deps.
- Never put API keys in client code. Secrets only in `.env.local`.
- Before writing any Gemini Live API code, open the official docs in the browser and use the CURRENT SDK (`@google/genai`) syntax. Do not rely on memory.
- After each step, run the dev server and verify before moving on.
