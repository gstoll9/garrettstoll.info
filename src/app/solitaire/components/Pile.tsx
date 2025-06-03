import { useDroppable } from '@dnd-kit/core';
import Card from './Card';
import { Card as CardType } from '../lib/types';

interface PileProps {
  cards: CardType[];
  title: string;
  pileId: string;
  stacked?: boolean; // NEW: determines layout style
}

export default function Pile({ cards, title, pileId, stacked = false }: PileProps) {
  
  const { setNodeRef } = useDroppable({
    id: pileId,
  });

  return (
    <div ref={setNodeRef} className="pile">
      <div style={{ fontSize: '12px', marginBottom: '4px' }}>{title}</div>
      {cards.map((card, idx) => (
        <Card 
            key={card.id} 
            card={card} 
            index={stacked ? 0 : idx}
        />
      ))}
    </div>
  );
}
