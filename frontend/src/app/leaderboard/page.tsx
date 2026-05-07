'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Trophy, Star, Award, Sparkles, LayoutList, Loader2, Save, 
  MessageSquare, Film, PlusCircle, BookmarkCheck 
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
      <div className="min-h-screen bg-black flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans pb-24">
      <Header />

      <main className="container mx-auto px-8 max-w-6xl mt-28">
        <div className="flex items-center gap-3 border-b border-white/10 pb-6 mb-12">
          <Trophy className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white">Đại Sảnh Thứ Hạng</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Bảng xếp hạng chất lượng 3D Donghua tổng hợp từ bầu chọn cộng đồng.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* LEFT: VISUAL PERSONAL TIER LIST BOARD (2/3 Grid) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-bold">Bảng Xếp Hạng Cá Nhân Của Bạn</h2>
            </div>

            {/* Visual Board Rows */}
            <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
              {Object.keys(boardStructure).map((tierKey) => {
                const tk = tierKey as Tier;
                const items = boardStructure[tk];
                return (
                  <div key={tk} className="tier-row">
                    <div className={`tier-label tier-label-${tk}`}>
                      {tk}
                    </div>
                    <div className="tier-items">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <div 
                            key={it.id} 
                            className="relative group w-12 aspect-[2/3] rounded-md overflow-hidden border border-white/10 cursor-pointer"
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

            {/* Quick Placement Selector Form Panel */}
            <form onSubmit={handleSaveTier} className="glass-card p-6 flex flex-col gap-4">
              <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <PlusCircle className="w-4 h-4 text-violet-400" />
                Xếp hạng nhanh phim của bạn
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-zinc-500 font-bold uppercase">Chọn bộ phim</label>
                  <select
                    value={selectedMovieId}
                    onChange={(e) => setSelectedMovieId(e.target.value)}
                    className="bg-zinc-900 border border-white/10 text-white rounded-lg p-2.5 text-sm outline-none focus:border-violet-500"
                  >
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-zinc-500 font-bold uppercase">Xếp vào hạng (Tier)</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as Tier)}
                    className="bg-zinc-900 border border-white/10 text-white rounded-lg p-2.5 text-sm outline-none focus:border-violet-500"
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
                <label className="text-xs text-zinc-500 font-bold uppercase">Ghi chú cá nhân (Notes)</label>
                <input
                  type="text"
                  placeholder="Nhập cảm nhận của bạn về vị trí đặt phim này..."
                  value={tierNotes}
                  onChange={(e) => setTierNotes(e.target.value)}
                  className="input-cinema"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-cinema btn-cinema-primary py-3 mt-1 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Lưu Thứ Hạng Cá Nhân
              </button>
            </form>
          </div>

          {/* RIGHT: AGGREGATED GLOBAL LEADERBOARD (1/3 Grid) */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold">BXH Toàn Cầu Thực Tế</h2>
            </div>

            <div className="flex flex-col gap-4">
              {leaderboard.length > 0 ? (
                leaderboard.map((row, idx) => (
                  <div key={row.id} className="glass-card p-5 flex flex-col gap-4 relative overflow-hidden">
                    {/* Position Rank Flag indicator */}
                    <div className="absolute top-0 right-0 bg-violet-600/10 border-b border-l border-violet-500/20 text-violet-400 font-sans font-extrabold px-3 py-1 text-sm rounded-bl-xl">
                      # {idx + 1}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 aspect-[2/3] rounded-md overflow-hidden border border-white/10 relative flex-shrink-0">
                        <Image
                          src={row.movie.posterUrl}
                          alt={row.movie.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 max-w-[160px]">
                        <h3 className="text-sm font-bold text-white truncate">{row.movie.title}</h3>
                        <span className="text-[10px] text-zinc-500 font-semibold">{row.movie.studio} • {row.movie.releaseYear}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-amber-400/10 border border-amber-500/20 text-amber-400 font-sans font-extrabold text-[11px] px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {row.movie.rating.toFixed(1)}
                          </span>
                          <span className="bg-violet-400/10 border border-violet-500/20 text-violet-400 font-sans font-extrabold text-[11px] px-2 py-0.5 rounded">
                            {row.globalTier}-TIER
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Representation */}
                    <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold uppercase">
                        <span>Điểm Tích Lũy</span>
                        <span className="text-violet-400 font-extrabold">{row.tierScore.toFixed(1)} / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-600 to-indigo-600"
                          style={{ width: `${row.tierScore}%` }}
                        />
                      </div>
                      
                      {/* Breakdown vote counts */}
                      <div className="grid grid-cols-6 gap-1 text-center mt-1 text-[9px] font-bold text-zinc-500">
                        <div>S: {row.s_tier_count}</div>
                        <div>A: {row.a_tier_count}</div>
                        <div>B: {row.b_tier_count}</div>
                        <div>C: {row.c_tier_count}</div>
                        <div>D: {row.d_tier_count}</div>
                        <div>F: {row.f_tier_count}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 glass-card p-6">
                  <Film className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Chưa có dữ liệu thống kê bảng xếp hạng.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
