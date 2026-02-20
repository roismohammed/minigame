import HandRhythmGame from "@/components/HandRhythmGame";

export const metadata = {
  title: "Hand Rhythm - Osu! Inspired Hand Tracking Game",
  description: "Play rhythm game using hand tracking with MediaPipe Hands",
};

export default function HandRhythmPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <HandRhythmGame />
    </main>
  );
}
