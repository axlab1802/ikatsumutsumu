"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Volume2, Music } from "lucide-react";
import { getGameSettings, saveGameSettings, GameSettings } from "@/lib/store";

export default function AdminPage() {
    const [settings, setSettings] = useState<GameSettings | null>(null);

    useEffect(() => {
        setSettings(getGameSettings());
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "seWavDataUrl" | "bgmMp3DataUrl") => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File size is too big! Please upload max 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (settings) {
                const newSettings = { ...settings, [type]: dataUrl };
                setSettings(newSettings);
                saveGameSettings(newSettings);
                alert(`${type} updated successfully!`);
            }
        };
        reader.readAsDataURL(file);
    };

    const clearScores = () => {
        if (confirm("Are you sure you want to reset the high score?")) {
            saveGameSettings({ highScore: 0 });
            setSettings((prev) => (prev ? { ...prev, highScore: 0 } : null));
        }
    };

    if (!settings) return null;

    return (
        <main className="min-h-screen p-6 font-bold" style={{ backgroundColor: "var(--riso-paper)", color: "var(--riso-black)" }}>
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/" className="hover:bg-yellow-200 p-2 rounded-full transition riso-card hover:translate-y-1">
                        <ArrowLeft />
                    </Link>
                    <h1 className="text-4xl tracking-tighter mix-blend-multiply" style={{ color: "var(--riso-blue)" }}>GAME SETTINGS</h1>
                </div>

                <div className="riso-card p-6 rounded-none p-8 leading-relaxed">
                    <h2 className="text-2xl flex items-center gap-2 mb-4 mix-blend-multiply" style={{ color: "var(--riso-pink)" }}>
                        <Volume2 /> Sound Effects (WAV)
                    </h2>
                    <p className="text-sm mb-4 font-bold opacity-80">Upload an exhilarating sound effect used when destroying items.</p>
                    <input
                        type="file"
                        accept="audio/wav"
                        className="block w-full text-sm font-bold file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-sm file:font-black file:bg-[var(--riso-yellow)] file:text-[var(--riso-black)] hover:file:bg-yellow-400 file:cursor-pointer p-2 border-2 border-dashed border-black mb-4"
                        onChange={(e) => handleFileUpload(e, "seWavDataUrl")}
                    />
                    {settings.seWavDataUrl && (
                        <div className="mt-4">
                            <audio controls src={settings.seWavDataUrl} className="h-10 w-full rounded-none" />
                        </div>
                    )}
                </div>

                <div className="riso-card p-6 rounded-none p-8 leading-relaxed">
                    <h2 className="text-2xl flex items-center gap-2 mb-4 mix-blend-multiply" style={{ color: "var(--riso-blue)" }}>
                        <Music /> Background Music (MP3)
                    </h2>
                    <p className="text-sm mb-4 font-bold opacity-80">Upload background music for the game.</p>
                    <input
                        type="file"
                        accept="audio/mpeg"
                        className="block w-full text-sm font-bold file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-sm file:font-black file:bg-[var(--riso-pink)] file:text-[var(--riso-paper)] hover:file:opacity-80 file:cursor-pointer p-2 border-2 border-dashed border-black mb-4"
                        onChange={(e) => handleFileUpload(e, "bgmMp3DataUrl")}
                    />
                    {settings.bgmMp3DataUrl && (
                        <div className="mt-4">
                            <audio controls src={settings.bgmMp3DataUrl} className="h-10 w-full rounded-none" />
                        </div>
                    )}
                </div>

                <div className="riso-card p-6 rounded-none p-8 leading-relaxed" style={{ backgroundColor: "#ffebf5" }}>
                    <h2 className="text-2xl flex items-center gap-2 mb-4 mix-blend-multiply" style={{ color: "var(--riso-pink)" }}>
                        High Score Storage
                    </h2>
                    <p className="text-sm font-bold mb-4">Current High Score: <span className="text-3xl mix-blend-multiply" style={{ color: "var(--riso-blue)" }}>{settings.highScore}</span> points</p>
                    <button
                        onClick={clearScores}
                        className="riso-btn-alt flex items-center gap-2 py-3 px-6 font-black"
                    >
                        <Trash2 size={24} /> RESET SCORES
                    </button>
                </div>
            </div>
        </main>
    );
}
