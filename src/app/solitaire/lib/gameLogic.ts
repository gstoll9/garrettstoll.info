import { Card, Suit, Rank } from './types';

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];

  for (let suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        suit,
        rank: rank as Rank,
        faceUp: false,
        id: `${suit}-${rank}-${Math.random()}`,
      });
    }
  }

  return shuffle(deck);
}

function shuffle(array: Card[]): Card[] {
  return array.sort(() => Math.random() - 0.5);
}