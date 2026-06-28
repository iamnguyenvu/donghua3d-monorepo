'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { catalogApi, AiringMoviePayload } from '@/lib/api';
import { Calendar, Bell, BellOff, Clock, Flame, Film, ArrowRight, Loader2, Sparkles } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ Hai', shortLabel: 'T2' },
  { value: 2, label: 'Thứ Ba', shortLabel: 'T3' },
  { value: 3, label: 'Thứ Tư', shortLabel: 'T4' },
  { value: 4, label: 'Thứ Năm', shortLabel: 'T5' },
  { value: 5, label: 'Thứ Sáu', shortLabel: 'T6' },
  { value: 6, label: 'Thứ Bảy', shortLabel: 'T7' },
  { value: 7, label: 'Chủ Nhật', shortLabel: 'CN' }
];

export default function ReleaseCalendarPage() {
  const [schedule, setSchedule] = useState<AiringMoviePayload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // 1. Resolve current day of week (1=Mon, ..., 7=Sun) to auto-select today on load
  useEffect(() => {
    const today = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const airingToday = today === 0 ? 7 : today;
    setSelectedDay(airingToday);
    
    // Load subscription states from localStorage
    const saved = localStorage.getItem('donghua3d_calendar_subs');
    if (saved) {
      try {
        setSubscriptions(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // 2. Fetch Weekly Schedule data from the API
  useEffect(() => {
    async function fetchSchedule() {
      setLoading(true);
      try {
        const res = await catalogApi.getAiringSchedule();
        if (res.success && res.data) {
          setSchedule(res.data);
        }
      } catch (err) {
        console.error('Error fetching calendar schedule:', err);
      }
      setLoading(false);
    }
    fetchSchedule();
  }, []);

  // 3. Keep running timer for dynamic countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter movies airing on selected day
  const filteredMovies = schedule.filter((m) => m.airingDay === selectedDay);

  // Toggle notification subscription
  const toggleSubscription = (movieId: string, movieTitle: string) => {
    let updated;
    if (subscriptions.includes(movieId)) {
      updated = subscriptions.filter((id) => id !== movieId);
      alert(`🔕 Đã hủy đăng ký nhận thông báo phim "${movieTitle}".`);
    } else {
      updated = [...subscriptions, movieId];
      alert(`🔔 Đăng ký thành công! Bạn sẽ nhận được thông báo ngay khi tập mới của "${movieTitle}" ra mắt.`);
    }
    setSubscriptions(updated);
    localStorage.setItem('donghua3d_calendar_subs', JSON.stringify(updated));
  };

  // Helper: compute countdown to next airing time (Mocked to 19:00 on the airing day of week)
  const getCountdownString = (airingDay: number) => {
    const now = currentDate;
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    
    // Target is 19:00 (7 PM) of the airing day
    let daysDiff = airingDay - currentDay;
    if (daysDiff < 0 || (daysDiff === 0 && now.getHours() >= 19)) {
      daysDiff += 7; // releases next week
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysDiff);
    targetDate.setHours(19, 0, 0, 0);

    const diffMs = targetDate.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (daysDiff === 0) {
      return `Phát sóng hôm nay lúc 19:00 (còn ${hours}h ${mins}m ${secs}s)`;
    }
    if (daysDiff === 1) {
      return `Phát sóng ngày mai lúc 19:00`;
    }
    return `Phát sóng sau ${daysDiff} ngày nữa (19:00)`;
  };

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col font-sans selection:bg-violet-600/30">
      <Header />

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md p-6 md:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-pink-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 z-10 flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              <span className="text-xs font-black uppercase tracking-widest text-violet-400">Lịch Phát Sóng Tuần</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400">
              Động Phủ Lịch Chiếu Hoạt Hình 3D
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Cập nhật khung giờ ra mắt chính xác của các siêu phẩm hoạt hình Trung Quốc 3D ăn khách nhất. 
              Nhấn chuông thông báo để nhận cảnh báo tu vi linh thạch ngay khi tập mới được cào về!
            </p>
          </div>

          <div className="z-10 flex flex-col items-center justify-center bg-zinc-950/60 border border-zinc-850 px-5 py-4 rounded-[4px] min-w-[200px]">
            <Clock className="w-6 h-6 text-amber-500 animate-pulse mb-1.5" />
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Giờ Hệ Thống</span>
            <span className="text-sm font-black font-mono tracking-wider text-amber-400 mt-1">
              {currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Days Navigator Tab Bar */}
        <div className="grid grid-cols-7 gap-2 bg-[#0c0c10]/60 border border-zinc-900/60 p-2 rounded-[4px] backdrop-blur-md shadow-xl select-none">
          {DAYS_OF_WEEK.map((d) => {
            const isActive = d.value === selectedDay;
            const isSystemToday = (currentDate.getDay() === 0 ? 7 : currentDate.getDay()) === d.value;
            
            return (
              <button
                key={d.value}
                onClick={() => setSelectedDay(d.value)}
                className={`py-3 px-1 rounded-[3px] text-center transition-all cursor-pointer border flex flex-col justify-center items-center gap-1.5 outline-none ${isActive ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]' : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
              >
                <span className="text-xs font-black uppercase tracking-wider">{d.label}</span>
                {isSystemToday && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-400/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-[2px] scale-90 tracking-widest">
                    Hôm Nay
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule Listing Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="bg-[#0b0b14]/30 border border-zinc-900/40 rounded-[4px] py-20 px-4 text-center flex flex-col items-center justify-center shadow-xl">
            <Film className="w-12 h-12 text-zinc-700 mb-3 animate-pulse" />
            <span className="text-xs text-zinc-400 font-black uppercase tracking-widest">Không có lịch phát sóng</span>
            <p className="text-xs text-zinc-550 mt-1 max-w-sm">
              Không có bộ phim hoạt hình nào có lịch phát vào ngày {DAYS_OF_WEEK.find(x => x.value === selectedDay)?.label}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMovies.map((movie) => {
              const isSubbed = subscriptions.includes(movie.id);
              
              return (
                <div 
                  key={movie.id} 
                  className="group relative bg-[#0b0b14]/75 border border-zinc-900 hover:border-violet-500/30 rounded-[4px] p-4 flex gap-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] overflow-hidden"
                >
                  {/* Glassmorphic lighting glow on hover */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/0 group-hover:bg-violet-600/5 rounded-full blur-2xl transition-all duration-500 pointer-events-none" />

                  {/* Left Side: Poster Image */}
                  <a 
                    href={`/movies/${movie.slug}`} 
                    className="relative w-24 sm:w-28 aspect-[3/4] rounded-[3px] overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-900 group-hover:border-zinc-800 transition-colors"
                  >
                    {movie.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                        No Poster
                      </div>
                    )}
                    
                    {/* Rating badge */}
                    {movie.rating > 0 && (
                      <div className="absolute top-1.5 left-1.5 bg-black/75 border border-amber-400/25 px-1.5 py-0.5 rounded-[2px] flex items-center gap-1 text-[9px] text-amber-400 font-black">
                        <Flame className="w-2.5 h-2.5 fill-current" />
                        <span>{movie.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </a>

                  {/* Right Side: Details & Actions */}
                  <div className="flex-grow flex flex-col justify-between py-1 min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        {/* Title */}
                        <a 
                          href={`/movies/${movie.slug}`}
                          className="text-sm font-black text-zinc-200 group-hover:text-violet-400 transition-colors truncate no-underline"
                        >
                          {movie.title}
                        </a>

                        {/* Subscription Bell Button */}
                        <button
                          onClick={() => toggleSubscription(movie.id, movie.title)}
                          className={`p-1.5 rounded-[3px] border cursor-pointer transition-all outline-none ${isSubbed ? 'bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-600 hover:text-white' : 'bg-transparent border-zinc-850 hover:border-zinc-750 text-zinc-500 hover:text-zinc-300'}`}
                          title={isSubbed ? "Hủy đăng ký thông báo" : "Đăng ký nhận thông báo"}
                        >
                          {isSubbed ? <Bell className="w-3.5 h-3.5 animate-swing" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Studio Name */}
                      <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                        Studio: {movie.studio || 'Chưa cập nhật'}
                      </p>

                      {/* Airing countdown info */}
                      <div className="flex items-center gap-1.5 text-[10px] text-violet-400 font-bold bg-violet-600/5 border border-violet-500/10 px-2 py-1 rounded-[2px] max-w-max">
                        <Clock className="w-3 h-3 text-violet-400" />
                        <span>{getCountdownString(movie.airingDay)}</span>
                      </div>
                    </div>

                    {/* Latest Episode Block */}
                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-3 mt-3 gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] text-zinc-550 font-black uppercase tracking-widest block">Tập mới nhất</span>
                        {movie.latestEpisode ? (
                          <a 
                            href={`/movies/${movie.slug}/tap-${movie.latestEpisode.episodeNumber}`}
                            className="text-[11px] font-black text-zinc-300 hover:text-violet-400 transition-colors truncate block max-w-[150px] no-underline"
                          >
                            Tập {movie.latestEpisode.episodeNumber}: {movie.latestEpisode.title}
                          </a>
                        ) : (
                          <span className="text-[11px] font-black text-zinc-650 block">Chưa công chiếu</span>
                        )}
                      </div>

                      <a
                        href={`/movies/${movie.slug}`}
                        className="py-1 px-2.5 rounded-[2px] bg-zinc-950 border border-zinc-850 hover:border-zinc-750 text-zinc-400 hover:text-white text-[10px] font-extrabold transition-all no-underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
