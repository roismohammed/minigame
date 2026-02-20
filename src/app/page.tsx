import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 font-sans relative overflow-hidden">
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="z-10 text-center space-y-12">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_30px_rgba(147,51,234,0.5)] tracking-tighter">
          ARCADE PROTOCOL
        </h1>

        <p className="text-gray-400 text-xl tracking-widest uppercase font-light">
          Select Your Mission
        </p>

        <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto px-4">
          {/* Hand Slicer Card */}
          <Link href="/hand-slicer" className="group relative block p-1">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-black/80 border border-white/10 rounded-2xl p-8 hover:bg-black/60 transition-colors duration-300 flex items-center gap-8 overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-cyan-500/10 to-transparent"></div>

              <div className="flex-1 text-left">
                <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  HAND SLICER
                </h2>
                <p className="text-gray-400">
                  Use your hands to slice incoming orbs. Avoid the red killers!
                </p>
              </div>

              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Hand Rhythm Card */}
          <Link href="/hand-rhythm" className="group relative block p-1">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-black/80 border border-white/10 rounded-2xl p-8 hover:bg-black/60 transition-colors duration-300 flex items-center gap-8 overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-purple-500/10 to-transparent"></div>

              <div className="flex-1 text-left">
                <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  HAND RHYTHM
                </h2>
                <p className="text-gray-400">
                  Beat detection rhythm game. Hit circles in sync with the
                  music!
                </p>
              </div>

              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-gray-500 text-sm font-mono">
        SYSTEM STATUS: ONLINE
      </div>
    </main>
  );
}
