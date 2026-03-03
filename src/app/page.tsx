"use client";

import Link from "next/link";
import { Gamepad2, Settings, Volume2, VolumeX } from "lucide-react";
import { getGameSettings, saveGameSettings } from "@/lib/store";
import { useEffect, useState } from "react";

export default function Home() {
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(getGameSettings().soundEnabled);
  }, []);

  const handlePlayClick = () => {
    saveGameSettings({ soundEnabled: soundOn });
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = !soundOn;
    setSoundOn(next);
    saveGameSettings({ soundEnabled: next });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-6xl text-center leading-tight mb-8 riso-text mix-blend-multiply tracking-tighter">
        SEAFOOD POP! <br /> <span className="text-3xl text-black" style={{ textShadow: "2px 2px 0px #ffe800", mixBlendMode: "normal" }}>~ Ikatsumutsumu ~</span>
      </h1>

      <div className="flex flex-col gap-6 w-full max-w-sm mt-8">
        <Link
          href="/game"
          onClick={handlePlayClick}
          className="riso-btn flex items-center justify-center gap-3 font-bold py-4 px-8"
        >
          <Gamepad2 size={28} />
          <span className="text-2xl font-black">PLAY GAME</span>
        </Link>
        <button
          onClick={toggleSound}
          className="riso-card flex items-center justify-center gap-2 font-bold py-2 mt-[-10px] bg-white border-2 border-dashed border-black hover:bg-yellow-200"
        >
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span>SOUND: {soundOn ? "ON" : "OFF"}</span>
        </button>

        <Link
          href="/admin"
          className="riso-btn-alt flex items-center justify-center gap-3 font-bold py-4 px-8 mt-4"
        >
          <Settings size={28} />
          <span className="text-2xl font-black">SETTINGS</span>
        </Link>
      </div>

      <div className="mt-16 text-center text-lg font-bold" style={{ color: "var(--riso-blue)" }}>
        <p>Save sea creatures by connecting them!</p>
        <p className="mt-2 text-2xl tracking-widest">🐙🦑🦀🐟🌵🥃🥤</p>
      </div>
    </main>
  );
}
