import { useDraggable } from '@dnd-kit/core';
import { Card as CardType } from '../lib/types';

export default function Card({ card, index }: { card: CardType; index: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.id,
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    top: `${index * 20}px`,
    zIndex: index,
  };

  const className = `card ${card.faceUp ? (card.suit === '♥' || card.suit === '♦' ? 'red' : 'black') : 'card-back'}`;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={className}
      style={style}
    >
      {card.faceUp ? (
        <>
          <div>{card.rank}</div>
          <div style={{ textAlign: 'center', fontSize: '20px' }}>{card.suit}</div>
          <div style={{ alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>{card.rank}</div>
        </>
      ) : (
        <span>🂠</span>
      )}
    </div>
  );
}
