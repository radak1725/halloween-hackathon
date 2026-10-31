/**
 * Offline-first Web Audio API 110 BPM CPR Metronome,
 * Calming Human Voice Narrator (Gemini 3.8 TTS with predictive pre-caching),
 * Web Speech Recognition voice command controller, and Description Dictation controller.
 */

import { BASELINE_PROTOCOLS, type ProtocolStep } from './protocols';

export type CalmingVoicePersona = 'Charon' | 'Zephyr' | 'Puck' | 'Kore';

export interface VoicePersonaOption {
  id: CalmingVoicePersona;
  label: string;
  description: string;
}

export const CALMING_VOICE_OPTIONS: VoicePersonaOption[] = [
  {
    id: 'Charon',
    label: 'British Paramedic (Charon)',
    description: 'Warm, grounded UK paramedic tone',
  },
  {
    id: 'Puck',
    label: 'British First-Aider (Puck)',
    description: 'Calm, supportive UK conversational tone',
  },
  {
    id: 'Zephyr',
    label: 'British NHS Nurse (Zephyr)',
    description: 'Gentle, soothing UK nurse cadence',
  },
  {
    id: 'Kore',
    label: 'British Clinical (Kore)',
    description: 'Composed, clear UK responder tone',
  },
];

export class CprMetronome {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private beatCount = 0;
  private isPlaying = false;
  private onBeatCallback: ((beatNumber: number) => void) | null = null;

  // 110 BPM = 60,000 ms / 110 = 545.45 ms per compression
  public readonly bpm = 110;
  private readonly intervalMs = Math.round(60000 / 110);

  public start(onBeat?: (beatNumber: number) => void) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.beatCount = 0;
    this.onBeatCallback = onBeat || null;

    if (typeof window !== 'undefined' && !this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    this.triggerBeat();
    if (typeof window !== 'undefined') {
      this.intervalId = window.setInterval(() => {
        this.triggerBeat();
      }, this.intervalMs);
    }
  }

  private triggerBeat() {
    this.beatCount = (this.beatCount % 30) + 1;
    if (this.onBeatCallback) {
      this.onBeatCallback(this.beatCount);
    }

    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Accent every 1st and 10th compression so responder can track 30 compressions easily
      const isAccent =
        this.beatCount === 1 ||
        this.beatCount === 10 ||
        this.beatCount === 20 ||
        this.beatCount === 30;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 880 : 660, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio hardware errors in headless browsers
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.beatCount = 0;
  }

  public get active(): boolean {
    return this.isPlaying;
  }
}

// Client-side audio cache & in-flight deduplication map for Gemini 3.8 TTS
const clientTtsAudioCache = new Map<string, string>();
const inFlightTtsPromises = new Map<string, Promise<string | null>>();
let activeHtmlAudio: HTMLAudioElement | null = null;
let currentSpeechSessionId = 0;

/**
 * Selects a natural British English (en-GB) offline browser voice ONLY when the device has no internet connection.
 */
function pickWarmOfflineBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const britishVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('en-gb') ||
      /uk|british|great britain|united kingdom/i.test(v.name)
  );
  const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool =
    britishVoices.length > 0
      ? britishVoices
      : englishVoices.length > 0
      ? englishVoices
      : voices;

  const preferredMatchers = [
    /sonia/i,
    /ryan/i,
    /libby/i,
    /maisie/i,
    /natural/i,
    /online.*natural/i,
    /neural/i,
    /premium/i,
    /enhanced/i,
    /serena/i,
    /daniel/i,
    /arthur/i,
    /oliver/i,
    /kate/i,
    /martha/i,
    /google uk english/i,
    /siri/i,
  ];

  for (const regex of preferredMatchers) {
    const match = pool.find((v) => regex.test(v.name));
    if (match) return match;
  }

  return pool[0] || null;
}

function speakOfflineFallback(
  text: string,
  sessionId: number,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    if (sessionId !== currentSpeechSessionId) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    const chosenVoice = pickWarmOfflineBrowserVoice();
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      if (sessionId === currentSpeechSessionId) onStart?.();
    };
    utterance.onend = () => {
      if (sessionId === currentSpeechSessionId) onEnd?.();
    };
    utterance.onerror = () => {
      if (sessionId === currentSpeechSessionId) onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
}

/**
 * Fetches and caches a single step's Gemini 3.8 TTS British English audio in the background (deduplicated).
 */
export function prefetchStepAudio(
  text: string,
  voiceName: CalmingVoicePersona = 'Charon'
): Promise<string | null> {
  const cleanText = text.trim();
  if (!cleanText || typeof window === 'undefined') return Promise.resolve(null);
  if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve(null);

  const cacheKey = `v3-gb::${voiceName}::${cleanText}`;
  const existing = clientTtsAudioCache.get(cacheKey);
  if (existing) return Promise.resolve(existing);

  const inFlight = inFlightTtsPromises.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voiceName }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { audioBase64?: string; mimeType?: string };
      if (!data.audioBase64) return null;
      const dataUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      clientTtsAudioCache.set(cacheKey, dataUrl);
      return dataUrl;
    } catch {
      return null;
    } finally {
      inFlightTtsPromises.delete(cacheKey);
    }
  })();

  inFlightTtsPromises.set(cacheKey, promise);
  return promise;
}

/**
 * Pre-fetches all steps of a protocol so Step 1..N are cached with the real Gemini TTS British voice.
 */
export function prefetchProtocolSteps(
  steps: ProtocolStep[],
  voiceName: CalmingVoicePersona = 'Charon'
): void {
  if (!steps || steps.length === 0) return;
  steps.slice(0, 2).forEach((step) => {
    prefetchStepAudio(step.voiceScript, voiceName);
  });
  if (steps.length > 2 && typeof window !== 'undefined') {
    window.setTimeout(() => {
      steps.slice(2).forEach((step) => {
        prefetchStepAudio(step.voiceScript, voiceName);
      });
    }, 100);
  }
}

/**
 * Pre-warms Step 1 of the baseline emergency protocols when on the Home Screen
 * so clicking any card starts the warm British Gemini TTS voice with minimal wait.
 */
export function prewarmHomeFirstSteps(voiceName: CalmingVoicePersona = 'Charon'): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  BASELINE_PROTOCOLS.forEach((protocol, index) => {
    const firstStep = protocol.steps.default[0];
    if (firstStep) {
      window.setTimeout(() => {
        prefetchStepAudio(firstStep.voiceScript, voiceName);
      }, index * 250);
    }
  });
}

/**
 * Speaks the step using the warm, calming British (`en-GB`) Gemini 3.8 TTS voice (`Charon`, `Puck`, `Zephyr`, `Kore`).
 * Uses a gentle 1.07x rate so the speech is brisk without introducing metallic browser time-stretching artifacts.
 */
export async function speakStepText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  voiceName: CalmingVoicePersona = 'Charon'
): Promise<void> {
  if (typeof window === 'undefined') {
    onEnd?.();
    return;
  }

  stopSpeaking();
  const sessionId = ++currentSpeechSessionId;

  // Only use browser speechSynthesis if completely offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    speakOfflineFallback(text, sessionId, onStart, onEnd);
    return;
  }

  try {
    onStart?.();
    const dataUrl = await prefetchStepAudio(text, voiceName);

    if (sessionId !== currentSpeechSessionId) return;

    if (!dataUrl) {
      throw new Error('TTS audio unavailable');
    }

    const audio = new Audio(dataUrl);
    // Keep playbackRate at 1.07 so it is brisk while keeping 100% natural human voice timbre (no metallic pitch-stretching)
    audio.defaultPlaybackRate = 1.07;
    audio.playbackRate = 1.07;
    if ('preservesPitch' in audio) {
      (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    }
    activeHtmlAudio = audio;
    audio.onplay = () => {
      audio.playbackRate = 1.07;
    };
    audio.onended = () => {
      if (sessionId === currentSpeechSessionId) onEnd?.();
    };
    audio.onerror = () => {
      if (sessionId === currentSpeechSessionId) {
        speakOfflineFallback(text, sessionId, onStart, onEnd);
      }
    };
    await audio.play();
  } catch {
    if (sessionId === currentSpeechSessionId) {
      speakOfflineFallback(text, sessionId, onStart, onEnd);
    }
  }
}

export function stopSpeaking(): void {
  currentSpeechSessionId++;

  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    activeHtmlAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

export type VoiceCommandType = 'next' | 'back' | 'repeat';

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export class VoiceCommandController {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private shouldKeepListening = false;
  private onCommand: ((cmd: VoiceCommandType, rawTranscript: string) => void) | null = null;
  private onStatusChange: ((listening: boolean) => void) | null = null;
  private lastTriggerTime = 0;

  public get supported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public start(
    onCommand: (cmd: VoiceCommandType, rawTranscript: string) => void,
    onStatusChange?: (listening: boolean) => void
  ): boolean {
    if (!this.supported) return false;
    this.onCommand = onCommand;
    this.onStatusChange = onStatusChange || null;
    this.shouldKeepListening = true;

    if (!this.recognition) {
      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      const RecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!RecognitionCtor) return false;

      this.recognition = new RecognitionCtor();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const len = event.results.length;
        if (len === 0) return;
        const latest = event.results[len - 1]?.[0]?.transcript?.toLowerCase().trim() || '';
        const now = Date.now();
        if (now - this.lastTriggerTime < 900) return;

        if (/\b(next|forward|continue|done)\b/.test(latest)) {
          this.lastTriggerTime = now;
          this.onCommand?.('next', latest);
        } else if (/\b(back|previous|before)\b/.test(latest)) {
          this.lastTriggerTime = now;
          this.onCommand?.('back', latest);
        } else if (/\b(repeat|again|read)\b/.test(latest)) {
          this.lastTriggerTime = now;
          this.onCommand?.('repeat', latest);
        }
      };

      this.recognition.onerror = () => {
        // Silently handle mic permission denied or no-speech timeout
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.shouldKeepListening) {
          try {
            this.recognition?.start();
            this.isListening = true;
          } catch {
            this.shouldKeepListening = false;
            this.onStatusChange?.(false);
          }
        } else {
          this.onStatusChange?.(false);
        }
      };
    }

    try {
      this.recognition.start();
      this.isListening = true;
      this.onStatusChange?.(true);
      return true;
    } catch {
      this.isListening = false;
      this.onStatusChange?.(false);
      return false;
    }
  }

  public stop() {
    this.shouldKeepListening = false;
    this.isListening = false;
    try {
      this.recognition?.stop();
    } catch {
      // Ignore
    }
    this.onStatusChange?.(false);
  }
}

interface DictationRecognitionResultItem {
  transcript: string;
}

interface DictationRecognitionResult {
  isFinal: boolean;
  0: DictationRecognitionResultItem;
  length: number;
}

interface DictationRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<DictationRecognitionResult>;
}

interface DictationRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: DictationRecognitionEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export interface PatientLanguageOption {
  code: string;
  label: string;
  speechLang: string;
}

export const PATIENT_LANGUAGES: PatientLanguageOption[] = [
  { code: 'en-GB', label: 'English (UK / International)', speechLang: 'en-GB' },
  { code: 'es-ES', label: 'Español (Spanish → English)', speechLang: 'es-ES' },
  { code: 'fr-FR', label: 'Français (French → English)', speechLang: 'fr-FR' },
  { code: 'de-DE', label: 'Deutsch (German → English)', speechLang: 'de-DE' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi → English)', speechLang: 'hi-IN' },
  { code: 'ur-PK', label: 'اردو (Urdu → English)', speechLang: 'ur-PK' },
  { code: 'ar-SA', label: 'العربية (Arabic → English)', speechLang: 'ar-SA' },
  { code: 'pl-PL', label: 'Polski (Polish → English)', speechLang: 'pl-PL' },
  { code: 'zh-CN', label: '中文 (Mandarin → English)', speechLang: 'zh-CN' },
  { code: 'pt-BR', label: 'Português (Portuguese → English)', speechLang: 'pt-BR' },
  { code: 'it-IT', label: 'Italiano (Italian → English)', speechLang: 'it-IT' },
  { code: 'auto', label: 'Auto-Detect Any Language → English', speechLang: 'en-GB' },
];

/**
 * Dual-mode Multilingual Dictation Controller for Live AR & Situational Description:
 * 1. Streams live text as the patient/responder speaks via Web Speech Recognition in their chosen language.
 * 2. Simultaneously records audio via MediaRecorder so if Web Speech Recognition
 *    produces no text (or is in Auto-Detect mode), the audio is transcribed & translated to English via `/api/transcribe` (gemini-3.5-transcribe).
 */
export class DictationController {
  private recognition: DictationRecognitionInstance | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private capturedViaSpeechApi = false;
  private currentSourceLang = 'en-GB';

  public async start(
    onLiveTranscript: (finalChunk: string, interimChunk: string) => void,
    onError: (msg: string) => void,
    sourceLanguage = 'en-GB'
  ): Promise<boolean> {
    if (this.isRecording) return true;
    this.capturedViaSpeechApi = false;
    this.audioChunks = [];
    this.currentSourceLang = sourceLanguage;

    const langObj =
      PATIENT_LANGUAGES.find((l) => l.code === sourceLanguage) || PATIENT_LANGUAGES[0];

    // 1. Start Web Speech Recognition if available for instant live word streaming
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        SpeechRecognition?: new () => DictationRecognitionInstance;
        webkitSpeechRecognition?: new () => DictationRecognitionInstance;
      };
      const RecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (RecognitionCtor) {
        try {
          this.recognition = new RecognitionCtor();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = langObj.speechLang;

          this.recognition.onresult = (event: DictationRecognitionEvent) => {
            let finalText = '';
            let interimText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              const t = res?.[0]?.transcript || '';
              if (res?.isFinal) {
                finalText += t + ' ';
              } else {
                interimText += t;
              }
            }
            if (finalText.trim() || interimText.trim()) {
              this.capturedViaSpeechApi = true;
              onLiveTranscript(finalText.trim(), interimText.trim());
            }
          };

          this.recognition.onerror = () => {
            // Fall back to MediaRecorder if SpeechRecognition errors
          };

          this.recognition.start();
        } catch {
          // Ignore and rely on MediaRecorder
        }
      }
    }

    // 2. Also start MediaRecorder for guaranteed high-accuracy Gemini transcription + translation fallback
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };
        this.mediaRecorder.start();
        this.isRecording = true;
        return true;
      } catch {
        if (this.recognition) {
          this.isRecording = true;
          return true;
        }
        onError('Microphone permission was denied or no microphone was found.');
        return false;
      }
    } else if (this.recognition) {
      this.isRecording = true;
      return true;
    }

    onError('Voice dictation is not supported in this browser.');
    return false;
  }

  public async stop(): Promise<string | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }

    if (!this.mediaRecorder) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const recorder = this.mediaRecorder!;
      recorder.onstop = async () => {
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((t) => t.stop());
          this.mediaStream = null;
        }
        this.mediaRecorder = null;

        // If SpeechRecognition already streamed the transcript (and not in 'auto' audio-only mode), skip duplicate round-trip
        if (
          (this.capturedViaSpeechApi && this.currentSourceLang !== 'auto') ||
          this.audioChunks.length === 0
        ) {
          resolve(null);
          return;
        }

        try {
          const blob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const audioDataUrl = reader.result as string;
            try {
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioDataUrl,
                  sourceLanguage: this.currentSourceLang,
                }),
              });
              if (!res.ok) {
                resolve(null);
                return;
              }
              const data = (await res.json()) as { transcript?: string };
              resolve(data.transcript?.trim() || null);
            } catch {
              resolve(null);
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          resolve(null);
        }
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });
  }
}
