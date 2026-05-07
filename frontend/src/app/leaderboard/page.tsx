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

      <main className="container mx-auto px-8 max-w-6xl mt-28">
        <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6 mb-12">
          <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">Đại Sảnh Thứ Hạng</h1>
            <p className="text-sm text-zinc-400 mt-1">Bảng xếp hạng chất lượng 3D Donghua tổng hợp từ bầu chọn cộng đồng.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* LEFT: VISUAL PERSONAL TIER LIST BOARD (2/3 Grid) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="flex items-center gap-2.5">
              <BookmarkCheck className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Bảng Xếp Hạng Cá Nhân Của Bạn</h2>
            </div>

            {/* Visual Board Rows using pure Tailwind */}
            <div className="rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 shadow-2xl">
              {Object.keys(boardStructure).map((tierKey) => {
                const tk = tierKey as Tier;
                const items = boardStructure[tk];
                return (
                  <div key={tk} className="flex items-stretch min-h-[95px] border-b border-zinc-800/50 last:border-0">
                    <div className={`flex items-center justify-center w-24 text-2xl tracking-tighter flex-shrink-0 select-none ${tierColorsMap[tk]}`}>
                      {tk}
                    </div>
                    <div className="flex flex-wrap gap-3.5 p-4 bg-zinc-950/40 flex-grow min-h-[60px] items-center">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <div 
                            key={it.id} 
                            className="relative group w-12 aspect-[2/3] rounded-lg overflow-hidden border border-zinc-800 cursor-pointer transition-all duration-300 hover:scale-110 hover:border-violet-500 hover:shadow-[0_4px_15px_rgba(138,43,226,0.3)]"
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
                        <span className="text-xs text-zinc-600 font-semibold italic">Trống</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Placement Selector Form Panel using pure Tailwind */}
            <form onSubmit={handleSaveTier} className="p-6 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl flex flex-col gap-5 shadow-lg">
              <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-3">
                <PlusCircle className="w-4 h-4 text-violet-400" />
                Xếp hạng nhanh phim của bạn
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Chọn bộ phim</label>
                  <select
                    value={selectedMovieId}
                    onChange={(e) => setSelectedMovieId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl p-3 text-sm cursor-pointer outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  >
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Xếp vào hạng (Tier)</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as Tier)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl p-3 text-sm cursor-pointer outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
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

              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Ghi chú cá nhân (Notes)</label>
                <input
                  type="text"
                  placeholder="Nhập cảm nhận của bạn về vị trí đặt phim này..."
                  value={tierNotes}
                  onChange={(e) => setTierNotes(e.target.value)}
                  className="bg-zinc-900/60 border border-zinc-800 text-white rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Lưu Thứ Hạng Cá Nhân
              </button>
            </form>
          </div>

          {/* RIGHT: AGGREGATED GLOBAL LEADERBOARD (1/3 Grid) */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">BXH Toàn Cầu Thực Tế</h2>
            </div>

            <div className="flex flex-col gap-5">
              {leaderboard.length > 0 ? (
                leaderboard.map((row, idx) => (
                  <div key={row.id} className="p-5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl flex flex-col gap-4 relative overflow-hidden shadow-lg group transition-all hover:border-zinc-700">
                    {/* Position Rank Flag indicator */}
                    <div className="absolute top-0 right-0 bg-violet-600/10 border-b border-l border-zinc-800 text-violet-400 font-sans font-extrabold px-3.5 py-1 text-sm rounded-bl-xl shadow-sm">
                      # {idx + 1}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden border border-zinc-800 relative flex-shrink-0">
                        <Image
                          src={row.movie.posterUrl}
                          alt={row.movie.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex flex-col gap-1 max-w-[160px]">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">{row.movie.title}</h3>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{row.movie.studio} • {row.movie.releaseYear}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-amber-400/5 border border-amber-400/20 text-amber-400 font-sans font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {row.movie.rating.toFixed(1)}
                          </span>
                          <span className="bg-violet-500/5 border border-violet-500/20 text-violet-300 font-sans font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg shadow-sm">
                            {row.globalTier}-TIER
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Representation */}
                    <div className="flex flex-col gap-2 border-t border-zinc-800/50 pt-4">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                        <span>Điểm Tích Lũy</span>
                        <span className="text-violet-400 font-extrabold">{row.tierScore.toFixed(1)} / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 transition-all duration-1000"
                          style={{ width: `${row.tierScore}%` }}
                        />
                      </div>
                      
                      {/* Breakdown vote counts */}
                      <div className="grid grid-cols-6 gap-1 text-center mt-1.5 text-[9px] font-bold text-zinc-500 bg-zinc-900/40 py-1.5 rounded-lg border border-zinc-900/60">
                        <div>S: <span className="text-rose-400">{row.s_tier_count}</span></div>
                        <div>A: <span className="text-orange-400">{row.a_tier_count}</span></div>
                        <div>B: <span className="text-amber-400">{row.b_tier_count}</span></div>
                        <div>C: <span className="text-emerald-400">{row.c_tier_count}</span></div>
                        <div>D: <span className="text-slate-400">{row.d_tier_count}</span></div>
                        <div>F: <span className="text-zinc-600">{row.f_tier_count}</span></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-zinc-950/40 border border-zinc-800 rounded-2xl p-6">
                  <Film className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 italic">Chưa có dữ liệu thống kê bảng xếp hạng.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
