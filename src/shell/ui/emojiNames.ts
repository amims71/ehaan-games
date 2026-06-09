// Spoken names for the emoji used across the games (so success audio can say the item name).
// Production voice clips (M3) will key off the same names.

export const EMOJI_NAME: Record<string, string> = {
  // Fruit
  '🍎': 'apple', '🍌': 'banana', '🍇': 'grapes', '🍓': 'strawberry', '🍊': 'orange',
  '🍉': 'watermelon', '🍐': 'pear', '🍑': 'peach', '🥝': 'kiwi', '🍒': 'cherry',
  '🥭': 'mango', '🍍': 'pineapple',
  // Animals
  '🐶': 'dog', '🐱': 'cat', '🐰': 'rabbit', '🐻': 'bear', '🐼': 'panda', '🦁': 'lion',
  '🐯': 'tiger', '🐸': 'frog', '🐵': 'monkey', '🐷': 'pig', '🐮': 'cow', '🐨': 'koala',
  // Vehicles
  '🚗': 'car', '🚌': 'bus', '🚲': 'bike', '🚕': 'taxi', '🚙': 'jeep', '🚒': 'fire truck',
  '🚓': 'police car', '🚚': 'truck', '🚜': 'tractor', '🛵': 'scooter', '🚂': 'train',
  '🚁': 'helicopter',
  // Match-game extras
  '⭐': 'star', '🌞': 'sun', '🌈': 'rainbow', '🦋': 'butterfly', '🐢': 'turtle', '🐠': 'fish',
  '🌸': 'flower', '🐙': 'octopus', '🦄': 'unicorn', '🍦': 'ice cream', '🎈': 'balloon',
  '🐧': 'penguin', '🐝': 'bee', '🌻': 'sunflower',
};

/** Spoken name for an emoji, or empty string if unknown. */
export function nameFor(emoji: string): string {
  return EMOJI_NAME[emoji] ?? '';
}
