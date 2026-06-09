/*
 * Generate the spoken-word clips (names, colours, shapes, numbers, letters, feedback) with the
 * ElevenLabs Text-to-Speech narrator — replacing the macOS `say` placeholders at the same vo/ paths.
 * Animal SOUND effects are handled separately (gen-animal-sfx.ts) and are not touched here.
 *
 * Dev-time only. Requires ELEVENLABS_API_KEY (loaded from .env, which is gitignored). Output .m4a
 * clips are committed so the app stays fully offline.
 *
 *   pnpm assets:voice --quota                  # show remaining credits
 *   pnpm assets:voice --list                   # list available voices (pick a voice id)
 *   pnpm assets:voice --voice=<id> --group=names [--limit=6]
 *   pnpm assets:voice --voice=<id> --group=colors
 *
 * Groups are ordered by priority so generation can stop any time (e.g. if credits run low); commit
 * after each group.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TTS = 'https://api.elevenlabs.io/v1/text-to-speech';
const OUT_DIR = 'public/assets/audio/vo';
const MODEL = 'eleven_multilingual_v2';
const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // "Rachel" premade — override with --voice=<id>

interface Word { file: string; text: string; }
const w = (file: string, text?: string): Word => ({ file, text: text ?? file });

// Letters say their NAME, not their sound (phonetic spelling forces correct pronunciation).
const LETTERS: Record<string, string> = {
  a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'eff', g: 'gee', h: 'aitch', i: 'eye',
  j: 'jay', k: 'kay', l: 'ell', m: 'emm', n: 'en', o: 'oh', p: 'pee', q: 'cue', r: 'arr',
  s: 'ess', t: 'tee', u: 'you', v: 'vee', w: 'double you', x: 'ex', y: 'why', z: 'zee',
};
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// Priority order: most-heard first.
const GROUPS: { name: string; words: Word[] }[] = [
  {
    name: 'names',
    words: [
      w('apple'), w('banana'), w('grapes'), w('strawberry'), w('orange'), w('watermelon'),
      w('pear'), w('peach'), w('kiwi'), w('cherry'), w('mango'), w('pineapple'),
      w('dog'), w('cat'), w('rabbit'), w('bear'), w('panda'), w('lion'), w('tiger'), w('frog'),
      w('monkey'), w('pig'), w('cow'), w('koala'), w('duck'), w('elephant'), w('hen'), w('owl'),
      w('horse'), w('snake'), w('bird'),
      w('car'), w('bus'), w('bike'), w('taxi'), w('jeep'), w('fire-truck', 'fire truck'),
      w('police-car', 'police car'), w('truck'), w('tractor'), w('scooter'), w('train'), w('helicopter'),
      w('star'), w('sun'), w('rainbow'), w('butterfly'), w('turtle'), w('fish'), w('flower'),
      w('octopus'), w('unicorn'), w('ice-cream', 'ice cream'), w('balloon'), w('penguin'), w('sunflower'),
    ],
  },
  { name: 'colors', words: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'teal'].map((c) => w(c)) },
  { name: 'shapes', words: ['circle', 'square', 'rectangle', 'triangle', 'oval', 'semicircle', 'pentagon', 'hexagon', 'octagon', 'star', 'diamond', 'heart', 'trapezium', 'cross', 'arrow', 'parallelogram'].map((s) => w(s)) },
  { name: 'numbers', words: NUMBERS.map((word, i) => w(String(i), word)) },
  { name: 'letters', words: Object.entries(LETTERS).map(([file, text]) => w(file, text)) },
  { name: 'extra', words: [w('big'), w('small'), w('great-job', 'Great job!')] },
];

async function synth(voice: string, key: string, tmp: string, file: string, text: string): Promise<void> {
  const res = await fetch(`${TTS}/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text, model_id: MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  mkdirSync(OUT_DIR, { recursive: true });
  const mp3 = join(tmp, `${file}.mp3`);
  writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
  const out = join(OUT_DIR, `${file}.m4a`);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05';
  execFileSync('ffmpeg', ['-y', '-i', mp3,
    '-af', `${trim},areverse,${trim},areverse,loudnorm=I=-16:TP=-1.5:LRA=11`,
    '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', out], { stdio: 'ignore' });
}

function arg(name: string): string | undefined {
  return process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}
function flag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

async function main(): Promise<void> {
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env');
  } catch { /* no .env — use the real environment */ }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { console.error('ELEVENLABS_API_KEY is not set (add it to .env).'); process.exit(1); }
  const headers = { 'xi-api-key': key };

  if (flag('quota')) {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers });
    const s = await r.json() as { character_count: number; character_limit: number; tier: string };
    console.log(`tier: ${s.tier} — used ${s.character_count}/${s.character_limit} chars (${s.character_limit - s.character_count} left)`);
    return;
  }

  if (flag('list')) {
    const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers });
    const v = await r.json() as { voices: { voice_id: string; name: string; labels?: Record<string, string> }[] };
    v.voices.forEach((x) => console.log(`${x.voice_id}  ${x.name.padEnd(16)} ${Object.values(x.labels ?? {}).join(', ')}`));
    return;
  }

  const voice = arg('voice') ?? DEFAULT_VOICE;
  const tmp = mkdtempSync(join(tmpdir(), 'voice-'));

  // Ad-hoc single clip for tuning a tricky word:  --file=<name> --text="..."
  const adhocFile = arg('file');
  const adhocText = arg('text');
  if (adhocFile && adhocText) {
    process.stdout.write(`  ${adhocFile} "${adhocText}" ... `);
    await synth(voice, key, tmp, adhocFile, adhocText);
    console.log('ok');
    return;
  }

  const groupName = arg('group');
  const limit = Number(arg('limit') ?? 0);
  const group = GROUPS.find((g) => g.name === groupName);
  if (!group) {
    console.error(`Pass --group=<${GROUPS.map((g) => g.name).join('|')}>  (and optionally --limit=N, --voice=<id>)`);
    process.exit(1);
  }
  const only = arg('only')?.split(',').map((s) => s.trim()).filter(Boolean);
  let words = limit > 0 ? group.words.slice(0, limit) : group.words;
  if (only) words = words.filter((x) => only.includes(x.file));

  console.log(`group '${group.name}' — ${words.length} word(s), voice ${voice}, model ${MODEL}`);
  for (const { file, text } of words) {
    process.stdout.write(`  ${file.padEnd(14)} "${text}" ... `);
    await synth(voice, key, tmp, file, text);
    console.log('ok');
  }
  console.log(`\nDone: group '${group.name}' (${words.length}). Rebuild + redeploy to ship.`);
}

void main();
