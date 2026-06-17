'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { 
  Tv, MessageSquare, Send, Users, Loader2, ArrowLeft, Info, Copy, Check 
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PremiumPlayer from '@/components/PremiumPlayer';
import { catalogApi, authApi, EpisodePayload, MoviePayload } from '@/lib/api';

interface ChatMessage {
  username: string;
  content: string;
  timestamp: string;
}

export default function WatchPartyRoom() {
  const params = useParams() as { roomId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId;

  // Search parameters
  const queryMovieId = searchParams.get('movieId');
  const queryEpisodeId = searchParams.get('episodeId');

  // Player and state sync refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteSyncRef = useRef<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // UI and connection states
  const [username, setUsername] = useState<string>('');
  const [showNicknameModal, setShowNicknameModal] = useState<boolean>(false);
  const [nicknameInput, setNicknameInput] = useState<string>('');
  
  // Movie selection states (if not passed in URL)
  const [movies, setMovies] = useState<MoviePayload[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MoviePayload | null>(null);
  const [episodes, setEpisodes] = useState<EpisodePayload[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodePayload | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);

  // Active watching states
  const [episodeDetails, setEpisodeDetails] = useState<EpisodePayload | null>(null);
  const [loadingEpisode, setLoadingEpisode] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Social & Chat states
  const [membersCount, setMembersCount] = useState<number>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // 1. Resolve logged-in user or request nickname
  useEffect(() => {
    async function resolveUser() {
      const token = localStorage.getItem('donghua3d_token');
      if (token) {
        const res = await authApi.getMe();
        if (res.success && res.data) {
          const name = res.data.email.split('@')[0];
          setUsername(name);
          return;
        }
      }
      setShowNicknameModal(true);
    }
    resolveUser();
  }, []);

  // 2. Fetch Catalog if no queryParams provided
  useEffect(() => {
    if (queryMovieId && queryEpisodeId) return;

    async function loadCatalog() {
      setLoadingCatalog(true);
      const res = await catalogApi.getMovies();
      if (res.success && res.data) {
        setMovies(res.data);
      }
      setLoadingCatalog(false);
    }
    loadCatalog();
  }, [queryMovieId, queryEpisodeId]);

  // Load episodes when movie is selected manually
  useEffect(() => {
    if (!selectedMovie) return;
    const movieId = selectedMovie.id;
    async function loadEpisodes() {
      setLoadingCatalog(true);
      const res = await catalogApi.getMovie(movieId);
      if (res.success && res.data) {
        setEpisodes(res.data.episodes);
      }
      setLoadingCatalog(false);
    }
    loadEpisodes();
  }, [selectedMovie]);

  // 3. Load active episode details (either from query or manual selection)
  useEffect(() => {
    const activeEpisodeId = queryEpisodeId || selectedEpisode?.id;
    if (!activeEpisodeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingEpisode(false);
      return;
    }

    async function loadEpisode() {
      setLoadingEpisode(true);
      const res = await catalogApi.getEpisode(activeEpisodeId as string);
      if (res.success && res.data) {
        setEpisodeDetails(res.data);
      }
      setLoadingEpisode(false);
    }
    loadEpisode();
  }, [queryEpisodeId, selectedEpisode]);

  // 4. Connect and handle Real-time WebSockets via Socket.io
  useEffect(() => {
    if (!username || !episodeDetails) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      withCredentials: true
    });
    socketRef.current = socket;

    // Join room
    socket.emit('join-room', {
      roomId,
      username,
      movieId: episodeDetails.movieId,
      episodeId: episodeDetails.id
    });

    // Room Sync (on join)
    socket.on('room-sync', (roomState: { playing: boolean; currentTime: number }) => {
      console.log('🤖 [Socket] Room synced:', roomState);
      if (roomState.currentTime > 0 && playerRef.current) {
        isRemoteSyncRef.current = true;
        playerRef.current.currentTime = roomState.currentTime;
        if (roomState.playing) {
          playerRef.current.play();
        } else {
          playerRef.current.pause();
        }
        setTimeout(() => {
          isRemoteSyncRef.current = false;
        }, 1000);
      }
    });

    // Handle incoming video action events from other room members
    socket.on('video-state-change', (data: { playing: boolean; currentTime: number }) => {
      if (!playerRef.current) return;
      console.log('🤖 [Socket] Incoming state change:', data);
      
      isRemoteSyncRef.current = true;

      // Sync currentTime if it drifts by more than 2.5 seconds
      if (Math.abs(playerRef.current.currentTime - data.currentTime) > 2.5) {
        playerRef.current.currentTime = data.currentTime;
      }

      // Sync play/pause actions
      if (data.playing && playerRef.current.paused) {
        playerRef.current.play();
      } else if (!data.playing && !playerRef.current.paused) {
        playerRef.current.pause();
      }

      setTimeout(() => {
        isRemoteSyncRef.current = false;
      }, 500);
    });

    // Chat room messaging
    socket.on('new-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user-joined', (data: { username: string }) => {
      setMembersCount((prev) => prev + 1);
      setMessages((prev) => [
        ...prev,
        {
          username: 'Hệ thống 🤖',
          content: `${data.username} đã tham gia phòng xem chung!`,
          timestamp: new Date().toISOString()
        }
      ]);
    });

    socket.on('room-closed', () => {
      alert('Chủ phòng đã ngắt kết nối. Phòng xem chung này đã đóng.');
      router.push('/leaderboard');
    });

    return () => {
      socket.disconnect();
    };
  }, [username, episodeDetails, roomId, router]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. Handling outbound player actions (broadcast changes to other room members)
  const broadcastStateChange = (playing: boolean) => {
    // Prevent event storm if the play/pause action was triggered remotely
    if (isRemoteSyncRef.current || !socketRef.current || !playerRef.current) return;

    console.log('🤖 [Socket] Broadcasting action playing =', playing);
    socketRef.current.emit('video-state-change', {
      roomId,
      playing,
      currentTime: playerRef.current.currentTime
    });
  };

  const handleOutboundSeek = (time: number) => {
    if (isRemoteSyncRef.current || !socketRef.current || !playerRef.current) return;

    console.log('🤖 [Socket] Broadcasting seek =', time);
    socketRef.current.emit('video-state-change', {
      roomId,
      playing: !playerRef.current.paused,
      currentTime: time
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    socketRef.current.emit('send-message', {
      roomId,
      username,
      content: chatInput.trim()
    });
    setChatInput('');
  };

  const copyRoomLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    setUsername(nicknameInput.trim());
    setShowNicknameModal(false);
  };

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col font-sans selection:bg-violet-600/30">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Navigation & Room Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/20 backdrop-blur-md p-4 rounded-[4px] border border-zinc-900/60 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/leaderboard')}
              className="p-2 rounded-[4px] bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-all outline-none"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h1 className="text-sm font-black uppercase tracking-wider text-zinc-400">
                  Phòng Xem Chung #{roomId.slice(0, 8)}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Đồng bộ hóa thời gian phát video thời gian thực chuẩn từng mili-giây.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Share Link Button */}
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-2 py-2 px-4 rounded-[4px] bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600 hover:text-white text-violet-400 text-xs font-bold transition-all cursor-pointer outline-none"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép liên kết!' : 'Mời bạn bè'}
            </button>

            {/* Total Members online in room */}
            <div className="flex items-center gap-2 py-2 px-4 rounded-[4px] bg-zinc-900/50 border border-zinc-850 text-zinc-300 text-xs font-bold">
              <Users className="w-3.5 h-3.5 text-violet-400" />
              <span>{membersCount} Đang xem</span>
            </div>
          </div>
        </div>

        {/* Dynamic Catalog Picker (if roomId accessed without URL search params) */}
        {!episodeDetails && !loadingEpisode && (
          <div className="bg-[#0b0b14] border border-zinc-900/60 rounded-[4px] p-6 md:p-10 text-center max-w-2xl mx-auto w-full shadow-2xl flex flex-col items-center gap-6">
            <div className="p-4 rounded-full bg-violet-600/10 border border-violet-500/15 text-violet-400 animate-pulse">
              <Tv className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-500">
                Thiết Lập Video Cho Phòng
              </h2>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-md">
                Vui lòng chọn một tác phẩm hoạt hình cùng tập phim bạn muốn thưởng thức chung với mọi người trong phòng này.
              </p>
            </div>

            {loadingCatalog ? (
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin mt-4" />
            ) : (
              <div className="w-full flex flex-col gap-4 text-left">
                {/* 1. Movie Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Chọn phim hoạt hình</label>
                  <select
                    onChange={(e) => {
                      const m = movies.find(x => x.id === e.target.value);
                      setSelectedMovie(m || null);
                      setSelectedEpisode(null);
                    }}
                    className="w-full px-4 py-3 rounded-[4px] bg-[#07070a] border border-zinc-800 text-zinc-300 text-xs font-bold outline-none cursor-pointer focus:border-violet-500/50 transition-all"
                  >
                    <option value="">-- Click để chọn phim --</option>
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Episode Selector */}
                {selectedMovie && (
                  <div className="flex flex-col gap-1.5 animate-fadeIn">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Chọn tập phim</label>
                    <select
                      onChange={(e) => {
                        const ep = episodes.find(x => x.id === e.target.value);
                        setSelectedEpisode(ep || null);
                      }}
                      className="w-full px-4 py-3 rounded-[4px] bg-[#07070a] border border-zinc-800 text-zinc-300 text-xs font-bold outline-none cursor-pointer focus:border-violet-500/50 transition-all"
                    >
                      <option value="">-- Click để chọn tập --</option>
                      {episodes.map((ep) => (
                        <option key={ep.id} value={ep.id}>Tập {ep.episodeNumber}: {ep.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Active Player and Real-time chat side-by-side layout */}
        {episodeDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Main Video Player block */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              {loadingEpisode ? (
                <div className="aspect-video w-full rounded-[4px] bg-zinc-950 flex items-center justify-center border border-zinc-900/60 shadow-2xl">
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                </div>
              ) : (
                <PremiumPlayer
                  playerRef={playerRef}
                  src={episodeDetails.videoUrl}
                  videoUrl4k={episodeDetails.videoUrl4k}
                  isVipOnly={episodeDetails.isVipOnly}
                  title={`Tập ${episodeDetails.episodeNumber}: ${episodeDetails.title}`}
                  introStart={episodeDetails.introStart}
                  introEnd={episodeDetails.introEnd}
                  outroStart={episodeDetails.outroStart}
                  outroEnd={episodeDetails.outroEnd}
                  isWatchParty={true}
                  onPlay={() => broadcastStateChange(true)}
                  onPause={() => broadcastStateChange(false)}
                  onSeek={handleOutboundSeek}
                />
              )}

              {/* Video Title Details */}
              <div className="bg-[#0b0b14]/50 border border-zinc-900/40 p-4 rounded-[4px] flex flex-col gap-2">
                <h2 className="text-md font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
                  {episodeDetails.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {episodeDetails.description || 'Chưa có thông tin mô tả chi tiết tập phim này.'}
                </p>
                <div className="flex items-center gap-1.5 mt-2 bg-violet-600/10 border border-violet-500/15 py-2 px-3 rounded-[3px] text-violet-400 max-w-max">
                  <Info className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Bất kỳ ai trong phòng bấm dừng hoặc tua đều đồng bộ thời gian phát chung!
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Glassmorphic Sidebar Chat block */}
            <div className="lg:col-span-1 h-[450px] lg:h-[550px] flex flex-col bg-[#0b0b14] border border-zinc-900/60 rounded-[4px] shadow-2xl overflow-hidden">
              
              {/* Sidebar Header */}
              <div className="p-4 border-b border-zinc-900/80 bg-zinc-950/40 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">TRÒ CHUYỆN TRỰC TIẾP</span>
              </div>

              {/* Chat Message Lists */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-900 scrollbar-track-transparent">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <MessageSquare className="w-8 h-8 text-zinc-700 mb-2 animate-pulse" />
                    <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Chưa có tin nhắn nào</span>
                    <p className="text-[10px] text-zinc-500 mt-1 max-w-xs">Gửi tin nhắn chào mừng các bạn cùng xem phim nhé!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isSystem = msg.username === 'Hệ thống 🤖';
                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col gap-1 p-2 rounded-[3px] transition-all duration-300 ${isSystem ? 'bg-violet-950/20 border border-violet-500/10 text-center' : 'bg-zinc-900/20 border border-zinc-900/40 hover:bg-zinc-900/30'}`}
                      >
                        {!isSystem && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-violet-400">{msg.username}</span>
                            <span className="text-[8px] text-zinc-600 font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <p className={`text-xs ${isSystem ? 'text-violet-300 font-medium' : 'text-zinc-300'}`}>{msg.content}</p>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Footer Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-900 bg-zinc-950/20 flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập nội dung trò chuyện..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#050508] border border-zinc-800 rounded-[3px] text-xs text-zinc-300 placeholder-zinc-600 focus:border-violet-500/50 outline-none transition-all"
                />
                <button
                  type="submit"
                  className="p-2 bg-violet-600 border-0 hover:bg-violet-500 rounded-[3px] text-white cursor-pointer hover:scale-105 active:scale-95 transition-all outline-none"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* STUNNING GUEST NICKNAME MODAL */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <form 
            onSubmit={handleNicknameSubmit}
            className="w-full max-w-sm bg-[#0b0b14] border border-zinc-900 rounded-[4px] p-6 shadow-[0_0_50px_rgba(139,92,246,0.3)] flex flex-col gap-5 text-center animate-zoomIn"
          >
            <div className="p-3 rounded-full bg-violet-600/15 border border-violet-500/20 text-violet-400 mx-auto animate-bounce">
              <Users className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-md font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-500">
                Gia Nhập Phòng Xem Chung
              </h2>
              <p className="text-zinc-500 text-[10px] leading-relaxed max-w-xs mx-auto">
                Nhập tên hoặc biệt danh bất kỳ đại diện cho bạn khi nhắn tin và tương tác trong phòng xem chung này.
              </p>
            </div>

            <input
              type="text"
              placeholder="Nhập biệt danh của bạn..."
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-[3px] bg-[#050508] border border-zinc-850 text-zinc-300 text-xs font-bold focus:border-violet-500/50 outline-none transition-all"
            />

            <button
              type="submit"
              className="w-full py-3 rounded-[3px] bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-black uppercase tracking-wider border-0 shadow-[0_0_15px_rgba(139,92,246,0.25)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all outline-none"
            >
              Tham Gia Ngay
            </button>
          </form>
        </div>
      )}
      <Footer />
    </div>
  );
}
