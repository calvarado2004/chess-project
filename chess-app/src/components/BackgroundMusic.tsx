import { useEffect, useRef, useState, useCallback } from 'react';

// Calm background jazz that loops. Plays by default; browsers (and especially
// iOS/native WebViews) block autoplay with sound until the first user gesture,
// so we fall back to starting playback on the first interaction. The mute
// preference is remembered across sessions.

const MUSIC_SRC = '/chess-music.m4a';
const MUTE_KEY = 'chess-music-muted';
const VOLUME = 0.35;

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(loadMuted);

  // Try to play; if the browser blocks autoplay, start on the first gesture.
  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        const start = () => {
          audioRef.current?.play().catch(() => {});
          window.removeEventListener('pointerdown', start);
          window.removeEventListener('keydown', start);
          window.removeEventListener('touchstart', start);
        };
        window.addEventListener('pointerdown', start, { once: true });
        window.addEventListener('keydown', start, { once: true });
        window.addEventListener('touchstart', start, { once: true });
      });
    }
  }, []);

  // On mount: configure the element and begin playback unless muted.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;
    audio.loop = true;
    if (!muted) tryPlay();
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      const audio = audioRef.current;
      if (audio) {
        if (next) {
          audio.pause();
        } else {
          audio.volume = VOLUME;
          tryPlay();
        }
      }
      return next;
    });
  }, [tryPlay]);

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} preload="auto" loop />
      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? 'Unmute background music' : 'Mute background music'}
        title={muted ? 'Play music' : 'Mute music'}
        style={{
          position: 'fixed',
          right: '16px',
          bottom: '16px',
          zIndex: 2000,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1px solid #45475a',
          background: '#1e1e2eee',
          color: '#cdd6f4',
          fontSize: '20px',
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          padding: 0,
        }}
      >
        {muted ? '🔇' : '🎵'}
      </button>
    </>
  );
}
