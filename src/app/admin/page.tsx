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
        <main className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/" className="hover:bg-gray-800 p-2 rounded-full transition">
                        <ArrowLeft />
                    </Link>
                    <h1 className="text-3xl font-bold">Game Settings (JSON Storage)</h1>
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-400">
                        <Volume2 /> Sound Effects (WAV)
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">Upload an exhilarating sound effect used when destroying items.</p>
                    <input
                        type="file"
                        accept="audio/wav"
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        onChange={(e) => handleFileUpload(e, "seWavDataUrl")}
                    />
                    {settings.seWavDataUrl && (
                        <div className="mt-4">
                            <audio controls src={settings.seWavDataUrl} className="h-10 w-full" />
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-green-400">
                        <Music /> Background Music (MP3)
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">Upload background music for the game.</p>
                    <input
                        type="file"
                        accept="audio/mpeg"
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                        onChange={(e) => handleFileUpload(e, "bgmMp3DataUrl")}
                    />
                    {settings.bgmMp3DataUrl && (
                        <div className="mt-4">
                            <audio controls src={settings.bgmMp3DataUrl} className="h-10 w-full" />
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-red-900/40">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-500">
                        High Score Storage
                    </h2>
                    <p className="text-sm text-gray-300 mb-4">Current High Score: <span className="font-mono text-2xl text-yellow-400">{settings.highScore}</span> points</p>
                    <button
                        onClick={clearScores}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-bold transition"
                    >
                        <Trash2 size={20} /> Reset Scores
                    </button>
                </div>
            </div>
        </main>
    );
}
