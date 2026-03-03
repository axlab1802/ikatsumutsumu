"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { getGameSettings, saveGameSettings } from "@/lib/store";
import Link from "next/link";
import { Home } from "lucide-react";

const ITEMS = ["🦑", "🐙", "🌵", "🦀", "🥤", "🐟", "🥃"];
const BALL_RADIUS = 28;
const ITEM_LIMIT = 50;
const GAME_TIME = 30; // seconds

export default function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<number | null>(null);

    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [canShake, setCanShake] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
    const dragAudioRef = useRef<HTMLAudioElement | null>(null);
    const stompAudioRef = useRef<HTMLAudioElement | null>(null);
    const fourHitAudioRef = useRef<HTMLAudioElement | null>(null);
    const hurryUpAudioRef = useRef<HTMLAudioElement | null>(null);

    const isPointerDownRef = useRef(false);
    const selectedPathRef = useRef<Matter.Body[]>([]);
    const lastClearTimeRef = useRef(0);
    const hintPathRef = useRef<Matter.Body[]>([]);
    const isHurryUpPlayedRef = useRef(false);

    // Load Audio & Settings
    useEffect(() => {
        const settings = getGameSettings();
        setHighScore(settings.highScore);
        setSoundEnabled(settings.soundEnabled);

        // Preload sounds
        bgmAudioRef.current = new Audio("/assets/bgm.mp3");
        bgmAudioRef.current.loop = true;
        dragAudioRef.current = new Audio("/assets/drag.mp3");
        stompAudioRef.current = new Audio("/assets/stomp.wav");
        fourHitAudioRef.current = new Audio("/assets/4hit.mp3");
        hurryUpAudioRef.current = new Audio("/assets/hurry_up.wav");

        // Allow settings override for BGM
        if (settings.bgmMp3DataUrl) {
            bgmAudioRef.current = new Audio(settings.bgmMp3DataUrl);
            bgmAudioRef.current.loop = true;
        }
    }, []);

    const startGame = useCallback(() => {
        const prewarm = (audio: HTMLAudioElement | null) => {
            if (!audio) return;
            audio.muted = true;
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = false;
            }).catch(() => { });
        };

        if (soundEnabled) {
            prewarm(dragAudioRef.current);
            prewarm(stompAudioRef.current);
            prewarm(fourHitAudioRef.current);
            prewarm(hurryUpAudioRef.current);
        }

        setScore(0);
        setTimeLeft(GAME_TIME);
        setGameOver(false);
        setIsPlaying(true);
        setCanShake(true);
        lastClearTimeRef.current = Date.now();
        hintPathRef.current = [];
        isHurryUpPlayedRef.current = false;
        if (soundEnabled && bgmAudioRef.current) {
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

        const findHint = () => {
            const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label && ITEMS.includes(b.label));

            for (const startBody of bodies) {
                const stack: Matter.Body[][] = [[startBody]];
                const seen = new Set([startBody.id]);

                while (stack.length > 0) {
                    const path = stack.pop()!;
                    if (path.length >= 3) return path;
                    const current = path[path.length - 1];

                    for (const neighbor of bodies) {
                        if (neighbor.label === current.label && !seen.has(neighbor.id)) {
                            const dx = neighbor.position.x - current.position.x;
                            const dy = neighbor.position.y - current.position.y;
                            if (Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS * 3.5) {
                                seen.add(neighbor.id);
                                stack.push([...path, neighbor]);
                            }
                        }
                    }
                }
            }
            return [];
        };

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
                                if (soundEnabled && dragAudioRef.current) {
                                    dragAudioRef.current.currentTime = 0;
                                    dragAudioRef.current.play().catch(e => console.error(e));
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
            hintPathRef.current = [];
            lastClearTimeRef.current = Date.now();
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
                if (soundEnabled) {
                    if (connected.length >= 4 && fourHitAudioRef.current) {
                        fourHitAudioRef.current.currentTime = 0;
                        fourHitAudioRef.current.play().catch(e => console.error(e));
                    } else if (connected.length === 3 && stompAudioRef.current) {
                        stompAudioRef.current.currentTime = 0;
                        stompAudioRef.current.play().catch(e => console.error(e));
                    }
                }
                lastClearTimeRef.current = Date.now();
            } else {
                lastClearTimeRef.current = Date.now();
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

            if (timer === 10 && !isHurryUpPlayedRef.current) {
                isHurryUpPlayedRef.current = true;
                if (soundEnabled && hurryUpAudioRef.current) {
                    hurryUpAudioRef.current.currentTime = 0;
                    hurryUpAudioRef.current.play().catch(e => console.error(e));
                }
            }

            if (Date.now() - lastClearTimeRef.current > 5000 && hintPathRef.current.length === 0 && !isPointerDownRef.current && timer > 0) {
                hintPathRef.current = findHint();
            }

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
            // Background is Riso Paper (f4f0e6)
            ctx.fillStyle = "#f4f0e6";
            ctx.fillRect(0, 0, width, height);

            // Set up Emojis rendering
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const bodies = Matter.Composite.allBodies(engine.world);

            for (const b of bodies) {
                if (!ITEMS.includes(b.label)) continue;

                ctx.save();
                ctx.translate(b.position.x, b.position.y);
                ctx.rotate(b.angle);

                const isSelected = selectedPathRef.current.includes(b);
                const isHint = hintPathRef.current.includes(b);
                const hintScale = isHint ? 1.1 + Math.sin(Date.now() / 150) * 0.1 : 1;
                const scale = isSelected ? 1.2 : hintScale;

                // Riso Multiply Effect
                ctx.globalCompositeOperation = "multiply";
                ctx.font = `${BALL_RADIUS * 1.5 * scale}px Arial`;

                if (isSelected || isHint) {
                    // Bright Riso glow for selection
                    ctx.shadowColor = isSelected ? "#ff48b0" : "#0078bf"; // Pink for selection, Blue for hint
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 4;
                    ctx.shadowOffsetY = 4;
                    ctx.beginPath();
                    ctx.arc(0, 0, BALL_RADIUS * scale, 0, 2 * Math.PI);
                    ctx.fillStyle = isSelected ? "#ffe800" : "#f4f0e6"; // Yellow for selection, Paper color for hint pulse
                    ctx.fill();
                    ctx.shadowColor = "transparent";
                }

                // Offset text for riso printing effect
                ctx.globalAlpha = 0.8;
                ctx.fillText(b.label, -2, -2); // Cyan/base offset impression

                ctx.globalAlpha = 1.0;
                ctx.fillText(b.label, 2, 2); // Pink/Magenta offset

                ctx.globalCompositeOperation = "source-over"; // Reset for actual emoji
                ctx.fillText(b.label, 0, 0);

                ctx.restore();
            }

            // Draw connecting lines with Riso styling
            if (selectedPathRef.current.length > 0) {
                ctx.beginPath();
                for (let i = 0; i < selectedPathRef.current.length; i++) {
                    const body = selectedPathRef.current[i];
                    if (i === 0) ctx.moveTo(body.position.x, body.position.y);
                    else ctx.lineTo(body.position.x, body.position.y);
                }
                ctx.lineWidth = 14;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.globalCompositeOperation = "multiply";
                ctx.strokeStyle = "#0078bf"; // Riso Blue
                ctx.stroke();

                // Offset stroke
                ctx.translate(4, 4);
                ctx.strokeStyle = "#ff48b0"; // Riso Pink
                ctx.stroke();
                ctx.translate(-4, -4);
                ctx.globalCompositeOperation = "source-over";
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
    }, [soundEnabled]);

    const handleShake = useCallback(() => {
        if (!canShake || !engineRef.current || !isPlaying || gameOver) return;
        setCanShake(false);

        // Apply random explosive upward force to all items
        const bodies = Matter.Composite.allBodies(engineRef.current.world).filter(b => b.label && ITEMS.includes(b.label));

        for (const b of bodies) {
            const forceMagnitude = 0.05 + Math.random() * 0.05;
            Matter.Body.applyForce(b, b.position, {
                x: (Math.random() - 0.5) * 0.05,
                y: -forceMagnitude
            });
        }
    }, [canShake, isPlaying, gameOver]);

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
        <div className="flex flex-col items-center min-h-screen overflow-hidden select-none p-4" style={{ backgroundColor: "var(--riso-paper)" }}>
            <div className="w-full max-w-[360px] flex items-center justify-between p-4 font-black text-2xl" style={{ color: "var(--riso-black)" }}>
                <div>TIME: <span style={{ color: "var(--riso-pink)" }}>{timeLeft}</span>s</div>
                <div>SCORE: <span style={{ color: "var(--riso-blue)" }}>{score}</span></div>
            </div>

            <div className="relative riso-card overflow-hidden touch-none mt-2 rounded-xl">
                <canvas
                    ref={canvasRef}
                    width={360}
                    height={640}
                    className="block touch-none"
                    style={{ width: "100%", height: "auto", maxWidth: "360px", touchAction: "none" }}
                />

                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 backdrop-blur-sm bg-white/30 z-10">
                        <h2 className="text-5xl tracking-tighter riso-text text-center">
                            SEAFOOD POP!<br />
                            <span className="text-xl tracking-normal text-black" style={{ textShadow: "none" }}>Tap to play</span>
                        </h2>
                        <button
                            onClick={startGame}
                            className="riso-btn text-2xl font-black py-4 px-10"
                        >
                            START
                        </button>
                        <div className="text-xl font-black shadow-black mt-4 px-4 bg-white/50 rounded-full border-2 border-black border-dashed" style={{ color: "var(--riso-black)" }}>HIGH SCORE: {highScore}</div>
                    </div>
                )}

                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 backdrop-blur-md bg-white/50 z-10">
                        <h2 className="text-5xl tracking-tighter riso-text">TIME UP!</h2>
                        <div className="text-4xl font-black mix-blend-multiply" style={{ color: "var(--riso-blue)" }}>SCORE: {score}</div>
                        {score >= highScore && score > 0 && (
                            <div className="text-2xl font-black animate-pulse" style={{ color: "var(--riso-pink)" }}>NEW HIGH SCORE!</div>
                        )}
                        <button
                            onClick={startGame}
                            className="mt-6 riso-btn-alt text-2xl font-black py-4 px-8"
                        >
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-between w-full max-w-[360px] gap-4">
                <button
                    onClick={handleShake}
                    disabled={!canShake || !isPlaying || gameOver}
                    className={`riso-btn-alt flex-1 flex items-center justify-center gap-2 font-bold py-3 px-2 ${!canShake || !isPlaying || gameOver ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                    SHAKE(1)
                </button>
                <Link href="/" className="riso-card flex-1 flex items-center justify-center gap-2 font-bold py-3 px-2 hover:bg-yellow-200">
                    <Home size={20} /> QUIT
                </Link>
            </div>
        </div>
    );
}
