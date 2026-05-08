'use client';

import React, { useState, useEffect } from 'react';
import { 
  MediaPlayer, 
  MediaOutlet, 
  useMediaStore, 
  useMediaRemote,
  useMediaPlayer
} from '@vidstack/react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  SkipForward, Settings, Loader2
} from 'lucide-react';

interface PremiumPlayerProps {
  src: string;
  title: string;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  initialProgress?: number;
  onProgressPulse?: (currentTime: number, isCompleted: boolean) => void;
}

export default function PremiumPlayer({
  src,
  title,
  introStart = 0,
  introEnd = 0,
  outroStart = 0,
  outroEnd = 0,
  initialProgress = 0,
  onProgressPulse
}: PremiumPlayerProps) {
  return (
    <div className="relative aspect-video w-full rounded-[4px] overflow-hidden border border-zinc-900/60 bg-black shadow-2xl group select-none">
      <MediaPlayer
        src={src}
        title={title}
        aspectRatio="16/9"
        load="visible"
        playsInline
        crossOrigin="anonymous"
        currentTime={initialProgress}
        onProviderSetup={(provider: any) => {
          if (provider.type === 'hls') {
            provider.library = Hls;
            provider.config = {
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              maxBufferSize: 60 * 1000 * 1000,
            };
          }
        }}
        className="w-full h-full"
      >
        <MediaOutlet className="w-full h-full object-contain" />
        
        {/* Render custom controls inside the player context */}
        <CustomControls 
          introStart={introStart}
          introEnd={introEnd}
          outroStart={outroStart}
          outroEnd={outroEnd}
          onProgressPulse={onProgressPulse}
        />
      </MediaPlayer>
    </div>
  );
}

interface CustomControlsProps {
  introStart: number;
  introEnd: number;
  outroStart: number;
  outroEnd: number;
  onProgressPulse?: (currentTime: number, isCompleted: boolean) => void;
}

function CustomControls({
  introStart,
  introEnd,
  outroStart,
  outroEnd,
  onProgressPulse
}: CustomControlsProps) {
  const remote = useMediaRemote();
  const player = useMediaPlayer();

  // Subscribe to Vidstack player states using useMediaStore
  const { 
    paused = true, 
    currentTime = 0, 
    duration = 0, 
    volume = 0.8, 
    muted = false, 
    fullscreen = false, 
    waiting = false 
  } = useMediaStore();

  // UI Local States
  const [showIntroSkip, setShowIntroSkip] = useState(false);
  const [showOutroSkip, setShowOutroSkip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('Auto');

  // Dynamic Skip buttons logic
  useEffect(() => {
    setShowIntroSkip(currentTime >= introStart && currentTime <= introEnd && introEnd > introStart);
    setShowOutroSkip(currentTime >= outroStart && currentTime <= outroEnd && outroEnd > outroStart);
  }, [currentTime, introStart, introEnd, outroStart, outroEnd]);

  // Periodic watch progress pulse (Every 10 seconds of active playing)
  useEffect(() => {
    if (paused || duration === 0) return;

    const interval = setInterval(() => {
      if (onProgressPulse) {
        const isCompleted = currentTime >= duration - 30; // Within 30 seconds of video end
        onProgressPulse(currentTime, isCompleted);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [paused, currentTime, duration, onProgressPulse]);

  // Keyboard Shortcuts for skip buttons
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName;
      if (activeEl === 'INPUT' || activeEl === 'TEXTAREA') return;

      if ((e.key === 's' || e.key === 'S') && showIntroSkip) {
        handleSkipIntro();
      }
      if ((e.key === 'e' || e.key === 'E') && showOutroSkip) {
        handleSkipOutro();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIntroSkip, showOutroSkip]);

  const togglePlay = () => {
    if (paused) {
      remote.play();
    } else {
      remote.pause();
    }
  };

  const handleSkipIntro = () => {
    remote.seek(introEnd);
    setShowIntroSkip(false);
  };

  const handleSkipOutro = () => {
    remote.seek(outroEnd);
    setShowOutroSkip(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    remote.changeVolume(val);
    if (val > 0 && muted) {
      remote.unmute();
    }
  };

  const toggleMute = () => {
    if (muted) {
      remote.unmute();
    } else {
      remote.mute();
    }
  };

  const changeSpeed = (speed: number) => {
    remote.changePlaybackRate(speed);
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* 1. Large Hover Central Play/Pause Trigger Zone */}
      <div 
        onClick={togglePlay}
        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-black/10 group-hover:bg-black/35 transition-all duration-300"
      >
        {/* Buffering/Loading Spinner */}
        {waiting && (
          <div className="absolute p-4 rounded-full bg-black/60 backdrop-blur-md shadow-2xl border border-violet-500/20">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          </div>
        )}

        {/* Large Central Pause icon on active hover */}
        {!waiting && (
          <div className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 p-5 rounded-full bg-black/55 backdrop-blur-sm border border-white/10 hover:border-violet-500/30 hover:scale-110 active:scale-90 transition-all duration-300 shadow-2xl">
            {paused ? (
              <Play className="w-8 h-8 fill-white text-white translate-x-0.5" />
            ) : (
              <Pause className="w-8 h-8 fill-white text-white" />
            )}
          </div>
        )}
      </div>

      {/* 2. Floating skip intro/outro actions */}
      {showIntroSkip && (
        <button
          onClick={handleSkipIntro}
          className="absolute bottom-24 left-8 z-20 flex items-center gap-2 py-2.5 px-5 rounded-[4px] bg-[#0c0c10]/85 border border-violet-500/40 text-white font-extrabold font-sans text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-600 hover:border-violet-400 active:scale-95 transition-all duration-200 animate-pulse cursor-pointer outline-none"
        >
          <SkipForward className="w-3.5 h-3.5" />
          BỎ QUA GIỚI THIỆU (S)
        </button>
      )}

      {showOutroSkip && (
        <button
          onClick={handleSkipOutro}
          className="absolute bottom-24 right-8 z-20 flex items-center gap-2 py-2.5 px-5 rounded-[4px] bg-[#0c0c10]/85 border border-violet-500/40 text-white font-extrabold font-sans text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-600 hover:border-violet-400 active:scale-95 transition-all duration-200 animate-pulse cursor-pointer outline-none"
        >
          <SkipForward className="w-3.5 h-3.5" />
          BỎ QUA KẾT THÚC (E)
        </button>
      )}

      {/* 3. Bottom Glassmorphic Control Bar */}
      <div 
        className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-12 flex flex-col gap-4 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-350"
        onClick={(e) => e.stopPropagation()} // Prevent trigger play/pause when clicking controls
      >
        {/* Timeline Slider with buffer and hover glow */}
        <div className="relative group/timeline w-full flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => remote.seek(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/15 rounded-md appearance-none cursor-pointer accent-violet-500 hover:h-1.5 hover:accent-violet-400 transition-all outline-none"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.15) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.15) 100%)`
            }}
          />
        </div>

        {/* Action Controls and Settings bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* Play Button */}
            <button 
              onClick={togglePlay} 
              className="p-2 rounded-[4px] bg-white/5 border border-white/10 hover:bg-violet-600 hover:border-violet-400 text-white cursor-pointer transition-all outline-none"
            >
              {paused ? (
                <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
              ) : (
                <Pause className="w-4 h-4 fill-white text-white" />
              )}
            </button>

            {/* Volume control block */}
            <div className="flex items-center gap-2 group/volume">
              <button 
                onClick={toggleMute}
                className="p-2 rounded-[4px] bg-transparent border-0 text-zinc-400 hover:text-white cursor-pointer outline-none transition-colors"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-violet-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-16 h-1 bg-white/20 appearance-none rounded-lg accent-violet-500 cursor-pointer outline-none transition-all duration-300"
              />
            </div>

            {/* Time Indicators */}
            <span className="text-[11px] text-zinc-300 font-bold font-mono tracking-wider">
              {formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Settings trigger */}
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-[4px] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all outline-none flex items-center gap-1.5 ${showSettings ? 'text-violet-400 border-violet-500/40 bg-violet-500/10' : 'text-zinc-400 hover:text-white'}`}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Glassmorphic Settings menu popup */}
              {showSettings && (
                <div className="absolute bottom-11 right-0 w-48 bg-[#0c0c10]/95 backdrop-blur-md border border-zinc-900 rounded-[4px] p-2.5 flex flex-col gap-2.5 shadow-2xl z-30 select-none">
                  {/* Quality Settings Section */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest pl-1.5 pb-1">Chất lượng</span>
                    {['Auto', '1080p Ultra-HD', '720p HD', '480p SD'].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setQuality(q);
                          setShowSettings(false);
                        }}
                        className={`text-left px-2 py-1 text-[10px] font-bold rounded-[2px] cursor-pointer outline-none border-0 transition-colors ${quality === q ? 'bg-violet-600 text-white' : 'bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-zinc-900 my-0.5"></div>

                  {/* Playback speed section */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest pl-1.5 pb-1">Tốc độ phát</span>
                    {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`text-left px-2 py-1 text-[10px] font-bold rounded-[2px] cursor-pointer outline-none border-0 transition-colors ${playbackSpeed === speed ? 'bg-violet-600 text-white' : 'bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        {speed === 1 ? 'Bình thường' : `${speed}x`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button 
              onClick={() => {
                if (fullscreen) {
                  remote.exitFullscreen();
                } else {
                  remote.enterFullscreen();
                }
              }} 
              className="p-2 rounded-[4px] bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-all outline-none"
            >
              {fullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
