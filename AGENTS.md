# AGENTS.md — Architecture, Clinical Accuracy & Teammate Onboarding Notes

This document summarizes non-obvious architectural decisions, clinical safety guardrails, and verification steps for teammates working on **PulseAid**.

---

## 1. Core Architectural Decisions

### A. 100% Offline-First Baseline Protocols (`src/protocols.ts`)
- **Why**: In a real emergency (or a congested hackathon venue Wi-Fi), a first-aid app must **never** wait on a network request or LLM call to show life-saving steps.
- **How**: All 7 core emergency protocols (**CPR / Unresponsive**, **Choking**, **Severe Bleeding**, **Burns & Scalds**, **Fainting / Unresponsive Breathing**, **Severe Allergic Reaction / Anaphylaxis**, and **Sprains & Fractures**) are statically bundled in `src/protocols.ts` with full **Adult**, **Child (1–12 yrs)**, and **Infant (under 1 yr)** clinical variations aligned with standard **British Red Cross / St John Ambulance / AHA** guidelines.
- **PWA Service Worker**: `vite.config.ts` registers `VitePWA` (`registerType: 'autoUpdate'`, `devOptions.enabled: true`) so the app shell, scripts, styles, and fonts are precached for full offline execution after the first page load.

### B. Multimodal Photo + Text Specialisation (`server.ts` -> `/api/specialise-protocol`)
- **Runtime Isolation**: Gemini API calls (`@google/genai` SDK using `gemini-3.8-flash` with `ThinkingLevel.HIGH` and a strict JSON `responseSchema`) live exclusively on the Express backend (`server.ts`) and are triggered **only** when a user explicitly submits an optional photo and/or descriptive text in the **Specialise Protocol** drawer (or uses the **Protocol Authoring Studio**).
- **Grounded Adaptation**: When specialising an emergency protocol (e.g., user attaches a photo of a scald on a forearm or describes *"bleeding from palm with glass shard embedded"*), the server passes both the baseline Red Cross / St John protocol and the user's multimodal input (`inlineData` base64 image + text description) to Gemini with `ThinkingLevel.HIGH`. This ensures the specialised steps respect critical medical prohibitions (e.g., never pulling out an embedded object, never applying ice to burns).
- **Graceful Offline Fallback**: If the device is offline or the API key is unconfigured when the user submits a photo/note, the app does **not** crash or block—it attaches their photo and notes locally as a responder reference banner on top of the verified offline baseline protocol.

### C. Human-in-the-Loop Safety & Privacy Guardrails
- **Never Auto-Dial**: The persistent **Call Emergency Services** button uses a native `<a href="tel:999">` (or `112` / `911`) anchor without JavaScript `window.open` popups or confirmation modals. On mobile and desktop OSes, this opens the native phone dialer pre-filled with the emergency number so the human responder explicitly confirms the call.
- **Zero Background Data Transmission**: Photos and situational notes stay in browser memory unless the user explicitly clicks **"Generate Specialised Steps"**, and the server holds zero persistent database storage of medical images or personal data.

### D. Zero-Asset Web Audio 110 BPM Metronome & Web Speech Hands-Free Engine (`src/audioEngine.ts`)
- **110 BPM CPR Metronome**: Uses the browser's native `AudioContext` oscillator (`880 Hz` downbeat / `660 Hz` upbeat click every `545.45 ms` = `110 BPM`) rather than an external `.mp3` file, guaranteeing zero-latency offline playback inside the CPR wizard steps.
- **Hands-Free Voice Narration & Voice Commands**:
  - Uses `window.speechSynthesis` to read each step's `voiceScript` aloud automatically when Hands-Free Narration is active.
  - Uses `SpeechRecognition` / `webkitSpeechRecognition` to listen for spoken `"next"`, `"back"`, and `"repeat"` commands so a responder whose hands are occupied can navigate steps hands-free.

---

## 2. Quick Setup & Commands

```bash
# Start full-stack dev server (Express API + Vite middleware on port 3000)
npm run dev

# Run the automated headless verification suite across all 7 protocols, age branches, dialer links, and API schema
npm run verify

# Type-check the codebase
npm run lint

# Build production bundle
npm run build
```

---

## 3. Adding or Updating Clinical Protocols

1. Open `src/protocols.ts`.
2. Every `EmergencyProtocol` must define non-empty `steps.default` (and `steps.adult`, `steps.child`, `steps.infant` when `supportsAgeGroups: true`).
3. Every `ProtocolStep` must include `stepNumber`, `instruction`, `detail`, and `voiceScript`.
4. Run `npm run verify` after any content change—the verification script asserts that every category, age group, step field, and emergency dialer configuration is complete and crash-free.
