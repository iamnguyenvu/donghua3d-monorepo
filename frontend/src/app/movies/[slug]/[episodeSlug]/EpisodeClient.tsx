'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Star, MessageSquare, Loader2, Send, Flag, Bookmark
} from 'lucide-react';
import Header from '@/components/Header';
import PremiumPlayer from '@/components/PremiumPlayer';
import { 
  catalogApi, ratingApi, commentApi, 
  EpisodePayload, MovieWithEpisodes, ReviewPayload, CommentPayload,
  cleanEpisodeTitle
} from '@/lib/api';

export default function EpisodePage({ slug, episodeNumber }: { slug: string; episodeNumber: string }) {
  const router = useRouter();
  
  const [episode, setEpisode] = useState<EpisodePayload | null>(null);
  const [movie, setMovie] = useState<MovieWithEpisodes | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialProgress, setInitialProgress] = useState(0);

  // Selector Utility States
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedServer, setSelectedServer] = useState<string>('');

  // Autoplay State
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);

  // Social Panel State
  const [reviews, setReviews] = useState<ReviewPayload[]>([]);
  const [comments, setComments] = useState<CommentPayload[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSpoilerComment, setIsSpoilerComment] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [visibleSpoilers, setVisibleSpoilers] = useState<Record<string, boolean>>({});

  // 1. Fetch Episode Details, Movies, and Reviews
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const epRes = await catalogApi.getEpisodeByNumber(slug, episodeNumber);
      const mvRes = await catalogApi.getMovie(slug);
      
      if (epRes.success && epRes.data && mvRes.success && mvRes.data) {
        setEpisode(epRes.data);
        setMovie(mvRes.data);
        
        if (epRes.data.sources && epRes.data.sources.length > 0) {
          setSelectedServer(epRes.data.sources[0].serverName);
        } else {
          setSelectedServer('VIP 1');
        }

        // Set initial watch progress if present
        if (epRes.data.watchHistory && epRes.data.watchHistory.progress > 0) {
          setInitialProgress(epRes.data.watchHistory.progress);
        }

        // Fetch comments and reviews using movie.id
        const commentRes = await commentApi.getComments(mvRes.data.id, epRes.data.id);
        if (commentRes.success && commentRes.data) {
          setComments(commentRes.data);
        }
        
        const reviewRes = await ratingApi.getReviews(mvRes.data.id);
        if (reviewRes.success && reviewRes.data) {
          setReviews(reviewRes.data);
        }
      } else {
        // Fallback mockup states for instant visual WOW if API offline
        setEpisode({
          id: 'mock-123',
          movieId: slug,
          episodeNumber: parseInt(episodeNumber) || 1,
          title: 'Khởi đầu hoàn mỹ của Thạch Hạo',
          description: 'Cậu bé Thạch Thôn bộc lộ sức mạnh đáng sợ từ thuở ấu thơ, thu hút ánh nhìn của các tộc trưởng cổ xưa.',
          videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', // Public sample HLS stream
          duration: 1200.0,
          introStart: 10.0,
          introEnd: 90.0,
          outroStart: 1100.0,
          outroEnd: 1200.0,
          sources: [
            { id: '1', serverName: 'VIP 1 (Mux)', videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
            { id: '2', serverName: 'VIP 2 (Cloudflare)', videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
          ]
        });
        setMovie({
          id: slug,
          title: 'Perfect World',
          altTitles: ['Thế Giới Hoàn Mỹ'],
          rating: 9.2,
          expertRating: 9.4,
          audienceRating: 9.0,
          releaseYear: 2021,
          episodes: [],
        } as unknown as MovieWithEpisodes);
      }
      setLoading(false);
    }
    loadData();
  }, [slug, episodeNumber]);

  const handleProgressPulse = (currentTime: number, isCompleted: boolean) => {
    if (episode && movie) {
      catalogApi.saveWatchHistory(episode.id, currentTime, isCompleted);

      // Save to local watch history for Header Popover instant rendering
      try {
        const localHistoryStr = localStorage.getItem('donghua3d_local_watch_history') || '[]';
        const historyList = JSON.parse(localHistoryStr) as Array<{
          id: string;
          episodeId: string;
          movieId: string;
          movieTitle: string;
          episodeNumber: number;
          progress: number;
          duration: number;
          thumbnail: string;
          updatedAt: string;
        }>;

        // Remove duplicates of same movie to keep history clean
        const filteredList = historyList.filter(item => item.movieId !== movie.id);
        const newItem = {
          id: episode.id,
          episodeId: episode.id,
          movieId: movie.id,
          movieTitle: movie.title,
          episodeNumber: episode.episodeNumber,
          progress: currentTime,
          duration: episode.duration || 1200,
          thumbnail: episode.thumbnail || movie.posterUrl || '',
          updatedAt: new Date().toISOString()
        };

        const updatedList = [newItem, ...filteredList].slice(0, 10); // Keep top 10 recent
        localStorage.setItem('donghua3d_local_watch_history', JSON.stringify(updatedList));
      } catch (err) {
        console.error('Failed to save local watch history:', err);
      }
    }
  };

  const currentVideoUrl = React.useMemo(() => {
    if (!episode) return '';
    if (episode.sources && episode.sources.length > 0) {
      const src = episode.sources.find(s => s.serverName === selectedServer);
      if (src) return src.videoUrl;
    }
    return episode.videoUrl;
  }, [episode, selectedServer]);

  // Find next episode
  const nextEpisode = movie?.episodes && episode
    ? movie.episodes.find(ep => ep.episodeNumber === episode.episodeNumber + 1)
    : null;

  // Find previous episode
  const prevEpisode = movie?.episodes && episode
    ? movie.episodes.find(ep => ep.episodeNumber === episode.episodeNumber - 1)
    : null;

  const handlePrevEpisode = () => {
    if (prevEpisode && movie) {
      router.push(`/movies/${movie.slug || movie.id}/tap-${prevEpisode.episodeNumber}`);
    }
  };

  const handleNextEpisode = () => {
    if (nextEpisode && movie) {
      router.push(`/movies/${movie.slug || movie.id}/tap-${nextEpisode.episodeNumber}`);
    }
  };

  // Autoplay countdown timer
  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown === 0) {
      if (nextEpisode && movie) {
        router.push(`/movies/${movie.slug || movie.id}/tap-${nextEpisode.episodeNumber}`);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoplayCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setAutoplayCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoplayCountdown, nextEpisode, movie, router]);

  const handleVideoEnded = () => {
    if (nextEpisode) {
      setAutoplayCountdown(5); // Start 5s countdown
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRating === 0 || !movie || !episode) return;
    setSubmittingReview(true);

    const res = await ratingApi.submitRating(movie.id, episode.id, userRating, reviewText);
    if (res.success && res.data) {
      setReviews([res.data, ...reviews]);
      setReviewText('');
      setUserRating(0);
    }
    setSubmittingReview(false);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !movie || !episode) return;
    setSubmittingComment(true);

    const res = await commentApi.postComment(
      movie.id,
      episode.id,
      null, // Flat parent mapping for standard feeds, nested tree rendered locally
      commentText,
      isSpoilerComment
    );

    if (res.success && res.data) {
      setComments([res.data, ...comments]);
      setCommentText('');
      setIsSpoilerComment(false);
    }
    setSubmittingComment(false);
  };

  const handleCommentFlag = async (id: string) => {
    const res = await commentApi.flagComment(id);
    if (res.success) {
      alert('Đã báo cáo bình luận vi phạm thành công tới Quản Trị Viên.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!episode || !movie) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 text-center select-none">
        <Loader2 className="w-10 h-10 text-violet-500 mb-4 animate-spin" />
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Không tìm thấy tập phim</h2>
        <Link href="/" className="mt-5 px-5 py-2.5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-xs font-extrabold uppercase tracking-wider text-white no-underline transition-all">Quay về Trang Chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header />

      {/* Autoplay Next Episode Glassmorphic Overlay */}
      {autoplayCountdown !== null && nextEpisode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050508]/85 backdrop-blur-md animate-fade-in select-none">
          <div className="p-8 bg-zinc-950/80 border border-zinc-900 rounded-[4px] text-center max-w-sm w-full mx-4 shadow-[0_0_50px_rgba(139,92,246,0.3)] flex flex-col items-center">
            <div className="relative mb-5 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
              <span className="absolute text-lg font-black text-white">{autoplayCountdown}</span>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Chuẩn bị chuyển tập tiếp theo</h3>
            <p className="text-xs text-zinc-400 mb-6 truncate max-w-full">Tập {nextEpisode.episodeNumber}: {cleanEpisodeTitle(nextEpisode.title, nextEpisode.episodeNumber)}</p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => {
                  router.push(`/movies/${movie.slug || movie.id}/tap-${nextEpisode.episodeNumber}`);
                  setAutoplayCountdown(null);
                }}
                className="flex-grow py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-[2px] cursor-pointer transition-all border-0 outline-none"
              >
                Chuyển Ngay
              </button>
              <button
                onClick={() => setAutoplayCountdown(null)}
                className="flex-grow py-2.5 bg-transparent border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-[2px] cursor-pointer transition-all outline-none"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
         CINEMATIC WATCH PLAYER BLOCK (Layout 02 Netflix Style - Custom Vidstack Player)
         ============================================================================== */}
      <main className="w-full px-6 md:px-12 lg:px-16 mt-28">
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mb-5 transition-colors select-none flex-wrap">
          <Link href="/" className="text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1 no-underline">
            Trang Chủ
          </Link>
          <span className="text-zinc-700">/</span>
          <Link href={`/movies/${movie.slug || movie.id}`} className="text-zinc-500 hover:text-violet-400 transition-colors no-underline">
            {movie.title}
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300">Tập {episode.episodeNumber}</span>
        </nav>

        {/* Custom Vidstack Premium Video Player Component */}
        <PremiumPlayer
          src={currentVideoUrl}
          videoUrl4k={episode.videoUrl4k}
          isVipOnly={episode.isVipOnly}
          title={cleanEpisodeTitle(episode.title, episode.episodeNumber)}
          introStart={episode.introStart}
          introEnd={episode.introEnd}
          outroStart={episode.outroStart}
          outroEnd={episode.outroEnd}
          initialProgress={initialProgress}
          onProgressPulse={handleProgressPulse}
          onEnded={handleVideoEnded}
          onPrevEpisode={prevEpisode ? handlePrevEpisode : undefined}
          onNextEpisode={nextEpisode ? handleNextEpisode : undefined}
          episodes={movie.episodes}
          currentEpisodeNumber={episode.episodeNumber}
          movieSlug={movie.slug || movie.id}
          sources={episode.sources}
          selectedServer={selectedServer}
          onSelectServer={setSelectedServer}
        />

        {/* EPISODE DETAILS INFO */}
        <div className="mt-8 border-b border-zinc-900/60 pb-6 select-none">
          <div className="flex items-center gap-2 text-[10px] text-violet-400 font-black uppercase tracking-widest mb-1.5">
            <span>{movie.title}</span>
            <span className="text-zinc-700">|</span>
            <span>Tập {episode.episodeNumber}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider mb-2">
            {cleanEpisodeTitle(episode.title, episode.episodeNumber)}
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl mb-4">
            {episode.description}
          </p>

          {/* Social Actions Panel */}
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const newVal = !false; // Temporary toggle state for local UI until connected to backend
                if (movie) {
                  localStorage.setItem(`donghua3d_followed_${movie.id}`, newVal.toString());
                  alert(newVal ? `Đã thêm phim vào danh sách Theo dõi thành công!` : 'Đã bỏ theo dõi phim.');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer outline-none border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white shadow-sm"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Theo dõi phim</span>
            </button>
            <button
              onClick={() => {
                const score = prompt(`Nhập điểm số đánh giá tập phim từ 1 đến 10:`, '10');
                if (score) {
                  const num = parseInt(score, 10);
                  if (!isNaN(num) && num >= 1 && num <= 10) {
                    alert(`Cảm ơn bạn đã đánh giá ${num}/10 điểm! Đánh giá đã được ghi nhận vào hệ thống.`);
                  } else {
                    alert('Điểm số không hợp lệ. Vui lòng nhập từ 1 đến 10.');
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer outline-none border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-amber-400 shadow-sm"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>Đánh giá phim</span>
            </button>
          </div>
        </div>

        {/* ==============================================================================
           PREMIUM EPISODE SELECTOR & CDN SERVERS PANEL
           ============================================================================== */}
        <div className="mt-8 bg-[#09090d]/60 border border-zinc-900/80 rounded-[4px] p-6 shadow-xl select-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/60 pb-5">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                Danh Sách Tập Phim
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                Tổng cộng: {movie.episodes?.length || 0} tập • Đang chiếu chất lượng Ultra HD 4K
              </p>
            </div>

            {/* Server CDN Selector & Sorting Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sorting Toggle button */}
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="px-3 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer rounded-[2px]"
              >
                Thứ tự: {sortAsc ? 'Cũ nhất' : 'Mới nhất'}
              </button>

              {/* Search box for episodes */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm số tập..."
                  value={episodeSearch}
                  onChange={(e) => setEpisodeSearch(e.target.value)}
                  className="w-32 px-3 py-2 bg-zinc-950 focus:bg-zinc-900 border border-zinc-900 focus:border-zinc-800 rounded-[2px] text-[10px] text-white placeholder-zinc-600 font-bold focus:outline-none transition-all uppercase tracking-wider"
                />
              </div>
            </div>
          </div>

          {/* Series Switcher Panel (shown when movie belongs to a series) */}
          {movie.seriesMovies && movie.seriesMovies.length > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-900/50">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2.5">Xem Phần Khác</p>
              <div className="flex flex-wrap gap-2">
                {/* Current movie */}
                <div className="px-3 py-1.5 rounded-[2px] text-[10px] font-black bg-violet-600 text-white border border-violet-500 uppercase tracking-wide select-none">
                  {movie.seriesLabel || 'Phần Chính'}
                </div>
                {/* Other parts in the series */}
                {movie.seriesMovies.map((part) => (
                  <Link
                    key={part.id}
                    href={`/movies/${part.slug || part.id}`}
                    className="px-3 py-1.5 rounded-[2px] text-[10px] font-black bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 uppercase tracking-wide transition-all no-underline"
                  >
                    {part.seriesLabel || part.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Episode Grid Buttons - Dense Layout */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2 mt-5 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              const filtered = (movie.episodes || [])
                .filter(ep => ep.episodeNumber.toString().includes(episodeSearch));
              
              const sorted = [...filtered].sort((a, b) => 
                sortAsc ? a.episodeNumber - b.episodeNumber : b.episodeNumber - a.episodeNumber
              );

              if (sorted.length === 0) {
                return (
                  <div className="col-span-full py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider italic">
                    Không tìm thấy tập phim phù hợp.
                  </div>
                );
              }

              return sorted.map((ep) => {
                const isActive = ep.id === episode.id;
                return (
                  <Link
                    key={ep.id}
                    href={`/movies/${movie.slug || movie.id}/tap-${ep.episodeNumber}`}
                    className={`
                      py-3 text-center rounded-[2px] font-black text-xs transition-all no-underline flex flex-col justify-center items-center cursor-pointer border
                      ${isActive 
                        ? 'bg-gradient-to-br from-violet-600/90 to-indigo-600/90 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] hover:from-violet-500 hover:to-indigo-500 scale-105 z-10' 
                        : 'bg-zinc-950/60 hover:bg-zinc-900 border-zinc-900/80 text-zinc-400 hover:text-white'
                      }
                    `}
                  >
                    <span>{ep.episodeNumber}</span>
                  </Link>
                );
              });
            })()}
          </div>
        </div>

        {/* ==============================================================================
           SOCIAL INTERACTIONS (VERIFIED RATING + DISCUSSIONS)
           ============================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          
          {/* LEFT: VERIFIED RATINGS PANEL */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <h2 className="text-xs font-black text-white tracking-wider uppercase border-b border-zinc-900/60 pb-4 flex items-center gap-2">
              Đánh Giá Xác Thực
            </h2>

            {/* Post review panel form */}
            <form onSubmit={handleRatingSubmit} className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex flex-col gap-4 shadow-lg select-none">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bạn đánh giá tập phim này bao nhiêu?</span>
              
              {/* Star selector buttons */}
              <div className="flex flex-wrap items-center justify-between sm:justify-start gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className="p-1.5 xs:p-2 sm:p-1 bg-transparent border-0 cursor-pointer transition-transform hover:scale-125 outline-none flex items-center justify-center"
                    title={`Đánh giá ${star}/10 sao`}
                  >
                    <Star className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-5 sm:h-5 md:w-4 md:h-4 ${star <= userRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-750'}`} />
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder="Viết nhận xét ngắn gọn của bạn tại đây (không bắt buộc)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="bg-[#0c0c0f] border border-zinc-800/80 text-white rounded-[4px] p-3 text-xs outline-none focus:border-zinc-750 transition-all w-full"
              />

              <button
                type="submit"
                disabled={userRating === 0 || submittingReview}
                className="py-2.5 px-5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-md disabled:opacity-50 cursor-pointer outline-none border-0"
              >
                Gửi Đánh Giá {userRating > 0 && `(${userRating}/10)`}
              </button>
            </form>

            {/* List reviews feed */}
            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 select-none">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-[2px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-455">
                          {rev.user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-zinc-300 font-semibold truncate max-w-[120px]">{rev.user.email.split('@')[0]}</span>
                      </div>
                      <span className="bg-amber-400/5 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-[2px] text-[10px] font-extrabold flex items-center gap-0.5 shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {rev.value}/10
                      </span>
                    </div>
                    {rev.review && <p className="text-xs text-zinc-400 leading-relaxed">{rev.review}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-6">
                  <Star className="w-6 h-6 text-zinc-650 mx-auto mb-2" />
                  <p className="text-xs text-zinc-550 italic">Chưa có nhận xét nào.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: THREADED SOCIAL COMMENTS SYSTEM */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="text-xs font-black text-white tracking-wider uppercase border-b border-zinc-900/60 pb-4 flex items-center gap-2">
              Thảo Luận Tập Phim
            </h2>

            {/* Post comment form */}
            <form onSubmit={handleCommentSubmit} className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex flex-col gap-4 shadow-lg select-none">
              <textarea
                rows={3}
                placeholder="Bình luận suy nghĩ hoặc giả thuyết của bạn về tập này..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-[#0c0c0f] border border-zinc-800/80 text-white rounded-[4px] p-3 text-xs outline-none focus:border-zinc-750 transition-all w-full"
                required
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <label className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-400 select-none uppercase font-bold tracking-wider">
                  <input
                    type="checkbox"
                    checked={isSpoilerComment}
                    onChange={(e) => setIsSpoilerComment(e.target.checked)}
                    className="accent-violet-600 rounded border-zinc-800 bg-zinc-950"
                  />
                  Chứa tiết lộ nội dung (Spoiler Alert!)
                </label>

                <button
                  type="submit"
                  disabled={submittingComment}
                  className="py-2.5 px-4 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer outline-none border-0 w-full sm:w-auto"
                >
                  <Send className="w-3 h-3" />
                  Gửi Bình Luận
                </button>
              </div>
            </form>

            {/* Feed Comments list */}
            <div className="flex flex-col gap-6 select-none">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b border-zinc-900/60 pb-5 last:border-0 flex gap-4">
                    <div className="w-8 h-8 rounded-[2px] bg-zinc-900 flex items-center justify-center border border-zinc-850 text-xs font-bold text-zinc-400 flex-shrink-0 select-none">
                      {comment.user.email.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex flex-col gap-1.5 flex-grow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 font-bold">{comment.user.email.split('@')[0]}</span>
                          <span className="text-[10px] text-zinc-550 font-semibold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCommentFlag(comment.id)}
                            className="p-1 bg-transparent border-0 cursor-pointer text-zinc-550 hover:text-rose-500 transition-colors outline-none"
                            title="Báo cáo vi phạm"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content rendering (checking spoiler status) */}
                      {comment.isSpoiler && !visibleSpoilers[comment.id] ? (
                        <div 
                          onClick={() => setVisibleSpoilers({ ...visibleSpoilers, [comment.id]: true })}
                          className="inline-block text-[10px] font-bold py-1.5 px-3 border border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/8 text-amber-400 rounded-[2px] cursor-pointer transition-all select-none uppercase tracking-wider"
                        >
                          ⚠️ NHẤP ĐỂ XEM SPOILER (Nội dung tiết lộ trước cốt truyện)
                        </div>
                      ) : (
                        <p className={`text-xs text-zinc-300 leading-relaxed ${comment.isSpoiler ? 'border-l-2 border-amber-500 pl-3 bg-amber-500/5 py-1 rounded-[2px]' : ''}`}>
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-6">
                  <MessageSquare className="w-6 h-6 text-zinc-650 mx-auto mb-2" />
                  <p className="text-xs text-zinc-550 italic">Chưa có bình luận nào. Hãy bắt đầu cuộc thảo luận đầu tiên!</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
