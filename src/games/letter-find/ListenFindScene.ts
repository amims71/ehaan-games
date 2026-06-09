import { FindScene } from '@/shell/game/FindScene';

// Audio find-the-letter game: speaks the target; player taps the matching card without visual cue.
export class ListenFindScene extends FindScene {
  constructor() {
    super('ListenFind', 'audio');
  }
}
