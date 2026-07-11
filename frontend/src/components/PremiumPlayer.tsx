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
  SkipForward, SkipBack, Settings, Loader2, Sparkles,
  Lightbulb, ToggleLeft, ToggleRight, List
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { danmakuApi, DanmakuPayload, authApi } from '../lib/api';

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
  movieId?: string;
  episodeId?: string;
  episodes?: { id: string; episodeNumber: number; title: string; }[];
  currentEpisodeNumber?: number;
  movieSlug?: string;
  sources?: { id: string; serverName: string; videoUrl: string }[];
  selectedServer?: string;
  onSelectServer?: (server: string) => void;
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
  isWatchParty = false,
  movieId,
  episodeId,
  episodes,
  currentEpisodeNumber,
  movieSlug,
  sources,
  selectedServer,
  onSelectServer
}: PremiumPlayerProps) {
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '4K'>('1080p');
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  // Real-time Danmaku States
  const [danmakus, setDanmakus] = useState<DanmakuPayload[]>([]);
  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState<boolean>(true);
  const [danmakuInput, setDanmakuInput] = useState<string>('');
  const [danmakuColor, setDanmakuColor] = useState<string>('#ffffff');
  const socketRef = useRef<Socket | null>(null);

  // Load Danmakus & Setup WebSocket Connection
  useEffect(() => {
    if (!episodeId) return;

    // Fetch initial list of danmakus via REST API
    async function loadDanmakus() {
      const res = await danmakuApi.getDanmakus(episodeId!);
      if (res.success && res.data) {
        setDanmakus(res.data);
      }
    }
    loadDanmakus();

    // Connect to WebSocket Server for Real-time broadcasts
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const ioUrl = socketUrl.replace('/api', '');
    const socket = io(ioUrl, {
      transports: ['websocket'],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.emit('join-episode', { episodeId });

    socket.on('new-danmaku', (newDan: DanmakuPayload) => {
      setDanmakus((prev) => [...prev, newDan]);
      // If danmaku color/text matches, we can also push to visible in real-time if player is playing
      // but adding to danmakus list ensures the next time update picks it up naturally.
    });

    return () => {
      socket.disconnect();
    };
  }, [episodeId]);

  // Prevent page scroll when cinema mode is active
  useEffect(() => {
    if (isCinemaMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCinemaMode]);

  // Consolidate player refs to support both external forwarding and local control
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localPlayerRef = useRef<any>(null);
  const activePlayerRef = playerRef || localPlayerRef;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remote = useMediaRemote();

  const showControls = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 2500);
  }, []);

  const handleMouseMove = useCallback(() => {
    showControls();
  }, [showControls]);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setIsControlsVisible(false);
    }
  }, [isPlaying]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const lastSrcRef = useRef<string>('');
  const pendingSeekRef = useRef<number | null>(null);
  const pendingPlayRef = useRef<boolean>(false);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowResumePrompt(true);
    }
  }, [initialProgress, isWatchParty]);

  const handleResume = () => {
    if (activePlayerRef.current) {
      activePlayerRef.current.currentTime = initialProgress;
      activePlayerRef.current.play().catch((err: unknown) => {
        console.warn('Auto-play blocked or play failed:', err);
      });
    }
    setShowResumePrompt(false);
  };

  const handleStartOver = () => {
    if (activePlayerRef.current) {
      activePlayerRef.current.currentTime = 0;
      activePlayerRef.current.play().catch((err: unknown) => {
        console.warn('Auto-play blocked or play failed:', err);
      });
    }
    setShowResumePrompt(false);
  };

  const handleSendDanmaku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!danmakuInput.trim()) return;

    const token = localStorage.getItem('donghua3d_token');
    if (!token) {
      alert('Vui lòng đăng nhập để gửi bình luận đạn bay (Danmaku)!');
      return;
    }

    try {
      const userRes = await authApi.getMe();
      if (!userRes.success || !userRes.data) {
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
        return;
      }
      
      const user = userRes.data;
      const player = activePlayerRef.current;
      const playhead = player ? player.currentTime : 0;

      const payload = {
        movieId: movieId || '',
        episodeId: episodeId || '',
        text: danmakuInput.trim(),
        time: playhead,
        color: danmakuColor,
        style: 'scroll'
      };

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send-danmaku', {
          ...payload,
          userId: user.id
        });
        
        // Optimistic local update
        const localDan: DanmakuPayload = {
          id: `local-${Date.now()}`,
          text: payload.text,
          time: payload.time,
          color: payload.color,
          style: payload.style,
          createdAt: new Date().toISOString(),
          user: {
            id: user.id,
            email: user.email
          }
        };
        setDanmakus((prev) => [...prev, localDan]);
      } else {
        const res = await danmakuApi.postDanmaku(payload);
        if (res.success && res.data) {
          setDanmakus((prev) => [...prev, res.data!]);
        }
      }

      setDanmakuInput('');
    } catch (err) {
      console.error('Error posting danmaku:', err);
    }
  };

  const handleSetQuality = (q: '1080p' | '4K') => {
    setSelectedQuality(q);
    localStorage.setItem('donghua3d_selected_quality', q);
  };

  // Compute active source dynamically
  const activeSrc = selectedQuality === '4K' && videoUrl4k ? videoUrl4k : src;

  // Monitor activeSrc changes to capture playhead state before reload
  useEffect(() => {
    if (lastSrcRef.current && activeSrc !== lastSrcRef.current) {
      if (activePlayerRef.current) {
        const time = activePlayerRef.current.currentTime;
        const isPlaying = !activePlayerRef.current.paused;
        if (time > 2) {
          pendingSeekRef.current = time;
          pendingPlayRef.current = isPlaying;
        }
      }
    }
    lastSrcRef.current = activeSrc;
  }, [activeSrc, activePlayerRef]);

  const handleLoadedMetadata = () => {
    // 1. Re-apply playback speed from localStorage or defaults
    const savedSpeed = localStorage.getItem('donghua3d_playback_speed');
    if (savedSpeed) {
      const parsed = parseFloat(savedSpeed);
      if (!isNaN(parsed)) {
        setTimeout(() => {
          if (activePlayerRef.current) {
            activePlayerRef.current.playbackRate = parsed;
          }
          remote.changePlaybackRate(parsed);
          console.log('Restored playback speed on metadata loaded:', parsed);
        }, 150);
      }
    }

    // 2. Re-apply volume & muted
    const savedVolume = localStorage.getItem('donghua3d_volume');
    if (savedVolume) {
      const v = parseFloat(savedVolume);
      if (!isNaN(v)) {
        setTimeout(() => {
          remote.changeVolume(v);
        }, 150);
      }
    }
    const savedMuted = localStorage.getItem('donghua3d_muted');
    if (savedMuted === 'true') {
      setTimeout(() => {
        remote.mute();
      }, 150);
    } else if (savedMuted === 'false') {
      setTimeout(() => {
        remote.unmute();
      }, 150);
    }

    // 3. Existing seek behavior
    if (pendingSeekRef.current !== null && activePlayerRef.current) {
      const targetTime = pendingSeekRef.current;
      const shouldPlay = pendingPlayRef.current;
      pendingSeekRef.current = null;
      
      // Delay slightly to ensure HLS engine is fully attached and seek is stable
      setTimeout(() => {
        if (activePlayerRef.current) {
          activePlayerRef.current.currentTime = targetTime;
          if (shouldPlay) {
            activePlayerRef.current.play().catch((err: unknown) => {
              console.warn('Playback resume failed:', err);
            });
          }
        }
      }, 200);
    }
  };

  // Determine if paywall should be shown
  const showVipOverlay = selectedQuality === '4K' && !videoUrl4k;

  return (
    <div className={`relative w-full transition-all duration-500 ${isCinemaMode ? 'fixed inset-0 z-[9999] bg-black flex items-center justify-center p-4 md:p-12 backdrop-blur-3xl' : ''}`}>
      {/* Cinema Backdrop Overlay */}
      {isCinemaMode && (
        <div 
          onClick={() => setIsCinemaMode(false)}
          className="absolute inset-0 bg-black/95 z-[-1] cursor-pointer"
          title="Nhấn bên ngoài để tắt chế độ rạp chiếu"
        />
      )}

      <div 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative aspect-video w-full rounded-[4px] overflow-hidden border border-zinc-900/60 bg-black shadow-2xl group select-none ${isCinemaMode ? 'max-w-7xl max-h-[85vh] border-violet-500/30 shadow-[0_0_80px_rgba(139,92,246,0.25)]' : ''} ${!isControlsVisible && isPlaying ? 'cursor-none' : ''}`}
      >
        <MediaPlayer
          ref={activePlayerRef}
          src={activeSrc}
          title={title}
          aspectRatio={16/9}
          load="visible"
          playsInline
          crossOrigin="anonymous"
          currentTime={initialProgress}
          onPlay={() => {
            setIsPlaying(true);
            showControls();
            if (onPlay) onPlay();
          }}
          onPause={() => {
            setIsPlaying(false);
            showControls();
            if (onPause) onPause();
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (onEnded) onEnded();
          }}
          onSeeked={() => {
            if (onSeek && activePlayerRef?.current) {
              onSeek(activePlayerRef.current.currentTime);
            }
          }}
          onLoadedMetadata={handleLoadedMetadata}
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

              let networkRetryCount = 0;
              let mediaRetryCount = 0;

              provider.onInstance((hlsInstance: Hls) => {
                networkRetryCount = 0;
                mediaRetryCount = 0;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                hlsInstance.on(Hls.Events.ERROR, (event: any, data: any) => {
                  if (data.fatal) {
                    switch (data.type) {
                      case Hls.ErrorTypes.NETWORK_ERROR:
                        if (networkRetryCount < 3) {
                          networkRetryCount++;
                          console.warn(`Fatal network error (${networkRetryCount}/3), recovering HLS...`, data);
                          hlsInstance.startLoad();
                        } else {
                          console.error('Fatal network error recovery exhausted 3 retries.', data);
                        }
                        break;
                      case Hls.ErrorTypes.MEDIA_ERROR:
                        if (mediaRetryCount < 3) {
                          mediaRetryCount++;
                          console.warn(`Fatal media error (${mediaRetryCount}/3), recovering HLS media...`, data);
                          hlsInstance.recoverMediaError();
                        } else {
                          console.error('Fatal media error recovery exhausted 3 retries.', data);
                        }
                        break;
                      default:
                        console.error('Fatal HLS error cannot be recovered:', data);
                        break;
                    }
                  }
                });
              });
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
            isCinemaMode={isCinemaMode}
            setIsCinemaMode={setIsCinemaMode}
            movieId={movieId}
            episodeId={episodeId}
            episodes={episodes}
            currentEpisodeNumber={currentEpisodeNumber}
            movieSlug={movieSlug}
            sources={sources}
            selectedServer={selectedServer}
            onSelectServer={onSelectServer}
            isDanmakuEnabled={isDanmakuEnabled}
            setIsDanmakuEnabled={setIsDanmakuEnabled}
            danmakus={danmakus}
            isControlsVisible={isControlsVisible}
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
      {/* REAL-TIME DANMAKU INPUT BAR */}
      {isDanmakuEnabled && !isWatchParty && (
        <form onSubmit={handleSendDanmaku} className="w-full flex items-center gap-2.5 p-3.5 mt-3 bg-[#0c0c10]/40 border border-zinc-900/60 rounded-[4px] backdrop-blur-md select-none shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span className="hidden sm:inline">Bình luận đạn</span>
          </div>
          <input
            type="text"
            placeholder="Gửi bình luận đạn chạy ngang màn hình..."
            value={danmakuInput}
            onChange={(e) => setDanmakuInput(e.target.value)}
            className="flex-grow px-3.5 py-2.5 bg-black/60 border border-zinc-850 hover:border-zinc-850 focus:border-violet-500/50 rounded-[4px] text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-all"
          />
          {/* Color picker styled neatly */}
          <div className="relative flex items-center bg-[#07070a] border border-zinc-850 rounded-[4px] p-1.5 hover:border-zinc-800 transition-colors">
            <input
              type="color"
              value={danmakuColor}
              onChange={(e) => setDanmakuColor(e.target.value)}
              className="w-6 h-6 rounded-[2px] cursor-pointer bg-transparent border-0 p-0"
              title="Chọn màu bình luận"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-[4px] border-0 cursor-pointer shadow-md shadow-violet-600/10 hover:shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 outline-none"
          >
            <span>Bắn</span>
          </button>
        </form>
      )}
      </div>
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
  isCinemaMode: boolean;
  setIsCinemaMode: (val: boolean) => void;
  movieId?: string;
  episodeId?: string;
  episodes?: { id: string; episodeNumber: number; title: string; }[];
  currentEpisodeNumber?: number;
  movieSlug?: string;
  sources?: { id: string; serverName: string; videoUrl: string }[];
  selectedServer?: string;
  onSelectServer?: (server: string) => void;
  isDanmakuEnabled: boolean;
  setIsDanmakuEnabled: (val: boolean) => void;
  danmakus: DanmakuPayload[];
  isControlsVisible: boolean;
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
  onNextEpisode,
  isCinemaMode,
  setIsCinemaMode,
  episodes,
  currentEpisodeNumber,
  movieSlug,
  sources,
  selectedServer,
  onSelectServer,
  isDanmakuEnabled,
  setIsDanmakuEnabled,
  danmakus,
  episodeId,
  isControlsVisible
}: CustomControlsProps) {
  const remote = useMediaRemote();

  interface VisibleDanmaku extends DanmakuPayload {
    top: number;
    idStr: string;
  }
  const [visibleDanmakus, setVisibleDanmakus] = useState<VisibleDanmaku[]>([]);
  const lastCheckedTimeRef = useRef<number>(-1);

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

  // Trigger danmakus at correct currentTime playback points
  useEffect(() => {
    if (paused || !isDanmakuEnabled || danmakus.length === 0) return;

    const currentSecond = Math.floor(currentTime);
    if (currentSecond === lastCheckedTimeRef.current) return;
    lastCheckedTimeRef.current = currentSecond;

    // Find danmakus matching this exact second
    const matches = danmakus.filter(
      (d) => Math.floor(d.time) === currentSecond
    );

    if (matches.length > 0) {
      setTimeout(() => {
        setVisibleDanmakus((prev) => {
          if (prev.length > 30) return prev; // Limit maximum concurrency to avoid overlay cluttering

          const newItems = matches.map((d, idx) => {
            // Assign track channel index (0 to 7) to avoid vertical text overlaps
            const top = (prev.length + idx) % 8;
            return {
              ...d,
              top,
              idStr: `${d.id}-${Date.now()}-${idx}`,
            };
          });

          return [...prev, ...newItems];
        });
      }, 0);
    }
  }, [currentTime, paused, danmakus, isDanmakuEnabled]);

  // Community & Interactive Toolbar Local States
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Mobile Double-Tap to Seek states
  const [showSeekVisual, setShowSeekVisual] = useState<'back' | 'forward' | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'back' | 'forward' } | null>(null);

  const handleMobileTouch = (e: React.TouchEvent, side: 'back' | 'forward') => {
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.side === side && now - lastTapRef.current.time < 320) {
      e.stopPropagation();
      e.preventDefault();
      // Double tap registered
      if (remote) {
        if (side === 'back') {
          remote.seek(Math.max(0, currentTime - 10));
        } else {
          remote.seek(Math.min(duration, currentTime + 10));
        }
        setShowSeekVisual(side);
        setTimeout(() => {
          setShowSeekVisual(null);
        }, 650);
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, side };
      setTimeout(() => {
        if (lastTapRef.current && lastTapRef.current.time === now) {
          lastTapRef.current = null;
        }
      }, 320);
    }
  };

  // Load saved configurations from localStorage when episode changes
  useEffect(() => {
    const savedSpeed = localStorage.getItem('donghua3d_playback_speed');
    if (savedSpeed && remote) {
      const parsed = parseFloat(savedSpeed);
      if (!isNaN(parsed)) {
        setPlaybackSpeed(parsed);
        remote.changePlaybackRate(parsed);
      }
    }

    const savedAutoSkip = localStorage.getItem('donghua3d_auto_skip_intro');
    if (savedAutoSkip === 'true') {
      setAutoSkipIntro(true);
    }

    const savedVolume = localStorage.getItem('donghua3d_volume');
    if (savedVolume && remote) {
      const v = parseFloat(savedVolume);
      if (!isNaN(v)) {
        remote.changeVolume(v);
      }
    }

    const savedMuted = localStorage.getItem('donghua3d_muted');
    if (savedMuted === 'true' && remote) {
      remote.mute();
    } else if (savedMuted === 'false' && remote) {
      remote.unmute();
    }
  }, [episodeId, remote]);

  // Declared skipping functions with useCallback before useEffect keydown
  const handleSkipIntro = useCallback(() => {
    remote.seek(introEnd);
  }, [remote, introEnd]);

  const handleSkipOutro = useCallback(() => {
    remote.seek(outroEnd);
  }, [remote, outroEnd]);

  // Auto-skip feature execution when enabled
  useEffect(() => {
    if (autoSkipIntro && currentTime >= introStart && currentTime <= introEnd && introEnd > introStart) {
      handleSkipIntro();
    }
  }, [currentTime, autoSkipIntro, introStart, introEnd, handleSkipIntro]);

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
            localStorage.setItem('donghua3d_muted', 'false');
          } else {
            remote.mute();
            localStorage.setItem('donghua3d_muted', 'true');
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
          {
            const newVol = Math.min(1, volume + 0.1);
            remote.changeVolume(newVol);
            localStorage.setItem('donghua3d_volume', newVol.toString());
            if (newVol > 0 && muted) {
              remote.unmute();
              localStorage.setItem('donghua3d_muted', 'false');
            }
          }
          break;

        // ArrowDown: Decrease volume 10%
        case 'ArrowDown':
          e.preventDefault();
          {
            const newVol = Math.max(0, volume - 0.1);
            remote.changeVolume(newVol);
            localStorage.setItem('donghua3d_volume', newVol.toString());
            if (newVol === 0) {
              remote.mute();
              localStorage.setItem('donghua3d_muted', 'true');
            }
          }
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
    localStorage.setItem('donghua3d_volume', val.toString());
    if (val > 0 && muted) {
      remote.unmute();
      localStorage.setItem('donghua3d_muted', 'false');
    }
    if (val === 0) {
      remote.mute();
      localStorage.setItem('donghua3d_muted', 'true');
    }
  };

  const toggleMute = () => {
    if (muted) {
      remote.unmute();
      localStorage.setItem('donghua3d_muted', 'false');
    } else {
      remote.mute();
      localStorage.setItem('donghua3d_muted', 'true');
    }
  };

  const changeSpeed = (speed: number) => {
    remote.changePlaybackRate(speed);
    setPlaybackSpeed(speed);
    localStorage.setItem('donghua3d_playback_speed', speed.toString());
    setShowSettings(false);
  };

  const handleToggleAutoSkip = () => {
    const newVal = !autoSkipIntro;
    setAutoSkipIntro(newVal);
    localStorage.setItem('donghua3d_auto_skip_intro', newVal.toString());
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* DANMAKU FLOATING OVERLAY LAYER */}
      {isDanmakuEnabled && (
        <div className="absolute inset-x-0 top-0 h-[70%] pointer-events-none overflow-hidden z-25">
          {visibleDanmakus.map((d) => (
            <div
              key={d.idStr}
              onAnimationEnd={() => {
                setVisibleDanmakus((prev) => prev.filter((x) => x.idStr !== d.idStr));
              }}
              className="animate-danmaku-scroll select-none pointer-events-none text-xs md:text-sm font-extrabold"
              style={{
                top: `${d.top * 32 + 16}px`, // Distribute vertically across tracks
                color: d.color,
                textShadow: '1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000'
              }}
            >
              {d.text}
            </div>
          ))}
        </div>
      )}

      {/* Mobile Double Tap Seek Zones (Touch Only) */}
      <div className="absolute inset-x-0 top-0 bottom-16 z-20 flex pointer-events-none md:hidden">
        <div 
          onTouchStart={(e) => handleMobileTouch(e, 'back')}
          className="w-1/3 h-full pointer-events-auto select-none"
        />
        <div className="w-1/3 h-full" />
        <div 
          onTouchStart={(e) => handleMobileTouch(e, 'forward')}
          className="w-1/3 h-full pointer-events-auto select-none"
        />
      </div>

      {/* Seek ripples indicators */}
      {showSeekVisual === 'back' && (
        <div className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none bg-violet-600/25 border border-violet-500/35 text-white text-[10px] font-black tracking-widest px-4 py-2.5 rounded-full flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-ping">
          <span className="uppercase">Tua lùi</span>
          <span>-10s</span>
        </div>
      )}
      {showSeekVisual === 'forward' && (
        <div className="absolute right-1/4 top-1/2 translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none bg-violet-600/25 border border-violet-500/35 text-white text-[10px] font-black tracking-widest px-4 py-2.5 rounded-full flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-ping">
          <span className="uppercase">Tua tiếp</span>
          <span>+10s</span>
        </div>
      )}

      {/* 1. Large Hover Central Play/Pause Trigger Zone */}
      <div 
        onClick={togglePlay}
        className={`absolute inset-0 z-10 flex items-center justify-center cursor-pointer transition-all duration-300 ${
          isControlsVisible || paused ? 'bg-black/35' : 'bg-transparent pointer-events-none'
        }`}
      >
        {/* Buffering/Loading Spinner */}
        {waiting && (
          <div className="absolute p-4 rounded-full bg-black/60 backdrop-blur-md shadow-2xl border border-violet-500/20 pointer-events-auto">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          </div>
        )}

        {/* Large Central Pause icon on active hover */}
        {!waiting && (
          <div className={`p-5 rounded-full bg-transparent hover:bg-black/55 backdrop-blur-sm border border-transparent hover:border-white/10 hover:scale-110 active:scale-90 transition-all duration-300 pointer-events-auto ${
            isControlsVisible || paused ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
          }`}>
            {paused ? (
              <Play className="w-8 h-8 fill-white text-white translate-x-0.5" />
            ) : (
              <Pause className="w-8 h-8 fill-white text-white" />
            )}
          </div>
        )}
      </div>

      {/* 2. Floating skip intro/outro actions */}
      {showIntroSkip && !autoSkipIntro && (
        <button
          onClick={handleSkipIntro}
          className={`absolute bottom-28 left-8 z-20 flex items-center gap-2 py-2.5 px-5 rounded-[4px] bg-[#0c0c10]/85 border border-violet-500/40 text-white font-extrabold font-sans text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-600 hover:border-violet-400 active:scale-95 transition-all duration-200 animate-pulse cursor-pointer outline-none transition-opacity duration-350 ${
            isControlsVisible || paused ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5" />
          Bỏ Qua Giới Thiệu (S)
        </button>
      )}

      {showOutroSkip && (
        <button
          onClick={handleSkipOutro}
          className={`absolute bottom-28 right-8 z-20 flex items-center gap-2 py-2.5 px-5 rounded-[4px] bg-[#0c0c10]/85 border border-violet-500/40 text-white font-extrabold font-sans text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-600 hover:border-violet-400 active:scale-95 transition-all duration-200 animate-pulse cursor-pointer outline-none transition-opacity duration-350 ${
            isControlsVisible || paused ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5" />
          Bỏ Qua Kết Thúc (E)
        </button>
      )}

      {/* 3. Bottom Glassmorphic Control Bar */}
      <div 
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-12 flex flex-col gap-4 transition-all duration-350 ${
          isControlsVisible || paused || showSettings || showEpisodes
            ? 'opacity-100 translate-y-0 visible' 
            : 'opacity-0 translate-y-3 invisible pointer-events-none'
        }`}
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
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4 md:gap-5 flex-1 justify-start">
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

          {/* Interactive Community Actions Block (Benchmarked vs Hoathinh3D) */}
          <div className="hidden lg:flex flex-1 justify-center pointer-events-none">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-[4px] backdrop-blur-md pointer-events-auto">

              {/* Auto Skip Toggle */}
              <button
                onClick={handleToggleAutoSkip}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white rounded-[2px] text-xs font-bold transition-all cursor-pointer outline-none border-0"
                title="Tự động tua qua nhạc dạo Intro/Outro"
              >
                <span>Auto-Skip</span>
                {autoSkipIntro ? (
                  <ToggleRight className="w-5 h-5 text-violet-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-zinc-500" />
                )}
              </button>

              <span className="text-zinc-700">|</span>

              {/* Cinema Light Toggle */}
              <button
                onClick={() => setIsCinemaMode(!isCinemaMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer outline-none border-0 ${isCinemaMode ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white'}`}
                title="Bật/tắt chế độ rạp chiếu (Tắt đèn)"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{isCinemaMode ? 'Bật đèn' : 'Tắt đèn'}</span>
              </button>

              <span className="text-zinc-700">|</span>

              {/* Danmaku Toggle */}
              <button
                onClick={() => setIsDanmakuEnabled(!isDanmakuEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer outline-none border-0 ${isDanmakuEnabled ? 'text-violet-400 bg-violet-500/10 border border-violet-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                title="Bật/tắt bình luận đạn bay (Danmaku)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Danmaku</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            {/* Episode List Trigger */}
            {episodes && episodes.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowEpisodes(!showEpisodes)}
                  className={`flex items-center gap-1.5 p-2 rounded-[4px] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all outline-none ${showEpisodes ? 'text-violet-400 border-violet-500/40 bg-violet-500/10' : 'text-zinc-400 hover:text-white'}`}
                  title="Danh sách tập"
                >
                  <List className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Danh sách tập</span>
                </button>

                {/* Episodes Sidebar / Popup overlay */}
                {showEpisodes && (
                  <div className="absolute bottom-12 right-0 w-72 bg-[#0c0c10]/95 backdrop-blur-xl border border-zinc-900 rounded-[4px] p-4 flex flex-col gap-3 shadow-2xl z-40 select-none">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Chọn Tập</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{episodes.length} tập</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {episodes
                        .slice()
                        .sort((a, b) => a.episodeNumber - b.episodeNumber)
                        .map(ep => {
                        const isActive = ep.episodeNumber === currentEpisodeNumber;
                        return (
                          <a
                            key={ep.id}
                            href={`/movies/${movieSlug}/tap-${ep.episodeNumber}`}
                            className={`py-2 text-center rounded-[2px] font-black text-[11px] transition-all no-underline flex justify-center items-center cursor-pointer border ${isActive ? 'bg-violet-600 border-violet-500 text-white shadow-md' : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-900 text-zinc-400 hover:text-white'}`}
                          >
                            {ep.episodeNumber}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings trigger */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowSettings(!showSettings);
                  if (showEpisodes) setShowEpisodes(false);
                }}
                className={`p-2 rounded-[4px] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all outline-none flex items-center gap-1.5 ${showSettings ? 'text-violet-400 border-violet-500/40 bg-violet-500/10' : 'text-zinc-400 hover:text-white'}`}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Glassmorphic Settings menu popup */}
              {showSettings && (
                <div className="absolute bottom-11 right-0 w-52 bg-[#0c0c10]/95 backdrop-blur-md border border-zinc-900 rounded-[4px] p-2.5 flex flex-col gap-2.5 shadow-2xl z-30 select-none">
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

                  {/* Server Source Settings Section */}
                  {onSelectServer && (
                    <>
                      <div className="border-t border-zinc-900 my-1"></div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest pl-1.5 pb-1">Nguồn Server</span>
                        {(!sources || sources.length === 0 ? [{ id: 'vip1', serverName: 'VIP 1', videoUrl: '' }, { id: 'vip2', serverName: 'VIP 2', videoUrl: '' }] : sources).map(srv => (
                          <button
                            key={srv.id || srv.serverName}
                            onClick={() => {
                              onSelectServer(srv.serverName);
                              setShowSettings(false);
                            }}
                            className={`text-left px-2.5 py-1.5 text-[10px] font-bold rounded-[2px] cursor-pointer outline-none border-0 transition-colors ${selectedServer === srv.serverName ? 'bg-violet-600 text-white' : 'bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                          >
                            {srv.serverName}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="border-t border-zinc-900 my-1"></div>

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
