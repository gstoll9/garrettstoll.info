"use client";
import StandardLayout from "@/layouts/standardLayout";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

const suits = ["hearts", "spades", "clubs", "diamonds"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export default function CardDeck() {
  const [deck, setDeck] = useState<string[]>(() =>
    suits.flatMap((suit) => ranks.map((rank) => `/cards/${suit}_${rank}.png`))
  );
  const [draggedCards, setDraggedCards] = useState<{id: string, src: string, x: number, y: number, isFlipped: boolean}[]>([]);

  const handleCardDrag = (index: number) => {
    // Only allow dragging the top card (last card in deck)
    if (index !== deck.length - 1) return;
    
    const cardSrc = deck[index];
    const newDraggedCard = {
      id: `card-${Date.now()}-${index}`,
      src: cardSrc,
      x: 0,
      y: 0,
      isFlipped: false
    };
    
    setDraggedCards(prev => [...prev, newDraggedCard]);
    setDeck(prev => prev.slice(0, -1)); // Remove the last card
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "f") {
      setDraggedCards(prev => 
        prev.map((card, i) => 
          i === prev.length - 1 
            ? { ...card, isFlipped: !card.isFlipped }
            : card
        )
      );
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const page = (
    <div className="relative h-screen w-screen bg-green-700 flex items-center justify-center overflow-hidden">
      {/* Deck stack */}
      <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="relative w-[242px] h-[340px]">
          {deck.map((_, i) => (
            <motion.img
              key={`deck-${i}`}
              src="/cards/backs/back_dark.png"
              alt="card back"
              className="absolute rounded-md shadow-lg cursor-grab"
              style={{
                top: `${i * 1}px`, // Very small offset for depth
                left: `${i * 1}px`,
                width: "242px",
                height: "340px",
                zIndex: i + 1, // Bottom cards have lower z-index
              }}
              drag={i === deck.length - 1} // Only top card is draggable
              whileTap={{ cursor: "grabbing" }}
              onDragStart={() => handleCardDrag(i)}
              dragSnapToOrigin={false}
            />
          ))}
        </div>
      </div>

      {/* Dragged cards */}
      {draggedCards.map((card) => (
        <motion.div
          key={card.id}
          className="absolute cursor-grab"
          drag
          whileTap={{ cursor: "grabbing" }}
          style={{
            width: 242,
            height: 340,
            zIndex: 1000,
          }}
          initial={{ 
            x: 0, 
            y: 0,
            scale: 1 
          }}
        >
          <motion.img
            src={card.isFlipped ? card.src : "/cards/backs/back_dark.png"}
            alt="dragged card"
            className="rounded-md shadow-xl"
            style={{
              width: 242,
              height: 340,
            }}
          />
        </motion.div>
      ))}
    </div>
  );

  return StandardLayout({main: page});
}