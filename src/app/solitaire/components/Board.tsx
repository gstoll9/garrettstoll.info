'use client'
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { createDeck } from '../lib/gameLogic';
import { Card as CardType } from '../lib/types';
import Pile from './Pile';

export default function Board() {
  const [tableau, setTableau] = useState<CardType[][]>([]);
  const [stock, setStock] = useState<CardType[]>([]);

  useEffect(() => {
    const deck = createDeck();
    const tableauInit: CardType[][] = Array.from({ length: 7 }, () => []);
    let deckIndex = 0;

    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) {
        const card = deck[deckIndex++];
        tableauInit[i].push({
          ...card,
          faceUp: j === i,
        });
      }
    }

    setTableau(tableauInit);
    setStock(deck.slice(deckIndex));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    const sourcePileIndex = tableau.findIndex(pile =>
      pile.find(card => card.id === active.id)
    );
    const destinationPileIndex = parseInt(String(over.id).replace('pile-', ''), 10);

    if (sourcePileIndex === -1 || isNaN(destinationPileIndex)) return;
    if (sourcePileIndex === destinationPileIndex) return;

    const sourcePile = [...tableau[sourcePileIndex]];
    const destinationPile = [...tableau[destinationPileIndex]];
    const cardIndex = sourcePile.findIndex(c => c.id === active.id);
    const movedCards = sourcePile.splice(cardIndex);

    // Basic move (no Solitaire rules enforced yet)
    const newTableau = [...tableau];
    newTableau[sourcePileIndex] = sourcePile;
    newTableau[destinationPileIndex] = [...destinationPile, ...movedCards];
    setTableau(newTableau);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <div className="flex space-x-4">
            <Pile cards={stock} title="Stock" pileId="stock" />
            <Pile cards={[]} title="Waste" pileId="waste" />
          </div>
          <div className="flex space-x-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Pile key={i} cards={[]} title={`Foundation ${i + 1}`} pileId={`foundation-${i}`} />
            ))}
          </div>
        </div>

        <div className="flex space-x-4">
          {tableau.map((pile, i) => (
            <Pile key={i} cards={pile} title={`Pile ${i + 1}`} pileId={`pile-${i}`} />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
