"use client"
// pages/index.tsx
import Head from "next/head";
import { GameBoard } from "./components/GameBoard";

export default function Home() {
    return (
        <div className="app">
        <Head>
            <title>Minesweeper</title>
        </Head>
        <GameBoard />
        </div>
    );
}
  