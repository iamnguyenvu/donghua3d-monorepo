'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, Maximize2, SkipForward, ArrowLeft, Star, 
  MessageSquare, User, Calendar, AlertCircle, Loader2, Send, EyeOff, Flag 
} from 'lucide-react';
import Header from '@/components/Header';
import { 
  catalogApi, ratingApi, commentApi, 
  EpisodePayload, MoviePayload, ReviewPayload, CommentPayload 
} from '@/lib/api';

export default function WatchEpisode() {
  const params = useParams() as { id: string; episodeId: string };
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [episode, setEpisode] = useState<EpisodePayload | null>(null);
  const [movie, setMovie] = useState<MoviePayload | null>(null);
  const [loading, setLoading] = useState(true);

  // Custom Player Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showIntroSkip, setShowIntroSkip] = useState(false);
  const [showOutroSkip, setShowOutroSkip] = useState(false);

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
      const epRes = await catalogApi.getEpisode(params.episodeId);
      const mvRes = await catalogApi.getMovie(params.id);
      
      if (epRes.success && epRes.data && mvRes.success && mvRes.data) {
        setEpisode(epRes.data);
        setMovie(mvRes.data);
        
        // Load watch progress if present
        if (epRes.data.watchHistory && epRes.data.watchHistory.progress > 0) {
          setCurrentTime(epRes.data.watchHistory.progress);
        }

        // Fetch comments and reviews
        const commentRes = await commentApi.getComments(params.id, params.episodeId);
        if (commentRes.success && commentRes.data) {
          setComments(commentRes.data);
        }
        
        const reviewRes = await ratingApi.getReviews(params.id);
        if (reviewRes.success && reviewRes.data) {
          setReviews(reviewRes.data);
        }
      } else {
        // Fallback mockup states for instant visual WOW if API offline
        setEpisode({
          id: params.episodeId,
          movieId: params.id,
          episodeNumber: 1,
          title: 'Khởi đầu hoàn mỹ của Thạch Hạo',
          description: 'Cậu bé Thạch Thôn bộc lộ sức mạnh đáng sợ từ thuở ấu thơ, thu hút ánh nhìn của các tộc trưởng cổ xưa.',
          videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', // Public sample HLS stream
          duration: 1200.0,
          introStart: 10.0,
          introEnd: 90.0,
          outroStart: 1100.0,
          outroEnd: 1200.0,
        });
        setMovie({
          id: params.id,
          title: 'Perfect World',
          altTitles: ['Thế Giới Hoàn Mỹ'],
          rating: 9.2,
          expertRating: 9.4,
          audienceRating: 9.0,
          releaseYear: 2021,
        } as any);
      }
      setLoading(false);
    }
    loadData();
  }, [params.id, params.episodeId]);

  // 2. Bind HLS Video Player
  useEffect(() => {
    if (!episode || !videoRef.current) return;

    const video = videoRef.current;
    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(episode.videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Recover previous watch progress if needed
        if (episode.watchHistory && episode.watchHistory.progress > 0) {
          video.currentTime = episode.watchHistory.progress;
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS support
      video.src = episode.videoUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [episode]);

  // 3. Monitor Video Timing, Shortcuts and Skip Button Triggers
  useEffect(() => {
    if (!episode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName;
      if (activeEl === 'INPUT' || activeEl === 'TEXTAREA') return; // Ignore if typing inside reviews or comment boxes

      if ((e.key === 's' || e.key === 'S') && showIntroSkip) {
        handleSkipIntro();
      }
      if ((e.key === 'e' || e.key === 'E') && showOutroSkip) {
        handleSkipOutro();
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [episode, showIntroSkip, showOutroSkip]);

  // Save progress pulse tracker (Every 10 seconds of active play)
  useEffect(() => {
    if (!isPlaying || !episode) return;

    const pulseInterval = setInterval(() => {
      if (videoRef.current) {
        const t = videoRef.current.currentTime;
        const comp = t >= duration - 30; // Mark complete if within 30 seconds of video end
        catalogApi.saveWatchHistory(episode.id, t, comp);
      }
    }, 10000);

    return () => clearInterval(pulseInterval);
  }, [isPlaying, episode, duration]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !episode) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Show/hide Skip Intro and Outro buttons dynamically
    setShowIntroSkip(t >= episode.introStart && t <= episode.introEnd);
    setShowOutroSkip(t >= episode.outroStart && t <= episode.outroEnd);
  };

  const handleSkipIntro = () => {
    if (!videoRef.current || !episode) return;
    videoRef.current.currentTime = episode.introEnd;
    setCurrentTime(episode.introEnd);
    setShowIntroSkip(false);
  };

  const handleSkipOutro = () => {
    if (!videoRef.current || !episode) return;
    videoRef.current.currentTime = episode.outroEnd;
    setCurrentTime(episode.outroEnd);
    setShowOutroSkip(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 4. Submission Handlers
  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRating === 0 || !movie) return;
    setSubmittingReview(true);

    const res = await ratingApi.submitRating(movie.id, params.episodeId, userRating, reviewText);
    if (res.success && res.data) {
      setReviews([res.data, ...reviews]);
      setReviewText('');
      setUserRating(0);
    }
    setSubmittingReview(false);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !movie) return;
    setSubmittingComment(true);

    const res = await commentApi.postComment(
      movie.id,
      params.episodeId,
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!episode || !movie) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Không tìm thấy tập phim</h2>
        <Link href="/" className="btn-cinema btn-cinema-primary mt-6">Quay về Trang Chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans pb-24">
      <Header />

      {/* ==============================================================================
         CINEMATIC WATCH PLAYER BLOCK
         ============================================================================== */}
      <main className="container mx-auto px-8 max-w-6xl mt-28">
        <Link href={`/movies/${movie.id}`} className="flex items-center gap-2 text-zinc-400 hover:text-white no-underline font-semibold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh mục {movie.title}
        </Link>

        {/* Video Player Frame wrapper */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl group/player">
          <video
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* SKIP INTRO FLOATING ACTION BUTTON */}
          {showIntroSkip && (
            <button
              onClick={handleSkipIntro}
              className="absolute bottom-20 left-8 z-30 btn-cinema btn-cinema-primary rounded-xl px-6 py-3.5 animate-pulse-glow flex items-center gap-2 font-bold font-sans text-sm"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), #4C1D95)' }}
            >
              <SkipForward className="w-4 h-4" />
              BỎ QUA GIỚI THIỆU (Nhấn S)
            </button>
          )}

          {/* SKIP OUTRO FLOATING ACTION BUTTON */}
          {showOutroSkip && (
            <button
              onClick={handleSkipOutro}
              className="absolute bottom-20 right-8 z-30 btn-cinema btn-cinema-primary rounded-xl px-6 py-3.5 animate-pulse-glow flex items-center gap-2 font-bold font-sans text-sm"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), #4C1D95)' }}
            >
              <SkipForward className="w-4 h-4" />
              BỎ QUA PHẦN KẾT THÚC (Nhấn E)
            </button>
          )}

          {/* CUSTOM CONTROLS OVERLAY BAR */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-3 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 z-20">
            {/* Timeline Progress Slider */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = val;
                setCurrentTime(val);
              }}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:h-2 transition-all"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white cursor-pointer transition-colors">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                <span className="text-xs text-zinc-300 font-bold">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-zinc-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/20 appearance-none rounded-lg accent-violet-500 cursor-pointer"
                  />
                </div>

                <button onClick={toggleFullscreen} className="p-2 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* EPISODE DETAILS INFO */}
        <div className="mt-8 border-b border-white/10 pb-8">
          <div className="flex items-center gap-2 text-sm text-violet-400 font-bold uppercase tracking-wider mb-2">
            <span>{movie.title}</span>
            <span>•</span>
            <span>Tập {episode.episodeNumber}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            {episode.title}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-4xl">
            {episode.description}
          </p>
        </div>

        {/* ==============================================================================
           SOCIAL INTERACTIONS (VERIFIED RATING + DISCUSSIONS)
           ============================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          
          {/* LEFT: VERIFIED RATINGS PANEL */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-4">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              Đánh Giá Xác Thực
            </h2>

            {/* Post review panel form */}
            <form onSubmit={handleRatingSubmit} className="glass-card p-6 flex flex-col gap-4">
              <span className="text-xs font-bold text-zinc-400 uppercase">Bạn đánh giá tập phim này bao nhiêu?</span>
              
              {/* Star selector buttons */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className="p-1 bg-transparent border-0 cursor-pointer transition-transform hover:scale-125"
                  >
                    <Star className={`w-5 h-5 ${star <= userRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} />
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder="Viết nhận xét ngắn gọn của bạn tại đây (không bắt buộc)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="input-cinema text-sm w-full"
              />

              <button
                type="submit"
                disabled={userRating === 0 || submittingReview}
                className="btn-cinema btn-cinema-primary w-full py-2.5 text-sm"
              >
                Gửi Đánh Giá {userRating > 0 && `(${userRating}/10)`}
              </button>
            </form>

            {/* List reviews feed */}
            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev.id} className="glass-card p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-xs font-bold text-white">
                          U
                        </div>
                        <span className="text-xs text-zinc-300 font-semibold truncate max-w-[120px]">{rev.user.email.split('@')[0]}</span>
                      </div>
                      <span className="bg-amber-400/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[11px] font-extrabold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {rev.value}/10
                      </span>
                    </div>
                    {rev.review && <p className="text-xs text-zinc-400 leading-relaxed">{rev.review}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 glass-card p-6">
                  <Star className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">Chưa có đánh giá nào cho bộ phim này.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: THREADED SOCIAL COMMENTS SYSTEM */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-4">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              Thảo Luận Tập Phim
            </h2>

            {/* Post comment form */}
            <form onSubmit={handleCommentSubmit} className="glass-card p-6 flex flex-col gap-4">
              <textarea
                rows={3}
                placeholder="Bình luận suy nghĩ hoặc giả thuyết của bạn về tập này..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="input-cinema text-sm w-full"
                required
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
                  <input
                    type="checkbox"
                    checked={isSpoilerComment}
                    onChange={(e) => setIsSpoilerComment(e.target.checked)}
                    className="accent-violet-500"
                  />
                  Chứa tiết lộ nội dung trước (Spoiler Alert!)
                </label>

                <button
                  type="submit"
                  disabled={submittingComment}
                  className="btn-cinema btn-cinema-primary py-2 px-6 text-sm flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi Bình Luận
                </button>
              </div>
            </form>

            {/* Feed Comments list */}
            <div className="flex flex-col gap-6">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b border-white/5 pb-4 last:border-0 flex gap-4">
                    <div className="w-9 h-9 rounded-full bg-violet-900/40 flex items-center justify-center border border-violet-500/20 text-sm font-bold text-violet-300 flex-shrink-0">
                      C
                    </div>
                    
                    <div className="flex flex-col gap-1.5 flex-grow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 font-bold">{comment.user.email.split('@')[0]}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCommentFlag(comment.id)}
                            className="p-1 bg-transparent border-0 cursor-pointer text-zinc-500 hover:text-red-400 transition-colors"
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
                          className="spoiler-text inline-block text-xs py-2 px-3 border border-white/5"
                        >
                          ⚠️ NHẤP ĐỂ XEM SPOILER (Nội dung tiết lộ trước cốt truyện tập phim)
                        </div>
                      ) : (
                        <p className={`text-sm text-zinc-300 leading-relaxed ${comment.isSpoiler ? 'border-l-2 border-amber-500 pl-3 bg-amber-500/5 py-1 rounded' : ''}`}>
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 glass-card p-6">
                  <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Chưa có bình luận nào cho tập phim này. Hãy bắt đầu cuộc trò chuyện!</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
