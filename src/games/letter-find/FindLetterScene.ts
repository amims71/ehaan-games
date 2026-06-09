import { FindScene } from '@/shell/game/FindScene';

// Visual find-the-letter game: shows the target character; player taps the matching card.
export class FindLetterScene extends FindScene {
  constructor() {
    super('FindLetter', 'visual');
  }
}
