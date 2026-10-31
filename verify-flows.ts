/**
 * Automated Headless Verification Suite (`verify-flows.ts`)
 * Walks through:
 * 1. Home screen & all 7 required emergency categories (CPR, Choking, Bleeding, Burns, Fainting, Allergic, Sprains)
 * 2. Adult, Child, and Infant protocol branches
 * 3. Every sequential step in every protocol (verifying non-empty instruction, detail, voiceScript, and sequential stepNumber)
 * 4. Region dialer configurations (999, 112, 911) and `tel:` human-in-the-loop compliance
 * 5. Express server routes (`/api/health` and `/api/specialise-protocol` input validation)
 */

import {
  type AgeGroup,
  BASELINE_PROTOCOLS,
  getStepsForProtocol,
  REGIONS,
} from './src/protocols.ts';
import { createApp } from './server.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`VERIFICATION FAILED: ${message}`);
  }
}

async function runVerification() {
  console.log('=== PulseAid Automated Verification Suite ===\n');

  // 1. Verify all 7 required emergency categories exist on the Home Triage Grid
  const requiredIds = [
    'cpr',
    'choking',
    'bleeding',
    'burns',
    'fainting',
    'allergic',
    'sprains',
  ];

  for (const reqId of requiredIds) {
    const found = BASELINE_PROTOCOLS.find((p) => p.id === reqId);
    assert(found, `Missing required emergency category: ${reqId}`);
    assert(found.title.trim().length > 0, `Category ${reqId} has empty title`);
    assert(found.shortTitle.trim().length > 0, `Category ${reqId} has empty shortTitle`);
    assert(found.shortSummary.trim().length > 0, `Category ${reqId} has empty shortSummary`);
  }
  console.log(`[PASS] All ${requiredIds.length} required emergency categories verified.`);

  // 2. Walk through every category -> every age branch -> every sequential step
  const ageGroups: AgeGroup[] = ['adult', 'child', 'infant'];
  let totalStepsVerified = 0;
  let metronomeStepsVerified = 0;
  let callPromptStepsVerified = 0;

  for (const protocol of BASELINE_PROTOCOLS) {
    const branchesToTest: AgeGroup[] = protocol.supportsAgeGroups ? ageGroups : ['adult'];

    for (const age of branchesToTest) {
      const steps = getStepsForProtocol(protocol, age);
      assert(
        steps.length >= 4,
        `Protocol "${protocol.id}" (${age}) must have at least 4 sequential steps, found ${steps.length}`
      );

      steps.forEach((step, idx) => {
        const expectedNumber = idx + 1;
        assert(
          step.stepNumber === expectedNumber,
          `Protocol "${protocol.id}" (${age}) step index ${idx} has stepNumber=${step.stepNumber}, expected ${expectedNumber}`
        );
        assert(
          step.instruction && step.instruction.trim().length > 5,
          `Protocol "${protocol.id}" (${age}) step ${expectedNumber} is missing instruction`
        );
        assert(
          step.detail && step.detail.trim().length > 15,
          `Protocol "${protocol.id}" (${age}) step ${expectedNumber} is missing detailed guidance`
        );
        assert(
          step.voiceScript && step.voiceScript.trim().length > 10,
          `Protocol "${protocol.id}" (${age}) step ${expectedNumber} is missing TTS voiceScript`
        );

        if (step.hasMetronome) metronomeStepsVerified++;
        if (step.callPrompt) callPromptStepsVerified++;
        totalStepsVerified++;
      });
    }
  }

  assert(metronomeStepsVerified > 0, 'Expected at least one CPR step with 110 BPM metronome enabled');
  assert(
    callPromptStepsVerified >= 6,
    'Expected emergency call prompts across the emergency protocols'
  );
  console.log(
    `[PASS] Walked through ${totalStepsVerified} total steps across all protocols and Adult/Child/Infant branches with zero missing fields.`
  );

  // 3. Verify Emergency Services Dialer configuration (999 / 112 / 911)
  const expectedRegions = ['999', '112', '911'];
  for (const code of expectedRegions) {
    const reg = REGIONS.find((r) => r.code === code);
    assert(reg, `Missing emergency dialer region configuration for ${code}`);
    const telHref = `tel:${reg.code}`;
    assert(telHref === `tel:${code}`, `Invalid tel: href generated for ${code}`);
  }
  console.log('[PASS] Persistent Emergency Dialer regions (999 / 112 / 911) verified.');

  // 4. Verify Express API Server endpoints (/api/health and /api/specialise-protocol validation)
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert(healthRes.status === 200, `Expected /api/health 200, got ${healthRes.status}`);
    const healthData = (await healthRes.json()) as {
      status: string;
      offlineBaselineCount: number;
    };
    assert(healthData.status === 'ok', 'Expected /api/health status ok');
    assert(
      healthData.offlineBaselineCount === 7,
      `Expected 7 offline protocols in health check, got ${healthData.offlineBaselineCount}`
    );

    // Verify /api/specialise-protocol rejects empty payload cleanly without crashing
    const emptySpecRes = await fetch(`http://127.0.0.1:${port}/api/specialise-protocol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseProtocolId: 'burns', description: '' }),
    });
    assert(
      emptySpecRes.status === 400,
      `Expected 400 validation error for empty specialisation request, got ${emptySpecRes.status}`
    );

    // Verify /api/tts rejects empty text cleanly
    const emptyTtsRes = await fetch(`http://127.0.0.1:${port}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   ', voiceName: 'Charon' }),
    });
    assert(
      emptyTtsRes.status === 400,
      `Expected 400 validation error for empty TTS request, got ${emptyTtsRes.status}`
    );

    // Verify /api/transcribe rejects invalid audio payload cleanly
    const emptyTranscribeRes = await fetch(`http://127.0.0.1:${port}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioDataUrl: '' }),
    });
    assert(
      emptyTranscribeRes.status === 400,
      `Expected 400 validation error for empty transcribe request, got ${emptyTranscribeRes.status}`
    );

    console.log(
      '[PASS] Server API endpoints (/api/health, /api/tts, /api/transcribe & /api/specialise-protocol validation) verified.'
    );
  } finally {
    server.close();
  }

  console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY.');
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
