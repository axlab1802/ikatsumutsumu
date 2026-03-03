import Link from "next/link";
import { Gamepad2, Settings } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-900 to-black text-white">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 drop-shadow-lg text-center leading-tight">
        SEAFOOD POP! <br /> <span className="text-2xl font-bold text-white">~ Ikatsumutsumu ~</span>
      </h1>
      
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <Link 
          href="/game" 
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
        >
          <Gamepad2 size={28} />
          <span className="text-2xl">PLAY GAME</span>
        </Link>
        
        <Link 
          href="/admin" 
          className="flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 border border-gray-600"
        >
          <Settings size={28} />
          <span className="text-2xl">SETTINGS</span>
        </Link>
      </div>

      <div className="mt-12 text-center text-sm text-gray-400">
        <p>Save sea creatures by connecting them!</p>
        <p>🐙 🦑 🦀 🐟 🌵 🥃 🥤</p>
      </div>
    </main>
  );
}
