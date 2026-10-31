import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { BASELINE_PROTOCOLS, type EmergencyProtocol } from './src/protocols.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // Cache generated WAV audio in memory for instant replay during live demos
  const ttsCache = new Map<string, string>();

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      offlineBaselineCount: BASELINE_PROTOCOLS.length,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
    });
  });

  /**
   * POST /api/tts
   * Generates warm, calm, natural British human voice audio via gemini-3.8-flash-lite-tts
   * with languageCode: 'en-GB' and natural British NHS / Red Cross responder phrasing.
   */
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voiceName = 'Charon' }: { text?: string; voiceName?: string } = req.body || {};
      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Missing text for speech generation.' });
        return;
      }

      const allowedVoices = ['Charon', 'Kore', 'Puck', 'Fenrir', 'Zephyr'];
      const selectedVoice = allowedVoices.includes(voiceName) ? voiceName : 'Charon';

      const britishStyleByVoice: Record<string, string> = {
        Charon:
          'Speak with an authentic, natural British English accent (en-GB, warm Southern English NHS paramedic). Sound like a real, empathetic human responder—calm, grounded, conversational, and reassuring at a brisk, natural pace. Never sound robotic or AI-generated.',
        Puck:
          'Speak with an authentic, natural British English accent (en-GB, friendly UK St John Ambulance first-aider). Sound like a warm, supportive, real human speaking conversationally and briskly right beside the listener.',
        Zephyr:
          'Speak with an authentic, natural British English accent (en-GB, gentle, caring UK NHS 111 / 999 nurse). Warm, soothing, natural human British voice with genuine empathy and a brisk, steady conversational cadence.',
        Kore:
          'Speak with an authentic, natural British English accent (en-GB, composed British Red Cross clinical responder). Warm, articulate, natural human British intonation at a brisk, reassuring pace.',
        Fenrir:
          'Speak with an authentic, natural British English accent (en-GB, steady UK emergency medic). Warm, reassuring, real human voice at a brisk pace.',
      };

      const stylePrompt =
        britishStyleByVoice[selectedVoice] || britishStyleByVoice.Charon;

      const cacheKey = `v3-gb-british::${selectedVoice}::${text.trim()}`;

      const cached = ttsCache.get(cacheKey);
      if (cached) {
        res.json({ audioBase64: cached, mimeType: 'audio/wav', cached: true });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: stylePrompt,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            languageCode: 'en-GB',
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        throw new Error('No audio returned from Gemini TTS model.');
      }

      if (ttsCache.size > 100) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', cached: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to synthesize calming voice audio.';
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /api/transcribe
   * Uses gemini-3.5-transcribe to transcribe spoken descriptions in ANY language
   * and automatically translate them into clear English for first-aid guidance.
   */
  app.post('/api/transcribe', async (req, res) => {
    try {
      const {
        audioDataUrl,
        sourceLanguage = 'auto',
      }: { audioDataUrl?: string; sourceLanguage?: string } = req.body || {};
      if (!audioDataUrl || !audioDataUrl.startsWith('data:audio/')) {
        res.status(400).json({ error: 'Missing valid audio data for transcription.' });
        return;
      }

      const match = audioDataUrl.match(/^data:(audio\/[a-zA-Z0-9.+;-]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid audio data URL format.' });
        return;
      }

      const rawMime = match[1].split(';')[0] || 'audio/webm';
      const base64Audio = match[2];

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: rawMime,
                data: base64Audio,
              },
            },
            {
              text: `The speaker may be speaking in any language (hint: ${sourceLanguage}). Transcribe what they said regarding the injury or emergency and translate it directly into clear, natural English sentences suitable for first-aid triage. Return ONLY the English translation with no extra commentary.`,
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      res.json({ transcript });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to transcribe audio right now.';
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /api/translate-speech
   * Real-time multilingual speech translator & injury intent detector.
   * Takes live spoken text in any language, translates it into English, identifies the
   * suspected emergency protocol ID, and detects if the patient confirmed the injury.
   */
  app.post('/api/translate-speech', async (req, res) => {
    try {
      const {
        text,
        sourceLanguage = 'auto',
      }: { text?: string; sourceLanguage?: string } = req.body || {};

      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Missing speech text to translate.' });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are a multilingual medical first-aid interpreter.
The patient or bystander spoke the following text (language hint: "${sourceLanguage}"):
"${text.trim()}"

1. Detect the spoken language name (e.g., "English", "Spanish", "French", "Hindi", "Urdu", "Arabic", "German", "Polish", "Mandarin").
2. Translate the statement into clear, concise English describing the injury or symptoms. (If already in English, return the cleaned English text).
3. Map the described injury/symptoms to the best matching first-aid protocol ID from: "burns", "bleeding", "sprains", "allergic", "choking", "cpr", "fainting" (or "" if unclear).
4. Set confirmedByPatient to true ONLY if the speaker explicitly confirmed or asked to proceed to advice (e.g., "yes", "confirm", "that's right", "go to advice", "sí", "oui", "ja", "haan").`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: { type: Type.STRING },
              englishTranslation: { type: Type.STRING },
              recommendedProtocolId: { type: Type.STRING },
              confirmedByPatient: { type: Type.BOOLEAN },
            },
            required: [
              'detectedLanguage',
              'englishTranslation',
              'recommendedProtocolId',
              'confirmedByPatient',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to translate speech right now.';
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /api/ar-scan-wound
   * Real-time AR wound & anatomical target scanner using gemini-3.8-flash (ThinkingLevel.LOW)
   * Returns 0-1000 normalized bounding box coordinates, wound classification, severity triage
   * (111 vs 999), recommended protocol ID, and immediate AR overlay action instruction.
   */
  app.post('/api/ar-scan-wound', async (req, res) => {
    try {
      const {
        frameDataUrl,
        currentProtocolId = 'burns',
      }: { frameDataUrl?: string; currentProtocolId?: string } = req.body || {};

      if (!frameDataUrl || !frameDataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'Missing valid camera frame for AR wound scan.' });
        return;
      }

      const match = frameDataUrl.match(/^data:(image\/[a-zA-Z0-9.+;-]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid frame data URL format.' });
        return;
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: `You are a real-time clinical Augmented Reality (AR) first-aid vision system aligned with UK Red Cross / St John Ambulance guidance.
Analyze this live camera frame (currently selected category context: "${currentProtocolId}").
1. If a visible wound, burn, redness, cut, swelling, rash, bandage, or simulated injury mark is present, locate its bounding box (ymin, xmin, ymax, xmax on a 0 to 1000 scale) and identify it.
2. If an uninjured body part (e.g., hand, palm, forearm, wrist, ankle, arm, chest, face) is shown (such as during a live first-aid demonstration), locate the primary anatomical target zone where treatment/dressing/cooling/pressure should be applied (ymin, xmin, ymax, xmax on a 0 to 1000 scale) and label the anatomical region clearly (e.g., "Forearm Target Zone — Ready for Cooling / Dressing" or "Palm / Hand — Direct Pressure Target Zone").
3. Determine whether the presentation looks non-serious/moderate ("minor_111" or "urgent_111" — advise calling 111 if needed) or life-threatening ("critical_999" — advise calling 999).
4. Provide a concise, imperative AR overlay instruction (max 10 words) and a 1-sentence clinical observation note.`,
            },
          ],
        },
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detected: {
                type: Type.BOOLEAN,
                description: 'True if a wound, simulated mark, or anatomical target area is visible.',
              },
              woundLabel: {
                type: Type.STRING,
                description:
                  'Short AR HUD title, e.g. "Forearm Erythema / Scald" or "Palm Target Zone (Direct Pressure)".',
              },
              recommendedProtocolId: {
                type: Type.STRING,
                description:
                  'Best matching protocol ID from: "burns", "bleeding", "sprains", "allergic", "choking", "cpr", "fainting".',
              },
              severity: {
                type: Type.STRING,
                description: '"minor_111", "urgent_111", or "critical_999".',
              },
              actionInstruction: {
                type: Type.STRING,
                description:
                  'Short imperative AR overlay action (max 10 words), e.g., "Cool under running water for 20 minutes".',
              },
              clinicalNote: {
                type: Type.STRING,
                description:
                  'One concise sentence describing the visual finding and first-aid priority.',
              },
              box2d: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.INTEGER, description: 'Top Y coordinate (0-1000)' },
                  xmin: { type: Type.INTEGER, description: 'Left X coordinate (0-1000)' },
                  ymax: { type: Type.INTEGER, description: 'Bottom Y coordinate (0-1000)' },
                  xmax: { type: Type.INTEGER, description: 'Right X coordinate (0-1000)' },
                },
                required: ['ymin', 'xmin', 'ymax', 'xmax'],
              },
            },
            required: [
              'detected',
              'woundLabel',
              'recommendedProtocolId',
              'severity',
              'actionInstruction',
              'clinicalNote',
              'box2d',
            ],
          },
        },
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error('Empty AR scan response.');
      }

      const parsed = JSON.parse(rawJson);
      res.json({ scan: parsed });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to perform AR wound scan right now.';
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /api/specialise-protocol
   * Accepts an optional baseProtocolId, descriptive text, and/or base64 photoDataUrl.
   * Uses Gemini 3.8 Flash with ThinkingLevel.HIGH to generate a medically accurate,
   * situation-specialised first aid step-by-step protocol grounded in Red Cross / St John guidance.
   */
  app.post('/api/specialise-protocol', async (req, res) => {
    try {
      const {
        baseProtocolId,
        description,
        photoDataUrl,
        ageGroup = 'adult',
      }: {
        baseProtocolId?: string;
        description?: string;
        photoDataUrl?: string;
        ageGroup?: string;
      } = req.body || {};

      if (!description?.trim() && !photoDataUrl) {
        res.status(400).json({
          error: 'Please provide either a photo or a short description of the injury or situation.',
        });
        return;
      }

      const baseProtocol: EmergencyProtocol | undefined = BASELINE_PROTOCOLS.find(
        (p) => p.id === baseProtocolId
      );

      const ai = getGenAIClient();

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (photoDataUrl && photoDataUrl.startsWith('data:image/')) {
        const match = photoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      const baselineContext = baseProtocol
        ? `Base Red Cross / St John Ambulance Protocol (${baseProtocol.title}):\n${JSON.stringify(
            baseProtocol.steps.default,
            null,
            2
          )}`
        : 'No pre-selected category; determine the appropriate first aid category from the user description and/or photo.';

      parts.push({
        text: `You are a senior clinical first-aid protocol specialist aligned strictly with British Red Cross, St John Ambulance, and AHA emergency guidelines.
A bystander has provided optional situational details and/or a photo of an injury or emergency scene so the step-by-step first aid wizard can be specialised for their exact situation.

Casualty Age Group: ${ageGroup}
User Situational Description: ${description?.trim() || 'See attached photo for injury/scene context.'}
${baselineContext}

Generate a clear, sequential, medically accurate step-by-step first aid protocol (between 5 and 6 steps) tailored to this exact injury, anatomical location, and environment.
Rules:
1. Keep each step focused on ONE primary action so a panicking user can follow it one screen at a time.
2. Include a clear spoken voiceScript for hands-free narration on every step.
3. Preserve all critical medical safety prohibitions (e.g., never pull out an embedded object, never apply ice/butter/creams to a burn, never give abdominal thrusts to an infant under 1 year, never let an anaphylaxis casualty stand up).
4. Set hasMetronome: true ONLY on chest compression steps.
5. If the injury is NOT life-threatening or serious (e.g., minor/moderate burn or scald, sprain, strain, small cut, recovered faint, mild symptoms), set urgency to "urgent" and on the medical-help step recommend calling 111 (NHS non-emergency medical advice) by setting advise111: true (and callPrompt: false unless red-flag symptoms appear). Only set callPrompt: true for life-threatening emergencies requiring 999/112/911.
6. If the User Situational Description contains any non-English words or sentences, translate their meaning into English and output all titles, summaries, instructions, details, and voiceScript strictly in clear English.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Concise specialised emergency protocol title (e.g., "Forearm Boiling Water Scald")',
              },
              shortTitle: {
                type: Type.STRING,
                description: 'Short 2-3 word card title',
              },
              shortSummary: {
                type: Type.STRING,
                description: '1-line recognition or situation summary',
              },
              clinicalSummary: {
                type: Type.STRING,
                description: '1-2 sentence explanation of how this protocol was tailored to the user photo/description.',
              },
              urgency: {
                type: Type.STRING,
                description: 'Either "critical" (life-threatening, call 999) or "urgent" (non-life-threatening, suggest calling 111)',
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    instruction: {
                      type: Type.STRING,
                      description: 'Bold imperative headline for this single step',
                    },
                    detail: {
                      type: Type.STRING,
                      description: '2-3 concise sentences explaining exactly how to perform the step in this specific scenario',
                    },
                    voiceScript: {
                      type: Type.STRING,
                      description: 'Natural, calm spoken sentence for Text-to-Speech readout',
                    },
                    warning: {
                      type: Type.STRING,
                      description: 'Explicit Do-Not safety warning if applicable to this step',
                    },
                    hasMetronome: {
                      type: Type.BOOLEAN,
                      description: 'True only if this step involves 110 BPM CPR chest compressions',
                    },
                    callPrompt: {
                      type: Type.BOOLEAN,
                      description: 'True if the user should call 999/112/911 emergency services on this step',
                    },
                    advise111: {
                      type: Type.BOOLEAN,
                      description: 'True if the injury is not serious/life-threatening and the user should call 111 for non-emergency medical advice on this step',
                    },
                  },
                  required: ['stepNumber', 'instruction', 'detail', 'voiceScript'],
                },
              },
            },
            required: ['title', 'shortTitle', 'shortSummary', 'clinicalSummary', 'urgency', 'steps'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      const normalisedSteps = (Array.isArray(parsed.steps) ? parsed.steps : []).map(
        (step: Record<string, unknown>, idx: number) => ({
          stepNumber: idx + 1,
          instruction: String(step.instruction || `Step ${idx + 1}`),
          detail: String(step.detail || ''),
          voiceScript: String(
            step.voiceScript || `Step ${idx + 1}. ${String(step.instruction || '')}. ${String(step.detail || '')}`
          ),
          warning: step.warning ? String(step.warning) : undefined,
          hasMetronome: Boolean(step.hasMetronome),
          callPrompt: Boolean(step.callPrompt),
          advise111: Boolean(step.advise111),
        })
      );

      if (normalisedSteps.length === 0) {
        throw new Error('Model returned an empty step list.');
      }

      const specialisedProtocol: EmergencyProtocol = {
        id: `specialised-${Date.now()}`,
        title: String(parsed.title || baseProtocol?.title || 'Specialised First Aid Protocol'),
        shortTitle: String(parsed.shortTitle || baseProtocol?.shortTitle || 'Specialised Care'),
        shortSummary: String(parsed.shortSummary || description || 'Tailored first aid protocol'),
        urgency: parsed.urgency === 'critical' ? 'critical' : 'urgent',
        iconName: baseProtocol?.iconName || 'Sparkles',
        supportsAgeGroups: false,
        clinicalSource: 'Red Cross / St John Ambulance Baseline + Situational Adaptation',
        isSpecialised: true,
        specialisationContext: {
          baseProtocolId: baseProtocol?.id,
          description: description?.trim(),
          photoDataUrl,
          clinicalSummary: String(
            parsed.clinicalSummary ||
              'Protocol steps adapted to your provided injury details and situational context.'
          ),
          createdAt: new Date().toISOString(),
        },
        steps: {
          default: normalisedSteps,
        },
      };

      res.json({ protocol: specialisedProtocol });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate specialised protocol right now.';
      res.status(500).json({ error: message });
    }
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseAid server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start listening if executed directly as the main entrypoint
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  startServer();
}
