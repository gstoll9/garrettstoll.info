import { useDraggable } from '@dnd-kit/core';
import { Card as CardType } from '../lib/types';

export default function Card({ card, index }: { card: CardType; index: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.id,
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    top: `${index * 16}px`,
    zIndex: index,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute w-16 h-24 border rounded bg-white text-black text-sm text-center shadow"
      style={style}
    >
      {card.faceUp ? `${card.rank} ${card.suit}` : '🂠'}
    </div>
  );
}
