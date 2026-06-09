// Lightweight game registry — drives the Hub menu.

export interface GameEntry {
  id: string;
  sceneKey: string;
  title: string;
  icon: string;
}

export const GAMES: GameEntry[] = [
  { id: 'color-sort',    sceneKey: 'ColorSort',   title: 'Color Sort',    icon: '🎨' },
  { id: 'item-sort',     sceneKey: 'ItemSort',    title: 'Item Sort',     icon: '🧺' },
  { id: 'item-match',    sceneKey: 'ItemMatch',   title: 'Item Match',    icon: '🧩' },
  { id: 'letter-match',  sceneKey: 'LetterMatch', title: 'Letter Match',  icon: '🔡' },
  { id: 'find-letter',   sceneKey: 'FindLetter',  title: 'Find It',       icon: '🔠' },
  { id: 'listen-find',   sceneKey: 'ListenFind',  title: 'Listen & Find', icon: '🔊' },
];
