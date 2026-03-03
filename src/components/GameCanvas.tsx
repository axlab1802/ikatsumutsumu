"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { getGameSettings, saveGameSettings } from "@/lib/store";
import Link from "next/link";
import { Home } from "lucide-react";

const ITEMS = ["🦑", "🐙", "🌵", "🦀", "🥤", "🐟", "🥃"];
const BALL_RADIUS = 28;
const ITEM_LIMIT = 50;
const GAME_TIME = 60; // seconds

export default function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<number | null>(null);

    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const seBufferRef = useRef<AudioBuffer | null>(null);
    const bgmAudioRef = useRef<HTMLAudioElement | null>(null);

    const isPointerDownRef = useRef(false);
    const selectedPathRef = useRef<Matter.Body[]>([]);

    // Load Audio & Settings
    useEffect(() => {
        const settings = getGameSettings();
        setHighScore(settings.highScore);

        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

        if (settings.seWavDataUrl) {
            fetch(settings.seWavDataUrl)
                .then(res => res.arrayBuffer())
                .then(buffer => audioContextRef.current?.decodeAudioData(buffer))
                .then(decoded => {
                    seBufferRef.current = decoded || null;
                }).catch(e => console.error(e));
        }

        if (settings.bgmMp3DataUrl) {
            bgmAudioRef.current = new Audio(settings.bgmMp3DataUrl);
            bgmAudioRef.current.loop = true;
        }
    }, []);

    const playSE = useCallback(() => {
        if (!audioContextRef.current) return;
        if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume();
        }

        if (seBufferRef.current) {
            const source = audioContextRef.current.createBufferSource();
            source.buffer = seBufferRef.current;
            source.connect(audioContextRef.current.destination);
            source.start();
        } else {
            // Fallback simple beep for placeholder EXHILARATING sound
            const osc = audioContextRef.current.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(500, audioContextRef.current.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioContextRef.current.currentTime + 0.1);
            const gain = audioContextRef.current.createGain();
            gain.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioContextRef.current.destination);
            osc.start();
            osc.stop(audioContextRef.current.currentTime + 0.3);
        }
    }, []);

    const startGame = useCallback(() => {
        setScore(0);
        setTimeLeft(GAME_TIME);
        setGameOver(false);
        setIsPlaying(true);
        if (bgmAudioRef.current) {
            bgmAudioRef.current.currentTime = 0;
            bgmAudioRef.current.play().catch(e => console.error(e));
        }

        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const width = 360;
        const height = 640;

        const engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
        engineRef.current = engine;

        // Walls (U-shape)
        Matter.World.add(engine.world, [
            Matter.Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true }), // Bottom
            Matter.Bodies.rectangle(-25, height / 2, 50, height * 2, { isStatic: true }), // Left
            Matter.Bodies.rectangle(width + 25, height / 2, 50, height * 2, { isStatic: true }) // Right
        ]);


        // Pre-spawn initial items so the box is full
        const initialBodies: Matter.Body[] = [];
        for (let i = 0; i < ITEM_LIMIT; i++) {
            const typeInfo = ITEMS[Math.floor(Math.random() * ITEMS.length)];
            const body = Matter.Bodies.circle(
                width / 2 + (Math.random() - 0.5) * (width - 100),
                (height / 2) - Math.random() * (height * 1.5), // Drop from above so they settle naturally
                BALL_RADIUS,
                {
                    restitution: 0.2,
                    friction: 0.5,
                    render: { fillStyle: "transparent" },
                    label: typeInfo
                }
            );
            initialBodies.push(body);
        }
        Matter.World.add(engine.world, initialBodies);

        const spawnTimer = setInterval(() => {
            if (engine.world.bodies.length < ITEM_LIMIT + 3) {
                const typeInfo = ITEMS[Math.floor(Math.random() * ITEMS.length)];
                const body = Matter.Bodies.circle(
                    width / 2 + (Math.random() - 0.5) * 100,
                    -50,
                    BALL_RADIUS,
                    {
                        restitution: 0.2,
                        friction: 0.5,
                        render: { fillStyle: "transparent" },
                        label: typeInfo
                    }
                );
                Matter.World.add(engine.world, body);
            }
        }, 150);

        const checkCollision = (pointerXY: { x: number, y: number }) => {
            const bodies = engine.world.bodies.filter(b => b.label && ITEMS.includes(b.label));

            for (const b of bodies) {
                // Use a generous circular hitbox for better touch/mouse connectivity
                const dx = b.position.x - pointerXY.x;
                const dy = b.position.y - pointerXY.y;
                if (Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS * 1.5) {
                    const lastSelected = selectedPathRef.current[selectedPathRef.current.length - 1];
                    if (!lastSelected) {
                        selectedPathRef.current.push(b);
                        break;
                    } else {
                        // check distance to last selected and type matching
                        if (lastSelected.id !== b.id && lastSelected.label === b.label && !selectedPathRef.current.includes(b)) {
                            const bdx = b.position.x - lastSelected.position.x;
                            const bdy = b.position.y - lastSelected.position.y;
                            if (Math.sqrt(bdx * bdx + bdy * bdy) < BALL_RADIUS * 3.5) {
                                selectedPathRef.current.push(b);
                                // mini pop sound
                                const osc = audioContextRef.current?.createOscillator();
                                if (osc && audioContextRef.current) {
                                    osc.frequency.value = 800 + selectedPathRef.current.length * 100;
                                    osc.connect(audioContextRef.current.destination);
                                    osc.start();
                                    osc.stop(audioContextRef.current.currentTime + 0.05);
                                }
                                break;
                            }
                        }
                    }
                }
            }
        };

        const handlePointerDown = (e: React.PointerEvent) => {
            isPointerDownRef.current = true;
            selectedPathRef.current = [];
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            checkCollision({ x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
        };

        const handlePointerMove = (e: React.PointerEvent) => {
            if (!isPointerDownRef.current) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            checkCollision({ x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
        };

        const handlePointerUp = () => {
            isPointerDownRef.current = false;
            const connected = selectedPathRef.current;
            if (connected.length >= 3) {
                Matter.World.remove(engine.world, connected);
                setScore(s => s + connected.length * connected.length * 100);
                playSE();
            }
            selectedPathRef.current = [];
        };

        canvas.onpointerdown = handlePointerDown as unknown as (e: PointerEvent) => void;
        canvas.onpointermove = handlePointerMove as unknown as (e: PointerEvent) => void;
        canvas.onpointerup = handlePointerUp as unknown as (e: PointerEvent) => void;
        canvas.onpointercancel = handlePointerUp as unknown as (e: PointerEvent) => void;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let timer = GAME_TIME;
        const gameTimer = setInterval(() => {
            timer--;
            setTimeLeft(timer);
            if (timer <= 0) {
                clearInterval(gameTimer);
                clearInterval(spawnTimer);
                setGameOver(true);
                setIsPlaying(false);
                if (bgmAudioRef.current) bgmAudioRef.current.pause();
                Matter.Engine.clear(engine);
                if (renderRef.current) cancelAnimationFrame(renderRef.current);
            }
        }, 1000);

        const customRender = () => {
            // Background gradient
            ctx.fillStyle = "#1e3a8a";
            ctx.fillRect(0, 0, width, height);

            // Emojis mapping
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const bodies = Matter.Composite.allBodies(engine.world);

            for (const b of bodies) {
                if (!ITEMS.includes(b.label)) continue;

                ctx.save();
                ctx.translate(b.position.x, b.position.y);
                ctx.rotate(b.angle);

                const isSelected = selectedPathRef.current.includes(b);
                const scale = isSelected ? 1.2 : 1;

                if (isSelected) {
                    ctx.shadowColor = "rgba(100, 255, 150, 0.9)";
                    ctx.shadowBlur = 25;
                    ctx.beginPath();
                    ctx.arc(0, 0, BALL_RADIUS * scale, 0, 2 * Math.PI);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                    ctx.fill();
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.font = `${BALL_RADIUS * 1.5 * scale}px Arial`;
                ctx.fillText(b.label, 0, 0);
                ctx.restore();
            }

            // Draw connecting lines
            if (selectedPathRef.current.length > 0) {
                ctx.beginPath();
                for (let i = 0; i < selectedPathRef.current.length; i++) {
                    const body = selectedPathRef.current[i];
                    if (i === 0) ctx.moveTo(body.position.x, body.position.y);
                    else ctx.lineTo(body.position.x, body.position.y);
                }
                ctx.lineWidth = 10;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.stroke();
            }

            Matter.Engine.update(engine, 1000 / 60);
            renderRef.current = requestAnimationFrame(customRender);
        };

        renderRef.current = requestAnimationFrame(customRender);

        return () => {
            clearInterval(spawnTimer);
            clearInterval(gameTimer);
            Matter.Engine.clear(engine);
            if (renderRef.current) cancelAnimationFrame(renderRef.current);
        };
    }, [playSE]);

    useEffect(() => {
        if (gameOver) {
            if (score > highScore) {
                setHighScore(score);
                saveGameSettings({ highScore: score });
            }
        }
    }, [gameOver, score, highScore]);

    // Clean layout for Game
    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-900 overflow-hidden select-none">
            <div className="w-full max-w-[360px] flex items-center justify-between p-4 text-white font-bold">
                <div className="text-xl">Time: <span className="text-red-400">{timeLeft}</span>s</div>
                <div className="text-xl">Score: <span className="text-green-400">{score}</span></div>
            </div>

            <div className="relative shadow-2xl rounded-2xl overflow-hidden bg-black touch-none">
                <canvas
                    ref={canvasRef}
                    width={360}
                    height={640}
                    className="block touch-none"
                    style={{ width: "100%", height: "auto", maxWidth: "360px", touchAction: "none" }}
                />

                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-6 backdrop-blur-sm">
                        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow">
                            SEAFOOD POP
                        </h2>
                        <button
                            onClick={startGame}
                            className="bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-4 px-10 rounded-full shadow-lg transform active:scale-95 transition"
                        >
                            START
                        </button>
                        <div className="text-yellow-400 font-bold mt-4 shadow-black">High Score: {highScore}</div>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6 backdrop-blur-md">
                        <h2 className="text-4xl font-extrabold text-red-500 animate-pulse">TIME UP!</h2>
                        <div className="text-3xl text-white font-bold">Score: {score}</div>
                        {score >= highScore && score > 0 && (
                            <div className="text-xl text-yellow-500 font-bold">NEW HIGH SCORE!</div>
                        )}
                        <button
                            onClick={startGame}
                            className="mt-6 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold py-3 px-8 rounded-full shadow-lg transform active:scale-95 transition"
                        >
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-center w-full max-w-[360px]">
                <Link href="/" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-6 rounded-lg transition border border-gray-600">
                    <Home size={20} /> Quit to Menu
                </Link>
            </div>
        </div>
    );
}
