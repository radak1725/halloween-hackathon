# PulseAid — Calm, Hands-Free Emergency First Aid Companion

PulseAid is a high-contrast, offline-first emergency first aid web application designed for panicking bystanders to execute medically accurate, sequential life-saving steps (Red Cross / St John Ambulance aligned) with hands-free voice narration, spoken command navigation, a 110 BPM CPR metronome, persistent one-tap emergency dialing, and optional **Photo + Text Protocol Specialisation**.

## User Review & Critical Decisions

> [!IMPORTANT]
> Updated to include your requested **Optional Photo + Descriptive Text Specialisation** flow. Please review the updated plan below and click **Proceed** when ready to build.

- **Confirmed Decision 1 — Optional Photo + Descriptive Text Protocol Specialisation**: Users can optionally attach or snap a **photo** of the injury/scene and enter **descriptive text** (e.g., *"Scald on forearm from boiling kettle, camping with only bottled water"* or *"Deep cut on palm from broken glass"*) either from the Home Screen or inside any active Emergency Wizard to generate a tailored, situation-specific step-by-step protocol via multimodal Gemini (`gemini-3.8-flash` with `ThinkingLevel.HIGH`).
- **Confirmed Decision 2 — Offline-First Guarantee & Explicit Human-in-the-Loop Privacy**: All 7 core protocols work 100% offline with zero network dependency. Adding a photo or text is strictly optional and only transmitted when the user explicitly taps **"Specialise Protocol"** (never auto-transmitted or stored on external servers). If offline, the photo and notes attach locally as a responder reference card while running the standard offline protocol.
- **Confirmed Decision 3 — Clinical Interactive Helpers**: Embed the **110 BPM audio-visual CPR metronome** (Web Audio API synthesized beat + high-contrast visual pulse) and **Adult / Child / Infant casualty protocol toggle** inside relevant emergency wizards.
- **Confirmed Decision 4 — Hands-Free Voice Guidance & Voice Commands**: Automatically read each step aloud via the browser Web Speech Synthesis API (`speechSynthesis`) when Hands-Free Mode is active, paired with Web Speech Recognition listening for spoken **"Next"**, **"Back"**, and **"Repeat"** commands.
- **Confirmed Decision 5 — Visual Posture & Regional Dialing**: Launch in a **Daylight Clinical High-Contrast White** theme (`#FFFFFF` canvas, `#0F172A` ink, `#DC2626` emergency crimson) with a persistent 1-tap **999 / 112 / 911** region selector and `tel:` dialer link that opens the native phone dialer without auto-dialing or confirmation modals.

---

## 1. Overview & Core Concept

- **What It Does**: Walks a bystander through 7 critical emergency scenarios (**CPR / Unresponsive**, **Choking**, **Severe Bleeding**, **Burns & Scalds**, **Fainting / Unresponsive Breathing**, **Severe Allergic Reaction / Anaphylaxis**, and **Sprains & Fractures**) one clear action at a time with zero runtime network requirement—plus an optional **"Specialise with Photo & Details"** mode that adapts the step-by-step wizard to a specific injury photo and situational description.
- **Target Audience / Persona**: An untrained or stressed bystander in the first 3 minutes of a medical emergency whose hands may be occupied, as well as hackathon judges evaluating medical accuracy, multimodal AI utility, accessibility, offline resilience, and human-in-the-loop safety.
- **Key Value**: Eliminates cognitive overload during panic by replacing dense paragraphs with single-action screens, instant voice readout, hands-free voice navigation, age-tailored variations (Adult, Child, Infant), optional multimodal injury/context specialisation, and an ever-present one-tap emergency services dialer.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Launch & Non-Blocking Disclaimer Banner / Modal**: Displays a clear, high-contrast medical disclaimer ("Supports but does not replace professional medical help or training") that can be dismissed in one tap (or bypassed immediately if the user taps the persistent Call Emergency Services bar or selects an emergency card).
  2. **Home Triage Grid**: Large, high-contrast emergency cards arranged in a responsive multi-column desktop layout (`max-w-6xl` 2–3 column grid on desktop, full-width thumb-friendly cards on mobile) with oversized typography, semantic hazard accents, a prominent **"Specialise with Photo or Details"** action bar, and a top-bar region switcher (`999 UK`, `112 EU`, `911 US`).
  3. **Optional Photo + Text Specialisation Flow (Drawer / Modal)**:
     - Accessible both from the Home Screen (*"Have a specific injury or situation? Add optional photo & description"*) and directly inside any active Emergency Wizard (*"Specialise Steps for This Injury"* button).
     - **Photo Input**: Drag-and-drop, file picker, or mobile camera capture (`accept="image/*" capture="environment"`) with instant thumbnail preview and one-tap removal.
     - **Descriptive Text Input**: Clear textarea for situational details (e.g., location of injury, cause, available supplies, casualty symptoms) plus quick-tap context chips.
     - **Explicit User Action**: Nothing is uploaded until the user explicitly clicks **"Generate Specialised Steps"**. Once generated, the tailored protocol opens immediately in the step-by-step wizard (with a clear badge showing it was specialised for the provided context, plus a 1-tap toggle to switch back to the standard Red Cross / St John baseline steps at any time).
  4. **Sequential Step-by-Step Wizard**:
     - Displays **one instruction per screen** with a clear step counter (`Step 2 of 6`), large primary action headline, concise clinical sub-points, and explicit "DO NOT" safety callouts where medically critical.
     - **Adult / Child / Infant Selector**: Segmented control at the top of age-sensitive protocols (CPR, Choking) that dynamically adapts compression depth, hand placement, and back-blow technique.
     - **110 BPM CPR Metronome**: On chest compression steps, a one-tap / auto-activatable Web Audio API metronome clicks at 110 BPM with a synchronized visual compression guide ("PUSH HARD & FAST").
     - **Hands-Free Voice & Command Bar**: Reads the current step aloud automatically, provides a one-tap "Repeat Audio" button, and listens for spoken `"Next"`, `"Back"`, or `"Repeat"` commands when microphone voice control is toggled on.
     - **Oversized Bottom Navigation**: Full-width thumb-zone `Previous` and `Next Step` buttons (`min-h-[56px]`).
  5. **Persistent One-Tap Emergency Call Bar**: Fixed across every screen (`<a href="tel:999">` / `112` / `911`). Never triggers a confirmation dialog and never auto-dials without the user confirming in their native phone dialer.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: **Clinical Daylight Utilitarian** — inspired by aviation emergency checklists, Red Cross field manuals, and defibrillator (AED) interfaces. Calm, authoritative, zero visual clutter.
  - *Color Palette & Mood*:
    - `--background`: `#F8FAFC` (Cool Daylight Alabaster 60% canvas) & `#FFFFFF` (Pure White elevated card surface)
    - `--foreground`: `#0F172A` (Deep Slate Ink — 16.5:1 contrast ratio)
    - `--primary` (Emergency Action): `#DC2626` (Clinical Crimson — reserved strictly for the persistent Emergency Call button and critical life-safety alerts)
    - `--accent` (Guidance & Progression): `#0284C7` (Medical Cerulean Blue — used for primary wizard progression, active step indicators, and voice guidance state)
    - `--warning` (Clinical Caution): `#D97706` (Amber — used for "Watch Out / Do Not" clinical cautions)
  - *Typography & Hierarchy*:
    - Display & Action Headings: `Plus Jakarta Sans` (700/800 weight, tight tracking, `text-wrap: balance`, 28px–40px step headlines for instant legibility at arm's length).
    - Body & Clinical Detail: `Public Sans` (500/600 weight, generous 1.55 line height, high x-height for stressed reading).
    - Step Counters & BPM Telemetry: `JetBrains Mono` (`tabular-nums` for step numbers and 110 BPM metronome cadence).
  - *Component Styling & Layout*:
    - Minimum touch target of `48px × 48px` (`56px+` for wizard navigation and emergency call controls).
    - Aggregate sticky header + bottom bar height kept strictly compact to preserve open viewport space for the active step instruction.
    - Zero decorative status dots, zero code-comment headers, and clean unboxed metadata with middle-dot (`·`) separators.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: 100% Static Bundled Clinical Protocols + Service Worker Offline Caching**
  - *Chosen Approach*: Bundle all 7 core emergency protocols (including Adult, Child, and Infant branches) directly in a typed TypeScript clinical database, backed by a Service Worker (`vite-plugin-pwa`) that precaches the entire app shell and assets on first load.
  - *Why*: Guarantees zero network latency and 100% availability in dead zones, basements, or airplane-mode hackathon tests.
  - *Alternatives Considered*: Fetching base protocols from an API at runtime (rejected: violates offline-first life-safety requirement).

- **Decision 2: Multimodal Photo + Text Specialisation Layered Over Verified Baseline Protocols**
  - *Chosen Approach*: When a user optionally provides a photo (base64 `inlineData`) and/or descriptive text, send them to our server-side Express route (`POST /api/specialise-protocol`) which calls `@google/genai` (`gemini-3.8-flash` with `ThinkingLevel.HIGH` and a strict JSON `responseSchema`) grounded in the Red Cross / St John baseline protocol for that category.
  - *Why*: Allows the wizard to tailor step instructions, supply substitutions, and specific warnings to what the user is actually looking at, while always allowing a 1-tap revert to the static verified baseline and graceful offline fallback.

- **Decision 3: Native Web Speech Synthesis + Web Speech Recognition + Web Audio Metronome**
  - *Chosen Approach*: Use browser-native `window.speechSynthesis` for step narration, `SpeechRecognition` for hands-free `"Next" / "Back" / "Repeat"` voice commands, and `AudioContext` oscillators for the 110 BPM CPR metronome.
  - *Why*: Works completely offline for both baseline and specialised protocols with zero audio file downloads or network round-trips.

- **Decision 4: Human-in-the-Loop Privacy & Dialer Safety**
  - *Chosen Approach*: Use standard `<a href="tel:${emergencyNumber}">` links for the persistent Call Emergency Services button, and require explicit user confirmation before sending any optional photo or description to the specialisation endpoint.
  - *Why*: Strictly enforces the human-in-the-loop requirement so the user's OS dialer opens pre-filled and no medical photo or text is ever transmitted without explicit user action.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENT EMERGENCY HEADER & DIALER BAR                 │
│  [PulseAid Brand]   [Region: 999 | 112 | 911]   [CALL EMERGENCY (tel:)]    │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌──────────────────────┐   ┌───────────────────────┐   ┌─────────────────────┐
│   HOME TRIAGE GRID   │   │  STEP-BY-STEP WIZARD  │   │ PHOTO + TEXT        │
│                      │   │                       │   │ SPECIALISER DRAWER  │
│ • Disclaimer Banner  │   │ • Age Toggle          │   │ • Optional Camera / │
│ • 7 Emergency Cards  │   │   (Adult/Child/Infant)│   │   Photo Upload      │
│   (CPR, Choking,     │   │ • Specialised vs      │   │ • Descriptive Notes │
│    Bleeding, Burns,  │   │   Standard Toggle     │   │ • Explicit Consent  │
│    Fainting, Allergy,│   │ • Single Step Card    │   │ • Offline Fallback  │
│    Sprains)          │   │ • Safety Do-Not Box   │   └──────────┬──────────┘
│ • "Specialise with   │   │ • 110 BPM Metronome   │              │
│   Photo/Notes" CTA   │   │ • TTS + Voice Control │              │ HTTP POST
└──────────┬───────────┘   └───────────┬───────────┘              ▼
           │                           │               ┌─────────────────────┐
           └─────────────┬─────────────┘               │ EXPRESS API SERVER  │
                         ▼                             │ /api/specialise     │
┌──────────────────────────────────────────────────┐   │ @google/genai SDK   │
│     OFFLINE CLINICAL PROTOCOL STORE & ENGINES    │   │ gemini-3.8-flash    │
│ • Red Cross / St John Verified Protocol Dataset  │   │ Multimodal (Image + │
│ • Web Audio 110 BPM Oscillator Engine            │   │ Text) + High Think  │
│ • Web Speech TTS & Voice Command Engine          │   └─────────────────────┘
│ • Service Worker (PWA Precache) + LocalStorage   │
└──────────────────────────────────────────────────┘
```

### Data Model & State

- **`EmergencyProtocol`**:
  - `id`: `'cpr' | 'choking' | 'bleeding' | 'burns' | 'fainting' | 'allergic' | 'sprains' | string`
  - `title`: Human-readable emergency title (e.g., `"Unresponsive & Not Breathing (CPR)"`)
  - `shortSummary`: 1-line immediate recognition cue (e.g., `"No response, not breathing normally"`)
  - `urgency`: `'critical' | 'urgent'`
  - `supportsAgeGroups`: `boolean` (enables Adult / Child / Infant protocol switching)
  - `isSpecialised`: `boolean` (indicates whether this protocol was tailored from user photo/text)
  - `specialisationContext`: Optional `{ description?: string; photoDataUrl?: string; baseProtocolId?: string; clinicalSummary?: string }`
  - `steps`: Record keyed by `'default'` or `'adult' | 'child' | 'infant'`, containing ordered `ProtocolStep[]`
- **`ProtocolStep`**:
  - `stepNumber`: `number`
  - `instruction`: Primary bold imperative action (e.g., `"Give 30 chest compressions"`)
  - `detail`: Concise 1–2 sentence how-to guidance (e.g., `"Place the heel of your hand in the center of the chest. Push hard and fast, 5–6 cm deep."`)
  - `voiceScript`: Natural spoken narration string optimized for Text-to-Speech clarity
  - `warning`: Optional explicit safety restriction (e.g., `"Do NOT apply ice, iced water, creams, or butter to a burn."`)
  - `hasMetronome`: Optional boolean enabling the 110 BPM CPR compression guide on that step
  - `callPrompt`: Optional boolean highlighting immediate emergency service contact on that step

### Interactive Component & State Mapping

- **Region Dialer State (`region: '999' | '112' | '911'`)**: Persisted in `localStorage`; immediately updates the `href="tel:..."` attribute and label on the persistent Call Emergency Services button across all views.
- **Photo + Text Specialisation State (`photoDataUrl`, `descriptionText`, `targetProtocolId`, `isGenerating`)**:
  - Reads uploaded/captured image via `FileReader` into a resized base64 data URL (`mimeType` + `data`) so large phone camera photos compress cleanly before sending.
  - Sends multimodal payload (`inlineData` + `text` + baseline Red Cross / St John protocol steps) to `POST /api/specialise-protocol` only when the user clicks **"Generate Specialised Steps"**.
  - Stores the returned specialised protocol in memory (and optional local session) and opens the Step-by-Step Wizard at Step 1 with a toggle to compare or revert to the baseline standard protocol at any moment.
- **Wizard Step & Age State (`activeProtocolId`, `currentStepIndex`, `ageGroup`)**:
  - Switching `ageGroup` (`Adult` / `Child` / `Infant`) stays on the equivalent clinical step index and immediately updates the instruction and TTS readout.
  - Advancing or reversing steps cancels any in-flight `speechSynthesis` utterance, speaks the new step if Voice Narration is enabled, and auto-pauses the CPR metronome when leaving a compression step.
- **Verification Loop & Project Documentation**:
  - **Automated Headless Verification Script (`verify-flows.ts`)**: Walks through the home screen, disclaimer, emergency dialer links (`999`, `112`, `911`), all 7 emergency categories, every Adult/Child/Infant branch, every sequential step, and the Photo + Text specialisation schema/fallback handler to assert zero missing fields, valid `tel:` links, and error-free state transitions.
  - **`DESIGN.md` & `AGENTS.md`**: Generated at the project root documenting the high-contrast clinical color system, typography, thumb-zone rules, multimodal specialisation flow, offline architecture, and non-obvious setup decisions for teammates.
