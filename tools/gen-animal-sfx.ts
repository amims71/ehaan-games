/*
 * Generate AI animal sound effects (ElevenLabs Sound Effects API) for the Animal Sounds game.
 *
 * Dev-time only. Requires ELEVENLABS_API_KEY in the environment (never commit it). The generated
 * .m4a clips are written into public/assets/audio/vo/ and committed, so the shipped app makes no
 * network calls — same offline model as the rest of the bundled audio.
 *
 *   export ELEVENLABS_API_KEY=...      # pull from Vaultwarden
 *   pnpm assets:animal-sfx             # all 14
 *   pnpm assets:animal-sfx --only=moo,woof   # regenerate specific sounds
 *
 * Each clip replaces the placeholder `say`-spoken word at the SAME path, so no game code changes.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API = 'https://api.elevenlabs.io/v1/sound-generation';
const OUT_DIR = 'public/assets/audio/vo';

interface Sfx { sound: string; prompt: string; seconds: number; }

// Sound keys MUST match AnimalSoundScene's ANIMALS[].sound. Prompts ask for one clean, gentle,
// isolated sound (no music / background) suited to toddlers.
const SOUNDS: Sfx[] = [
  { sound: 'moo',     prompt: 'A single cow mooing once, clear and close-up, no music, no background noise', seconds: 2 },
  { sound: 'woof',    prompt: 'One friendly dog bark, a single clear woof, no music, no background', seconds: 1.5 },
  { sound: 'meow',    prompt: 'A single cute house-cat meow, clear, no music, no background', seconds: 1.5 },
  { sound: 'oink',    prompt: 'A single pig oink, clear, no music, no background', seconds: 1.5 },
  { sound: 'baa',     prompt: 'A single sheep baa bleat, clear, no music, no background', seconds: 1.5 },
  { sound: 'quack',   prompt: 'A single duck quack, clear, no music, no background', seconds: 1.5 },
  { sound: 'neigh',   prompt: 'A single horse neigh and whinny, clear, no music, no background', seconds: 2 },
  { sound: 'ribbit',  prompt: 'A single frog ribbit croak, clear, no music, no background', seconds: 1.5 },
  { sound: 'roar',    prompt: 'A single gentle lion roar, friendly not scary, clear, no music', seconds: 2 },
  { sound: 'cluck',   prompt: 'A hen clucking, a couple of soft chicken clucks, clear, no music', seconds: 2 },
  { sound: 'hoot',    prompt: 'An owl hooting twice, clear, no music, no background', seconds: 2 },
  { sound: 'buzz',    prompt: 'A bee buzzing for a moment, clear, no music, no background', seconds: 1.5 },
  { sound: 'hiss',    prompt: 'A single snake hiss, clear, no music, no background', seconds: 1.5 },
  { sound: 'trumpet', prompt: 'A single elephant trumpet call, clear, no music, no background', seconds: 2 },
];

async function main(): Promise<void> {
  // Load a local .env if present (dev convenience). The .env is gitignored — never committed.
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env');
  } catch {
    // No .env file — fall back to the real environment.
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error('ELEVENLABS_API_KEY is not set. Run:  export ELEVENLABS_API_KEY=...');
    process.exit(1);
  }

  const onlyArg = process.argv.slice(2).find((a) => a.startsWith('--only='));
  const only = onlyArg?.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean);
  const list = only ? SOUNDS.filter((s) => only.includes(s.sound)) : SOUNDS;
  if (!list.length) {
    console.error(`No matching sounds for --only=${only?.join(',')}.`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'animal-sfx-'));

  for (const { sound, prompt, seconds } of list) {
    process.stdout.write(`generating ${sound.padEnd(8)} `);
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: prompt, duration_seconds: seconds, prompt_influence: 0.5 }),
    });
    if (!res.ok) {
      console.error(`\nFAILED (${res.status}): ${await res.text()}`);
      process.exit(1);
    }
    const mp3 = join(tmp, `${sound}.mp3`);
    writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));

    // mp3 -> AAC/.m4a, trim edge silence (both ends) and normalise loudness so every prompt is
    // punchy and at an even volume on small speakers.
    const out = join(OUT_DIR, `${sound}.m4a`);
    const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05';
    execFileSync('ffmpeg', [
      '-y', '-i', mp3,
      '-af', `${trim},areverse,${trim},areverse,loudnorm=I=-16:TP=-1.5:LRA=11`,
      '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', out,
    ], { stdio: 'ignore' });
    console.log(`-> ${out}`);
  }

  console.log(`\nDone (${list.length}). Rebuild + redeploy to ship: pnpm build && npx cap sync android`);
}

void main();
