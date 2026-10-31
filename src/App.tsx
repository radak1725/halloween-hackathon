/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bone,
  Camera,
  Check,
  Download,
  Droplets,
  Flame,
  HeartPulse,
  Image as ImageIcon,
  Mic,
  MicOff,
  Pause,
  PhoneCall,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  WifiOff,
  Wind,
  X,
} from 'lucide-react';
import {
  type AgeGroup,
  BASELINE_PROTOCOLS,
  type EmergencyProtocol,
  getStepsForProtocol,
  REGIONS,
  type RegionCode,
} from './protocols';
import {
  CALMING_VOICE_OPTIONS,
  type CalmingVoicePersona,
  CprMetronome,
  DictationController,
  PATIENT_LANGUAGES,
  prefetchProtocolSteps,
  prewarmHomeFirstSteps,
  speakStepText,
  stopSpeaking,
  VoiceCommandController,
  type VoiceCommandType,
} from './audioEngine';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DEMO_SPECIALISATION_PRESETS = [
  {
    label: 'Boiling Kettle Forearm Scald (No Tap Nearby)',
    baseId: 'burns',
    text: 'Adult spilled boiling water from a camp kettle onto their right forearm. Skin is bright red and blistering. We are outdoors with 2 liters of cool bottled drinking water and a clean cotton shirt.',
  },
  {
    label: 'Deep Glass Cut on Palm (Shard Embedded)',
    baseId: 'bleeding',
    text: 'Broken drinking glass cut deep into the palm of the hand. Bleeding heavily and a small piece of glass appears stuck in the center of the wound.',
  },
  {
    label: 'Ankle Twisted on Stairs (Rapid Swelling)',
    baseId: 'sprains',
    text: 'Rolled left ankle stepping off a curb. Rapid swelling on outer ankle bone, painful to bear weight, no open wound.',
  },
];

function ProtocolIcon({
  name,
  className = 'w-7 h-7',
}: {
  name: EmergencyProtocol['iconName'];
  className?: string;
}) {
  switch (name) {
    case 'HeartPulse':
      return <HeartPulse className={className} aria-hidden="true" />;
    case 'Wind':
      return <Wind className={className} aria-hidden="true" />;
    case 'Droplets':
      return <Droplets className={className} aria-hidden="true" />;
    case 'Flame':
      return <Flame className={className} aria-hidden="true" />;
    case 'Activity':
      return <Activity className={className} aria-hidden="true" />;
    case 'ShieldAlert':
      return <ShieldAlert className={className} aria-hidden="true" />;
    case 'Bone':
      return <Bone className={className} aria-hidden="true" />;
    default:
      return <Sparkles className={className} aria-hidden="true" />;
  }
}

export default function App() {
  // Region emergency number ('999' | '112' | '911')
  const [region, setRegion] = useState<RegionCode>(() => {
    try {
      const saved = localStorage.getItem('pulseaid_region') as RegionCode | null;
      if (saved === '999' || saved === '112' || saved === '911') return saved;
    } catch {
      // Ignore storage errors
    }
    return '999';
  });

  // Launch medical disclaimer state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pulseaid_disclaimer_accepted') === 'true';
    } catch {
      return false;
    }
  });

  // Custom / specialised protocols created in session
  const [customProtocols, setCustomProtocols] = useState<EmergencyProtocol[]>(() => {
    try {
      const raw = localStorage.getItem('pulseaid_custom_protocols');
      return raw ? (JSON.parse(raw) as EmergencyProtocol[]) : [];
    } catch {
      return [];
    }
  });

  // Active wizard navigation state
  const [activeProtocolId, setActiveProtocolId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');

  // Calming Voice narration (TTS) and Hands-Free Voice Command state
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [voicePersona, setVoicePersona] = useState<CalmingVoicePersona>(() => {
    try {
      const saved = localStorage.getItem('pulseaid_voice_persona') as CalmingVoicePersona | null;
      if (saved && CALMING_VOICE_OPTIONS.some((o) => o.id === saved)) return saved;
    } catch {
      // Ignore
    }
    return 'Charon';
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceCommandsActive, setVoiceCommandsActive] = useState<boolean>(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);

  // Auto-Advance Slides state (automatically changes slides after voice readout finishes)
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(true);
  const [autoAdvanceDelaySec, setAutoAdvanceDelaySec] = useState<number>(4);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [autoAdvancePausedOnStep, setAutoAdvancePausedOnStep] = useState<boolean>(false);

  // 110 BPM CPR Metronome state
  const [metronomePlaying, setMetronomePlaying] = useState<boolean>(false);
  const [metronomeBeat, setMetronomeBeat] = useState<number>(0);
  const metronomeRef = useRef<CprMetronome | null>(null);
  const voiceControllerRef = useRef<VoiceCommandController | null>(null);

  // Photo + Text Specialisation modal & Live Camera state
  const [specialiserOpen, setSpecialiserOpen] = useState<boolean>(false);
  const [specBaseId, setSpecBaseId] = useState<string>('burns');
  const [specDescription, setSpecDescription] = useState<string>('');
  const [specPhotoDataUrl, setSpecPhotoDataUrl] = useState<string | undefined>(undefined);
  const [specPhotoName, setSpecPhotoName] = useState<string>('');
  const [specLoading, setSpecLoading] = useState<boolean>(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live in-app camera stream state + Real-Time AR Wound Scanner Overlay state
  const [liveCameraActive, setLiveCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Real-Time AR Wound Identification & Spatial Bounding Box state
  const [arOverlayEnabled, setArOverlayEnabled] = useState<boolean>(true);
  const [arScanning, setArScanning] = useState<boolean>(false);
  const [arScanResult, setArScanResult] = useState<{
    detected: boolean;
    woundLabel: string;
    recommendedProtocolId: string;
    severity: 'minor_111' | 'urgent_111' | 'critical_999';
    actionInstruction: string;
    clinicalNote: string;
    box2d: { ymin: number; xmin: number; ymax: number; xmax: number };
  } | null>(null);
  const [arLiveBox, setArLiveBox] = useState<{
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  }>({
    ymin: 240,
    xmin: 260,
    ymax: 760,
    xmax: 740,
  });
  const arScanInFlightRef = useRef<boolean>(false);

  // Multilingual Voice Detection & English Translation state
  const [patientLanguage, setPatientLanguage] = useState<string>('en-GB');
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [dictationInterim, setDictationInterim] = useState<string>('');
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const [lastOriginalSpeech, setLastOriginalSpeech] = useState<string>('');
  const [lastTranslatedEnglish, setLastTranslatedEnglish] = useState<string>('');
  const [detectedSpeechLangName, setDetectedSpeechLangName] = useState<string>('');
  const dictationRef = useRef<DictationController | null>(null);

  // Online/Offline & PWA Install state
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  const allProtocols = [...customProtocols, ...BASELINE_PROTOCOLS];
  const activeProtocol = allProtocols.find((p) => p.id === activeProtocolId) || null;
  const activeSteps = activeProtocol ? getStepsForProtocol(activeProtocol, ageGroup) : [];
  const safeStepIndex = Math.min(currentStepIndex, Math.max(0, activeSteps.length - 1));
  const currentStep = activeSteps[safeStepIndex] || null;

  // Helper to translate spoken non-English or multilingual patient input into English & detect injury category
  const processSpokenPatientChunk = async (rawChunk: string, langCode: string) => {
    const clean = rawChunk.trim();
    if (!clean) return;

    setLastOriginalSpeech(clean);

    // Quick local keyword matching for English injury types so category updates immediately even offline
    const lower = clean.toLowerCase();
    if (/\b(burn|scald|boiling|kettle|hot|fire|blister|quemadura|brûlure)\b/.test(lower)) {
      setSpecBaseId('burns');
    } else if (/\b(bleed|blood|cut|glass|knife|deep wound|sangre|saigne)\b/.test(lower)) {
      setSpecBaseId('bleeding');
    } else if (/\b(sprain|ankle|wrist|twisted|fracture|broken|swollen|tobillo|cheville)\b/.test(lower)) {
      setSpecBaseId('sprains');
    } else if (/\b(allergic|allergy|peanut|bee|epipen|swelling|throat|rash|alergia|allergie)\b/.test(lower)) {
      setSpecBaseId('allergic');
    } else if (/\b(choking|choke|airway|cough|asfixia|étouffe)\b/.test(lower)) {
      setSpecBaseId('choking');
    } else if (/\b(faint|fainted|dizzy|collapsed|breathing|desmayo|évanoui)\b/.test(lower)) {
      setSpecBaseId('fainting');
    } else if (/\b(cpr|unresponsive|not breathing|cardiac|heart)\b/.test(lower)) {
      setSpecBaseId('cpr');
    }

    // If online, call /api/translate-speech to translate any language to English and detect suspected injury
    if (isOnline) {
      try {
        const res = await fetch('/api/translate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clean,
            sourceLanguage: langCode,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            detectedLanguage?: string;
            englishTranslation?: string;
            recommendedProtocolId?: string;
            confirmedByPatient?: boolean;
          };
          const englishText = (data.englishTranslation || clean).trim();
          setLastTranslatedEnglish(englishText);
          if (data.detectedLanguage) {
            setDetectedSpeechLangName(data.detectedLanguage);
          }
          setSpecDescription((prev) =>
            prev.trim() ? `${prev.trim()} ${englishText}` : englishText
          );
          if (
            data.recommendedProtocolId &&
            BASELINE_PROTOCOLS.some((p) => p.id === data.recommendedProtocolId)
          ) {
            setSpecBaseId(data.recommendedProtocolId);
          }
          return;
        }
      } catch {
        // Fallback to appending raw text below
      }
    }

    setLastTranslatedEnglish(clean);
    setSpecDescription((prev) => (prev.trim() ? `${prev.trim()} ${clean}` : clean));
  };

  // Start multilingual voice detection (automatically triggered when Live AR turns on, or manually via button)
  const startVoiceDetectionListening = async (langOverride = patientLanguage) => {
    if (!dictationRef.current) {
      dictationRef.current = new DictationController();
    }
    if (isDictating) return;

    setSpecError(null);
    const started = await dictationRef.current.start(
      (finalChunk, interimChunk) => {
        if (finalChunk) {
          setDictationInterim('');
          processSpokenPatientChunk(finalChunk, langOverride);
        } else {
          setDictationInterim(interimChunk);
        }
      },
      (errMsg) => {
        setSpecError(errMsg);
        setIsDictating(false);
        setDictationInterim('');
      },
      langOverride
    );

    if (started) {
      setIsDictating(true);
    }
  };

  // Stop live camera tracks helper
  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    arScanInFlightRef.current = false;
    setArScanning(false);
    setLiveCameraActive(false);
  };

  // Start live in-app camera stream AND automatically turn on voice detection for Live AR
  const startLiveCamera = async (preferredFacing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);
    stopLiveCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera is not supported in this browser. Please use Upload Photo File.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video camera (e.g., laptop webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      setLiveCameraActive(true);

      // Automatically start multilingual voice detection as soon as Live AR camera turns on!
      startVoiceDetectionListening(patientLanguage);
    } catch {
      setCameraError(
        'Camera permission was denied or no camera was found. Please allow camera access or use Upload Photo File.'
      );
      setLiveCameraActive(false);
    }
  };

  // Attach media stream to <video> element whenever liveCameraActive turns true
  useEffect(() => {
    if (liveCameraActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [liveCameraActive]);

  // Run a single Gemini 3.8 Flash spatial AR scan on the live camera feed
  const triggerArWoundScan = async () => {
    const video = videoRef.current;
    if (
      !video ||
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      arScanInFlightRef.current ||
      !isOnline
    ) {
      return;
    }

    arScanInFlightRef.current = true;
    setArScanning(true);

    try {
      const scanCanvas = document.createElement('canvas');
      const targetWidth = 480;
      const targetHeight = Math.max(
        270,
        Math.round((video.videoHeight * targetWidth) / Math.max(1, video.videoWidth))
      );
      scanCanvas.width = targetWidth;
      scanCanvas.height = targetHeight;
      const ctx = scanCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const frameDataUrl = scanCanvas.toDataURL('image/jpeg', 0.72);

      const response = await fetch('/api/ar-scan-wound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameDataUrl,
          currentProtocolId: specBaseId,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      if (data?.scan) {
        const s = data.scan;
        const clampedBox = {
          ymin: Math.max(60, Math.min(820, Number(s.box2d?.ymin ?? 240))),
          xmin: Math.max(60, Math.min(820, Number(s.box2d?.xmin ?? 260))),
          ymax: Math.max(180, Math.min(940, Number(s.box2d?.ymax ?? 760))),
          xmax: Math.max(180, Math.min(940, Number(s.box2d?.xmax ?? 740))),
        };
        setArScanResult({
          detected: Boolean(s.detected),
          woundLabel: s.woundLabel || 'Target Injury Zone',
          recommendedProtocolId: s.recommendedProtocolId || specBaseId,
          severity: s.severity || 'urgent_111',
          actionInstruction:
            s.actionInstruction || 'Follow step-by-step first aid guidance carefully',
          clinicalNote: s.clinicalNote || '',
          box2d: clampedBox,
        });
        setArLiveBox(clampedBox);
      }
    } catch {
      // Keep real-time CV tracking active even if network scan hiccups
    } finally {
      arScanInFlightRef.current = false;
      setArScanning(false);
    }
  };

  // Real-time CV erythema/skin-target tracker (150ms tick) + periodic Gemini spatial grounding (2.6s tick)
  useEffect(() => {
    if (!liveCameraActive || !arOverlayEnabled) return;

    const cvAnalysisCanvas = document.createElement('canvas');
    cvAnalysisCanvas.width = 64;
    cvAnalysisCanvas.height = 48;
    const cvCtx = cvAnalysisCanvas.getContext('2d', { willReadFrequently: true });

    // Local real-time redness/erythema & skin-region tracker so the AR reticle responds immediately to motion
    const cvInterval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0 || !cvCtx) return;

      try {
        cvCtx.drawImage(video, 0, 0, 64, 48);
        const { data } = cvCtx.getImageData(0, 0, 64, 48);

        let redWeightSum = 0;
        let redXSum = 0;
        let redYSum = 0;
        let minRX = 64;
        let maxRX = 0;
        let minRY = 48;
        let maxRY = 0;

        for (let y = 4; y < 44; y++) {
          for (let x = 4; x < 60; x++) {
            const idx = (y * 64 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Detect heightened redness/erythema (burns, bleeding, inflammation, red marker)
            const isErythema = r > 110 && r > g * 1.32 && r > b * 1.32;
            if (isErythema) {
              const weight = r - Math.max(g, b);
              redWeightSum += weight;
              redXSum += x * weight;
              redYSum += y * weight;
              if (x < minRX) minRX = x;
              if (x > maxRX) maxRX = x;
              if (y < minRY) minRY = y;
              if (y > maxRY) maxRY = y;
            }
          }
        }

        if (redWeightSum > 450) {
          const cx = (redXSum / redWeightSum / 64) * 1000;
          const cy = (redYSum / redWeightSum / 48) * 1000;
          const halfW = Math.max(130, Math.min(320, ((maxRX - minRX) / 64) * 600));
          const halfH = Math.max(130, Math.min(320, ((maxRY - minRY) / 48) * 600));

          setArLiveBox((prev) => ({
            ymin: Math.round(prev.ymin * 0.55 + Math.max(60, cy - halfH) * 0.45),
            xmin: Math.round(prev.xmin * 0.55 + Math.max(60, cx - halfW) * 0.45),
            ymax: Math.round(prev.ymax * 0.55 + Math.min(940, cy + halfH) * 0.45),
            xmax: Math.round(prev.xmax * 0.55 + Math.min(940, cx + halfW) * 0.45),
          }));
        } else if (arScanResult?.box2d) {
          // Smoothly interpolate toward Gemini's latest grounded anatomical bounding box
          setArLiveBox((prev) => ({
            ymin: Math.round(prev.ymin * 0.7 + arScanResult.box2d.ymin * 0.3),
            xmin: Math.round(prev.xmin * 0.7 + arScanResult.box2d.xmin * 0.3),
            ymax: Math.round(prev.ymax * 0.7 + arScanResult.box2d.ymax * 0.3),
            xmax: Math.round(prev.xmax * 0.7 + arScanResult.box2d.xmax * 0.3),
          }));
        }
      } catch {
        // Ignore frame read errors
      }
    }, 150);

    // Kick off first Gemini spatial AR scan shortly after video starts, then every 2.7s
    const initialTimer = window.setTimeout(() => {
      triggerArWoundScan();
    }, 650);

    const geminiInterval = window.setInterval(() => {
      triggerArWoundScan();
    }, 2700);

    return () => {
      window.clearInterval(cvInterval);
      window.clearTimeout(initialTimer);
      window.clearInterval(geminiInterval);
    };
  }, [liveCameraActive, arOverlayEnabled, specBaseId, isOnline]);

  // Capture frame from live camera video into compressed JPEG data URL (and optionally apply AR scan findings)
  const captureLivePhoto = (applyArFindings = false) => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera stream is still warming up—please wait a moment and tap Capture again.');
      return;
    }

    const maxDim = 900;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSpecPhotoDataUrl(dataUrl);
      setSpecPhotoName(
        arScanResult?.woundLabel
          ? `AR Scan: ${arScanResult.woundLabel}`
          : `Live Camera Snapshot (${new Date().toLocaleTimeString()})`
      );
      if (applyArFindings && arScanResult) {
        if (BASELINE_PROTOCOLS.some((p) => p.id === arScanResult.recommendedProtocolId)) {
          setSpecBaseId(arScanResult.recommendedProtocolId);
        }
        if (arScanResult.clinicalNote) {
          setSpecDescription((prev) =>
            prev.trim()
              ? `${prev.trim()} [AR Scan: ${arScanResult.woundLabel} — ${arScanResult.clinicalNote}]`
              : `${arScanResult.woundLabel}: ${arScanResult.clinicalNote}`
          );
        }
      }
      stopLiveCamera();
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startLiveCamera(nextFacing);
  };

  // Initialize Metronome, Voice Command & Dictation Controllers
  useEffect(() => {
    metronomeRef.current = new CprMetronome();
    voiceControllerRef.current = new VoiceCommandController();
    dictationRef.current = new DictationController();
    return () => {
      metronomeRef.current?.stop();
      voiceControllerRef.current?.stop();
      dictationRef.current?.stop();
      stopSpeaking();
      stopLiveCamera();
    };
  }, []);

  // Online / Offline & PWA install listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Persist region choice
  const handleSelectRegion = (newRegion: RegionCode) => {
    setRegion(newRegion);
    try {
      localStorage.setItem('pulseaid_region', newRegion);
    } catch {
      // Ignore
    }
  };

  // Persist voice persona choice
  const handleSelectVoicePersona = (persona: CalmingVoicePersona) => {
    setVoicePersona(persona);
    try {
      localStorage.setItem('pulseaid_voice_persona', persona);
    } catch {
      // Ignore
    }
  };

  // Persist disclaimer acceptance
  const handleAcceptDisclaimer = () => {
    setDisclaimerAccepted(true);
    try {
      localStorage.setItem('pulseaid_disclaimer_accepted', 'true');
    } catch {
      // Ignore
    }
  };

  // Stop metronome if leaving a metronome step or exiting wizard
  useEffect(() => {
    if (!currentStep?.hasMetronome && metronomePlaying) {
      metronomeRef.current?.stop();
      setMetronomePlaying(false);
      setMetronomeBeat(0);
    }
  }, [currentStep, metronomePlaying]);

  // Pre-warm Step 1 of baseline protocols on Home Screen so clicking a card speaks with the Gemini voice right away
  useEffect(() => {
    if (!activeProtocol && voiceEnabled) {
      prewarmHomeFirstSteps(voicePersona);
    }
  }, [activeProtocol, voicePersona, voiceEnabled]);

  // Pre-warm all steps of the active protocol so slide transitions speak in 0ms
  useEffect(() => {
    if (activeProtocol && activeSteps.length > 0 && voiceEnabled) {
      prefetchProtocolSteps(activeSteps, voicePersona);
    }
  }, [activeProtocolId, ageGroup, voicePersona, voiceEnabled]);

  // Auto-narrate step when entering or changing steps in wizard & trigger Auto-Advance on completion
  useEffect(() => {
    setAutoAdvanceCountdown(null);
    setAutoAdvancePausedOnStep(false);

    if (!activeProtocol || !currentStep) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    const canAutoAdvance =
      autoAdvanceEnabled && safeStepIndex < activeSteps.length - 1;

    if (voiceEnabled) {
      speakStepText(
        currentStep.voiceScript,
        () => {
          setIsSpeaking(true);
          setAutoAdvanceCountdown(null);
        },
        () => {
          setIsSpeaking(false);
          if (canAutoAdvance) {
            setAutoAdvanceCountdown(autoAdvanceDelaySec);
          }
        },
        voicePersona
      );
    } else {
      stopSpeaking();
      setIsSpeaking(false);
      if (canAutoAdvance) {
        setAutoAdvanceCountdown(autoAdvanceDelaySec + 2);
      }
    }
  }, [
    activeProtocolId,
    safeStepIndex,
    ageGroup,
    voiceEnabled,
    voicePersona,
    autoAdvanceEnabled,
    autoAdvanceDelaySec,
    activeSteps.length,
  ]);

  // Tick the Auto-Advance countdown every 1 second and advance to the next slide at 0
  useEffect(() => {
    if (
      !activeProtocol ||
      !autoAdvanceEnabled ||
      autoAdvancePausedOnStep ||
      metronomePlaying ||
      isSpeaking ||
      autoAdvanceCountdown === null
    ) {
      return;
    }

    if (safeStepIndex >= activeSteps.length - 1) {
      setAutoAdvanceCountdown(null);
      return;
    }

    if (autoAdvanceCountdown <= 0) {
      setAutoAdvanceCountdown(null);
      setCurrentStepIndex((prev) => Math.min(activeSteps.length - 1, prev + 1));
      return;
    }

    const timerId = window.setTimeout(() => {
      setAutoAdvanceCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [
    activeProtocol,
    autoAdvanceEnabled,
    autoAdvancePausedOnStep,
    metronomePlaying,
    isSpeaking,
    autoAdvanceCountdown,
    safeStepIndex,
    activeSteps.length,
  ]);

  // Keep VoiceCommandController callbacks synced with latest wizard state
  useEffect(() => {
    if (!voiceCommandsActive || !voiceControllerRef.current) return;

    const handleVoiceCommand = (cmd: VoiceCommandType, raw: string) => {
      setLastVoiceCommand(`"${raw}" → ${cmd.toUpperCase()}`);
      if (cmd === 'next') {
        setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(0, activeSteps.length - 1)));
      } else if (cmd === 'back') {
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      } else if (cmd === 'repeat' && currentStep) {
        speakStepText(
          currentStep.voiceScript,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false),
          voicePersona
        );
      }
    };

    voiceControllerRef.current.start(handleVoiceCommand, (listening) => {
      setVoiceCommandsActive(listening);
    });
  }, [voiceCommandsActive, activeSteps.length, currentStep, voicePersona]);

  const toggleMetronome = () => {
    if (!metronomeRef.current) return;
    if (metronomePlaying) {
      metronomeRef.current.stop();
      setMetronomePlaying(false);
      setMetronomeBeat(0);
    } else {
      metronomeRef.current.start((beat) => {
        setMetronomeBeat(beat);
      });
      setMetronomePlaying(true);
    }
  };

  const toggleVoiceCommands = () => {
    if (!voiceControllerRef.current) return;
    if (voiceCommandsActive) {
      voiceControllerRef.current.stop();
      setVoiceCommandsActive(false);
      setLastVoiceCommand(null);
    } else {
      const started = voiceControllerRef.current.start(
        (cmd, raw) => {
          setLastVoiceCommand(`"${raw}" → ${cmd.toUpperCase()}`);
          if (cmd === 'next') {
            setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(0, activeSteps.length - 1)));
          } else if (cmd === 'back') {
            setCurrentStepIndex((prev) => Math.max(0, prev - 1));
          } else if (cmd === 'repeat' && currentStep) {
            speakStepText(
              currentStep.voiceScript,
              () => setIsSpeaking(true),
              () => setIsSpeaking(false),
              voicePersona
            );
          }
        },
        (listening) => setVoiceCommandsActive(listening)
      );
      if (!started) {
        setVoiceCommandsActive(false);
      }
    }
  };

  const openProtocol = (protocolId: string) => {
    handleAcceptDisclaimer();
    setActiveProtocolId(protocolId);
    setCurrentStepIndex(0);
  };

  const returnHome = () => {
    metronomeRef.current?.stop();
    setMetronomePlaying(false);
    setMetronomeBeat(0);
    stopSpeaking();
    setIsSpeaking(false);
    setActiveProtocolId(null);
    setCurrentStepIndex(0);
  };

  // Open Specialiser Modal (either from Home or inside an active protocol, optionally auto-launching Live AR Camera)
  const openSpecialiser = (defaultBaseId?: string, autoStartArCamera = false) => {
    const baseId =
      defaultBaseId ||
      (activeProtocol?.isSpecialised
        ? activeProtocol.specialisationContext?.baseProtocolId || 'burns'
        : activeProtocol?.id || 'burns');
    setSpecBaseId(baseId);
    setSpecError(null);
    setCameraError(null);
    setSpecialiserOpen(true);
    if (autoStartArCamera) {
      setArOverlayEnabled(true);
      window.setTimeout(() => {
        startLiveCamera();
      }, 60);
    }
  };

  const closeSpecialiser = () => {
    stopLiveCamera();
    if (isDictating) {
      dictationRef.current?.stop();
      setIsDictating(false);
      setDictationInterim('');
    }
    setSpecialiserOpen(false);
  };

  const handleToggleDictation = async () => {
    if (!dictationRef.current) {
      dictationRef.current = new DictationController();
    }

    if (isDictating) {
      setIsDictating(false);
      setDictationInterim('');
      setIsTranscribingAudio(true);
      const fallbackTranscript = await dictationRef.current.stop();
      setIsTranscribingAudio(false);
      if (fallbackTranscript) {
        await processSpokenPatientChunk(fallbackTranscript, patientLanguage);
        setSpecError(null);
      }
      return;
    }

    await startVoiceDetectionListening(patientLanguage);
  };

  // Switch patient spoken language and restart live voice detection if currently listening
  const handleSelectPatientLanguage = async (newLangCode: string) => {
    setPatientLanguage(newLangCode);
    if (isDictating && dictationRef.current) {
      await dictationRef.current.stop();
      setIsDictating(false);
      setDictationInterim('');
      window.setTimeout(() => {
        startVoiceDetectionListening(newLangCode);
      }, 80);
    }
  };

  // 1-Tap Confirm Suspected Injury -> Immediately move to the English First Aid Advice Wizard
  const handleConfirmSuspectedInjuryAndGoToAdvice = async () => {
    let capturedDataUrl = specPhotoDataUrl;

    // If live AR camera is running, grab the current frame automatically
    const video = videoRef.current;
    if (liveCameraActive && video && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const maxDim = 900;
        let width = video.videoWidth;
        let height = video.videoHeight;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSpecPhotoDataUrl(capturedDataUrl);
        }
      } catch {
        // Ignore frame capture errors
      }
    }

    stopLiveCamera();

    if (isDictating && dictationRef.current) {
      setIsDictating(false);
      setDictationInterim('');
      dictationRef.current.stop().catch(() => {});
    }

    const confirmedCategoryId =
      arScanResult?.recommendedProtocolId &&
      BASELINE_PROTOCOLS.some((p) => p.id === arScanResult.recommendedProtocolId)
        ? arScanResult.recommendedProtocolId
        : specBaseId;

    const baseProtocol =
      BASELINE_PROTOCOLS.find((p) => p.id === confirmedCategoryId) || BASELINE_PROTOCOLS[0];

    const combinedEnglishNotes = [
      specDescription.trim(),
      arScanResult?.woundLabel
        ? `AR Identified: ${arScanResult.woundLabel} (${arScanResult.actionInstruction})`
        : '',
      arScanResult?.clinicalNote || '',
    ]
      .filter(Boolean)
      .join(' · ');

    // Close modal and immediately move to the English First Aid Advice section
    setSpecialiserOpen(false);
    setSpecLoading(false);

    if (!combinedEnglishNotes && !capturedDataUrl) {
      openProtocol(baseProtocol.id);
      return;
    }

    const immediateProtocol = buildOfflineFallbackSpecialisedProtocol(
      baseProtocol,
      combinedEnglishNotes || `Confirmed ${baseProtocol.shortTitle}`,
      capturedDataUrl
    );
    saveCustomProtocol(immediateProtocol);
    openProtocol(immediateProtocol.id);

    // If online, also refine the protocol in the background with Gemini 3.8 Flash so steps are tailored in English
    if (isOnline) {
      try {
        const response = await fetch('/api/specialise-protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseProtocolId: baseProtocol.id,
            description: combinedEnglishNotes || `Confirmed ${baseProtocol.title}`,
            photoDataUrl: capturedDataUrl,
            ageGroup,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.protocol) {
            const generated: EmergencyProtocol = data.protocol;
            saveCustomProtocol(generated);
            setActiveProtocolId(generated.id);
          }
        }
      } catch {
        // Keep the immediate verified English protocol active
      }
    }
  };

  // Compress uploaded photo to a clean JPEG data URL (max 900px dimension)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopLiveCamera();
    setSpecPhotoName(file.name);
    setSpecError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setSpecPhotoDataUrl(compressed);
        } else {
          setSpecPhotoDataUrl(rawDataUrl);
        }
      };
      img.onerror = () => {
        setSpecPhotoDataUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const saveCustomProtocol = (newProtocol: EmergencyProtocol) => {
    setCustomProtocols((prev) => {
      const updated = [newProtocol, ...prev.slice(0, 5)];
      try {
        localStorage.setItem('pulseaid_custom_protocols', JSON.stringify(updated));
      } catch {
        // Ignore storage quota
      }
      return updated;
    });
  };

  const buildOfflineFallbackSpecialisedProtocol = (
    base: EmergencyProtocol,
    description: string,
    photoDataUrl?: string
  ): EmergencyProtocol => {
    const baseSteps = getStepsForProtocol(base, ageGroup);
    const contextNote = description.trim()
      ? `Confirmed context (English): "${description.trim()}". Follow verified ${base.shortTitle} steps carefully.`
      : `Photo attached for ${base.shortTitle}. Follow verified clinical steps carefully.`;

    return {
      ...base,
      id: `specialised-offline-${Date.now()}`,
      title: `${base.shortTitle} (Confirmed First Aid Advice)`,
      shortTitle: `${base.shortTitle} (Confirmed)`,
      shortSummary: description.trim() || `Attached injury photo for ${base.shortTitle}`,
      supportsAgeGroups: false,
      isSpecialised: true,
      specialisationContext: {
        baseProtocolId: base.id,
        description: description.trim() || undefined,
        photoDataUrl,
        clinicalSummary: `${contextNote} (All first-aid guidance translated & presented in English).`,
        createdAt: new Date().toISOString(),
        offlineFallback: true,
      },
      steps: {
        default: baseSteps.map((s, idx) =>
          idx === 0
            ? {
                ...s,
                detail: `${s.detail} [Confirmed Situation: ${description.trim() || 'Photo reference attached'}]`,
              }
            : s
        ),
      },
    };
  };

  const handleGenerateSpecialisedProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specDescription.trim() && !specPhotoDataUrl) {
      setSpecError('Please take/upload a photo or enter a short description of the injury.');
      return;
    }

    stopLiveCamera();
    setSpecLoading(true);
    setSpecError(null);

    const baseProtocol =
      BASELINE_PROTOCOLS.find((p) => p.id === specBaseId) || BASELINE_PROTOCOLS[0];

    // If offline, immediately attach photo + notes to the verified offline protocol
    if (!isOnline) {
      const offlineSpecialised = buildOfflineFallbackSpecialisedProtocol(
        baseProtocol,
        specDescription,
        specPhotoDataUrl
      );
      saveCustomProtocol(offlineSpecialised);
      setSpecialiserOpen(false);
      setSpecLoading(false);
      openProtocol(offlineSpecialised.id);
      return;
    }

    try {
      const response = await fetch('/api/specialise-protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseProtocolId: baseProtocol.id,
          description: specDescription.trim(),
          photoDataUrl: specPhotoDataUrl,
          ageGroup,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.protocol) {
        throw new Error(data.error || 'Could not generate specialised protocol.');
      }

      const generated: EmergencyProtocol = data.protocol;
      saveCustomProtocol(generated);
      setSpecialiserOpen(false);
      setSpecLoading(false);
      openProtocol(generated.id);
    } catch {
      // Graceful fallback to offline verified steps with photo & description attached
      const fallbackProtocol = buildOfflineFallbackSpecialisedProtocol(
        baseProtocol,
        specDescription,
        specPhotoDataUrl
      );
      saveCustomProtocol(fallbackProtocol);
      setSpecialiserOpen(false);
      setSpecLoading(false);
      openProtocol(fallbackProtocol.id);
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* PERSISTENT TOP BAR CONTRACT & ONE-TAP EMERGENCY SERVICES DIALER */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={returnHome}
              className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 rounded-lg py-1"
              aria-label="PulseAid Home"
            >
              <span className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center font-display font-extrabold text-xl shrink-0">
                +
              </span>
              <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 whitespace-nowrap shrink-0">
                PulseAid
              </span>
            </button>

            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md">
                <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                Offline Ready
              </span>
            )}
          </div>

          {/* Zone 2: Region Selector (999 | 112 | 911) */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div
              className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200"
              role="group"
              aria-label="Emergency Number Region"
            >
              {REGIONS.map((r) => {
                const active = region === r.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => handleSelectRegion(r.code)}
                    data-testid={`region-btn-${r.code}`}
                    className={`min-h-[40px] px-3 py-1 rounded-lg font-mono-tabular text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title={`Set emergency number to ${r.code} (${r.regionName})`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {!isInstalled && deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallPWA}
                className="hidden md:inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Install Offline App
              </button>
            )}
          </div>

          {/* Zone 3: Persistent 1-Tap Call Emergency Services CTA + 111 Non-Emergency Option */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <a
              href="tel:111"
              data-testid="non-emergency-111-btn"
              className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-600 text-sky-950 font-display font-extrabold text-xs sm:text-sm tracking-tight flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              aria-label="Call 111 for Non-Serious Injury Medical Advice (Opens Phone Dialer)"
              title="Not life-threatening? Call 111 for urgent medical advice"
            >
              <PhoneCall className="w-4 h-4 text-sky-700 shrink-0" aria-hidden="true" />
              <span>NOT SERIOUS? CALL 111</span>
            </a>

            <a
              href={`tel:${region}`}
              data-testid="emergency-call-btn"
              className="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-display font-extrabold text-base sm:text-lg tracking-tight flex items-center justify-center gap-2.5 shadow-sm transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              aria-label={`Call Emergency Services ${region} (Opens Phone Dialer)`}
            >
              <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>CALL {region} NOW</span>
            </a>
          </div>
        </div>
      </header>

      {/* LAUNCH MEDICAL DISCLAIMER BANNER (Dismissible in 1 tap, never blocks emergency dialing) */}
      {!disclaimerAccepted && (
        <section
          aria-label="Medical Disclaimer"
          data-testid="medical-disclaimer"
          className="bg-amber-50 border-b-2 border-amber-300 text-slate-900"
        >
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="w-6 h-6 text-amber-800 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-sm sm:text-base leading-snug">
                <strong className="font-display font-bold text-slate-900">
                  Medical Guidance Disclaimer:{' '}
                </strong>
                <span className="text-slate-800">
                  This app provides calm step-by-step support aligned with Red Cross &amp; St John
                  Ambulance guidance, but{' '}
                  <strong className="underline">
                    does not replace professional medical help or formal training
                  </strong>
                  . In any life-threatening emergency, tap <strong>CALL {region} NOW</strong>{' '}
                  above, or tap <strong>CALL 111</strong> if the injury is not serious.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAcceptDisclaimer}
              data-testid="dismiss-disclaimer-btn"
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-bold text-sm flex items-center justify-center gap-2 shrink-0 transition-colors"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>I Understand</span>
            </button>
          </div>
        </section>
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {!activeProtocol ? (
          /* =========================================================
             VIEW 1: HOME TRIAGE SCREEN (Large, High-Contrast Cards)
             ========================================================= */
          <div className="space-y-8" data-testid="home-screen">
            {/* Hero Header + Calming Voice & Live Camera/Photo Specialise Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-bold tracking-wider text-slate-600">
                  OFFLINE-READY FIRST AID · TAP AN EMERGENCY TO START
                </p>
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                  What is the emergency right now?
                </h1>
                <p className="text-base sm:text-lg text-slate-700 font-medium">
                  Select a card below for calm, one-step-at-a-time instructions with reassuring
                  human voice narration.
                </p>
              </div>

              {/* Quick Action Bar: Voice Toggle + Calming Voice Selector + Live Photo/Text Specialisation */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVoiceEnabled((v) => !v)}
                  data-testid="home-voice-toggle"
                  className={`min-h-[48px] px-4 py-2.5 rounded-xl border-2 font-display font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                    voiceEnabled
                      ? 'bg-sky-50 border-sky-600 text-sky-900'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {voiceEnabled ? (
                    <Volume2 className="w-5 h-5 text-sky-700" aria-hidden="true" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  )}
                  <span>Calming Voice: {voiceEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {voiceEnabled && (
                  <select
                    aria-label="Select Calming Voice Tone"
                    value={voicePersona}
                    onChange={(e) =>
                      handleSelectVoicePersona(e.target.value as CalmingVoicePersona)
                    }
                    data-testid="voice-persona-select"
                    className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-white border-2 border-slate-300 font-display font-bold text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  >
                    {CALMING_VOICE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        Voice: {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setAutoAdvanceEnabled((a) => !a)}
                  data-testid="home-autoadvance-toggle"
                  className={`min-h-[48px] px-4 py-2.5 rounded-xl border-2 font-display font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                    autoAdvanceEnabled
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {autoAdvanceEnabled ? (
                    <Play className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  ) : (
                    <Pause className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  )}
                  <span>Auto-Slide: {autoAdvanceEnabled ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openSpecialiser('burns', true)}
                  data-testid="open-specialiser-btn"
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-bold text-sm flex items-center gap-2 shadow-xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Camera className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <span>Live AR Wound Scanner</span>
                </button>
              </div>
            </div>

            {/* CORE 7 EMERGENCY CARDS GRID */}
            <section aria-label="Common Emergencies">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {BASELINE_PROTOCOLS.map((protocol) => {
                  const isCritical = protocol.urgency === 'critical';
                  return (
                    <button
                      key={protocol.id}
                      type="button"
                      onMouseEnter={() => {
                        if (voiceEnabled) {
                          prefetchProtocolSteps(
                            getStepsForProtocol(protocol, ageGroup).slice(0, 2),
                            voicePersona
                          );
                        }
                      }}
                      onTouchStart={() => {
                        if (voiceEnabled) {
                          prefetchProtocolSteps(
                            getStepsForProtocol(protocol, ageGroup).slice(0, 2),
                            voicePersona
                          );
                        }
                      }}
                      onClick={() => openProtocol(protocol.id)}
                      data-testid={`emergency-card-${protocol.id}`}
                      className={`group text-left rounded-2xl p-5 sm:p-6 bg-white border-2 transition-all flex flex-col justify-between min-h-[168px] shadow-xs hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                        isCritical
                          ? 'border-red-300 hover:border-red-600'
                          : 'border-slate-200 hover:border-sky-600'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                              isCritical
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            <ProtocolIcon name={protocol.iconName} className="w-7 h-7" />
                          </div>

                          <div className="text-xs font-bold tracking-wide text-slate-600">
                            {isCritical ? (
                              <span className="text-red-700 font-extrabold">
                                LIFE-SAVING · {region}
                              </span>
                            ) : (
                              <span className="text-sky-800 font-bold">
                                URGENT · 111 IF MINOR
                              </span>
                            )}
                            <span aria-hidden="true"> · </span>
                            <span>{protocol.steps.default.length} STEPS</span>
                          </div>
                        </div>

                        <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 group-hover:text-sky-700 transition-colors">
                          {protocol.shortTitle}
                        </h2>

                        <p className="text-sm sm:text-base text-slate-700 font-medium leading-snug">
                          {protocol.shortSummary}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>
                          {protocol.supportsAgeGroups
                            ? 'Adult · Child · Infant steps'
                            : 'Step-by-step calming voice'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sky-700 group-hover:translate-x-0.5 transition-transform">
                          Start Now
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Dedicated Card for Real-Time AR Wound Scanner + Photo/Text Specialisation */}
                <button
                  type="button"
                  onClick={() => openSpecialiser('burns', true)}
                  data-testid="emergency-card-specialise"
                  className="group text-left rounded-2xl p-5 sm:p-6 bg-slate-900 text-white border-2 border-slate-900 hover:border-sky-500 transition-all flex flex-col justify-between min-h-[168px] shadow-xs hover:shadow-md active:scale-[0.99]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 text-sky-300 flex items-center justify-center shrink-0">
                        <Camera className="w-7 h-7" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-bold tracking-wide text-sky-300">
                        REAL-TIME AR WOUND OVERLAY + VOICE
                      </span>
                    </div>

                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white">
                      AR Wound Scanner &amp; Specialiser
                    </h2>

                    <p className="text-sm sm:text-base text-slate-200 font-medium leading-snug">
                      Point your camera at an injury for a real-time AR target overlay, triage
                      (111 vs {region}), and tailored step-by-step guidance.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/15 flex items-center justify-between text-xs font-bold text-sky-300">
                    <span>Real-time AR tracking · Privacy safe</span>
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Launch AR Camera
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              </div>
            </section>

            {/* RECENT SPECIALISED PROTOCOLS (If user generated any during session) */}
            {customProtocols.length > 0 && (
              <section
                aria-label="Your Specialised Protocols"
                className="pt-4 border-t border-slate-200 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-extrabold text-lg text-slate-900">
                    Tailored Protocols Created in This Session
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomProtocols([]);
                      try {
                        localStorage.removeItem('pulseaid_custom_protocols');
                      } catch {
                        // Ignore
                      }
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Clear Saved
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customProtocols.map((cp) => (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() => openProtocol(cp.id)}
                      className="text-left p-4 rounded-2xl bg-white border-2 border-sky-600 hover:bg-sky-50/40 transition-colors flex items-center gap-4"
                    >
                      {cp.specialisationContext?.photoDataUrl ? (
                        <img
                          src={cp.specialisationContext.photoDataUrl}
                          alt="Attached injury context"
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                          <Sparkles className="w-7 h-7" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-sky-700">
                          SPECIALISED PROTOCOL · {cp.steps.default.length} STEPS
                        </div>
                        <h3 className="font-display font-extrabold text-lg text-slate-900 truncate">
                          {cp.title}
                        </h3>
                        <p className="text-sm text-slate-700 truncate">{cp.shortSummary}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-sky-700 shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* =========================================================
             VIEW 2: STEP-BY-STEP EMERGENCY WIZARD (One Step Per Screen)
             ========================================================= */
          <div className="space-y-6" data-testid="wizard-screen">
            {/* Wizard Top Navigation & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <button
                type="button"
                onClick={returnHome}
                data-testid="wizard-back-home-btn"
                className="min-h-[48px] px-4 py-2 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-900 font-display font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>All Emergencies</span>
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Specialise Current Protocol with Live AR Wound Scanner / Photo / Notes */}
                <button
                  type="button"
                  onClick={() => openSpecialiser(activeProtocol.id, true)}
                  data-testid="wizard-specialise-btn"
                  className="min-h-[48px] px-3.5 py-2 rounded-xl bg-white border-2 border-slate-300 hover:border-sky-600 text-slate-900 font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Camera className="w-4 h-4 text-sky-600" aria-hidden="true" />
                  <span>Live AR Wound Scanner</span>
                </button>

                {/* Revert to Standard Baseline if currently viewing a Specialised Protocol */}
                {activeProtocol.isSpecialised &&
                  activeProtocol.specialisationContext?.baseProtocolId && (
                    <button
                      type="button"
                      onClick={() =>
                        openProtocol(activeProtocol.specialisationContext!.baseProtocolId!)
                      }
                      data-testid="revert-baseline-btn"
                      className="min-h-[48px] px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>Standard Baseline Steps</span>
                    </button>
                  )}

                {/* Auto-Advance Slides Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setAutoAdvanceEnabled((prev) => {
                      const next = !prev;
                      if (!next) setAutoAdvanceCountdown(null);
                      return next;
                    });
                  }}
                  data-testid="wizard-autoadvance-toggle"
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl border-2 font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                    autoAdvanceEnabled
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {autoAdvanceEnabled ? (
                    <Play className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Pause className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{autoAdvanceEnabled ? 'Auto-Slide ON' : 'Auto-Slide OFF'}</span>
                </button>

                {/* Hands-Free Calming Voice Narration Toggle */}
                <button
                  type="button"
                  onClick={() => setVoiceEnabled((v) => !v)}
                  data-testid="wizard-voice-toggle"
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl border-2 font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                    voiceEnabled
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {voiceEnabled ? (
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <VolumeX className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
                </button>

                {/* Calming Voice Tone Selector inside Wizard */}
                {voiceEnabled && (
                  <select
                    aria-label="Select Calming Voice Tone"
                    value={voicePersona}
                    onChange={(e) =>
                      handleSelectVoicePersona(e.target.value as CalmingVoicePersona)
                    }
                    className="min-h-[48px] px-3 py-2 rounded-xl bg-white border-2 border-slate-300 font-display font-bold text-xs sm:text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                  >
                    {CALMING_VOICE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Spoken Voice Commands ("Next", "Back", "Repeat") Toggle */}
                {voiceControllerRef.current?.supported && (
                  <button
                    type="button"
                    onClick={toggleVoiceCommands}
                    data-testid="wizard-mic-toggle"
                    className={`min-h-[48px] px-3.5 py-2 rounded-xl border-2 font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                      voiceCommandsActive
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                    title='Say "Next", "Back", or "Repeat" hands-free'
                  >
                    {voiceCommandsActive ? (
                      <Mic className="w-4 h-4 text-sky-400" aria-hidden="true" />
                    ) : (
                      <MicOff className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    )}
                    <span>
                      {voiceCommandsActive ? 'Mic Listening ("Next/Back")' : 'Voice Commands'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Protocol Header + Adult / Child / Infant Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-600 tracking-wide">
                  {activeProtocol.clinicalSource}
                  {lastVoiceCommand && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="text-sky-700">Heard {lastVoiceCommand}</span>
                    </>
                  )}
                </div>
                <h1
                  data-testid="wizard-protocol-title"
                  className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900"
                >
                  {activeProtocol.title}
                </h1>
              </div>

              {activeProtocol.supportsAgeGroups && (
                <div
                  className="inline-flex items-center bg-slate-200/80 p-1 rounded-xl border border-slate-300 self-start"
                  role="group"
                  aria-label="Casualty Age Group"
                >
                  {(
                    [
                      { id: 'adult', label: 'Adult' },
                      { id: 'child', label: 'Child (1–12y)' },
                      { id: 'infant', label: 'Infant (<1y)' },
                    ] as const
                  ).map((group) => {
                    const active = ageGroup === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setAgeGroup(group.id);
                          setCurrentStepIndex(0);
                        }}
                        data-testid={`age-toggle-${group.id}`}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-lg font-display font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        {group.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Specialised Context Banner (If photo or notes were attached) */}
            {activeProtocol.isSpecialised && activeProtocol.specialisationContext && (
              <div
                data-testid="specialised-context-banner"
                className="rounded-2xl bg-sky-50 border-2 border-sky-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                {activeProtocol.specialisationContext.photoDataUrl && (
                  <img
                    src={activeProtocol.specialisationContext.photoDataUrl}
                    alt="User provided injury reference"
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xl object-cover border border-sky-300 shrink-0"
                  />
                )}
                <div className="space-y-1 flex-1">
                  <div className="text-xs font-extrabold tracking-wide text-sky-900">
                    SPECIALISED FOR YOUR SITUATION
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">
                    {activeProtocol.specialisationContext.clinicalSummary}
                  </p>
                  {activeProtocol.specialisationContext.description && (
                    <p className="text-xs text-slate-700">
                      Notes: &ldquo;{activeProtocol.specialisationContext.description}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step Progress Segmented Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono-tabular font-bold text-slate-700">
                <span data-testid="wizard-step-counter">
                  STEP {String(safeStepIndex + 1).padStart(2, '0')} OF{' '}
                  {String(activeSteps.length).padStart(2, '0')}
                </span>
                <span>
                  {Math.round(((safeStepIndex + 1) / Math.max(1, activeSteps.length)) * 100)}%
                  COMPLETE
                </span>
              </div>
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(1, activeSteps.length)}, minmax(0, 1fr))`,
                }}
              >
                {activeSteps.map((step, idx) => (
                  <button
                    key={step.stepNumber}
                    type="button"
                    onClick={() => setCurrentStepIndex(idx)}
                    aria-label={`Go to Step ${idx + 1}`}
                    className={`h-3 rounded-full transition-colors ${
                      idx === safeStepIndex
                        ? 'bg-sky-600'
                        : idx < safeStepIndex
                        ? 'bg-slate-900'
                        : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* SINGLE STEP CARD (High-Contrast One-Instruction-Per-Screen) */}
            {currentStep && (
              <article
                data-testid="wizard-step-card"
                className="rounded-3xl bg-white border-2 border-slate-300 shadow-sm p-6 sm:p-10 space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-mono-tabular font-bold text-sm sm:text-base">
                    STEP {currentStep.stepNumber}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      speakStepText(
                        currentStep.voiceScript,
                        () => setIsSpeaking(true),
                        () => setIsSpeaking(false),
                        voicePersona
                      )
                    }
                    data-testid="repeat-voice-btn"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors"
                  >
                    <Volume2
                      className={`w-4 h-4 ${isSpeaking ? 'text-sky-600' : 'text-slate-700'}`}
                      aria-hidden="true"
                    />
                    <span>
                      {isSpeaking ? `Speaking (${voicePersona})...` : 'Read Step Aloud'}
                    </span>
                  </button>
                </div>

                {/* Primary Single Action Imperative Headline */}
                <h2
                  data-testid="wizard-step-instruction"
                  className="font-display font-extrabold text-2xl sm:text-4xl text-slate-900 leading-tight"
                >
                  {currentStep.instruction}
                </h2>

                {/* Concise How-To Clinical Detail */}
                <p
                  data-testid="wizard-step-detail"
                  className="text-lg sm:text-xl text-slate-800 font-medium leading-relaxed max-w-3xl"
                >
                  {currentStep.detail}
                </p>

                {/* Explicit Safety DO-NOT Warning Box */}
                {currentStep.warning && (
                  <div
                    data-testid="wizard-step-warning"
                    className="rounded-2xl bg-amber-50 border-2 border-amber-400 p-4 sm:p-5 flex items-start gap-3.5 text-amber-950"
                  >
                    <AlertTriangle
                      className="w-6 h-6 text-amber-800 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold tracking-wider text-amber-900">
                        CRITICAL SAFETY CAUTION
                      </div>
                      <p className="text-base sm:text-lg font-bold leading-snug">
                        {currentStep.warning}
                      </p>
                    </div>
                  </div>
                )}

                {/* 110 BPM AUDIO-VISUAL CPR METRONOME (Only on Chest Compression Steps) */}
                {currentStep.hasMetronome && (
                  <div
                    data-testid="cpr-metronome-box"
                    className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono-tabular font-bold text-sky-400">
                        <span>CPR COMPRESSION PACEMAKER</span>
                        <span aria-hidden="true">·</span>
                        <span>110 BEATS PER MINUTE</span>
                      </div>
                      <div className="font-display font-extrabold text-xl sm:text-2xl">
                        {metronomePlaying
                          ? `PUSH HARD & FAST — COUNT: ${String(metronomeBeat).padStart(2, '0')} / 30`
                          : 'Start 110 BPM Audio-Visual Compression Guide'}
                      </div>
                      <p className="text-sm text-slate-300">
                        Push down firmly on every click. Accents sound on beats 1, 10, 20, and 30.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleMetronome}
                      data-testid="toggle-metronome-btn"
                      className={`w-full sm:w-auto min-h-[52px] px-6 py-3 rounded-xl font-display font-extrabold text-base flex items-center justify-center gap-2.5 transition-transform shrink-0 ${
                        metronomePlaying
                          ? 'bg-red-600 hover:bg-red-700 text-white scale-100'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                      }`}
                    >
                      <HeartPulse className="w-5 h-5" aria-hidden="true" />
                      <span>
                        {metronomePlaying ? 'Stop 110 BPM Metronome' : 'Start 110 BPM Metronome'}
                      </span>
                    </button>
                  </div>
                )}

                {/* NON-SERIOUS INJURY: CALL 111 MEDICAL ADVICE HIGHLIGHT */}
                {(currentStep.advise111 || activeProtocol.urgency === 'urgent') && (
                  <div
                    data-testid="step-111-advice-box"
                    className="rounded-2xl bg-sky-50 border-2 border-sky-400 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold tracking-wide text-sky-900">
                        INJURY NOT SERIOUS OR LIFE-THREATENING? CALL 111
                      </div>
                      <p className="text-base sm:text-lg font-bold text-slate-900">
                        If the person is stable and the injury is not life-threatening, call 111 for
                        non-emergency medical advice instead of {region}.
                      </p>
                    </div>
                    <a
                      href="tel:111"
                      data-testid="step-111-call-btn"
                      className="w-full sm:w-auto min-h-[52px] px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-display font-extrabold text-base flex items-center justify-center gap-2 shrink-0 transition-colors"
                    >
                      <PhoneCall className="w-5 h-5" aria-hidden="true" />
                      <span>Call 111 for Advice</span>
                    </a>
                  </div>
                )}

                {/* Step-Specific Call Emergency Services Highlight */}
                {currentStep.callPrompt && (
                  <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold tracking-wide text-red-800">
                        {currentStep.advise111
                          ? `IF SEVERE OR RED-FLAG SYMPTOMS PRESENT: CALL ${region}`
                          : 'EMERGENCY DISPATCH REQUIRED'}
                      </div>
                      <p className="text-base sm:text-lg font-bold text-slate-900">
                        Open your phone dialer pre-filled with {region} and put the call on
                        speakerphone.
                      </p>
                    </div>
                    <a
                      href={`tel:${region}`}
                      data-testid="step-emergency-call-btn"
                      className="w-full sm:w-auto min-h-[52px] px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-extrabold text-base flex items-center justify-center gap-2 shrink-0"
                    >
                      <PhoneCall className="w-5 h-5" aria-hidden="true" />
                      <span>Dial {region} Now</span>
                    </a>
                  </div>
                )}

                {/* AUTO-ADVANCE SLIDE PROGRESSION BAR */}
                {autoAdvanceEnabled && safeStepIndex < activeSteps.length - 1 && (
                  <div
                    data-testid="auto-advance-bar"
                    className="rounded-2xl bg-slate-100 border border-slate-300 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800">
                      <Play className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                      {metronomePlaying ? (
                        <span>Auto-Slide paused while 110 BPM CPR Metronome is active</span>
                      ) : autoAdvancePausedOnStep ? (
                        <span>Auto-Slide paused on this step</span>
                      ) : isSpeaking ? (
                        <span>
                          Speaking Step {currentStep.stepNumber} · Will auto-advance to Step{' '}
                          {currentStep.stepNumber + 1} when finished
                        </span>
                      ) : autoAdvanceCountdown !== null ? (
                        <span className="font-mono-tabular text-emerald-900">
                          Auto-advancing to Step {currentStep.stepNumber + 1} in{' '}
                          {autoAdvanceCountdown}s...
                        </span>
                      ) : (
                        <span>Auto-Slide active</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Auto-Advance Pause Duration"
                        value={autoAdvanceDelaySec}
                        onChange={(e) => {
                          const sec = Number(e.target.value);
                          setAutoAdvanceDelaySec(sec);
                          if (!isSpeaking) setAutoAdvanceCountdown(sec);
                        }}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800"
                      >
                        <option value={2}>2s pause</option>
                        <option value={4}>4s pause</option>
                        <option value={7}>7s pause</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setAutoAdvancePausedOnStep((prev) => {
                            const next = !prev;
                            if (!next && !isSpeaking) {
                              setAutoAdvanceCountdown(autoAdvanceDelaySec);
                            }
                            return next;
                          });
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-lg bg-white hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-900 flex items-center gap-1"
                      >
                        {autoAdvancePausedOnStep ? (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                            <span>Resume</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
                            <span>Hold Step</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )}

            {/* OVERSIZED THUMB-ZONE WIZARD NAVIGATION (PREVIOUS / NEXT STEP) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={safeStepIndex === 0}
                data-testid="wizard-prev-btn"
                className={`min-h-[60px] px-6 py-4 rounded-2xl font-display font-extrabold text-lg flex items-center justify-center gap-2 border-2 transition-colors ${
                  safeStepIndex === 0
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-900 active:scale-[0.99]'
                }`}
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                <span>Previous Step</span>
              </button>

              {safeStepIndex < activeSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentStepIndex((prev) => Math.min(activeSteps.length - 1, prev + 1))
                  }
                  data-testid="wizard-next-btn"
                  className="sm:col-span-2 min-h-[60px] px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-display font-extrabold text-xl flex items-center justify-center gap-3 shadow-sm transition-colors active:scale-[0.99]"
                >
                  <span>
                    Next Step ({safeStepIndex + 2} of {activeSteps.length})
                  </span>
                  <ArrowRight className="w-6 h-6" aria-hidden="true" />
                </button>
              ) : (
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex(0)}
                    data-testid="wizard-restart-btn"
                    className="min-h-[60px] px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold text-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" aria-hidden="true" />
                    <span>Repeat From Step 1</span>
                  </button>
                  <button
                    type="button"
                    onClick={returnHome}
                    data-testid="wizard-finish-home-btn"
                    className="min-h-[60px] px-6 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-display font-extrabold text-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check className="w-5 h-5" aria-hidden="true" />
                    <span>All Emergencies</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
         MODAL / DRAWER: LIVE CAMERA + FILE UPLOAD + TEXT SPECIALISER
         ========================================================= */}
      {specialiserOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="specialiser-modal-title"
          data-testid="specialiser-modal"
        >
          <div className="bg-white rounded-3xl border-2 border-slate-300 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-xl my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="text-xs font-extrabold tracking-wider text-sky-700">
                  OPTIONAL MULTIMODAL SPECIALISATION
                </div>
                <h2
                  id="specialiser-modal-title"
                  className="font-display font-extrabold text-2xl text-slate-900"
                >
                  Specialise Protocol with Live Photo &amp; Details
                </h2>
                <p className="text-sm text-slate-700">
                  Snap a live photo right in the app (or upload a file) and describe specifics to
                  tailor the step-by-step first aid wizard.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSpecialiser}
                data-testid="close-specialiser-btn"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center shrink-0"
                aria-label="Close Specialiser"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleGenerateSpecialisedProtocol} className="space-y-5">
              {/* 1. Base Emergency Category Selector */}
              <div className="space-y-2">
                <label
                  htmlFor="spec-category-select"
                  className="block font-display font-bold text-sm text-slate-900"
                >
                  1. Emergency Category Baseline
                </label>
                <select
                  id="spec-category-select"
                  value={specBaseId}
                  onChange={(e) => setSpecBaseId(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 font-semibold text-slate-900 focus:border-sky-600 focus:outline-none"
                >
                  {BASELINE_PROTOCOLS.map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Optional Injury / Scene Photo: Live In-App Camera OR Upload File */}
              <div className="space-y-2.5">
                <span className="block font-display font-bold text-sm text-slate-900">
                  2. Optional Photo of Injury or Scene
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  data-testid="specialiser-photo-input"
                  className="hidden"
                />

                {liveCameraActive ? (
                  /* LIVE IN-APP CAMERA VIEWFINDER WITH REAL-TIME AR WOUND OVERLAY */
                  <div
                    data-testid="live-camera-viewfinder"
                    className="rounded-2xl bg-slate-950 border-2 border-sky-500 overflow-hidden space-y-3 p-3"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* REAL-TIME AR WOUND IDENTIFICATION HUD OVERLAY */}
                      {arOverlayEnabled && (
                        <div
                          data-testid="ar-wound-overlay"
                          className="absolute inset-0 pointer-events-none select-none overflow-hidden"
                        >
                          {/* Subtle Clinical AR Grid Overlay */}
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage:
                                'linear-gradient(to right, rgba(56, 189, 248, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.35) 1px, transparent 1px)',
                              backgroundSize: '36px 36px',
                            }}
                          />

                          {/* Top AR Telemetry Bar + Auto Voice Detection Status */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-sky-400/60 text-sky-300 font-mono-tabular text-[11px] font-bold">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    arScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                                  }`}
                                />
                                <span>
                                  {arScanning
                                    ? 'AR SCANNING WOUND...'
                                    : 'REAL-TIME AR TRACKING'}
                                </span>
                              </div>

                              <div
                                data-testid="ar-voice-status-badge"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono-tabular text-[11px] font-bold border ${
                                  isDictating
                                    ? 'bg-red-950/90 border-red-400 text-red-200'
                                    : 'bg-slate-950/85 border-slate-600 text-slate-300'
                                }`}
                              >
                                <Mic className="w-3 h-3 text-red-400 animate-pulse" aria-hidden="true" />
                                <span>
                                  {isDictating
                                    ? `VOICE LISTENING (${patientLanguage.toUpperCase()}) → ENGLISH`
                                    : 'VOICE STANDBY'}
                                </span>
                              </div>
                            </div>

                            {arScanResult && (
                              <div
                                className={`px-2.5 py-1 rounded-lg font-mono-tabular text-[11px] font-extrabold border ${
                                  arScanResult.severity === 'critical_999'
                                    ? 'bg-red-950/90 border-red-400 text-red-200'
                                    : 'bg-sky-950/90 border-sky-400 text-sky-200'
                                }`}
                              >
                                {arScanResult.severity === 'critical_999'
                                  ? `SEVERE INJURY · DIAL ${region}`
                                  : 'NON-SERIOUS / MODERATE · ADVISE 111'}
                              </div>
                            )}
                          </div>

                          {/* Dynamic AR Wound Target Bounding Box (0-1000 normalized -> %) */}
                          <div
                            className="absolute transition-all duration-150 ease-out"
                            style={{
                              top: `${Math.max(6, Math.min(82, arLiveBox.ymin / 10))}%`,
                              left: `${Math.max(6, Math.min(82, arLiveBox.xmin / 10))}%`,
                              width: `${Math.max(
                                16,
                                Math.min(86, (arLiveBox.xmax - arLiveBox.xmin) / 10)
                              )}%`,
                              height: `${Math.max(
                                16,
                                Math.min(80, (arLiveBox.ymax - arLiveBox.ymin) / 10)
                              )}%`,
                            }}
                          >
                            {/* Translucent Target Highlight Fill */}
                            <div
                              className={`w-full h-full rounded-xl border ${
                                arScanResult?.severity === 'critical_999'
                                  ? 'bg-red-500/15 border-red-400/60'
                                  : 'bg-sky-400/15 border-sky-400/60'
                              }`}
                            />

                            {/* High-Contrast AR Corner Reticle Brackets */}
                            <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-sky-300 rounded-tl-md" />
                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-sky-300 rounded-tr-md" />
                            <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-sky-300 rounded-bl-md" />
                            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-sky-300 rounded-br-md" />

                            {/* Center Target Crosshair Reticle */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full border border-sky-300/80 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-sky-300 animate-ping" />
                              </div>
                            </div>
                          </div>

                          {/* Bottom AR Clinical Identification + Live Multilingual Speech-to-English Subtitle Banner */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-slate-950/90 border border-sky-400/70 p-2.5 sm:p-3 text-white shadow-lg space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[11px] font-mono-tabular font-extrabold text-sky-300 tracking-wide">
                                {arScanResult
                                  ? `SUSPECTED INJURY: ${arScanResult.woundLabel.toUpperCase()}`
                                  : 'HOLD INJURY IN FRAME & SPEAK IN ANY LANGUAGE'}
                              </div>
                              <span className="text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-400/40">
                                SUSPECTED CATEGORY:{' '}
                                {(arScanResult?.recommendedProtocolId || specBaseId).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-display font-bold text-white">
                              {arScanResult
                                ? `AR English Advice: ${arScanResult.actionInstruction}`
                                : 'Tracking redness, erythema, and listening for spoken symptoms...'}
                            </div>
                            {(dictationInterim || lastTranslatedEnglish) && (
                              <div className="text-[11px] text-emerald-300 font-medium truncate border-t border-white/15 pt-1">
                                {dictationInterim
                                  ? `Listening (${patientLanguage}): "${dictationInterim}..."`
                                  : `Translated to English${
                                      detectedSpeechLangName ? ` (from ${detectedSpeechLangName})` : ''
                                    }: "${lastTranslatedEnglish}"`}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AR Camera Controls + Multilingual Selector + 1-Tap Confirm Suspected Injury Button */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setArOverlayEnabled((v) => !v)}
                            data-testid="toggle-ar-overlay-btn"
                            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 border ${
                              arOverlayEnabled
                                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>AR Overlay: {arOverlayEnabled ? 'ON' : 'OFF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleDictation}
                            data-testid="ar-voice-toggle-btn"
                            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 border ${
                              isDictating
                                ? 'bg-red-600 border-red-400 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-200'
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{isDictating ? 'Voice Detection: ON' : 'Voice Detection: OFF'}</span>
                          </button>

                          <select
                            aria-label="Select Patient Spoken Language"
                            value={patientLanguage}
                            onChange={(e) => handleSelectPatientLanguage(e.target.value)}
                            data-testid="ar-language-select"
                            className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-900 border border-sky-500/60 text-white font-display font-bold text-xs focus:outline-none"
                          >
                            {PATIENT_LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>
                                Mic Language: {lang.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={triggerArWoundScan}
                            disabled={arScanning}
                            data-testid="rescan-ar-wound-btn"
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-300 font-display font-bold text-xs flex items-center gap-1.5"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${arScanning ? 'animate-spin' : ''}`}
                              aria-hidden="true"
                            />
                            <span>{arScanning ? 'Scanning...' : 'Scan Wound'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleFlipCamera}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Flip</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => captureLivePhoto(true)}
                            data-testid="capture-live-photo-btn"
                            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                          >
                            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Snap Photo Only</span>
                          </button>
                        </div>
                      </div>

                      {/* PROMINENT 1-TAP BUTTON: CONFIRM SUSPECTED INJURY & MOVE STRAIGHT TO FIRST AID ADVICE */}
                      <button
                        type="button"
                        onClick={handleConfirmSuspectedInjuryAndGoToAdvice}
                        data-testid="ar-confirm-injury-advice-btn"
                        className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-display font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-colors"
                      >
                        <Check className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                        <span>
                          Confirm Suspected Injury (
                          {
                            (
                              BASELINE_PROTOCOLS.find(
                                (p) =>
                                  p.id === (arScanResult?.recommendedProtocolId || specBaseId)
                              ) || BASELINE_PROTOCOLS[0]
                            ).shortTitle
                          }
                          ) → Go Straight to English First Aid Advice
                        </span>
                        <ArrowRight className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : !specPhotoDataUrl ? (
                  /* TWO DISTINCT OPTIONS: LIVE IN-APP AR CAMERA vs UPLOAD FILE */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setArOverlayEnabled(true);
                        startLiveCamera();
                      }}
                      data-testid="start-live-camera-btn"
                      className="min-h-[96px] p-4 rounded-2xl border-2 border-sky-600 bg-sky-50/70 hover:bg-sky-100/70 text-slate-900 flex flex-col items-center justify-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-sky-700" aria-hidden="true" />
                      <span className="font-display font-extrabold text-sm text-sky-950">
                        Live AR Wound Camera + Auto Voice Detection
                      </span>
                      <span className="text-xs text-slate-700">
                        Identifies wound in real time &amp; listens in any language
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="upload-photo-file-btn"
                      className="min-h-[96px] p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-600 bg-slate-50 hover:bg-sky-50/40 text-slate-800 flex flex-col items-center justify-center gap-1.5 transition-colors"
                    >
                      <ImageIcon className="w-6 h-6 text-slate-700" aria-hidden="true" />
                      <span className="font-display font-bold text-sm">
                        Upload Photo from Files
                      </span>
                      <span className="text-xs text-slate-600">
                        Choose an existing image from your device
                      </span>
                    </button>
                  </div>
                ) : (
                  /* CAPTURED / UPLOADED PHOTO PREVIEW + AR SCAN SUMMARY */
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={specPhotoDataUrl}
                          alt="Selected injury preview"
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm text-slate-900 truncate">
                            {specPhotoName || 'Attached Photo Ready'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {arScanResult
                              ? `AR Action: ${arScanResult.actionInstruction}`
                              : 'Ready to include in protocol specialisation'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setArOverlayEnabled(true);
                            startLiveCamera();
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 shrink-0"
                        >
                          Re-Open AR Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSpecPhotoDataUrl(undefined);
                            setSpecPhotoName('');
                            setArScanResult(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-red-700 hover:bg-red-50 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold">
                    {cameraError}
                  </div>
                )}
              </div>

              {/* 3. Optional Descriptive Text + Multilingual Voice Dictation + Quick Hackathon Demo Scenarios */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="spec-description-input"
                    className="block font-display font-bold text-sm text-slate-900"
                  >
                    3. Situational Description (Speak in Any Language → Translates to English)
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Select Spoken Language for Dictation"
                      value={patientLanguage}
                      onChange={(e) => handleSelectPatientLanguage(e.target.value)}
                      data-testid="dictate-language-select"
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 font-display font-bold text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                    >
                      {PATIENT_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleToggleDictation}
                      disabled={isTranscribingAudio}
                      data-testid="dictate-description-btn"
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors ${
                        isDictating
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300'
                      }`}
                    >
                      {isDictating ? (
                        <>
                          <Mic className="w-4 h-4 text-white animate-pulse" aria-hidden="true" />
                          <span>Stop Dictating (Listening...)</span>
                        </>
                      ) : isTranscribingAudio ? (
                        <>
                          <Mic className="w-4 h-4 text-sky-700" aria-hidden="true" />
                          <span>Translating to English...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-sky-700" aria-hidden="true" />
                          <span>Dictate (Any Language)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {lastOriginalSpeech && lastTranslatedEnglish && lastOriginalSpeech !== lastTranslatedEnglish && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex flex-col gap-0.5">
                    <span className="font-bold">
                      Heard{detectedSpeechLangName ? ` (${detectedSpeechLangName})` : ''}: &ldquo;
                      {lastOriginalSpeech}&rdquo;
                    </span>
                    <span className="font-extrabold text-emerald-900">
                      Translated to English for First Aid Advice: &ldquo;{lastTranslatedEnglish}&rdquo;
                    </span>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    id="spec-description-input"
                    rows={3}
                    value={
                      dictationInterim
                        ? `${specDescription}${specDescription ? ' ' : ''}${dictationInterim}`
                        : specDescription
                    }
                    onChange={(e) => {
                      setSpecDescription(e.target.value);
                      setDictationInterim('');
                      setSpecError(null);
                    }}
                    data-testid="specialiser-description-input"
                    placeholder="Speak in any language (Spanish, French, Hindi, Urdu, Arabic, English, etc.) — your words are automatically translated into English for first-aid advice..."
                    className={`w-full p-3.5 rounded-2xl bg-slate-50 border-2 text-slate-900 font-medium text-sm sm:text-base focus:bg-white focus:outline-none ${
                      isDictating
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-slate-300 focus:border-sky-600'
                    }`}
                  />
                </div>

                {/* 1-Tap Demo Presets for fast 3-minute hackathon judging */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {DEMO_SPECIALISATION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSpecBaseId(preset.baseId);
                        setSpecDescription(preset.text);
                        setSpecError(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors text-left"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {specError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm font-bold">
                  {specError}
                </div>
              )}

              {/* Direct 1-Tap Patient Confirmation Banner to Move Immediately to Advice Section */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-extrabold tracking-wide text-emerald-900">
                    PATIENT CONFIRMED SUSPECTED INJURY?
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    Skip waiting and jump straight to the English step-by-step first aid advice for{' '}
                    <span className="underline">
                      {
                        (
                          BASELINE_PROTOCOLS.find(
                            (p) => p.id === (arScanResult?.recommendedProtocolId || specBaseId)
                          ) || BASELINE_PROTOCOLS[0]
                        ).title
                      }
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmSuspectedInjuryAndGoToAdvice}
                  data-testid="confirm-injury-advice-btn"
                  className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shrink-0 shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  <span>Confirm Injury → Go to Advice Now</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Human-in-the-loop Privacy Note & Submit */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  Human-in-the-loop: Data is sent only when you confirm and is never stored
                  externally. All guidance is delivered in English.
                </p>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeSpecialiser}
                    className="flex-1 sm:flex-initial min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 font-display font-bold text-sm text-slate-800 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={specLoading}
                    data-testid="submit-specialiser-btn"
                    className="flex-1 sm:flex-initial min-h-[48px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {specLoading ? 'Tailoring Steps...' : 'Generate Specialised Steps'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUIET CLINICAL FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            <span>PulseAid Emergency First Aid Companion</span>
            <span aria-hidden="true"> · </span>
            <span>Aligned with Red Cross &amp; St John Ambulance Standards</span>
          </div>
          <div>
            <span>Does not replace professional medical care</span>
            <span aria-hidden="true"> · </span>
            <a
              href={`tel:${region}`}
              className="font-bold text-red-700 hover:underline"
            >
              Emergency Dialer: {region}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
