import Phaser from 'phaser';
import { FindScene, type FindToken } from '@/shell/game/FindScene';

// Audio game: hear an animal sound and tap the matching animal emoji.
// promptKey returns the sound (e.g. 'moo'); pronounce returns the name (e.g. 'cow').

interface AnimalDef {
  name: string;
  emoji: string;
  sound: string;
}

const ANIMALS: AnimalDef[] = [
  { name: 'cow',      emoji: '🐄', sound: 'moo'      },
  { name: 'dog',      emoji: '🐶', sound: 'woof'     },
  { name: 'cat',      emoji: '🐱', sound: 'meow'     },
  { name: 'pig',      emoji: '🐷', sound: 'oink'     },
  { name: 'sheep',    emoji: '🐑', sound: 'baa'      },
  { name: 'duck',     emoji: '🦆', sound: 'quack'    },
  { name: 'horse',    emoji: '🐴', sound: 'neigh'    },
  { name: 'frog',     emoji: '🐸', sound: 'ribbit'   },
  { name: 'lion',     emoji: '🦁', sound: 'roar'     },
  { name: 'hen',      emoji: '🐔', sound: 'cluck'    },
  { name: 'owl',      emoji: '🦉', sound: 'hoot'     },
  { name: 'bee',      emoji: '🐝', sound: 'buzz'     },
  { name: 'snake',    emoji: '🐍', sound: 'hiss'     },
  { name: 'elephant', emoji: '🐘', sound: 'trumpet'  },
];

export class AnimalSoundScene extends FindScene {
  // Lookup rebuilt each round so drawFace can access emoji without extra fields on FindToken.
  private animalMap = new Map<string, AnimalDef>();

  constructor() {
    super('AnimalSound', 'audio');
  }

  protected roundTitle(): string {
    return 'What animal?';
  }

  protected pickCandidates(): FindToken[] {
    const picked = this.shuffle([...ANIMALS]).slice(0, 8);
    this.animalMap = new Map(picked.map((a) => [a.name, a]));
    return picked.map((a) => ({ key: a.name }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: FindToken,
  ): void {
    const animal = this.animalMap.get(token.key);
    const emoji  = animal?.emoji ?? '❓';
    const label  = this.add
      .text(0, 0, emoji, { fontSize: `${Math.round(size * 0.55)}px` })
      .setOrigin(0.5);
    parent.add(label);
  }

  /** Spoken on correct tap: the animal NAME (e.g. "cow"). */
  protected pronounce(token: FindToken): string {
    return token.key;
  }

  /** Spoken as the audio PROMPT: the animal SOUND (e.g. "moo"). */
  protected override promptKey(token: FindToken): string {
    return this.animalMap.get(token.key)?.sound ?? token.key;
  }
}
