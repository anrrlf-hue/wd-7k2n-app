"use client";

import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { shouldStartAmbientAudio } from "@/lib/ambient-bgm-policy";

const STORAGE_KEY = "saju-bgm-muted";

function volumeForPath(pathname: string) {
  return pathname === "/" ? 0.32 : pathname === "/diagnosis" ? 0.22 : 0.12;
}

export function AmbientBgm() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && started && !muted) audio.volume = volumeForPath(pathname);
  }, [muted, pathname, started]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  function toggle() {
    if (started && !muted) {
      setMuted(true);
      localStorage.setItem(STORAGE_KEY, "1");
      audioRef.current?.pause();
      return;
    }

    const nextMuted = false;
    if (!shouldStartAmbientAudio({ userInitiated: true, muted: nextMuted })) return;
    const audio = audioRef.current ?? new Audio("/audio/wealth-ambient.mp3");
    if (!audioRef.current) {
      audio.loop = true;
      audio.preload = "metadata";
      audioRef.current = audio;
    }
    audio.volume = volumeForPath(pathname);
    setMuted(false);
    localStorage.setItem(STORAGE_KEY, "0");
    void audio.play().then(() => setStarted(true)).catch(() => {
      audio.pause();
      setMuted(true);
      localStorage.setItem(STORAGE_KEY, "1");
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={started && !muted ? "배경음악 끄기" : "배경음악 켜기"}
      title={started && !muted ? "배경음악 끄기" : "배경음악 켜기"}
      className="bgm-toggle"
    >
      {started && !muted ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
