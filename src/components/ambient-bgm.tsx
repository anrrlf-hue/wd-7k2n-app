"use client";

import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "saju-bgm-muted";

export function AmbientBgm() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1");
  const [started, setStarted] = useState(false);

  useEffect(() => {

    const audio = new Audio("/audio/wealth-ambient.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = muted ? 0 : pathname === "/" ? 0.18 : pathname === "/diagnosis" ? 0.12 : 0.07;
    const id = window.setInterval(() => {
      const delta = target - audio.volume;
      if (Math.abs(delta) < 0.004) {
        audio.volume = target;
        window.clearInterval(id);
      } else {
        audio.volume = Math.max(0, Math.min(1, audio.volume + Math.sign(delta) * 0.004));
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [muted, pathname]);

  useEffect(() => {
    function startAudio() {
      if (muted || started || !audioRef.current) return;
      void audioRef.current.play().then(() => setStarted(true)).catch(() => undefined);
    }
    document.addEventListener("pointerdown", startAudio, { once: true });
    document.addEventListener("keydown", startAudio, { once: true });
    return () => {
      document.removeEventListener("pointerdown", startAudio);
      document.removeEventListener("keydown", startAudio);
    };
  }, [muted, started]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !started) return;
    const current = audio;
    function handleVisibility() {
      if (document.hidden) {
        current.pause();
        return;
      }
      if (!muted) void current.play().catch(() => undefined);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [muted, started]);

  function toggle() {
    const audio = audioRef.current;
    const next = !muted;
    setMuted(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    if (!audio) return;
    if (next) {
      audio.pause();
      audio.volume = 0;
      return;
    }
    void audio.play().then(() => setStarted(true)).catch(() => undefined);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "배경음악 켜기" : "배경음악 끄기"}
      title={muted ? "배경음악 켜기" : "배경음악 끄기"}
      className="bgm-toggle"
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
