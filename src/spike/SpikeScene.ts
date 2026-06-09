// THROWAWAY SPIKE SCENE — deleted at the start of Phase 1 (see plan Task 18).
// Purpose: exercise Phaser drag events + the PURE dropValidation module + the
// native-audio voice prompt + the looping music bed on REAL devices.
import Phaser from 'phaser';
import { isValidDrop, isSetComplete, type DraggableMeta, type DropTarget } from '@/shell/input/dropValidation';
import type { AudioService } from '@/shell/audio/AudioService';
import type { AudioCueId } from '@/types';

const PROMPT_CUE = 'spike-prompt-sort' as AudioCueId;
const MUSIC_CUE = 'spike-music-bed' as AudioCueId;

interface SpikeItem { obj: Phaser.GameObjects.Rectangle; meta: DraggableMeta; homeX: number; homeY: number; }

export class SpikeScene extends Phaser.Scene {
  private audio!: AudioService;
  private items: SpikeItem[] = [];
  private targets: { zone: Phaser.GameObjects.Zone; target: DropTarget }[] = [];
  private placed: string[] = [];

  constructor() { super('Spike'); }

  init(data: { audio: AudioService }): void { this.audio = data.audio; }

  preload(): void {
    // Ambient music via Phaser loader (WebAudio backend); voice is native (preloaded by AudioService).
    this.load.audio(MUSIC_CUE, ['assets/audio/spike-music-bed.m4a']);
  }

  create(): void {
    const { width, height } = this.scale;
    // Two bins (drop targets): blue (left), orange (right). Generous toddler hit areas.
    const binDefs = [
      { id: 'bin-blue', cat: 'blue', color: 0x0072b2, x: width * 0.25 },
      { id: 'bin-orange', cat: 'orange', color: 0xe69f00, x: width * 0.75 },
    ];
    for (const b of binDefs) {
      this.add.rectangle(b.x, height * 0.78, 220, 220, b.color, 0.35).setStrokeStyle(6, b.color);
      const zone = this.add.zone(b.x, height * 0.78, 220, 220).setRectangleDropZone(220, 220);
      this.targets.push({ zone, target: { id: b.id, acceptsCategoryId: b.cat } });
    }
    // Three draggable items: 2 blue, 1 orange.
    const itemDefs = [
      { id: 'i1', cat: 'blue', color: 0x0072b2, x: width * 0.3 },
      { id: 'i2', cat: 'orange', color: 0xe69f00, x: width * 0.5 },
      { id: 'i3', cat: 'blue', color: 0x0072b2, x: width * 0.7 },
    ];
    for (const it of itemDefs) {
      const r = this.add.rectangle(it.x, height * 0.3, 120, 120, it.color).setInteractive({ draggable: true });
      this.items.push({ obj: r, meta: { id: it.id, categoryId: it.cat }, homeX: it.x, homeY: height * 0.3 });
    }

    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, dx: number, dy: number) => {
      obj.setPosition(dx, dy);
    });
    this.input.on('drop', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, zone: Phaser.GameObjects.Zone) => {
      const item = this.items.find((i) => i.obj === obj);
      const tgt = this.targets.find((t) => t.zone === zone);
      if (!item || !tgt) return;
      if (isValidDrop(item.meta, tgt.target)) {
        obj.setPosition(zone.x, zone.y);
        obj.disableInteractive();
        if (!this.placed.includes(item.meta.id)) this.placed.push(item.meta.id);
        if (isSetComplete(this.placed, this.items.map((i) => i.meta.id))) {
          // Appreciation: replay the voice prompt (cheer stand-in for the spike).
          void this.audio.play(PROMPT_CUE);
        }
      } else {
        obj.setPosition(item.homeX, item.homeY);
      }
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, dropped: boolean) => {
      if (!dropped) {
        const item = this.items.find((i) => i.obj === obj);
        if (item) obj.setPosition(item.homeX, item.homeY);
      }
    });

    // Start the looping music bed and play the intro voice prompt (critical → native).
    void this.audio.play(MUSIC_CUE);
    void this.audio.play(PROMPT_CUE);

    // On-screen replay button so the device tester can re-trigger the voice prompt after interruptions.
    const replay = this.add.rectangle(width * 0.5, height * 0.06, 260, 70, 0x009e73).setInteractive();
    this.add.text(width * 0.5, height * 0.06, 'Replay voice', { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    replay.on('pointerup', () => { void this.audio.play(PROMPT_CUE); });
  }
}
