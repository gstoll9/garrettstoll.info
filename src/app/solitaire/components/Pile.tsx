import { useDroppable } from '@dnd-kit/core';
import Card from './Card';
import { Card as CardType } from '../lib/types';

export default function Pile({
  cards,
  title,
  pileId,
}: {
  cards: CardType[];
  title: string;
  pileId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: pileId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative w-16 min-h-24 p-1 border rounded ${
        isOver ? 'border-yellow-400' : 'border-gray-300'
      } bg-green-600 text-white`}
    >
      <div className="text-xs text-center mb-1">{title}</div>
      {cards.map((card, idx) => (
        <Card key={card.id} card={card} index={idx} />
      ))}
    </div>
  );
}
