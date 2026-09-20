"use client";

import { useEffect, useRef, useState } from "react";

export function AmbientBgm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const audio = new Audio("/audio/ambient-cinematic-atlasaudio.mp3");
    audio.loop = true;
    audio.preload = "metadata";
    audio.volume = 0.06;
    audio.muted = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
    };
  }, []);

  function toggleMute() {
    const audio = audioRef.current;
    const next = !muted;
    setMuted(next);
    if (!audio) return;
    audio.muted = next;
    if (!next) void audio.play().catch(() => undefined);
  }

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? "배경음악 켜기" : "배경음악 끄기"}
      title={muted ? "배경음악 켜기" : "배경음악 끄기"}
      className="fixed right-4 bottom-4 z-50 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-sm shadow-lg backdrop-blur"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
