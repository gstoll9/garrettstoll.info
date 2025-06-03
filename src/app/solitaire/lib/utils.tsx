import type { Card } from './types';

const rankOrder = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];

export function canStack(cardA: Card, cardB: Card): boolean {
  const indexA = rankOrder.indexOf(cardA.rank);
  const indexB = rankOrder.indexOf(cardB.rank);

  if (indexA === -1 || indexB === -1) return false;

  const isOppositeColor =
    (['♥', '♦'].includes(cardA.suit) && ['♠', '♣'].includes(cardB.suit)) ||
    (['♠', '♣'].includes(cardA.suit) && ['♥', '♦'].includes(cardB.suit));

  return indexA === indexB + 1 && isOppositeColor;
}

export function canScore(cardA: Card | null, cardB: Card): boolean {

    const indexB = rankOrder.indexOf(cardB.rank);
    
    if ((!cardA) && (indexB === -1)) return true;
    if (!cardA) return false;
    
    const indexA = rankOrder.indexOf(cardA.rank);
    
    const isSameSuit = cardA.suit === cardB.suit;
    return (indexA === indexB - 1) && isSameSuit;
}
