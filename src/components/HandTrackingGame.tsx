"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Script from "next/script";

// Define minimal types for what we use from global window objects
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

interface Circle {
  x: number;
  y: number;
  radius: number;
  color: string;
  id: number;
  type: "score" | "killer" | "gold";
  speed: number;
}

const HandTrackingGame: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game State
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [areScriptsLoaded, setAreScriptsLoaded] = useState(false);
  const [isBuffActive, setIsBuffActive] = useState(false);
  const [buffTimeLeft, setBuffTimeLeft] = useState(0);

  // Refs
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const gameOverRef = useRef(false);
  const gameStartedRef = useRef(false);
  const circlesRef = useRef<Circle[]>([]);
  const lastSpawnTime = useRef<number>(0);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const multiHandLandmarksRef = useRef<any[]>([]);
  const trailsRef = useRef<{ [key: number]: { x: number; y: number }[] }>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Buff System Refs
  const buffSystemRef = useRef({
    active: false,
    endTime: 0,
  });

  // Track loaded scripts
  const scriptsLoadedRef = useRef({
    hands: false,
    camera: false,
    drawing: false,
  });

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio("/backsound.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // --- Game Loop Helpers Defined First to avoid "Used before defined" ---

  const drawCircles = (ctx: CanvasRenderingContext2D) => {
    for (const circle of circlesRef.current) {
      ctx.save();

      // -- Motion Trail (Neon Tail) --
      const trailLength = circle.radius * 4;

      // Create gradient from circle center upwards
      const gradient = ctx.createLinearGradient(
        circle.x,
        circle.y,
        circle.x,
        circle.y - trailLength,
      );

      // Start with circle color (faded slightly), end with transparent
      gradient.addColorStop(0, circle.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      // Draw the trail as a rectangle/path behind the circle
      ctx.beginPath();
      ctx.fillStyle = gradient;
      // Width slightly smaller than diameter for a tapered look or same width
      ctx.rect(
        circle.x - circle.radius,
        circle.y - trailLength,
        circle.radius * 2,
        trailLength,
      );
      ctx.fill();

      // -- Main Circle --
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.fillStyle = circle.color;

      // Neon Glow Effect
      ctx.shadowColor = circle.color;
      ctx.shadowBlur = circle.type === "gold" ? 40 : 20;

      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  };

  const activateBuff = () => {
    if (buffSystemRef.current.active) return; // Prevent stacking/extension

    buffSystemRef.current.active = true;
    buffSystemRef.current.endTime = performance.now() + 10000; // 10 seconds
    setIsBuffActive(true);

    // Convert ALL existing circles to GOLD
    circlesRef.current.forEach((circle) => {
      circle.type = "gold";
      circle.color = "rgba(255, 215, 0, 0.9)";
    });
  };

  const spawnCircle = (canvasWidth: number) => {
    const baseInterval = 1000;
    const decreasePer10Points = 50;
    const interval = Math.max(
      400,
      baseInterval - Math.floor(scoreRef.current / 10) * decreasePer10Points,
    );

    const now = performance.now();
    if (now - lastSpawnTime.current > interval) {
      let type: "score" | "killer" | "gold" = "score";

      if (buffSystemRef.current.active) {
        type = "gold"; // Force gold during buff
      } else {
        const rand = Math.random();
        if (rand > 0.98)
          type = "gold"; // 2% chance for gold
        else if (rand > 0.3) type = "score";
        else type = "killer";
      }

      const radius = 25;
      const y = -radius;
      const x = Math.random() * (canvasWidth - 2 * radius) + radius;

      const baseSpeed = 3;
      const speed = baseSpeed + Math.floor(scoreRef.current / 50) * 0.5;

      let color = "rgba(34, 197, 94, 0.8)"; // Green
      if (type === "killer") color = "rgba(239, 68, 68, 0.8)"; // Red
      if (type === "gold") color = "rgba(255, 215, 0, 0.9)"; // Gold

      const newCircle: Circle = {
        x,
        y,
        radius,
        color,
        id: now,
        type,
        speed,
      };

      circlesRef.current.push(newCircle);
      lastSpawnTime.current = now;
    }
  };

  const handleGameOver = () => {
    gameOverRef.current = true;
    setGameOver(true);
    setGameStarted(false);
    gameStartedRef.current = false;
    buffSystemRef.current.active = false;
    setIsBuffActive(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const updateGameLogic = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    // Check Buff Expiration
    if (buffSystemRef.current.active) {
      const remaining = buffSystemRef.current.endTime - performance.now();
      if (remaining <= 0) {
        buffSystemRef.current.active = false;
        setIsBuffActive(false);
        setBuffTimeLeft(0);
      } else {
        setBuffTimeLeft(Math.ceil(remaining / 1000));
      }
    }

    spawnCircle(width);

    // Get fingertips for ALL detected hands
    const fingertips: { x: number; y: number }[] = [];
    if (
      multiHandLandmarksRef.current &&
      multiHandLandmarksRef.current.length > 0
    ) {
      for (const landmarks of multiHandLandmarksRef.current) {
        const indexFingerTip = landmarks[8];
        if (indexFingerTip) {
          fingertips.push({
            x: (1 - indexFingerTip.x) * width,
            y: indexFingerTip.y * height,
          });
        }
      }
    }

    // Draw interaction points & Trails
    // First, update trails
    const currentFrameFingertips: { [key: number]: { x: number; y: number } } =
      {};

    if (
      multiHandLandmarksRef.current &&
      multiHandLandmarksRef.current.length > 0
    ) {
      multiHandLandmarksRef.current.forEach((landmarks, index) => {
        const indexFingerTip = landmarks[8];
        if (indexFingerTip) {
          const x = (1 - indexFingerTip.x) * width;
          const y = indexFingerTip.y * height;
          currentFrameFingertips[index] = { x, y };

          // Add to trail
          if (!trailsRef.current[index]) trailsRef.current[index] = [];
          trailsRef.current[index].push({ x, y });

          // Limit trail length
          if (trailsRef.current[index].length > 20) {
            trailsRef.current[index].shift();
          }
        }
      });
    } else {
      // Clear trails if no hands detected (optional, or let them fade)
      trailsRef.current = {};
    }

    // Render Trails (Lightsaber Interaction)
    Object.keys(trailsRef.current).forEach((key) => {
      const handIndex = parseInt(key);
      const trail = trailsRef.current[handIndex];

      if (trail.length < 2) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Glow Color based on Buff
      const glowColor = buffSystemRef.current.active
        ? "rgba(255, 215, 0, 0.8)"
        : "rgba(0, 255, 255, 0.8)";
      const coreColor = "white";

      // Draw Glow (Outer Beam)
      ctx.shadowBlur = 20;
      ctx.shadowColor = glowColor;
      ctx.lineWidth = 15;
      ctx.strokeStyle = glowColor;

      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        // Quadratic curve for smoother lines could be used, but simple lineTo is fast
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();

      // Draw Core (Inner Beam)
      ctx.shadowBlur = 10;
      ctx.shadowColor = "white";
      ctx.lineWidth = 6;
      ctx.strokeStyle = coreColor;
      ctx.stroke(); // Re-stroke path with inner core

      ctx.restore();
    });

    // Draw fingertip highlight
    for (const tip of fingertips) {
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = "white";
      ctx.shadowColor = buffSystemRef.current.active ? "gold" : "cyan";
      ctx.shadowBlur = 15;
      ctx.fill();
    }

    const survivingCircles: Circle[] = [];

    for (const circle of circlesRef.current) {
      circle.y += circle.speed;

      let hit = false;
      let offScreen = false;

      if (circle.y - circle.radius > height) {
        offScreen = true;
        // In Buff mode, or if gold, no penalty
        if (circle.type === "score" && !buffSystemRef.current.active) {
          livesRef.current -= 1;
          setLives(livesRef.current);

          if (livesRef.current <= 0) {
            handleGameOver();
          }
        }
      }

      if (!offScreen) {
        for (const tip of fingertips) {
          const dx = tip.x - circle.x;
          const dy = tip.y - circle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < circle.radius + 15) {
            hit = true;
            break;
          }
        }

        if (hit) {
          if (circle.type === "score") {
            scoreRef.current += 10;
            setScore(scoreRef.current);
          } else if (circle.type === "gold") {
            scoreRef.current += 20; // 2x points for gold (Green is 10)
            setScore(scoreRef.current);
            if (!buffSystemRef.current.active) {
              activateBuff();
            }
          } else {
            // Killer logic
            if (!buffSystemRef.current.active) {
              handleGameOver();
            }
          }
        }
      }

      if (!hit && !offScreen) {
        survivingCircles.push(circle);
      } else if (
        hit &&
        circle.type === "killer" &&
        !buffSystemRef.current.active
      ) {
        survivingCircles.push(circle);
      }
    }

    if (!gameOverRef.current) {
      circlesRef.current = survivingCircles;
    }

    drawCircles(ctx);
  };

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = window;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);

    // Draw Video Feed mirrored
    canvasCtx.translate(width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, width, height);

    // Draw Hand Landmarks
    if (results.multiHandLandmarks) {
      multiHandLandmarksRef.current = results.multiHandLandmarks;
      for (const landmarks of results.multiHandLandmarks) {
        if (drawConnectors && HAND_CONNECTIONS) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5,
          });
        }
        if (drawLandmarks) {
          drawLandmarks(canvasCtx, landmarks, {
            color: "#FF0000",
            lineWidth: 2,
          });
        }
      }
    } else {
      multiHandLandmarksRef.current = [];
    }

    canvasCtx.restore();

    if (gameStartedRef.current && !gameOverRef.current) {
      updateGameLogic(canvasCtx, width, height);
    } else if (gameOverRef.current) {
      drawCircles(canvasCtx);
    }
  }, []); // Dependencies are mostly game logic which uses refs

  // --- Initialization ---

  const initializeMediaPipe = useCallback(() => {
    if (handsRef.current) return;

    console.log("Initializing MediaPipe...");
    const { Hands, Camera, HAND_CONNECTIONS } = window;

    if (!Hands || !Camera) {
      console.error("MediaPipe classes not found on window");
      return;
    }

    const hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    handsRef.current = hands;

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
      cameraRef.current = camera;
    }
  }, [onResults]);

  const checkScriptsLoaded = useCallback(() => {
    if (
      scriptsLoadedRef.current.hands &&
      scriptsLoadedRef.current.camera &&
      scriptsLoadedRef.current.drawing
    ) {
      setAreScriptsLoaded(true);
      initializeMediaPipe();
    }
  }, [initializeMediaPipe]);

  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        // cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

  const startGame = () => {
    setScore(0);
    setLives(5);
    setGameOver(false);
    setGameStarted(true);
    setIsBuffActive(false);

    scoreRef.current = 0;
    livesRef.current = 5;
    gameOverRef.current = false;
    gameStartedRef.current = true;
    circlesRef.current = [];
    lastSpawnTime.current = performance.now();
    buffSystemRef.current = { active: false, endTime: 0 };

    // Play Music
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.error("Audio play error:", e));
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-neutral-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Background Overlay with Grid */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      ></div>

      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Scripts */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Camera Utils loaded");
          scriptsLoadedRef.current.camera = true;
          checkScriptsLoaded();
        }}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Hands loaded");
          scriptsLoadedRef.current.hands = true;
          checkScriptsLoaded();
        }}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Drawing Utils loaded");
          scriptsLoadedRef.current.drawing = true;
          checkScriptsLoaded();
        }}
      />

      {/* HUD: Score and Lives - Glassmorphism */}
      <div
        className={`absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 transition-all duration-500`}
      >
        {isBuffActive && (
          <div className="text-yellow-400 font-black text-4xl animate-pulse tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]">
            BUFF: {buffTimeLeft}s
          </div>
        )}
        <div
          className={`flex gap-6 px-8 py-3 backdrop-blur-md border rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-500 ${isBuffActive ? "bg-yellow-900/40 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)]" : "bg-black/40 border-white/10 hover:bg-black/50 hover:border-cyan-500/50"}`}
        >
          <div className="text-white font-bold text-2xl tracking-wider flex items-center gap-2">
            SCORE{" "}
            <span
              className={`font-mono text-3xl drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] ${isBuffActive ? "text-yellow-400" : "text-cyan-400"}`}
            >
              {score}
            </span>
          </div>
          <div className="w-px h-8 bg-white/20 self-center"></div>
          <div className="text-white font-bold text-2xl tracking-wider flex items-center gap-2">
            LIVES{" "}
            <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
              {"♥".repeat(lives)}
            </span>
          </div>
        </div>
      </div>

      {gameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="p-10 border-2 border-red-500/50 bg-black/60 rounded-3xl text-center shadow-[0_0_50px_rgba(239,68,68,0.4)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 mb-2 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-tighter relative z-10">
              GAME OVER
            </h1>
            <p className="text-4xl text-gray-300 mb-10 font-light tracking-wide relative z-10">
              Final Score: <span className="text-white font-bold">{score}</span>
            </p>
            <button
              onClick={startGame}
              className="relative z-10 px-12 py-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold rounded-xl text-2xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_40px_rgba(220,38,38,0.8)] hover:-translate-y-1 active:scale-95 border border-red-400/30"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
          {areScriptsLoaded ? (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-12 bg-black/80 rounded-2xl border border-white/10 text-center max-w-xl shadow-2xl">
                <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-8 drop-shadow-sm tracking-tighter loading-none">
                  HAND SLICER
                </h1>
                <div className="space-y-4 mb-10 text-lg text-gray-300 font-light">
                  <p>
                    Use your{" "}
                    <span className="text-cyan-400 font-bold glow-cyan">
                      Index Finger
                    </span>{" "}
                    to slice the{" "}
                    <span className="text-green-400 font-bold glow-green">
                      Green Orbs
                    </span>
                    .
                  </p>
                  <p>
                    Avoid the{" "}
                    <span className="text-red-500 font-bold glow-red">
                      Red Killers
                    </span>{" "}
                    at all costs.
                  </p>
                  <p className="text-sm text-gray-500 pt-4 border-t border-gray-800">
                    Supports Single & Dual Hand Tracking
                  </p>
                </div>

                <button
                  onClick={startGame}
                  className="group relative inline-flex items-center justify-center px-10 py-5 overflow-hidden font-bold text-white rounded-full bg-cyan-600 shadow-[0_0_20px_rgba(8,145,178,0.5)] transition-all duration-300 hover:bg-cyan-500 hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] hover:scale-105 active:scale-95"
                >
                  <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-72 group-hover:h-72 opacity-10"></span>
                  <span className="relative text-2xl tracking-widest">
                    START MISSION
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping"></div>
                <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-cyan-400 text-xl font-mono tracking-widest animate-pulse">
                INITIALIZING SYSTEMS...
              </p>
            </div>
          )}
        </div>
      )}

      <video ref={videoRef} className="hidden" playsInline></video>

      {/* Cyberpunk Frame around Canvas */}
      <div className="relative p-1 rounded-3xl bg-gradient-to-b from-gray-800 to-gray-900 shadow-2xl overflow-hidden group">
        {/* Animated Glow Border */}
        <div
          className={`absolute -inset-[2px] rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-xy ${isBuffActive ? "bg-gradient-to-r from-violet-500 via-yellow-400 to-violet-500" : "bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500"}`}
        ></div>

        <div className="relative rounded-[22px] overflow-hidden bg-black border-4 border-gray-900 shadow-inner">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="block max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain"
          ></canvas>

          {/* Corner Accents */}
          <div
            className={`absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 rounded-tl-xl pointer-events-none transition-colors duration-500 ${isBuffActive ? "border-yellow-500/50" : "border-cyan-500/50"}`}
          ></div>
          <div
            className={`absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 rounded-tr-xl pointer-events-none transition-colors duration-500 ${isBuffActive ? "border-violet-500/50" : "border-purple-500/50"}`}
          ></div>
          <div
            className={`absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 rounded-bl-xl pointer-events-none transition-colors duration-500 ${isBuffActive ? "border-yellow-500/50" : "border-cyan-500/50"}`}
          ></div>
          <div
            className={`absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 rounded-br-xl pointer-events-none transition-colors duration-500 ${isBuffActive ? "border-violet-500/50" : "border-purple-500/50"}`}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default HandTrackingGame;
