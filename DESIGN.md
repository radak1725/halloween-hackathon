# DESIGN.md — PulseAid Clinical Emergency Interface Specification

## 1. Design Philosophy: Calm, High-Contrast, Zero-Panic Utility

In a medical emergency, cognitive bandwidth collapses. Fine Motor skills degrade, tunnel vision sets in, and dense paragraphs become unreadable. **PulseAid** adopts a **Clinical Daylight Utilitarian** design language inspired by Automatic External Defibrillator (AED) interfaces, aviation emergency QRH (Quick Reference Handbooks), and British Red Cross / St John Ambulance field cards.

Every visual decision serves three non-negotiable goals:
1. **Immediate Legibility at Arm's Length**: A responder kneeling beside a casualty with their phone lying on the floor must be able to read the active step without squinting.
2. **One-Action-Per-Screen Focus**: Never show a wall of text. Each step screen presents one primary imperative action, a short clinical explanation, and an explicit "DO NOT" caution box when safety-critical.
3. **Zero Barrier to Emergency Services**: The **Call Emergency Services** (`999` / `112` / `911`) action is persistently anchored at the top of every screen as a direct `tel:` link—never hidden behind menus or confirmation dialogs.

---

## 2. Color Palette & Contrast System (60-30-10 Rule)

All foreground/background pairings meet or exceed **WCAG AAA (7:1+)** for primary instructions and **WCAG AA (4.5:1+)** for secondary controls.

| Token Role | Hex | Tailwind Utility | Contrast vs Surface | Semantic Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Dominant Canvas (60%)** | `#F8FAFC` | `bg-slate-50` | — | Daylight-legible low-glare background canvas |
| **Elevated Card Surface (30%)** | `#FFFFFF` | `bg-white` | — | Primary triage cards, active wizard step container |
| **Primary Ink** | `#0F172A` | `text-slate-900` | `16.8:1` (AAA) | Step headlines, card titles, primary instructions |
| **Secondary Clinical Copy** | `#334155` | `text-slate-700` | `10.4:1` (AAA) | Detailed how-to bullet points, casualty age cues |
| **Muted Metadata** | `#475569` | `text-slate-600` | `7.2:1` (AAA) | Step counters, offline indicators, unboxed metadata |
| **Emergency Action (10% Accent)** | `#DC2626` | `bg-red-600` | `5.6:1` vs `#FFF` | Persistent Call `999`/`112`/`911` button & Critical Life-Safety badge |
| **Clinical Progression Accent** | `#0284C7` | `bg-sky-600` | `4.8:1` vs `#FFF` | Wizard "Next Step" CTA, active step progress bar, Voice Narration state |
| **Clinical Caution / Do-Not** | `#FEF3C7` / `#92400E` | `bg-amber-50 text-amber-900` | `10.1:1` (AAA) | Explicit safety prohibitions (e.g., "Do NOT apply ice to a burn") |

### Accessibility & Color-Blind Safety
- **No Hue-Only Signaling**: Critical vs. Urgent categories, active voice narration, and safety warnings always pair color with explicit text labels (`CRITICAL`, `DO NOT`, `VOICE ON`) and distinct iconography (`PhoneCall`, `AlertTriangle`, `Volume2`).

---

## 3. Typography & Hierarchy

PulseAid follows a strict **2+1 Font System** loaded with `swap` fallback to system grotesques for instant offline rendering:

1. **Display & Imperative Action Face (`Plus Jakarta Sans`, Weights 700–800)**:
   - Used for Emergency Card titles and Wizard Step imperatives.
   - Wizard Step Headline: `clamp(1.75rem, 3.5vw, 2.5rem)` (`28px`–`40px`), line-height `1.15`, `text-wrap: balance` to prevent orphan words.
2. **Clinical Body & Guidance Face (`Public Sans`, Weights 500–700)**:
   - High x-height and open apertures designed for stressed reading.
   - Step Detail Copy: `1.125rem`–`1.25rem` (`18px`–`20px`), line-height `1.55`, constrained to `65ch` max width.
3. **Telemetry & Step Numerals (`JetBrains Mono`, Weight 700, `tabular-nums`)**:
   - Used strictly for step progression (`STEP 02 OF 06`), emergency phone numbers (`999 / 112 / 911`), and the `110 BPM` CPR compression metronome counter so digits never jitter during live pulsing.

---

## 4. Layout, Spatial Math & Thumb-Zone Ergonomics

- **Minimum Touch Targets**:
  - Standard interactive controls (Region selector, Age selector, Voice toggles): `min-h-[48px] min-w-[48px]`.
  - Primary Wizard Progression (`Previous` / `Next Step`) & Persistent Emergency Dialer: `min-h-[56px]` to `min-h-[64px]` so trembling or gloved hands cannot mis-tap.
- **Responsive Viewport Architecture**:
  - **Mobile (`375px`–`640px`)**: Single-column high-impact triage cards; bottom-anchored wizard navigation in the natural thumb zone.
  - **Desktop (`1024px`–`1440px`)**: Expands cleanly to a `max-w-6xl` 2-to-3 column triage grid on the Home screen and a focused, high-legibility 2-column command layout in the Step Wizard (Step Instruction + Clinical Helpers / Photo Context side-by-side).
- **15% Sticky Surface Cap**:
  - The persistent top emergency bar is compact (`56px`–`64px`), ensuring >85% of the viewport remains open for the active emergency instruction.
- **Anti-Slop & Zero-Pill Discipline**:
  - Static metadata uses clean unboxed typography separated by middle dots (`·`).
  - Interactive switches (Region `999 | 112 | 911`, Age `Adult | Child | Infant`) use tactile segmented button groups with clear active states.
