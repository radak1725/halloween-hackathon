export type RegionCode = '999' | '112' | '911';
export type AgeGroup = 'adult' | 'child' | 'infant';

export interface RegionInfo {
  code: RegionCode;
  label: string;
  regionName: string;
}

export const REGIONS: RegionInfo[] = [
  { code: '999', label: '999', regionName: 'UK & Commonwealth' },
  { code: '112', label: '112', regionName: 'Europe & International' },
  { code: '911', label: '911', regionName: 'US & Canada' },
];

export interface ProtocolStep {
  stepNumber: number;
  instruction: string;
  detail: string;
  voiceScript: string;
  warning?: string;
  hasMetronome?: boolean;
  callPrompt?: boolean;
  advise111?: boolean;
}

export interface SpecialisationContext {
  baseProtocolId?: string;
  description?: string;
  photoDataUrl?: string;
  clinicalSummary?: string;
  createdAt?: string;
  offlineFallback?: boolean;
}

export interface EmergencyProtocol {
  id: string;
  title: string;
  shortTitle: string;
  shortSummary: string;
  urgency: 'critical' | 'urgent';
  iconName: 'HeartPulse' | 'Wind' | 'Droplets' | 'Flame' | 'Activity' | 'ShieldAlert' | 'Bone' | 'Sparkles';
  supportsAgeGroups: boolean;
  clinicalSource: string;
  isSpecialised?: boolean;
  specialisationContext?: SpecialisationContext;
  steps: {
    default: ProtocolStep[];
    adult?: ProtocolStep[];
    child?: ProtocolStep[];
    infant?: ProtocolStep[];
  };
}

export const BASELINE_PROTOCOLS: EmergencyProtocol[] = [
  {
    id: 'cpr',
    title: 'Unresponsive & Not Breathing (CPR)',
    shortTitle: 'CPR & Unresponsive',
    shortSummary: 'Casualty does not respond and is not breathing normally',
    urgency: 'critical',
    iconName: 'HeartPulse',
    supportsAgeGroups: true,
    clinicalSource: 'Red Cross & St John Ambulance Resuscitation Guidelines',
    steps: {
      default: [
        {
          stepNumber: 1,
          instruction: 'Check for danger and tap shoulders to check response',
          detail: 'Make sure the area is safe for you to approach. Gently shake the casualty’s shoulders and ask loudly right into both ears: "Are you alright?"',
          voiceScript: 'Step 1. Check that the area is safe. Gently shake their shoulders and shout loudly: Are you alright?',
          warning: 'Do NOT rush into an unsafe scene (traffic, live electricity, or fire) without securing your own safety first.',
        },
        {
          stepNumber: 2,
          instruction: 'Open the airway and check breathing for 10 seconds',
          detail: 'Place one hand on their forehead and gently tilt their head back. Lift the tip of the chin with two fingers. Look, listen, and feel for normal breathing for no more than 10 seconds.',
          voiceScript: 'Step 2. Tilt their head back gently and lift the chin. Look, listen, and feel for normal breathing for up to 10 seconds.',
          warning: 'Occasional noisy gasps (agonal breathing) are NOT normal breathing. Start CPR immediately if you see gasping.',
        },
        {
          stepNumber: 3,
          instruction: 'Call Emergency Services on speakerphone and request an AED',
          detail: 'Tap the red Call Emergency Services button now and put your phone on speaker so your hands stay free. Send any bystander to bring a defibrillator (AED) immediately.',
          voiceScript: 'Step 3. Call Emergency Services immediately and switch your phone to speaker. Ask anyone nearby to fetch a defibrillator.',
          callPrompt: true,
        },
        {
          stepNumber: 4,
          instruction: 'Give 30 chest compressions in the center of the chest',
          detail: 'Kneel beside the chest. Place the heel of one hand in the center of the chest, place your other hand on top, and interlock your fingers. Keep arms straight and push hard and fast 5 to 6 cm deep at 110 beats per minute.',
          voiceScript: 'Step 4. Give 30 chest compressions. Place the heel of your hand in the center of the chest, interlock your fingers, and push firmly 5 to 6 centimeters deep to the rhythm of the metronome.',
          warning: 'Allow the chest to come all the way back up after every push. Do not lean on the chest between compressions.',
          hasMetronome: true,
        },
        {
          stepNumber: 5,
          instruction: 'Give 2 rescue breaths (or continue hands-only CPR)',
          detail: 'Tilt the head back and lift the chin. Pinch the soft part of the nose closed, seal your mouth over theirs, and blow steadily for 1 second until the chest rises. Give 2 breaths total.',
          voiceScript: 'Step 5. Tilt the head, pinch the nose, and give 2 steady rescue breaths watching the chest rise. If you cannot give rescue breaths, continue uninterrupted chest compressions.',
          warning: 'If you are unable or unwilling to give rescue breaths, perform continuous hands-only chest compressions without stopping.',
        },
        {
          stepNumber: 6,
          instruction: 'Continue 30 compressions to 2 breaths until help arrives',
          detail: 'Keep repeating cycles of 30 chest compressions and 2 rescue breaths. If an AED arrives, switch it on immediately and follow its voice prompts.',
          voiceScript: 'Step 6. Keep repeating 30 chest compressions followed by 2 rescue breaths until emergency paramedics take over or the person wakes up and breathes normally.',
          hasMetronome: true,
        },
      ],
      adult: [
        {
          stepNumber: 1,
          instruction: 'Check for danger and tap shoulders to check response',
          detail: 'Make sure the area is safe for you to approach. Gently shake the adult’s shoulders and ask loudly right into both ears: "Are you alright?"',
          voiceScript: 'Step 1, Adult CPR. Check the area is safe. Gently shake their shoulders and shout loudly: Are you alright?',
          warning: 'Do NOT rush into an unsafe scene (traffic, live electricity, or fire) without securing your own safety first.',
        },
        {
          stepNumber: 2,
          instruction: 'Open the airway and check breathing for 10 seconds',
          detail: 'Place one hand on their forehead and gently tilt their head back. Lift the tip of the chin with two fingers. Look, listen, and feel for normal breathing for no more than 10 seconds.',
          voiceScript: 'Step 2. Tilt their head back gently and lift the chin. Look, listen, and feel for normal breathing for up to 10 seconds.',
          warning: 'Occasional noisy gasps (agonal breathing) are NOT normal breathing. Start CPR immediately if you see gasping.',
        },
        {
          stepNumber: 3,
          instruction: 'Call Emergency Services on speakerphone and request an AED',
          detail: 'Tap the red Call Emergency Services button now and put your phone on speaker so your hands stay free. Send any bystander to bring a defibrillator (AED) immediately.',
          voiceScript: 'Step 3. Call Emergency Services immediately and switch your phone to speaker. Ask anyone nearby to fetch a defibrillator.',
          callPrompt: true,
        },
        {
          stepNumber: 4,
          instruction: 'Give 30 two-handed chest compressions (5–6 cm deep)',
          detail: 'Kneel beside the chest. Place the heel of one hand in the center of the chest, place your other hand on top, and interlock your fingers. Keep arms straight and push hard and fast 5 to 6 cm deep at 110 beats per minute.',
          voiceScript: 'Step 4. Give 30 chest compressions. Place the heel of your hand in the center of the chest, interlock your fingers, and push firmly 5 to 6 centimeters deep to the rhythm of the metronome.',
          warning: 'Allow the chest to recoil completely after every push. Do not pause between compressions.',
          hasMetronome: true,
        },
        {
          stepNumber: 5,
          instruction: 'Give 2 rescue breaths (or continue hands-only CPR)',
          detail: 'Tilt the head back and lift the chin. Pinch the soft part of the nose closed, seal your mouth over theirs, and blow steadily for 1 second until the chest rises. Give 2 breaths total.',
          voiceScript: 'Step 5. Tilt the head, pinch the nose, and give 2 steady rescue breaths watching the chest rise. If you cannot give rescue breaths, continue uninterrupted chest compressions.',
          warning: 'If you are unable or unwilling to give rescue breaths, perform continuous hands-only chest compressions without stopping.',
        },
        {
          stepNumber: 6,
          instruction: 'Continue 30 compressions to 2 breaths until help arrives',
          detail: 'Keep repeating cycles of 30 chest compressions and 2 rescue breaths. If an AED arrives, switch it on immediately and follow its voice prompts.',
          voiceScript: 'Step 6. Keep repeating 30 chest compressions followed by 2 rescue breaths until emergency paramedics take over or the person wakes up and breathes normally.',
          hasMetronome: true,
        },
      ],
      child: [
        {
          stepNumber: 1,
          instruction: 'Check danger and check the child for a response (Age 1–12)',
          detail: 'Ensure the area is safe. Tap the child’s shoulder gently and call their name or ask loudly: "Are you alright?"',
          voiceScript: 'Step 1, Child CPR for ages 1 to 12. Check safety, tap the child on the shoulder, and ask loudly if they are alright.',
        },
        {
          stepNumber: 2,
          instruction: 'Open airway, check breathing (10s), and Call Emergency Services',
          detail: 'Tilt the head back gently and lift the chin. Check for normal breathing for up to 10 seconds. Put your phone on speaker and call Emergency Services now.',
          voiceScript: 'Step 2. Tilt the head back, lift the chin, and check for normal breathing for 10 seconds. Call Emergency Services on speakerphone.',
          callPrompt: true,
        },
        {
          stepNumber: 3,
          instruction: 'Give 5 initial rescue breaths before compressions',
          detail: 'Pediatric cardiac arrest is usually caused by lack of oxygen. Pinch the child’s nose, seal your mouth over theirs, and blow steadily 5 times (1 second per breath) watching the chest rise.',
          voiceScript: 'Step 3. Give 5 initial rescue breaths. Pinch the child’s nose, cover their mouth with yours, and give 5 steady breaths so the chest rises.',
          warning: 'Do not blow too hard—use just enough air to make the child’s chest visibly rise.',
        },
        {
          stepNumber: 4,
          instruction: 'Give 30 one-handed chest compressions (5 cm deep)',
          detail: 'Place the heel of ONE hand in the center of the child’s chest (use two hands only if the child is large or you cannot reach depth). Push down one-third of the chest depth (about 5 cm) at 110 beats per minute.',
          voiceScript: 'Step 4. Place the heel of one hand in the center of the child’s chest. Give 30 compressions pressing down about 5 centimeters to the beat of the metronome.',
          hasMetronome: true,
        },
        {
          stepNumber: 5,
          instruction: 'Give 2 rescue breaths then 30 compressions continuously',
          detail: 'Alternate 2 rescue breaths with 30 chest compressions at 110 BPM. Continue without stopping until paramedics arrive or the child starts breathing normally.',
          voiceScript: 'Step 5. Give 2 rescue breaths followed by 30 chest compressions. Repeat this cycle continuously until medical help arrives.',
          hasMetronome: true,
        },
      ],
      infant: [
        {
          stepNumber: 1,
          instruction: 'Tap the sole of the baby’s foot to check response (Under 1 yr)',
          detail: 'Ensure the environment is safe. Gently tap or flick the sole of the infant’s foot and call out to them. Never shake a baby.',
          voiceScript: 'Step 1, Infant CPR for babies under 1 year. Tap the sole of the baby’s foot to check for a response. Never shake an infant.',
          warning: 'NEVER shake an infant to check for a response.',
        },
        {
          stepNumber: 2,
          instruction: 'Place head in neutral position and check breathing for 10s',
          detail: 'Place the baby on a firm flat surface. Keep their head in a neutral flat position (as if looking straight up—do NOT tilt the head far back as this closes an infant’s airway). Check breathing for up to 10 seconds and call Emergency Services on speakerphone.',
          voiceScript: 'Step 2. Keep the baby’s head in a neutral flat position. Check for normal breathing for up to 10 seconds and call Emergency Services on speakerphone.',
          warning: 'Do NOT tilt an infant’s head far backward—over-tilting blocks a baby’s delicate airway.',
          callPrompt: true,
        },
        {
          stepNumber: 3,
          instruction: 'Give 5 gentle initial rescue puffs covering mouth and nose',
          detail: 'Keep the head neutral and lift the chin slightly. Seal your mouth over BOTH the baby’s mouth and nose. Blow gently from your cheeks 5 times (1 second each), just enough to make the chest rise.',
          voiceScript: 'Step 3. Seal your mouth over both the baby’s mouth and nose. Give 5 gentle puffs of air from your cheeks, watching the little chest rise.',
        },
        {
          stepNumber: 4,
          instruction: 'Give 30 two-finger chest compressions (4 cm deep)',
          detail: 'Place the tips of TWO FINGERS right in the center of the baby’s chest. Press down vertically by one-third of the chest depth (about 4 cm) 30 times at 110 beats per minute.',
          voiceScript: 'Step 4. Place two fingers in the center of the baby’s chest. Give 30 compressions pressing down about 4 centimeters to the metronome beat.',
          hasMetronome: true,
        },
        {
          stepNumber: 5,
          instruction: 'Alternate 2 gentle rescue puffs with 30 two-finger compressions',
          detail: 'Continue cycles of 2 gentle puffs (covering mouth and nose) and 30 two-finger compressions until paramedics arrive or the baby begins crying or breathing normally.',
          voiceScript: 'Step 5. Continue alternating 2 gentle puffs and 30 two-finger compressions until emergency services take over.',
          hasMetronome: true,
        },
      ],
    },
  },
  {
    id: 'choking',
    title: 'Choking (Blocked Airway)',
    shortTitle: 'Choking',
    shortSummary: 'Clutching throat, unable to speak, cough, or breathe',
    urgency: 'critical',
    iconName: 'Wind',
    supportsAgeGroups: true,
    clinicalSource: 'Red Cross & St John Ambulance Choking Protocol',
    steps: {
      default: [
        {
          stepNumber: 1,
          instruction: 'Ask "Are you choking?" and encourage forceful coughing',
          detail: 'If the person can speak, cry, or cough effectively, encourage them to keep coughing to clear the blockage themselves. Stay right with them.',
          voiceScript: 'Step 1. Ask: Are you choking? If they can cough or make sounds, encourage them to keep coughing forcefully.',
          warning: 'Do NOT put your fingers blindly into their mouth—you may push the blockage deeper.',
        },
        {
          stepNumber: 2,
          instruction: 'Bend them forward and give up to 5 sharp back blows',
          detail: 'If they cannot cough, speak, or breathe: stand to the side and slightly behind them. Support their chest with one hand, bend them well forward, and give up to 5 sharp blows between the shoulder blades with the heel of your other hand.',
          voiceScript: 'Step 2. Bend the person well forward while supporting their chest. Give up to 5 sharp blows between their shoulder blades with the heel of your hand, checking after each blow.',
        },
        {
          stepNumber: 3,
          instruction: 'Give up to 5 abdominal thrusts (Heimlich maneuver)',
          detail: 'If back blows fail: stand behind them and put both arms around the upper abdomen. Make a fist and place it between the belly button and the bottom of the ribs. Grasp your fist with your other hand and pull sharply inwards and upwards up to 5 times.',
          voiceScript: 'Step 3. Stand behind them and place your fist just above the belly button. Grasp your fist with your other hand and pull sharply inwards and upwards up to 5 times.',
          warning: 'Do NOT perform abdominal thrusts on babies under 1 year or on visibly pregnant casualties (use chest thrusts instead).',
        },
        {
          stepNumber: 4,
          instruction: 'Call Emergency Services and repeat 5 back blows + 5 thrusts',
          detail: 'If the blockage has still not cleared after 5 back blows and 5 abdominal thrusts, call Emergency Services on speakerphone immediately and continue alternating 5 back blows with 5 abdominal thrusts.',
          voiceScript: 'Step 4. If the airway is still blocked, call Emergency Services on speakerphone now and keep repeating cycles of 5 back blows and 5 abdominal thrusts.',
          callPrompt: true,
        },
        {
          stepNumber: 5,
          instruction: 'If they become unresponsive, start CPR immediately',
          detail: 'Carefully lower them to the floor, call Emergency Services if not already on the line, and begin 30 chest compressions at 110 BPM. Look in the mouth before rescue breaths only if you see a visible object.',
          voiceScript: 'Step 5. If the person becomes unresponsive, lower them to the floor and start chest compressions immediately.',
          hasMetronome: true,
        },
      ],
      adult: [
        {
          stepNumber: 1,
          instruction: 'Ask "Are you choking?" and encourage forceful coughing',
          detail: 'If the adult can speak or cough effectively, encourage them to keep coughing to clear the blockage themselves.',
          voiceScript: 'Step 1, Adult Choking. Ask: Are you choking? If they can cough, encourage them to keep coughing forcefully.',
          warning: 'Do NOT put your fingers blindly into their mouth.',
        },
        {
          stepNumber: 2,
          instruction: 'Bend them forward and give up to 5 sharp back blows',
          detail: 'Support their chest with one hand and bend them well forward so the object comes out of the mouth rather than going deeper. Give up to 5 sharp blows between the shoulder blades with the heel of your hand.',
          voiceScript: 'Step 2. Bend the person well forward. Give up to 5 sharp blows between their shoulder blades with the heel of your hand.',
        },
        {
          stepNumber: 3,
          instruction: 'Give up to 5 abdominal thrusts',
          detail: 'Stand behind them, place a clenched fist between the navel (belly button) and bottom of the breastbone, grasp with your other hand, and pull sharply inwards and upwards up to 5 times.',
          voiceScript: 'Step 3. Stand behind them, place your fist just above the belly button, grasp with your other hand, and pull sharply inwards and upwards up to 5 times.',
          warning: 'If the casualty is pregnant or you cannot reach around their abdomen, perform firm chest thrusts on the lower half of the breastbone instead.',
        },
        {
          stepNumber: 4,
          instruction: 'Call Emergency Services and repeat 5 back blows + 5 thrusts',
          detail: 'Put your phone on speaker and call Emergency Services. Keep alternating 5 back blows and 5 abdominal thrusts until the object comes out or help arrives.',
          voiceScript: 'Step 4. Call Emergency Services on speakerphone and keep alternating 5 back blows and 5 abdominal thrusts.',
          callPrompt: true,
        },
        {
          stepNumber: 5,
          instruction: 'If they collapse or become unresponsive, begin CPR',
          detail: 'Lower them safely to the floor and start 30 chest compressions at 110 BPM.',
          voiceScript: 'Step 5. If they become unresponsive, lower them to the floor and begin chest compressions immediately.',
          hasMetronome: true,
        },
      ],
      child: [
        {
          stepNumber: 1,
          instruction: 'Encourage the child to cough if they are able (Age 1–12)',
          detail: 'If the child is coughing loudly, encourage them to keep coughing and stay with them. If their cough is silent or they cannot breathe, act immediately.',
          voiceScript: 'Step 1, Child Choking. If the child can cough, encourage them to cough. If they cannot breathe or make a sound, move immediately to Step 2.',
        },
        {
          stepNumber: 2,
          instruction: 'Lean the child forward and give up to 5 back blows',
          detail: 'Kneel behind a small child or bend them forward across your lap. Support their chest and give up to 5 sharp back blows between the shoulder blades with the heel of your hand.',
          voiceScript: 'Step 2. Lean the child well forward and give up to 5 sharp back blows between the shoulder blades with the heel of your hand.',
        },
        {
          stepNumber: 3,
          instruction: 'Give up to 5 child abdominal thrusts',
          detail: 'Kneel behind the child. Place your fist just above their belly button, grasp it with your other hand, and pull sharply inwards and upwards up to 5 times with controlled force.',
          voiceScript: 'Step 3. Kneel behind the child, place your fist just above their belly button, and pull sharply inwards and upwards up to 5 times.',
          warning: 'Every child who receives abdominal thrusts must be examined by a doctor afterward, even if the blockage clears.',
        },
        {
          stepNumber: 4,
          instruction: 'Call Emergency Services and alternate 5 back blows + 5 thrusts',
          detail: 'If the object has not cleared, call Emergency Services on speakerphone and repeat cycles of 5 back blows and 5 abdominal thrusts. If the child becomes unresponsive, start Child CPR.',
          voiceScript: 'Step 4. Call Emergency Services on speakerphone and keep alternating 5 back blows with 5 abdominal thrusts.',
          callPrompt: true,
        },
      ],
      infant: [
        {
          stepNumber: 1,
          instruction: 'Lay baby face-down along your forearm and give up to 5 back blows',
          detail: 'Sit down and lay the baby face-down along your forearm or thigh, supporting their head and jaw with your hand so the head is lower than the chest. Give up to 5 firm back blows between the shoulder blades with the heel of your hand.',
          voiceScript: 'Step 1, Infant Choking. Lay the baby face-down along your forearm with their head supported lower than their chest. Give up to 5 firm back blows between the shoulder blades.',
          warning: 'Support the baby’s jaw with your fingers without pressing on the soft throat tissues.',
        },
        {
          stepNumber: 2,
          instruction: 'Turn baby face-up and give up to 5 two-finger chest thrusts',
          detail: 'If back blows do not clear the blockage, turn the baby face-up along your other forearm. Place two fingers in the center of the chest (just below the nipple line) and push sharply downwards and inwards up to 5 times.',
          voiceScript: 'Step 2. Turn the baby face-up along your forearm. Place two fingers in the center of the chest and give up to 5 sharp chest thrusts.',
          warning: 'NEVER perform abdominal thrusts (Heimlich maneuver) on an infant under 1 year—it can cause severe internal injury.',
        },
        {
          stepNumber: 3,
          instruction: 'Check the mouth and remove any visible dislodged object',
          detail: 'Look inside the baby’s mouth. If you can clearly see the object at the front of the mouth, carefully pick it out with your fingertips.',
          voiceScript: 'Step 3. Look inside the baby’s mouth and carefully remove the object only if you can clearly see it.',
          warning: 'NEVER perform a blind finger sweep in a baby’s mouth—you can push the object further down the airway.',
        },
        {
          stepNumber: 4,
          instruction: 'Call Emergency Services and repeat 5 back blows + 5 chest thrusts',
          detail: 'Tap Call Emergency Services now on speakerphone. Keep alternating 5 back blows and 5 two-finger chest thrusts. If the baby becomes unresponsive, begin Infant CPR immediately.',
          voiceScript: 'Step 4. Call Emergency Services on speakerphone immediately and continue alternating 5 back blows and 5 chest thrusts.',
          callPrompt: true,
        },
      ],
    },
  },
  {
    id: 'bleeding',
    title: 'Severe Bleeding & Deep Wounds',
    shortTitle: 'Severe Bleeding',
    shortSummary: 'Heavy blood loss from a cut, laceration, or puncture wound',
    urgency: 'critical',
    iconName: 'Droplets',
    supportsAgeGroups: false,
    clinicalSource: 'Red Cross & St John Ambulance Trauma Control Guidelines',
    steps: {
      default: [
        {
          stepNumber: 1,
          instruction: 'Expose the wound and check for embedded objects',
          detail: 'Wear disposable gloves if immediately available. Remove or cut away clothing around the wound so you can clearly see where the blood is coming from and check for glass or sharp debris.',
          voiceScript: 'Step 1. Expose the wound and look quickly to see if any glass or sharp object is embedded inside.',
        },
        {
          stepNumber: 2,
          instruction: 'Apply direct, firm pressure over the wound immediately',
          detail: 'Place a sterile dressing, clean towel, or folded non-fluffy cloth directly over the wound and press down firmly with your palm or fingers. If an object is stuck in the wound, press firmly on EITHER SIDE of the object.',
          voiceScript: 'Step 2. Press a clean pad or cloth firmly and directly over the bleeding wound. If an object is stuck in the wound, press on either side of the object.',
          warning: 'NEVER pull out an embedded object from a wound—it may be plugging a major blood vessel. Do not press directly on top of an embedded object.',
        },
        {
          stepNumber: 3,
          instruction: 'Call Emergency Services on speakerphone while holding pressure',
          detail: 'Keep constant pressure on the wound (or ask the casualty to hold the pad firmly if they are able) and call Emergency Services on speakerphone now.',
          voiceScript: 'Step 3. Maintain firm pressure without lifting the pad, and call Emergency Services on speakerphone.',
          callPrompt: true,
        },
        {
          stepNumber: 4,
          instruction: 'Bandage the pad firmly in place (stack a second pad if soaked)',
          detail: 'Wrap a bandage firmly over the dressing to maintain pressure. If blood soaks through the first pad, place a second pad directly on top and bandage over both.',
          voiceScript: 'Step 4. Secure the pad firmly with a bandage. If blood soaks through, do not remove the first pad—place a second pad right on top of it.',
          warning: 'Do NOT remove the original blood-soaked pad, as peeling it off tears away forming blood clots and restarts heavy bleeding.',
        },
        {
          stepNumber: 5,
          instruction: 'Lay the casualty down, raise legs if pale, and keep warm',
          detail: 'Help the casualty lie flat on a blanket or coat to protect them from the cold ground. If they look pale, dizzy, or clammy (signs of shock), raise and support their uninjured legs above heart level.',
          voiceScript: 'Step 5. Help the person lie down, cover them to keep them warm, and raise their legs if they feel faint or pale. Monitor their breathing until help arrives.',
          warning: 'Do NOT give the casualty anything to eat, drink, or smoke in case they require emergency surgery.',
        },
      ],
    },
  },
  {
    id: 'burns',
    title: 'Burns & Scalds',
    shortTitle: 'Burns & Scalds',
    shortSummary: 'Skin damage from heat, boiling liquid, steam, chemicals, or electricity',
    urgency: 'urgent',
    iconName: 'Flame',
    supportsAgeGroups: false,
    clinicalSource: 'Red Cross & British Burn Association First Aid Standard',
    steps: {
      default: [
        {
          stepNumber: 1,
          instruction: 'Stop the burning process and move away from the heat source',
          detail: 'Make sure the area is safe. Move the casualty away from the fire, hot liquid, or steam. If an electrical burn is suspected, switch off the power supply before touching the casualty.',
          voiceScript: 'Step 1. Move the person safely away from the heat source. If electricity is involved, turn off the power before touching them.',
        },
        {
          stepNumber: 2,
          instruction: 'Flood the burn with cool running water for 20 full minutes',
          detail: 'Hold the burned area under cool or lukewarm gently running tap water for at least 20 minutes immediately. Cool the burn, but keep the rest of the casualty warm.',
          voiceScript: 'Step 2. Place the burn under cool running water immediately and keep cooling it continuously for 20 minutes.',
          warning: 'Do NOT use ice, iced water, butter, oil, toothpaste, or ointments. Ice causes further tissue damage and greasy substances trap heat inside the skin.',
        },
        {
          stepNumber: 3,
          instruction: 'Gently remove rings, watches, belts, and loose clothing',
          detail: 'While cooling the burn, carefully remove any jewelry, watches, shoes, or loose clothing near the burned area BEFORE the tissue begins to swell.',
          voiceScript: 'Step 3. Gently remove rings, watches, and loose clothing near the burn before swelling starts.',
          warning: 'Do NOT peel or pull off any clothing or material that is stuck to the burned skin—cut around it instead.',
        },
        {
          stepNumber: 4,
          instruction: 'Cover the cooled burn loosely lengthwise with cling film',
          detail: 'Once cooled for 20 minutes, lay strips of clean kitchen cling film (plastic wrap) lengthwise over the burn, or place a clean clear plastic bag over a burned hand or foot.',
          voiceScript: 'Step 4. After cooling for 20 minutes, cover the burn loosely lengthwise with clean kitchen cling film or a sterile non-fluffy dressing.',
          warning: 'Do NOT wrap cling film tightly around a limb (swelling will cut off circulation), and NEVER burst any blisters.',
        },
        {
          stepNumber: 5,
          instruction: 'Call 111 for minor/moderate burns, or 999 if severe',
          detail: 'If the burn is smaller and not life-threatening (such as a mild scald or small blister), call 111 for non-emergency medical advice. Call 999/112/911 immediately if the burn is larger than the casualty’s hand, white/charred, on the face, airway, hands, or on a child.',
          voiceScript: 'Step 5. If the burn is minor or moderate and not life-threatening, call 1 1 1 for medical advice. If the burn is larger than their hand, deep, or on the face or airway, call Emergency Services.',
          advise111: true,
          callPrompt: true,
        },
      ],
    },
  },
  {
    id: 'fainting',
    title: 'Fainting & Unresponsive (Breathing)',
    shortTitle: 'Fainting & Recovery',
    shortSummary: 'Collapsed, dizzy, or unresponsive but breathing normally',
    urgency: 'urgent',
    iconName: 'Activity',
    supportsAgeGroups: false,
    clinicalSource: 'Red Cross & St John Ambulance Recovery Position Protocol',
    steps: {
      default: [
        {
          stepNumber: 1,
          instruction: 'Confirm the casualty is breathing normally (10-second check)',
          detail: 'Kneel beside them, tilt the head gently back, and check for normal regular breathing for up to 10 seconds. If they are NOT breathing normally, switch immediately to the CPR protocol.',
          voiceScript: 'Step 1. Check that the person is breathing normally. If they are not breathing normally, switch immediately to CPR.',
        },
        {
          stepNumber: 2,
          instruction: 'If conscious or waking up: Lay flat and raise legs 30 cm',
          detail: 'If the person felt faint or briefly fainted and is waking up, keep them lying flat on their back and raise and support their legs about 30 cm (12 inches) to restore blood flow to the brain.',
          voiceScript: 'Step 2. If they are waking up from a faint, keep them lying flat on their back and raise their legs about 30 centimeters.',
          warning: 'Do NOT sit a fainted person upright on a chair immediately—blood will pool in their legs and cause them to faint again.',
        },
        {
          stepNumber: 3,
          instruction: 'If still unresponsive and breathing: Place in Recovery Position',
          detail: 'Place the arm nearest you at a right angle. Bring their far arm across the chest with the back of their hand against their cheek. Pull their far knee up and roll them gently toward you onto their side, tilting the head back so the airway stays open.',
          voiceScript: 'Step 3. If they remain unresponsive but are breathing normally, roll them onto their side into the Recovery Position and tilt their head back to keep the airway open.',
        },
        {
          stepNumber: 4,
          instruction: 'Loosen tight clothing and provide fresh air',
          detail: 'Unbutton tight collars, belts, or scarves around the neck and chest. Open a window or ask bystanders to step back so the casualty has plenty of fresh air.',
          voiceScript: 'Step 4. Loosen any tight clothing around their neck or waist and make sure they have plenty of fresh air.',
        },
        {
          stepNumber: 5,
          instruction: 'Call 111 if recovered within 1–2 minutes, or 999 if unresponsive',
          detail: 'If they wake up quickly and feel normal within 1 to 2 minutes, keep them resting and call 111 for non-emergency medical advice. If they do not regain consciousness within 2 minutes, have chest pain, or are pregnant, call Emergency Services immediately.',
          voiceScript: 'Step 5. If they recover quickly within 1 to 2 minutes, call 1 1 1 for non-emergency medical advice. If they stay unresponsive or have chest pain, call Emergency Services now.',
          advise111: true,
          callPrompt: true,
        },
      ],
    },
  },
  {
    id: 'allergic',
    title: 'Severe Allergic Reaction (Anaphylaxis)',
    shortTitle: 'Allergic Reaction',
    shortSummary: 'Swollen lips/tongue, wheezing, rash, dizziness after allergen exposure',
    urgency: 'critical',
    iconName: 'ShieldAlert',
    supportsAgeGroups: false,
    clinicalSource: 'Resuscitation Council UK & Red Cross Anaphylaxis Guidance',
    steps: {
      default: [
        {
          stepNumber: 1,
          instruction: 'Recognize anaphylaxis signs and check for an auto-injector',
          detail: 'Look for rapid swelling of lips, tongue, or throat, wheezing or noisy breathing, hoarse voice, widespread red blotchy rash, or sudden dizziness. Ask immediately if they carry an Adrenaline Auto-Injector (EpiPen, Jext, or Emerade).',
          voiceScript: 'Step 1. Check for swelling of the lips or throat, difficulty breathing, or dizziness, and locate their adrenaline auto-injector immediately.',
        },
        {
          stepNumber: 2,
          instruction: 'Position safely: Sit up for breathing difficulty, lay flat if dizzy',
          detail: 'If they are struggling to breathe, help them sit slightly upright propped against a wall. If they feel dizzy, pale, or faint, lay them flat on their back with legs raised.',
          voiceScript: 'Step 2. Help them sit propped up if they are struggling to breathe, or lay them flat with legs raised if they feel faint.',
          warning: 'NEVER let someone with suspected anaphylaxis stand up or walk—standing can trigger a sudden fatal drop in blood pressure.',
        },
        {
          stepNumber: 3,
          instruction: 'Inject adrenaline into the outer mid-thigh immediately',
          detail: 'Remove the safety cap. Hold the auto-injector firmly at a 90-degree angle against the outer middle section of the thigh (it can be given straight through trousers). Press firmly until it clicks and hold in place for 3 to 10 seconds.',
          voiceScript: 'Step 3. Remove the safety cap and press the adrenaline auto-injector firmly against the outer mid-thigh until it clicks. Hold it in place for up to 10 seconds.',
          warning: 'Inject ONLY into the outer mid-thigh muscle—never into a vein, buttock, or finger.',
        },
        {
          stepNumber: 4,
          instruction: 'Call Emergency Services immediately and state "Anaphylaxis"',
          detail: 'Tap Call Emergency Services now and tell the dispatcher "Suspected Anaphylaxis". You must call an ambulance even if the casualty starts feeling better after the adrenaline injection.',
          voiceScript: 'Step 4. Call Emergency Services immediately and state suspected anaphylaxis, even if symptoms begin to improve.',
          callPrompt: true,
        },
        {
          stepNumber: 5,
          instruction: 'Give a second auto-injector after 5 minutes if no improvement',
          detail: 'Note the time of the first injection. If breathing or consciousness has not improved after 5 minutes (or symptoms return), administer a second adrenaline auto-injector into the OPPOSITE outer thigh.',
          voiceScript: 'Step 5. If there is no improvement after 5 minutes, give a second adrenaline auto-injector into the opposite thigh and monitor breathing continuously.',
        },
      ],
    },
  },
  {
    id: 'sprains',
    title: 'Sprains, Strains & Suspected Fractures',
    shortTitle: 'Sprains & Fractures',
    shortSummary: 'Joint pain, rapid swelling, bruising, or suspected broken bone',
    urgency: 'urgent',
    iconName: 'Bone',
    supportsAgeGroups: false,
    clinicalSource: 'Red Cross & St John Ambulance Musculoskeletal Care (RICE)',
    steps: {
      default: [
        {
          stepNumber: 1,
          instruction: 'Stop movement and support the injured limb immediately',
          detail: 'Have the casualty sit or lie down right where they are. Gently support the injured joint or bone above and below the injury in the position they find most comfortable.',
          voiceScript: 'Step 1. Have the person rest immediately and gently support the injured joint or limb without forcing it to move.',
          warning: 'Do NOT try to straighten an angled or deformed limb, and do not ask the casualty to "walk it off" or test weight on it.',
        },
        {
          stepNumber: 2,
          instruction: 'Immobilize and cushion with pillows, folded clothes, or a sling',
          detail: 'Place rolled-up jackets, blankets, or pillows around the injured leg or ankle to keep it still. For an arm, wrist, or collarbone injury, support the arm against the chest using a sling or folded jacket.',
          voiceScript: 'Step 2. Cushion and immobilize the injury using folded clothing, pillows, or a supportive arm sling.',
        },
        {
          stepNumber: 3,
          instruction: 'Apply a wrapped cold pack for up to 20 minutes',
          detail: 'For sprains or closed swelling, wrap an ice pack or bag of frozen peas in a damp towel or cloth and hold it gently against the swollen area for a maximum of 20 minutes to reduce internal bleeding and swelling.',
          voiceScript: 'Step 3. Apply an ice pack wrapped in a cloth to the swollen area for up to 20 minutes.',
          warning: 'NEVER place bare ice or frozen packs directly onto bare skin—it causes frostbite/ice burns. Do not press ice onto an open fracture.',
        },
        {
          stepNumber: 4,
          instruction: 'Elevate the injured limb if it does not increase pain',
          detail: 'If a sprain is suspected and raising the limb does not cause sharp fracture pain, prop the injured ankle or wrist on a cushion above hip/heart level to slow down swelling. Check fingers or toes for warmth and color every 10 minutes.',
          voiceScript: 'Step 4. Gently elevate the injured limb on a cushion if it does not cause extra pain, and check that fingers or toes stay warm and pink.',
        },
        {
          stepNumber: 5,
          instruction: 'Call 111 for non-serious sprains, or 999 for severe fractures',
          detail: 'For a non-serious sprain, strain, or minor joint injury, call 111 for advice on local minor injury units. Only call 999/112/911 if the limb is deformed, bone is visible, the extremity turns pale/cold/numb, or a hip/spine fracture is suspected.',
          voiceScript: 'Step 5. If the injury is not serious, call 1 1 1 for non-emergency medical guidance. Only call Emergency Services if the limb looks deformed, feels numb, or cannot be moved safely.',
          advise111: true,
        },
      ],
    },
  },
];

export function getStepsForProtocol(protocol: EmergencyProtocol, ageGroup: AgeGroup): ProtocolStep[] {
  if (protocol.supportsAgeGroups && protocol.steps[ageGroup] && protocol.steps[ageGroup]!.length > 0) {
    return protocol.steps[ageGroup]!;
  }
  return protocol.steps.default;
}
