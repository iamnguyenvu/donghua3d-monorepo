'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Trophy, Star, Award, Sparkles, Loader2, Save, 
  PlusCircle, BookmarkCheck, Film 
} from 'lucide-react';
import Header from '@/components/Header';
import { 
  tierApi, catalogApi, 
  LeaderboardRowPayload, MoviePayload, PersonalTierPayload, Tier 
} from '@/lib/api';

export default function LeaderboardAndTiers() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowPayload[]>([]);
  const [movies, setMovies] = useState<MoviePayload[]>([]);
  const [personalTiers, setPersonalTiers] = useState<PersonalTierPayload[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector inputs for personal placements
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier>(Tier.S);
  const [tierNotes, setTierNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Leaderboard and personal placements
  const loadData = async () => {
    setLoading(true);
    const leadRes = await tierApi.getLeaderboard();
    const movieRes = await catalogApi.getMovies();
    
    if (leadRes.success && leadRes.data) {
      setLeaderboard(leadRes.data);
    }
    if (movieRes.success && movieRes.data) {
      setMovies(movieRes.data);
      if (movieRes.data.length > 0) {
        setSelectedMovieId(movieRes.data[0].id);
      }
    }

    const token = localStorage.getItem('donghua3d_token');
    if (token) {
      const personalRes = await tierApi.getPersonalTiers();
      if (personalRes.success && personalRes.data) {
        setPersonalTiers(personalRes.data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovieId) return;
    setSubmitting(true);

    const token = localStorage.getItem('donghua3d_token');
    if (!token) {
      alert('Vui lòng đăng nhập để có thể lưu bảng xếp hạng cá nhân của bạn!');
      setSubmitting(false);
      return;
    }

    const res = await tierApi.savePersonalTier(selectedMovieId, selectedTier, tierNotes);
    if (res.success && res.data) {
      setTierNotes('');
      // Reload everything to trigger fresh leaderboard mathematical scores
      await loadData();
    } else {
      alert(res.error?.message || 'Có lỗi xảy ra khi lưu.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  // Group personal tiers by Tier Category for the board visual
  const boardStructure = {
    [Tier.S]: personalTiers.filter(p => p.tier === Tier.S),
    [Tier.A]: personalTiers.filter(p => p.tier === Tier.A),
    [Tier.B]: personalTiers.filter(p => p.tier === Tier.B),
    [Tier.C]: personalTiers.filter(p => p.tier === Tier.C),
    [Tier.D]: personalTiers.filter(p => p.tier === Tier.D),
    [Tier.F]: personalTiers.filter(p => p.tier === Tier.F),
  };

  // Label backgrounds mapping using beautiful pure Tailwind gradients and shadows
  const tierColorsMap = {
    [Tier.S]: 'bg-gradient-to-br from-rose-500 via-pink-600 to-violet-600 text-white font-extrabold shadow-[0_0_20px_rgba(244,63,94,0.4)]',
    [Tier.A]: 'bg-gradient-to-br from-orange-400 to-rose-500 text-white font-extrabold shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    [Tier.B]: 'bg-gradient-to-br from-amber-400 to-orange-500 text-neutral-950 font-extrabold shadow-sm',
    [Tier.C]: 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-neutral-950 font-extrabold',
    [Tier.D]: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white font-extrabold',
    [Tier.F]: 'bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-400 font-bold',
  };

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="w-full px-6 md:px-12 lg:px-16 mt-28">
        <div className="flex items-center gap-4 border-b border-zinc-900/60 pb-5 mb-12">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3">
              Đại Sảnh Thứ Hạng
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* LEFT: VISUAL PERSONAL TIER LIST BOARD (2/3 Grid) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-zinc-400 tracking-wider uppercase border-l-2 border-zinc-750 pl-2.5 select-none">
                Bảng Xếp Hạng Cá Nhân Của Bạn
              </h2>
            </div>

            {/* Visual Board Rows using pure Tailwind */}
            <div className="rounded-[4px] overflow-hidden border border-zinc-900/60 bg-zinc-950/40 shadow-2xl">
              {Object.keys(boardStructure).map((tierKey) => {
                const tk = tierKey as Tier;
                const items = boardStructure[tk];
                return (
                  <div key={tk} className="flex items-stretch min-h-[90px] border-b border-zinc-900/40 last:border-0">
                    <div className={`flex items-center justify-center w-20 text-xl font-black tracking-tighter flex-shrink-0 select-none rounded-l-[2px] ${tierColorsMap[tk]}`}>
                      {tk}
                    </div>
                    <div className="flex flex-wrap gap-3 p-4 bg-zinc-950/20 flex-grow min-h-[50px] items-center">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <div 
                            key={it.id} 
                            className="relative group w-11 aspect-[2/3] rounded-[2px] overflow-hidden border border-zinc-900/80 cursor-pointer transition-all duration-300 hover:scale-110 hover:border-violet-600 hover:shadow-[0_4px_12px_rgba(124,58,237,0.35)]"
                            title={`${it.movie.title} (${tk}-Tier) ${it.notes ? `- ${it.notes}` : ''}`}
                          >
                            <Image
                              src={it.movie.posterUrl}
                              alt={it.movie.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-extrabold uppercase tracking-wider select-none">Trống</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Placement Selector Form Panel using pure Tailwind */}
            <form onSubmit={handleSaveTier} className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex flex-col gap-4 shadow-lg select-none">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900/60 pb-3">
                <PlusCircle className="w-3.5 h-3.5 text-violet-500" />
                Xếp hạng nhanh phim của bạn
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Chọn bộ phim</label>
                  <select
                    value={selectedMovieId}
                    onChange={(e) => setSelectedMovieId(e.target.value)}
                    className="bg-[#0c0c0f] border border-zinc-800/80 text-zinc-300 rounded-[4px] p-2.5 text-xs cursor-pointer outline-none focus:border-zinc-750 transition-all"
                  >
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Xếp vào hạng (Tier)</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as Tier)}
                    className="bg-[#0c0c0f] border border-zinc-800/80 text-zinc-300 rounded-[4px] p-2.5 text-xs cursor-pointer outline-none focus:border-zinc-750 transition-all"
                  >
                    <option value={Tier.S}>S-Tier (Siêu phẩm đặc sắc)</option>
                    <option value={Tier.A}>A-Tier (Hay xuất sắc)</option>
                    <option value={Tier.B}>B-Tier (Đáng xem)</option>
                    <option value={Tier.C}>C-Tier (Xem ổn)</option>
                    <option value={Tier.D}>D-Tier (Xem tạm)</option>
                    <option value={Tier.F}>F-Tier (Thất vọng)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Ghi chú cá nhân (Notes)</label>
                <input
                  type="text"
                  placeholder="Nhập cảm nhận của bạn về vị trí đặt phim này..."
                  value={tierNotes}
                  onChange={(e) => setTierNotes(e.target.value)}
                  className="bg-[#0c0c0f] border border-zinc-800/80 text-white rounded-[4px] p-3 text-xs outline-none focus:border-zinc-750 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-extrabold flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-md disabled:opacity-50 cursor-pointer outline-none border-0"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Lưu Thứ Hạng Cá Nhân
              </button>
            </form>
          </div>

          {/* RIGHT: AGGREGATED GLOBAL LEADERBOARD (1/3 Grid) */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-zinc-400 tracking-wider uppercase border-l-2 border-zinc-750 pl-2.5 select-none">
                BXH Toàn Cầu Thực Tế
              </h2>
            </div>

            <div className="flex flex-col gap-5 select-none">
              {leaderboard.length > 0 ? (
                leaderboard.map((row, idx) => (
                  <div key={row.id} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex flex-col gap-3 relative overflow-hidden shadow-lg group transition-all">
                    {/* Position Rank Flag indicator */}
                    <div className="absolute top-0 right-0 bg-violet-600/10 border-b border-l border-zinc-900 text-violet-500 font-black px-2.5 py-0.5 text-xs rounded-bl-[4px] shadow-sm">
                      # {idx + 1}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-10 aspect-[2/3] rounded-[2px] overflow-hidden border border-zinc-900/60 relative flex-shrink-0 shadow-sm">
                        <Image
                          src={row.movie.posterUrl}
                          alt={row.movie.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 max-w-[160px]">
                        <h3 className="text-xs font-bold text-white truncate group-hover:text-violet-400 transition-colors">{row.movie.title}</h3>
                        <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">{row.movie.studio} • {row.movie.releaseYear}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {row.movie.rating > 0 ? (
                            <span className="bg-black/80 border border-zinc-800 text-amber-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-[2px] flex items-center gap-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              {row.movie.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="bg-black/80 border border-zinc-800 text-zinc-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider shadow-sm select-none">
                              1080P
                            </span>
                          )}
                          <span className="bg-black/80 border border-zinc-800 text-zinc-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded-[2px] shadow-sm">
                            {row.globalTier}-TIER
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Representation */}
                    <div className="flex flex-col gap-1.5 border-t border-zinc-900/60 pt-3">
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider">
                        <span>Điểm Tích Lũy</span>
                        <span className="text-violet-400 font-black">{row.tierScore.toFixed(1)} / 100</span>
                      </div>
                      <div className="w-full h-1 bg-zinc-950 rounded-[1px] overflow-hidden border border-zinc-900">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-1000"
                          style={{ width: `${row.tierScore}%` }}
                        />
                      </div>
                      
                      {/* Breakdown vote counts */}
                      <div className="grid grid-cols-6 gap-1 text-center mt-1 text-[8px] font-bold text-zinc-550 bg-zinc-950/80 py-1.5 rounded-[2px] border border-zinc-900/60">
                        <div>S:<span className="text-rose-450 ml-0.5">{row.s_tier_count}</span></div>
                        <div>A:<span className="text-orange-450 ml-0.5">{row.a_tier_count}</span></div>
                        <div>B:<span className="text-amber-450 ml-0.5">{row.b_tier_count}</span></div>
                        <div>C:<span className="text-emerald-450 ml-0.5">{row.c_tier_count}</span></div>
                        <div>D:<span className="text-slate-450 ml-0.5">{row.d_tier_count}</span></div>
                        <div>F:<span className="text-zinc-600 ml-0.5">{row.f_tier_count}</span></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-6">
                  <Film className="w-8 h-8 text-zinc-650 mx-auto mb-2" />
                  <p className="text-xs text-zinc-550 italic">Chưa có dữ liệu thống kê bảng xếp hạng.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
