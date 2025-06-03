import { Card, Suit, Rank } from './types';

export function createDeck(): Card[] {
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const deck: Card[] = [];

  for (let suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
        let rankString: string;
        switch (rank) {
            case 1:
                rankString = 'A'; // Ace
                break;
            case 11:
                rankString = 'J'; // Jack
                break;
            case 12:
                rankString = 'Q'; // Queen
                break;
            case 13:
                rankString = 'K'; // King
                break;
            default:
                rankString = String(rank); // Numbers 2-10
        }
      deck.push({
        suit,
        rank: rankString as Rank,
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