'use client'
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { createDeck } from '../lib/gameLogic';
import { Card as CardType } from '../lib/types';
import Pile from './Pile';
import { canStack, canScore } from '../lib/utils';

function getPileIndex(pileId: string): number {
    return parseInt(String(pileId).replace('pile-', ''), 10);
}

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


    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;

        const sourceId = active.data.current?.fromPile;
        const targetId = over.id as string;

        
        

        const sourceIdx = getPileIndex(sourceId);
        const targetIdx = getPileIndex(targetId);

        if (sourceId === targetId) return;

        const sourcePile = tableau[sourceIdx];
        const targetPile = tableau[targetIdx];
        const card = sourcePile[sourcePile.length - 1];
        const topTargetCard = targetPile[targetPile.length - 1];

        // trying to score
        let canMove = (targetId.includes('score-') && targetPile.length == 0) 
            ? card.rank === 'A' // empty score pile must start with Ace
            : canScore(topTargetCard, card);

        // moving on board
        canMove = targetPile.length === 0
            ? card.rank === 'K' // empty tableau must start with King
            : canStack(topTargetCard, card);

        if (!canMove) return;

        // Move card
        const cardIndex = sourcePile.findIndex(c => c.id === active.id);
        const movedCards = sourcePile.splice(cardIndex);

        // Basic move (no Solitaire rules enforced yet)
        const newTableau = [...tableau];
        newTableau[sourceIdx] = sourcePile;
        newTableau[targetIdx] = [...targetPile, ...movedCards];

        // Flip card beneath if face-down
        const sourceAfterMove = newTableau[sourceIdx];
        const last = sourceAfterMove[sourceAfterMove.length - 1];
        if (last && !last.faceUp) {
            last.faceUp = true;
        }

        setTableau(newTableau);
    }

  return (
    <DndContext onDragEnd={handleDragEnd}>
        <div className="board">
            <div className="row">
                {/* stock and waste */}
                <Pile cards={stock} title="Stock" pileId="stock" stacked />
                <Pile cards={[]} title="Waste" pileId="waste" />
                {[1, 2, 3, 4].map(i => (
                    <Pile 
                        key={i} 
                        cards={[]} 
                        title={["Hearts", "Diamonds", "Clubs", "Spades"][i - 1]} 
                        pileId={`score-${i}`} 
                        stacked />
                ))}
            </div>
            <div className="row">
                {/* tableau piles */}
                {tableau.map((pile, i) => (
                    <Pile key={i} cards={pile} title={`Pile ${i + 1}`} pileId={`pile-${i}`} />
                ))}
            </div>
        </div>
    </DndContext>
  );
}
