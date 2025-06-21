'use client';
import { useState, useEffect } from 'react';
import Hydrogen from "./Hydrogen";
import SchrodingerEquation from "./SchrodingerEquation";


export default function HydrogenText() {
  const [text, setText] = useState<string>("SchrodingerEquation");

  return (
    <div>
      {(() => {
        switch (text) {
          case "SchrodingerEquation":
            return <SchrodingerEquation />;
          case "Hydrogen":
            return <Hydrogen />;
          default:
            return <p>Loading...</p>;
        }
      })()}
    </div>
  );
}