import { useRef, useState, useEffect } from 'react';
import { FaPause, FaPlay, FaVolumeUp, FaChevronDown, FaStepForward, FaStepBackward } from 'react-icons/fa';
import { FiMusic } from 'react-icons/fi';

const TRACKS = [
  {
    title: 'Super Shy',
    src: '/music/Super Shy - Newjeans (Remix).mp3',
    cover: '/images/polaroids/IMG_0942.webp',
  },
  {
    title: 'WARR',
    src: '/music/dean-warr.mp3',
    cover: '/images/polaroids/IMG_7390.webp',
  },
];
const DEFAULT_COVER = '/images/music/default.jpg';

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [minimized, setMinimized] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);

  // Persist state across page changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('musicPlayer');
      if (saved) {
        const { minimized, playing, volume, currentTrack } = JSON.parse(saved);
        setMinimized(minimized);
        setPlaying(false); // Don't auto-play on mount
        setVolume(volume);
        setCurrentTrack(currentTrack);
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'musicPlayer',
        JSON.stringify({ minimized, playing, volume, currentTrack })
      );
    }
  }, [minimized, playing, volume, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (playing && userInteracted) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing, currentTrack, volume, userInteracted]);

  // Keep audio playing when minimized
  useEffect(() => {
    // No-op: audio element is always mounted, so playback persists
  }, [minimized]);

  const handlePlayPause = () => {
    setUserInteracted(true);
    setPlaying((p) => !p);
  };
  const handleTrackSelect = (idx) => {
    setCurrentTrack(idx);
    setUserInteracted(true);
    setPlaying(true);
  };
  const handleVolume = (e) => setVolume(Number(e.target.value));
  const handleNext = () => {
    setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
    setUserInteracted(true);
    setPlaying(true);
  };
  const handlePrev = () => {
    setCurrentTrack((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setUserInteracted(true);
    setPlaying(true);
  };

  // Animation for minimized player
  const ringClass = playing ? 'animate-music-pulse' : '';

  // Animated bars for expanded player
  const AnimatedBars = () => (
    <div className="flex gap-1 items-end h-6 ml-2">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`w-1 rounded bg-white ${playing ? `animate-bar${n}` : ''}`}
          style={{ height: 16 + n * 4 }}
        />
      ))}
      <style>{`
        @keyframes music-pulse {
          0% { box-shadow: 0 0 0 0 #F9C2D980; }
          70% { box-shadow: 0 0 0 10px #F9C2D900; }
          100% { box-shadow: 0 0 0 0 #F9C2D900; }
        }
        .animate-music-pulse {
          animation: music-pulse 1.2s infinite;
        }
        @keyframes bar1 { 0%,100%{height:24px} 50%{height:12px} }
        @keyframes bar2 { 0%,100%{height:20px} 50%{height:28px} }
        @keyframes bar3 { 0%,100%{height:28px} 50%{height:16px} }
        @keyframes bar4 { 0%,100%{height:16px} 50%{height:32px} }
        .animate-bar1 { animation: bar1 1s infinite; }
        .animate-bar2 { animation: bar2 1s infinite; }
        .animate-bar3 { animation: bar3 1s infinite; }
        .animate-bar4 { animation: bar4 1s infinite; }
        .marquee {
          width: 120px;
          overflow: hidden;
          white-space: nowrap;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
        .marquee span {
          display: inline-block;
          padding-left: 100%;
          animation: marquee 5s linear infinite;
          font-size: 1rem;
          color: #fff;
          font-family: Poppins, Arial, Helvetica, sans-serif;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );

  const cover = TRACKS[currentTrack].cover || DEFAULT_COVER;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Audio element always mounted for persistent playback */}
      <audio ref={audioRef} src={TRACKS[currentTrack].src} loop />
      {minimized ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Floating pill with scrolling text */}
          {playing && (
            <div
              className="minimized-pill"
              style={{
                background: 'linear-gradient(90deg, #F9C2D9 60%, #E8D4F1 100%)',
                color: '#fff',
                borderRadius: 9999,
                padding: '8px 24px',
                fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
                fontWeight: 600,
                fontSize: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                position: 'relative',
                minWidth: 120,
                maxWidth: 180,
                overflow: 'hidden',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <div className="marquee-pill" style={{ width: 140, overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}>
                <span style={{ display: 'inline-block', paddingLeft: 40, animation: 'marquee-pill 6s linear infinite' }}>
                  {TRACKS[currentTrack].title + '   '}
                </span>
                <style>{`
                  @keyframes marquee-pill {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                  }
                `}</style>
              </div>
            </div>
          )}
          <button
            aria-label="Open music player"
            onClick={() => setMinimized(false)}
            className={`relative flex items-center justify-center ${ringClass}`}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F9C2D9 60%, #E8D4F1 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              border: 'none',
              color: '#fff',
              fontSize: 36,
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
              overflow: 'hidden',
            }}
          >
            <FiMusic style={{ strokeWidth: 1.5, zIndex: 2, position: 'relative' }} />
          </button>
        </div>
      ) : (
        <div
          style={{
            width: 320,
            background: 'linear-gradient(135deg, #F9C2D9 60%, #E8D4F1 100%)',
            borderRadius: 32,
            boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
            padding: 24,
            color: '#fff',
            fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <button
            aria-label="Minimize music player"
            onClick={() => setMinimized(true)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            <FaChevronDown />
          </button>
          <div className="flex flex-col items-center mb-2">
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <img
                src={cover}
                alt="cover"
                className="w-16 h-16 object-cover rounded-2xl border-4 border-white shadow"
                draggable={false}
                onError={e => { e.target.src = DEFAULT_COVER; }}
              />
              {playing && <span className="absolute left-1/2 top-1/2 animate-music-pulse" style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: '2px solid #F9C2D9',
                transform: 'translate(-50%,-50%)',
                zIndex: 0,
                pointerEvents: 'none',
                boxShadow: '0 0 0 0 #F9C2D980',
              }} />}
            </div>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4, marginTop: 8 }}>
              {TRACKS[currentTrack].title}
            </div>
            <AnimatedBars />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <button
              aria-label="Previous"
              onClick={handlePrev}
              style={{
                background: '#fff',
                color: '#F9C2D9',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                cursor: 'pointer',
              }}
            >
              <FaStepBackward />
            </button>
            <button
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={handlePlayPause}
              style={{
                background: '#fff',
                color: '#F9C2D9',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                cursor: 'pointer',
              }}
            >
              {playing ? <FaPause /> : <FaPlay />}
            </button>
            <button
              aria-label="Next"
              onClick={handleNext}
              style={{
                background: '#fff',
                color: '#F9C2D9',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                cursor: 'pointer',
              }}
            >
              <FaStepForward />
            </button>
            <FaVolumeUp />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
              style={{ width: 80 }}
            />
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Tracks</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {TRACKS.map((track, idx) => (
                <li key={track.src} style={{ marginBottom: 4 }}>
                  <button
                    onClick={() => handleTrackSelect(idx)}
                    style={{
                      background: idx === currentTrack ? '#fff' : 'rgba(255,255,255,0.2)',
                      color: idx === currentTrack ? '#F9C2D9' : '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '4px 12px',
                      fontWeight: idx === currentTrack ? 700 : 400,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <img
                      src={track.cover || DEFAULT_COVER}
                      alt="cover"
                      className="w-6 h-6 object-cover rounded-md border border-white"
                      style={{ flexShrink: 0 }}
                      draggable={false}
                      onError={e => { e.target.src = DEFAULT_COVER; }}
                    />
                    {track.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 