'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MediaPlayer, 
  MediaOutlet, 
  useMediaStore, 
  useMediaRemote
} from '@vidstack/react';
import Hls from 'hls.js';
import 'vidstack/styles/base.css';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  SkipForward, SkipBack, Settings, Loader2, Sparkles
} from 'lucide-react';

interface PremiumPlayerProps {
  src: string;
  videoUrl4k?: string | null;
  isVipOnly?: boolean;
  title: string;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  initialProgress?: number;
  onProgressPulse?: (currentTime: number, isCompleted: boolean) => void;
  // Real-time watch party sync callbacks
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playerRef?: React.RefObject<any>;
  onEnded?: () => void;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  isWatchParty?: boolean;
}

function formatResumeTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h} giờ ${m} phút ${s} giây`;
  }
  if (m > 0) {
    return `${m} phút ${s} giây`;
  }
  return `${s} giây`;
}

export default function PremiumPlayer({
  src,
  videoUrl4k,
  title,
  introStart = 0,
  introEnd = 0,
  outroStart = 0,
  outroEnd = 0,
  initialProgress = 0,
  onProgressPulse,
  onPlay,
  onPause,
  onSeek,
  playerRef,
  onEnded,
  onPrevEpisode,
  onNextEpisode,
  isWatchParty = false
}: PremiumPlayerProps) {
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '4K'>('1080p');
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Consolidate player refs to support both external forwarding and local control
  const localPlayerRef = useRef<any>(null);
  const activePlayerRef = playerRef || localPlayerRef;

  // Load selected quality from localStorage on mount (hydration-safe)
  useEffect(() => {
    const saved = localStorage.getItem('donghua3d_selected_quality');
    if (saved === '1080p' || saved === '4K') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedQuality(saved);
    }
  }, []);

  // Show Resume Prompt if initialProgress is significant and not in a Watch Party
  useEffect(() => {
    if (initialProgress > 10 && !isWatchParty) {
      setShowResumePrompt(true);
    }
  }, [initialProgress, isWatchParty]);

  const handleResume = () => {
    if (activePlayerRef.current) {
      activePlayerRef.current.currentTime = initialProgress;
      activePlayerRef.current.play().catch((err: any) => {
        console.warn('Auto-play blocked or play failed:', err);
      });
    }
    setShowResumePrompt(false);
  };

  const handleStartOver = () => {
    if (activePlayerRef.current) {
      activePlayerRef.current.currentTime = 0;
      activePlayerRef.current.play().catch((err: any) => {
        console.warn('Auto-play blocked or play failed:', err);
      });
    }
    setShowResumePrompt(false);
  };

  const handleSetQuality = (q: '1080p' | '4K') => {
    setSelectedQuality(q);
    localStorage.setItem('donghua3d_selected_quality', q);
  };

  // Compute active source dynamically
  const activeSrc = selectedQuality === '4K' && videoUrl4k ? videoUrl4k : src;

  // Determine if paywall should be shown
  const showVipOverlay = selectedQuality === '4K' && !videoUrl4k;

  return (
    <div className="relative aspect-video w-full rounded-[4px] overflow-hidden border border-zinc-900/60 bg-black shadow-2xl group select-none">
      <MediaPlayer
        ref={activePlayerRef}
        src={activeSrc}
        title={title}
        aspectRatio={16/9}
        load="visible"
        playsInline
        crossOrigin="anonymous"
        currentTime={initialProgress}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onSeeked={() => {
          if (onSeek && activePlayerRef?.current) {
            onSeek(activePlayerRef.current.currentTime);
          }
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          selectedQuality={selectedQuality}
          setSelectedQuality={handleSetQuality}
          videoUrl4k={videoUrl4k}
          onPrevEpisode={onPrevEpisode}
          onNextEpisode={onNextEpisode}
        />
      </MediaPlayer>

      {/* STUNNING GLASSMORPHIC VIP PAYWALL OVERLAY */}
      {showVipOverlay && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center bg-[#050508]/90 backdrop-blur-md transition-all duration-300">
          {/* Neon Purple Pulsing Shield or Star Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-violet-500/35 rounded-full blur-xl scale-125 animate-pulse"></div>
            <div className="relative p-5 rounded-full bg-gradient-to-tr from-amber-500 to-violet-600 border border-amber-300/30 shadow-[0_0_30px_rgba(139,92,246,0.5)]">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-violet-500 uppercase tracking-widest mb-3.5">
            Trải Nghiệm 4K Ultra-HD VIP
          </h2>
          
          <p className="text-zinc-300 text-xs md:text-sm max-w-lg leading-relaxed mb-8">
            Chất lượng hình ảnh siêu sắc nét 4K chỉ dành riêng cho các thành viên VIP của Donghua3D. 
            Bạn có thể tích lũy điểm uy tín bằng cách đóng góp đánh giá khách quan để kích hoạt VIP miễn phí!
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => {
                alert('Hệ thống thăng hạng VIP đang đồng bộ với ví & điểm uy tín của bạn!');
              }}
              className="px-6 py-3 rounded-[4px] bg-gradient-to-r from-amber-500 to-violet-600 text-xs font-black uppercase tracking-wider text-white border-0 cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95 transition-all outline-none"
            >
              Kích hoạt VIP / Nâng cấp ngay
            </button>

            <button
              onClick={() => setSelectedQuality('1080p')}
              className="px-6 py-3 rounded-[4px] bg-transparent border border-zinc-700 hover:border-zinc-500 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white cursor-pointer transition-all outline-none"
            >
              Quay lại 1080p Bản Thường
            </button>
          </div>
        </div>
      )}

      {/* STUNNING RESUME WATCH PROGRESS PROMPT OVERLAY */}
      {showResumePrompt && !showVipOverlay && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in select-none">
          <div className="p-6 md:p-8 bg-zinc-950/95 border border-violet-500/30 rounded-[4px] text-center max-w-sm w-full mx-4 shadow-[0_0_50px_rgba(139,92,246,0.35)] flex flex-col items-center">
            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute inset-0 bg-violet-500/25 rounded-full blur-xl scale-125 animate-pulse"></div>
              <div className="relative p-4 rounded-full bg-violet-600/10 border border-violet-500/20">
                <Sparkles className="w-8 h-8 text-violet-400" />
              </div>
            </div>

            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Xem Tiếp Tập Phim</h3>
            <p className="text-xs text-zinc-300 leading-relaxed mb-6">
              Bạn đang xem dở tập này tại <span className="text-violet-400 font-extrabold">{formatResumeTime(initialProgress)}</span>. Bạn có muốn xem tiếp từ vị trí này không?
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={handleResume}
                className="flex-grow py-3 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-[2px] cursor-pointer transition-all border-0 outline-none shadow-md hover:shadow-violet-600/30"
              >
                Xem tiếp
              </button>
              <button
                onClick={handleStartOver}
                className="flex-grow py-3 bg-transparent border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-[2px] cursor-pointer transition-all outline-none"
              >
                Xem từ đầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CustomControlsProps {
  introStart: number;
  introEnd: number;
  outroStart: number;
  outroEnd: number;
  onProgressPulse?: (currentTime: number, isCompleted: boolean) => void;
  selectedQuality: '1080p' | '4K';
  setSelectedQuality: (q: '1080p' | '4K') => void;
  videoUrl4k?: string | null;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
}

function CustomControls({
  introStart,
  introEnd,
  outroStart,
  outroEnd,
  onProgressPulse,
  selectedQuality,
  setSelectedQuality,
  videoUrl4k,
  onPrevEpisode,
  onNextEpisode
}: CustomControlsProps) {
  const remote = useMediaRemote();

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

  // Local State to track mouse inactivity for hiding cursor
  const [isMouseInactive, setIsMouseInactive] = useState(false);

  // Monitor mouse activity to auto-hide cursor in fullscreen mode
  useEffect(() => {
    if (!fullscreen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMouseInactive(false);
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = () => {
      setIsMouseInactive(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMouseInactive(true);
      }, 2500); // 2.5s of inactivity -> hide
    };

    window.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [fullscreen]);

  // Dynamically toggle cursor-none class on the parent media-player element
  useEffect(() => {
    const playerEl = document.querySelector('media-player');
    if (playerEl) {
      if (fullscreen && isMouseInactive) {
        playerEl.classList.add('cursor-none');
      } else {
        playerEl.classList.remove('cursor-none');
      }
    }
  }, [fullscreen, isMouseInactive]);

  // UI Local States (Only settings and speeds, skip states are computed on render!)
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Load saved playback speed from localStorage on mount (hydration-safe)
  useEffect(() => {
    const saved = localStorage.getItem('donghua3d_playback_speed');
    if (saved && remote) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlaybackSpeed(parsed);
        remote.changePlaybackRate(parsed);
      }
    }
  }, [remote]);

  // Compute Skip buttons visibility dynamically on render - ZERO state overhead, zero re-render loops!
  const showIntroSkip = currentTime >= introStart && currentTime <= introEnd && introEnd > introStart;
  const showOutroSkip = currentTime >= outroStart && currentTime <= outroEnd && outroEnd > outroStart;

  // Periodic watch progress pulse using a ref to prevent interval spamming and state loops
  const lastPulseRef = useRef<number>(0);

  useEffect(() => {
    if (paused || duration === 0) return;

    // Trigger pulse if 10 seconds of active playtime elapsed since the last pulse
    if (Math.abs(currentTime - lastPulseRef.current) >= 10) {
      lastPulseRef.current = currentTime;
      if (onProgressPulse) {
        const isCompleted = currentTime >= duration - 30; // Within 30 seconds of video end
        onProgressPulse(currentTime, isCompleted);
      }
    }
  }, [paused, currentTime, duration, onProgressPulse]);

  // Declared skipping functions with useCallback before useEffect keydown
  const handleSkipIntro = useCallback(() => {
    remote.seek(introEnd);
  }, [remote, introEnd]);

  const handleSkipOutro = useCallback(() => {
    remote.seek(outroEnd);
  }, [remote, outroEnd]);

  // Keyboard Shortcuts for skip buttons & general video controls (PC user enhancement)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName;
      if (activeEl === 'INPUT' || activeEl === 'TEXTAREA') return;

      switch (e.code) {
        // Spacebar: Toggle Play/Pause
        case 'Space':
          e.preventDefault();
          if (paused) {
            remote.play();
          } else {
            remote.pause();
          }
          break;

        // ArrowLeft: Seek back 10 seconds
        case 'ArrowLeft':
          e.preventDefault();
          remote.seek(Math.max(0, currentTime - 10));
          break;

        // ArrowRight: Seek forward 10 seconds
        case 'ArrowRight':
          e.preventDefault();
          remote.seek(Math.min(duration, currentTime + 10));
          break;

        // KeyM: Toggle Mute
        case 'KeyM':
          e.preventDefault();
          if (muted) {
            remote.unmute();
          } else {
            remote.mute();
          }
          break;

        // KeyF: Toggle Fullscreen
        case 'KeyF':
          e.preventDefault();
          if (fullscreen) {
            remote.exitFullscreen();
          } else {
            remote.enterFullscreen();
          }
          break;

        // ArrowUp: Increase volume 10%
        case 'ArrowUp':
          e.preventDefault();
          remote.changeVolume(Math.min(1, volume + 0.1));
          break;

        // ArrowDown: Decrease volume 10%
        case 'ArrowDown':
          e.preventDefault();
          remote.changeVolume(Math.max(0, volume - 0.1));
          break;

        // Intro skip (fallback 'S')
        case 'KeyS':
          if (showIntroSkip) {
            e.preventDefault();
            handleSkipIntro();
          }
          break;

        // Outro skip (fallback 'E')
        case 'KeyE':
          if (showOutroSkip) {
            e.preventDefault();
            handleSkipOutro();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paused, currentTime, duration, muted, fullscreen, volume, remote, showIntroSkip, showOutroSkip, handleSkipIntro, handleSkipOutro]);

  const togglePlay = () => {
    if (paused) {
      remote.play();
    } else {
      remote.pause();
    }
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
    localStorage.setItem('donghua3d_playback_speed', speed.toString());
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
            {/* Prev Episode Button */}
            <button 
              onClick={onPrevEpisode}
              disabled={!onPrevEpisode}
              className={`p-2 rounded-[4px] border transition-all outline-none ${onPrevEpisode ? 'bg-white/5 border-white/10 hover:bg-violet-600 hover:border-violet-400 text-white cursor-pointer' : 'bg-transparent border-zinc-900 text-zinc-700 cursor-not-allowed'}`}
              title="Tập trước"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play Button */}
            <button 
              onClick={togglePlay} 
              className="p-2.5 rounded-[4px] bg-violet-600 border border-violet-500 hover:bg-violet-700 hover:border-violet-600 text-white cursor-pointer transition-all outline-none shadow-md"
              title={paused ? "Phát" : "Tạm dừng"}
            >
              {paused ? (
                <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
              ) : (
                <Pause className="w-4 h-4 fill-white text-white" />
              )}
            </button>

            {/* Next Episode Button */}
            <button 
              onClick={onNextEpisode}
              disabled={!onNextEpisode}
              className={`p-2 rounded-[4px] border transition-all outline-none ${onNextEpisode ? 'bg-white/5 border-white/10 hover:bg-violet-600 hover:border-violet-400 text-white cursor-pointer' : 'bg-transparent border-zinc-900 text-zinc-700 cursor-not-allowed'}`}
              title="Tập tiếp theo"
            >
              <SkipForward className="w-4 h-4 fill-current" />
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
                    
                    {/* Free 1080p option */}
                    <button
                      onClick={() => {
                        setSelectedQuality('1080p');
                        setShowSettings(false);
                      }}
                      className={`text-left px-2.5 py-1.5 text-[10px] font-bold rounded-[2px] cursor-pointer outline-none border-0 transition-colors ${selectedQuality === '1080p' ? 'bg-violet-600 text-white' : 'bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      1080p Ultra-HD
                    </button>

                    {/* Premium 4K VIP option */}
                    <button
                      onClick={() => {
                        setSelectedQuality('4K');
                        setShowSettings(false);
                      }}
                      className={`text-left px-2.5 py-1.5 text-[10px] font-bold rounded-[2px] cursor-pointer outline-none border-0 transition-all flex items-center justify-between ${selectedQuality === '4K' ? 'bg-gradient-to-r from-amber-500 to-violet-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-transparent text-amber-400 hover:bg-white/5'}`}
                    >
                      <span>4K Ultra-HD VIP</span>
                      {!videoUrl4k && (
                        <span className="bg-amber-500/20 text-amber-300 text-[8px] px-1 rounded-[2px] border border-amber-400/20 font-black animate-pulse">
                          VIP
                        </span>
                      )}
                    </button>
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
